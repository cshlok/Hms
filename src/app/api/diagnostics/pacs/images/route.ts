import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';

/**
 * GET /api/diagnostics/pacs/images
 * Get PACS images with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const studyInstanceUid = searchParams.get('studyInstanceUid');
    const seriesInstanceUid = searchParams.get('seriesInstanceUid');
    const modality = searchParams.get('modality');
    const accessionNumber = searchParams.get('accessionNumber');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Cache key
    const cacheKey = `diagnostic:pacs:images:${patientId || ''}:${studyInstanceUid || ''}:${seriesInstanceUid || ''}:${modality || ''}:${accessionNumber || ''}:${fromDate || ''}:${toDate || ''}:${page}:${pageSize}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT i.*, 
                 p.patient_id as patient_identifier, p.first_name, p.last_name, 
                 ro.order_number, ro.procedure_name
          FROM pacs_images i
          JOIN patients p ON i.patient_id = p.id
          LEFT JOIN radiology_orders ro ON i.order_id = ro.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add filters
        if (patientId) {
          query += ' AND i.patient_id = ?';
          params.push(patientId);
        }

        if (studyInstanceUid) {
          query += ' AND i.study_instance_uid = ?';
          params.push(studyInstanceUid);
        }

        if (seriesInstanceUid) {
          query += ' AND i.series_instance_uid = ?';
          params.push(seriesInstanceUid);
        }

        if (modality) {
          query += ' AND i.modality = ?';
          params.push(modality);
        }

        if (accessionNumber) {
          query += ' AND i.accession_number = ?';
          params.push(accessionNumber);
        }

        if (fromDate) {
          query += ' AND i.study_date >= ?';
          params.push(fromDate);
        }

        if (toDate) {
          query += ' AND i.study_date <= ?';
          params.push(toDate);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY i.study_date DESC, i.study_time DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM pacs_images i
          JOIN patients p ON i.patient_id = p.id
          LEFT JOIN radiology_orders ro ON i.order_id = ro.id
          WHERE 1=1
          ${patientId ? ' AND i.patient_id = ?' : ''}
          ${studyInstanceUid ? ' AND i.study_instance_uid = ?' : ''}
          ${seriesInstanceUid ? ' AND i.series_instance_uid = ?' : ''}
          ${modality ? ' AND i.modality = ?' : ''}
          ${accessionNumber ? ' AND i.accession_number = ?' : ''}
          ${fromDate ? ' AND i.study_date >= ?' : ''}
          ${toDate ? ' AND i.study_date <= ?' : ''}
        `;
        
        const countParams = params.slice(0, -2);
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'pacs_images',
          details: { patientId, studyInstanceUid, modality, page, pageSize }
        });

        return {
          images: result.results,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages
          }
        };
      },
      1800 // 30 minutes cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/pacs/images:', error);
    return NextResponse.json({
      error: 'Failed to fetch PACS images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/diagnostics/pacs/images/:id
 * Get a specific PACS image by ID
 */
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Cache key
    const cacheKey = `diagnostic:pacs:image:${id}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Get image
        const query = `
          SELECT i.*, 
                 p.patient_id as patient_identifier, p.first_name, p.last_name, 
                 ro.order_number, ro.procedure_name
          FROM pacs_images i
          JOIN patients p ON i.patient_id = p.id
          LEFT JOIN radiology_orders ro ON i.order_id = ro.id
          WHERE i.id = ?
        `;

        const result = await DB.query(query, [id]);

        if (result.results.length === 0) {
          throw new Error('Image not found');
        }

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'pacs_images',
          resourceId: id,
          details: { id }
        });

        return result.results[0];
      },
      3600 // 1 hour cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/pacs/images/:id:', error);
    return NextResponse.json({
      error: 'Failed to fetch PACS image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/pacs/images/retrieve
 * Retrieve images from PACS server
 */
export async function POST_RETRIEVE(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiologist', 'radiology_technician', 'radiology_manager'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      patientId, 
      accessionNumber, 
      studyInstanceUid,
      studyDate,
      modality
    } = body;

    // Validate required fields
    if (!patientId && !accessionNumber && !studyInstanceUid) {
      return NextResponse.json({ 
        error: 'At least one of patientId, accessionNumber, or studyInstanceUid is required' 
      }, { status: 400 });
    }

    // Check if PACS is configured
    const pacsConfigQuery = `
      SELECT * FROM pacs_configuration
      WHERE active = true
      LIMIT 1
    `;
    
    const pacsConfigResult = await DB.query(pacsConfigQuery);
    
    if (pacsConfigResult.results.length === 0) {
      return NextResponse.json({
        error: 'PACS not configured'
      }, { status: 400 });
    }

    // In a real implementation, this would use a DICOM library to query the PACS server
    // For this example, we'll simulate a successful retrieval
    
    // Simulate retrieval delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate retrieved images
    const retrievedImages = [];
    
    // If we have a study instance UID, simulate retrieving that specific study
    if (studyInstanceUid) {
      // Generate a random number of series (1-5)
      const seriesCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < seriesCount; i++) {
        // Generate a random number of instances (5-20)
        const instanceCount = Math.floor(Math.random() * 16) + 5;
        
        const seriesInstanceUid = `1.2.840.10008.5.1.4.1.1.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}`;
        
        for (let j = 0; j < instanceCount; j++) {
          retrievedImages.push({
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid: `1.2.840.10008.5.1.4.1.1.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${j + 1}`,
            instanceNumber: j + 1,
            modality: modality || 'CT',
            studyDate: studyDate || new Date().toISOString().split('T')[0],
            studyTime: new Date().toISOString().split('T')[1].split('.')[0],
            seriesNumber: i + 1,
            seriesDescription: `Series ${i + 1}`,
            patientId,
            accessionNumber: accessionNumber || `ACC${Math.floor(Math.random() * 1000000)}`
          });
        }
      }
    } else {
      // Simulate retrieving multiple studies
      const studyCount = Math.floor(Math.random() * 3) + 1;
      
      for (let s = 0; s < studyCount; s++) {
        const studyInstanceUid = `1.2.840.10008.5.1.4.1.1.${Math.floor(Math.random() * 1000)}`;
        const seriesCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < seriesCount; i++) {
          const instanceCount = Math.floor(Math.random() * 10) + 5;
          
          const seriesInstanceUid = `1.2.840.10008.5.1.4.1.1.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}`;
          
          for (let j = 0; j < instanceCount; j++) {
            retrievedImages.push({
              studyInstanceUid,
              seriesInstanceUid,
              sopInstanceUid: `1.2.840.10008.5.1.4.1.1.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${j + 1}`,
              instanceNumber: j + 1,
              modality: modality || ['CT', 'MR', 'XR'][Math.floor(Math.random() * 3)],
              studyDate: studyDate || new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              studyTime: new Date().toISOString().split('T')[1].split('.')[0],
              seriesNumber: i + 1,
              seriesDescription: `Series ${i + 1}`,
              patientId,
              accessionNumber: accessionNumber || `ACC${Math.floor(Math.random() * 1000000)}`
            });
          }
        }
      }
    }
    
    // In a real implementation, we would store these images in the database
    // For this example, we'll just return the simulated results
    
    // Log retrieval
    await auditLog({
      userId: session.user.id,
      action: 'retrieve',
      resource: 'pacs_images',
      details: {
        patientId,
        accessionNumber,
        studyInstanceUid,
        imagesRetrieved: retrievedImages.length
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully retrieved ${retrievedImages.length} images`,
      retrievedImages: retrievedImages.slice(0, 10), // Return only first 10 for brevity
      totalImages: retrievedImages.length,
      uniqueStudies: new Set(retrievedImages.map(img => img.studyInstanceUid)).size,
      uniqueSeries: new Set(retrievedImages.map(img => img.seriesInstanceUid)).size
    });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/pacs/images/retrieve:', error);
    return NextResponse.json({
      error: 'Failed to retrieve images from PACS',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/pacs/images/store
 * Store images to PACS server
 */
export async function POST_STORE(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiologist', 'radiology_technician', 'radiology_manager'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      patientId, 
      orderId,
      accessionNumber, 
      modality,
      studyInstanceUid,
      seriesInstanceUid,
      sopInstanceUid,
      imageData
    } = body;

    // Validate required fields
    if (!patientId || !modality || !studyInstanceUid || !seriesInstanceUid || !sopInstanceUid || !imageData) {
      return NextResponse.json({ 
        error: 'Patient ID, modality, study instance UID, series instance UID, SOP instance UID, and image data are required' 
      }, { status: 400 });
    }

    // Check if PACS is configured
    const pacsConfigQuery = `
      SELECT * FROM pacs_configuration
      WHERE active = true
      LIMIT 1
    `;
    
    const pacsConfigResult = await DB.query(pacsConfigQuery);
    
    if (pacsConfigResult.results.length === 0) {
      return NextResponse.json({
        error: 'PACS not configured'
      }, { status: 400 });
    }

    // Check if patient exists
    const patientCheck = await DB.query('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (patientCheck.results.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if order exists if provided
    if (orderId) {
      const orderCheck = await DB.query('SELECT id FROM radiology_orders WHERE id = ?', [orderId]);
      if (orderCheck.results.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    // In a real implementation, this would use a DICOM library to store the image to the PACS server
    // For this example, we'll simulate a successful storage
    
    // Simulate storage delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Insert image record
    const query = `
      INSERT INTO pacs_images (
        patient_id, order_id, accession_number, modality,
        study_instance_uid, series_instance_uid, sop_instance_uid,
        study_date, study_time, series_number, instance_number,
        image_url, thumbnail_url, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      patientId,
      orderId || null,
      accessionNumber || null,
      modality,
      studyInstanceUid,
      seriesInstanceUid,
      sopInstanceUid,
      body.seriesNumber || 1,
      body.instanceNumber || 1,
      `https://pacs.example.com/wado?studyUID=${studyInstanceUid}&seriesUID=${seriesInstanceUid}&objectUID=${sopInstanceUid}`,
      `https://pacs.example.com/wado?studyUID=${studyInstanceUid}&seriesUID=${seriesInstanceUid}&objectUID=${sopInstanceUid}&contentType=image/jpeg`,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log storage
    await auditLog({
      userId: session.user.id,
      action: 'store',
      resource: 'pacs_images',
      resourceId: result.insertId,
      details: {
        patientId,
        orderId,
        studyInstanceUid,
        seriesInstanceUid,
        sopInstanceUid
      }
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:pacs:images:*');

    return NextResponse.json({
      success: true,
      message: 'Image successfully stored to PACS',
      imageId: result.insertId,
      studyInstanceUid,
      seriesInstanceUid,
      sopInstanceUid
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/pacs/images/store:', error);
    return NextResponse.json({
      error: 'Failed to store image to PACS',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/pacs/images/:id/annotations
 * Add annotations to a PACS image
 */
export async function POST_ANNOTATIONS(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiologist', 'radiology_technician'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      annotationType, 
      coordinates, 
      measurements,
      text,
      color,
      visibility
    } = body;

    // Validate required fields
    if (!annotationType || !coordinates) {
      return NextResponse.json({ 
        error: 'Annotation type and coordinates are required' 
      }, { status: 400 });
    }

    // Check if image exists
    const imageCheck = await DB.query('SELECT * FROM pacs_images WHERE id = ?', [id]);
    if (imageCheck.results.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Insert annotation
    const query = `
      INSERT INTO pacs_image_annotations (
        image_id, annotation_type, coordinates, measurements, text,
        color, visibility, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      annotationType,
      JSON.stringify(coordinates),
      measurements ? JSON.stringify(measurements) : null,
      text || null,
      color || '#FF0000',
      visibility !== undefined ? visibility : true,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log annotation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'pacs_image_annotations',
      resourceId: result.insertId,
      details: {
        imageId: id,
        annotationType,
        hasText: !!text,
        hasMeasurements: !!measurements
      }
    });

    // Get the created annotation
    const createdAnnotation = await DB.query(
      `SELECT * FROM pacs_image_annotations WHERE id = ?`,
      [result.insertId]
    );

    // Parse JSON fields
    const annotation = {
      ...createdAnnotation.results[0],
      coordinates: JSON.parse(createdAnnotation.results[0].coordinates),
      measurements: createdAnnotation.results[0].measurements ? 
        JSON.parse(createdAnnotation.results[0].measurements) : null
    };

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/pacs/images/:id/annotations:', error);
    return NextResponse.json({
      error: 'Failed to add annotation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/diagnostics/pacs/images/:id/annotations
 * Get annotations for a PACS image
 */
export async function GET_ANNOTATIONS(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Cache key
    const cacheKey = `diagnostic:pacs:image:${id}:annotations`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Check if image exists
        const imageCheck = await DB.query('SELECT id FROM pacs_images WHERE id = ?', [id]);
        if (imageCheck.results.length === 0) {
          throw new Error('Image not found');
        }

        // Get annotations
        const query = `
          SELECT a.*, u.username as created_by_name
          FROM pacs_image_annotations a
          LEFT JOIN users u ON a.created_by = u.id
          WHERE a.image_id = ?
          ORDER BY a.created_at ASC
        `;

        const result = await DB.query(query, [id]);

        // Parse JSON fields
        const annotations = result.results.map(annotation => ({
          ...annotation,
          coordinates: JSON.parse(annotation.coordinates),
          measurements: annotation.measurements ? JSON.parse(annotation.measurements) : null
        }));

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'pacs_image_annotations',
          details: { imageId: id }
        });

        return annotations;
      },
      1800 // 30 minutes cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/pacs/images/:id/annotations:', error);
    return NextResponse.json({
      error: 'Failed to fetch annotations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
