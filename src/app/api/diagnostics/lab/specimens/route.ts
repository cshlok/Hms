import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { generateBarcodeData } from '@/lib/barcode';

/**
 * GET /api/diagnostics/lab/specimens
 * Get laboratory specimens with optional filtering
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
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const specimenType = searchParams.get('specimenType');
    const collectedAfter = searchParams.get('collectedAfter');
    const collectedBefore = searchParams.get('collectedBefore');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Cache key
    const cacheKey = `diagnostic:lab:specimens:${patientId || ''}:${orderId || ''}:${status || ''}:${specimenType || ''}:${collectedAfter || ''}:${collectedBefore || ''}:${search || ''}:${page}:${pageSize}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT s.*, 
                 p.patient_id as patient_identifier, p.first_name, p.last_name, 
                 u1.username as collected_by_name,
                 u2.username as received_by_name,
                 lo.order_number
          FROM laboratory_specimens s
          JOIN patients p ON s.patient_id = p.id
          LEFT JOIN users u1 ON s.collected_by = u1.id
          LEFT JOIN users u2 ON s.received_by = u2.id
          LEFT JOIN laboratory_orders lo ON s.order_id = lo.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add filters
        if (patientId) {
          query += ' AND s.patient_id = ?';
          params.push(patientId);
        }

        if (orderId) {
          query += ' AND s.order_id = ?';
          params.push(orderId);
        }

        if (status) {
          query += ' AND s.status = ?';
          params.push(status);
        }

        if (specimenType) {
          query += ' AND s.specimen_type = ?';
          params.push(specimenType);
        }

        if (collectedAfter) {
          query += ' AND s.collected_at >= ?';
          params.push(collectedAfter);
        }

        if (collectedBefore) {
          query += ' AND s.collected_at <= ?';
          params.push(collectedBefore);
        }

        if (search) {
          query += ' AND (s.barcode_id LIKE ? OR s.specimen_id LIKE ? OR p.patient_id LIKE ? OR CONCAT(p.first_name, " ", p.last_name) LIKE ?)';
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY s.collected_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM laboratory_specimens s
          JOIN patients p ON s.patient_id = p.id
          WHERE 1=1
          ${patientId ? ' AND s.patient_id = ?' : ''}
          ${orderId ? ' AND s.order_id = ?' : ''}
          ${status ? ' AND s.status = ?' : ''}
          ${specimenType ? ' AND s.specimen_type = ?' : ''}
          ${collectedAfter ? ' AND s.collected_at >= ?' : ''}
          ${collectedBefore ? ' AND s.collected_at <= ?' : ''}
          ${search ? ' AND (s.barcode_id LIKE ? OR s.specimen_id LIKE ? OR p.patient_id LIKE ? OR CONCAT(p.first_name, " ", p.last_name) LIKE ?)' : ''}
        `;
        
        const countParams = params.slice(0, -2);
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'laboratory_specimens',
          details: { patientId, orderId, status, specimenType, page, pageSize }
        });

        return {
          specimens: result.results,
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
    console.error('Error in GET /api/diagnostics/lab/specimens:', error);
    return NextResponse.json({
      error: 'Failed to fetch specimens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/specimens
 * Create a new laboratory specimen
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'lab_manager', 'lab_technician', 'phlebotomist', 'nurse'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      patientId, 
      orderId, 
      specimenType, 
      collectionMethod, 
      collectionSite, 
      collectionNotes,
      containerType,
      volume,
      volumeUnits,
      priority
    } = body;

    // Validate required fields
    if (!patientId || !specimenType) {
      return NextResponse.json({ error: 'Patient ID and specimen type are required' }, { status: 400 });
    }

    // Check if patient exists
    const patientCheck = await DB.query('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (patientCheck.results.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if order exists if provided
    if (orderId) {
      const orderCheck = await DB.query('SELECT id FROM laboratory_orders WHERE id = ?', [orderId]);
      if (orderCheck.results.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    // Generate unique specimen ID
    const specimenId = `SP${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Generate barcode data
    const barcodeId = await generateBarcodeData(specimenId);

    // Insert specimen
    const query = `
      INSERT INTO laboratory_specimens (
        specimen_id, barcode_id, patient_id, order_id, specimen_type, 
        collection_method, collection_site, collection_notes,
        container_type, volume, volume_units, priority,
        status, collected_by, collected_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `;

    const params = [
      specimenId,
      barcodeId,
      patientId,
      orderId || null,
      specimenType,
      collectionMethod || null,
      collectionSite || null,
      collectionNotes || null,
      containerType || null,
      volume || null,
      volumeUnits || null,
      priority || 'routine',
      'collected',
      session.user.id,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'laboratory_specimens',
      resourceId: result.insertId,
      details: body
    });

    // Create specimen tracking entry
    await DB.query(
      `INSERT INTO laboratory_specimen_tracking (
        specimen_id, location, status, notes, performed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        result.insertId,
        collectionSite || 'Collection Point',
        'collected',
        'Specimen collected',
        session.user.id
      ]
    );

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:specimens:*');

    // Get the created specimen
    const createdSpecimen = await DB.query(
      `SELECT s.*, 
              p.patient_id as patient_identifier, p.first_name, p.last_name, 
              u1.username as collected_by_name,
              u2.username as received_by_name,
              lo.order_number
       FROM laboratory_specimens s
       JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u1 ON s.collected_by = u1.id
       LEFT JOIN users u2 ON s.received_by = u2.id
       LEFT JOIN laboratory_orders lo ON s.order_id = lo.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    return NextResponse.json(createdSpecimen.results[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/specimens:', error);
    return NextResponse.json({
      error: 'Failed to create specimen',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/diagnostics/lab/specimens/:id
 * Update a laboratory specimen
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Parse request body
    const body = await request.json();
    const { 
      specimenType, 
      collectionMethod, 
      collectionSite, 
      collectionNotes,
      containerType,
      volume,
      volumeUnits,
      priority,
      status,
      rejectionReason,
      storageLocation,
      receivedBy
    } = body;

    // Check if specimen exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_specimens WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    const existingSpecimen = existingCheck.results[0];

    // Authorization
    const isLabStaff = ['admin', 'lab_manager', 'lab_supervisor', 'lab_technician'].includes(session.user.roleName);
    const isCollector = ['phlebotomist', 'nurse'].includes(session.user.roleName);
    
    // Only lab staff can update received specimens
    if (existingSpecimen.status === 'received' && !isLabStaff) {
      return NextResponse.json({ error: 'Forbidden: Cannot update received specimen' }, { status: 403 });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let statusChanged = false;
    let oldStatus = existingSpecimen.status;
    let trackingNote = null;

    if (specimenType !== undefined) {
      updateFields.push('specimen_type = ?');
      updateParams.push(specimenType);
    }

    if (collectionMethod !== undefined) {
      updateFields.push('collection_method = ?');
      updateParams.push(collectionMethod || null);
    }

    if (collectionSite !== undefined) {
      updateFields.push('collection_site = ?');
      updateParams.push(collectionSite || null);
    }

    if (collectionNotes !== undefined) {
      updateFields.push('collection_notes = ?');
      updateParams.push(collectionNotes || null);
    }

    if (containerType !== undefined) {
      updateFields.push('container_type = ?');
      updateParams.push(containerType || null);
    }

    if (volume !== undefined) {
      updateFields.push('volume = ?');
      updateParams.push(volume || null);
    }

    if (volumeUnits !== undefined) {
      updateFields.push('volume_units = ?');
      updateParams.push(volumeUnits || null);
    }

    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateParams.push(priority);
    }

    if (status !== undefined && status !== existingSpecimen.status) {
      // Only lab staff can change status (except collectors can mark as collected)
      if (!isLabStaff && !(isCollector && status === 'collected')) {
        return NextResponse.json({ error: 'Forbidden: Cannot change specimen status' }, { status: 403 });
      }

      updateFields.push('status = ?');
      updateParams.push(status);
      statusChanged = true;
      
      // Set tracking note based on status change
      switch (status) {
        case 'received':
          trackingNote = 'Specimen received in laboratory';
          updateFields.push('received_by = ?');
          updateFields.push('received_at = NOW()');
          updateParams.push(session.user.id);
          break;
        case 'processing':
          trackingNote = 'Specimen processing started';
          break;
        case 'completed':
          trackingNote = 'Specimen processing completed';
          break;
        case 'rejected':
          if (!rejectionReason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
          }
          trackingNote = `Specimen rejected: ${rejectionReason}`;
          updateFields.push('rejection_reason = ?');
          updateParams.push(rejectionReason);
          break;
        case 'stored':
          if (!storageLocation) {
            return NextResponse.json({ error: 'Storage location is required' }, { status: 400 });
          }
          trackingNote = `Specimen stored at ${storageLocation}`;
          updateFields.push('storage_location = ?');
          updateParams.push(storageLocation);
          break;
        default:
          trackingNote = `Specimen status changed to ${status}`;
      }
    } else {
      // Handle storage location update without status change
      if (storageLocation !== undefined) {
        updateFields.push('storage_location = ?');
        updateParams.push(storageLocation || null);
        trackingNote = `Specimen storage location updated to ${storageLocation || 'unspecified'}`;
      }
      
      // Handle rejection reason update without status change
      if (rejectionReason !== undefined) {
        updateFields.push('rejection_reason = ?');
        updateParams.push(rejectionReason || null);
        if (rejectionReason) {
          trackingNote = `Rejection reason updated: ${rejectionReason}`;
        }
      }
    }

    // Handle received_by update
    if (receivedBy !== undefined && isLabStaff) {
      updateFields.push('received_by = ?');
      updateParams.push(receivedBy || null);
      
      if (receivedBy && !existingSpecimen.received_by) {
        updateFields.push('received_at = NOW()');
        trackingNote = 'Specimen receipt recorded';
      }
    }

    updateFields.push('updated_by = ?');
    updateParams.push(session.user.id);

    updateFields.push('updated_at = NOW()');

    // Add ID to params
    updateParams.push(id);

    // Execute update
    if (updateFields.length > 0) {
      const query = `UPDATE laboratory_specimens SET ${updateFields.join(', ')} WHERE id = ?`;
      await DB.query(query, updateParams);

      // Log update
      await auditLog({
        userId: session.user.id,
        action: 'update',
        resource: 'laboratory_specimens',
        resourceId: id,
        details: body
      });

      // Create tracking entry if status changed or tracking note exists
      if (trackingNote) {
        await DB.query(
          `INSERT INTO laboratory_specimen_tracking (
            specimen_id, location, status, notes, performed_by, created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            id,
            storageLocation || existingSpecimen.storage_location || 'Laboratory',
            status || existingSpecimen.status,
            trackingNote,
            session.user.id
          ]
        );
      }

      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:lab:specimens:*');
    }

    // Get the updated specimen
    const updatedSpecimen = await DB.query(
      `SELECT s.*, 
              p.patient_id as patient_identifier, p.first_name, p.last_name, 
              u1.username as collected_by_name,
              u2.username as received_by_name,
              lo.order_number
       FROM laboratory_specimens s
       JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u1 ON s.collected_by = u1.id
       LEFT JOIN users u2 ON s.received_by = u2.id
       LEFT JOIN laboratory_orders lo ON s.order_id = lo.id
       WHERE s.id = ?`,
      [id]
    );

    return NextResponse.json(updatedSpecimen.results[0]);
  } catch (error) {
    console.error('Error in PUT /api/diagnostics/lab/specimens/:id:', error);
    return NextResponse.json({
      error: 'Failed to update specimen',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/diagnostics/lab/specimens/:id/tracking
 * Get tracking history for a specimen
 */
export async function GET_TRACKING(request: NextRequest, { params }: { params: { id: string } }) {
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
    const cacheKey = `diagnostic:lab:specimen:${id}:tracking`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Check if specimen exists
        const specimenCheck = await DB.query('SELECT id FROM laboratory_specimens WHERE id = ?', [id]);
        if (specimenCheck.results.length === 0) {
          throw new Error('Specimen not found');
        }

        // Get tracking history
        const query = `
          SELECT t.*, u.username as performed_by_name
          FROM laboratory_specimen_tracking t
          LEFT JOIN users u ON t.performed_by = u.id
          WHERE t.specimen_id = ?
          ORDER BY t.created_at DESC
        `;

        const result = await DB.query(query, [id]);

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'laboratory_specimen_tracking',
          details: { specimenId: id }
        });

        return result.results;
      },
      1800 // 30 minutes cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/lab/specimens/:id/tracking:', error);
    return NextResponse.json({
      error: 'Failed to fetch specimen tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/specimens/:id/aliquot
 * Create an aliquot from a parent specimen
 */
export async function POST_ALIQUOT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'lab_manager', 'lab_supervisor', 'lab_technician'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      containerType,
      volume,
      volumeUnits,
      storageLocation,
      notes
    } = body;

    // Validate required fields
    if (!containerType || !volume || !volumeUnits) {
      return NextResponse.json({ error: 'Container type, volume, and volume units are required' }, { status: 400 });
    }

    // Check if parent specimen exists
    const parentCheck = await DB.query('SELECT * FROM laboratory_specimens WHERE id = ?', [id]);
    if (parentCheck.results.length === 0) {
      return NextResponse.json({ error: 'Parent specimen not found' }, { status: 404 });
    }

    const parentSpecimen = parentCheck.results[0];

    // Check if parent specimen is in a valid state for aliquoting
    if (!['received', 'processing', 'stored'].includes(parentSpecimen.status)) {
      return NextResponse.json({ 
        error: 'Cannot create aliquot: Parent specimen must be received, processing, or stored' 
      }, { status: 400 });
    }

    // Generate unique specimen ID for aliquot
    const specimenId = `AL${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Generate barcode data
    const barcodeId = await generateBarcodeData(specimenId);

    // Insert aliquot specimen
    const query = `
      INSERT INTO laboratory_specimens (
        specimen_id, barcode_id, patient_id, order_id, specimen_type, 
        parent_specimen_id, container_type, volume, volume_units,
        priority, status, storage_location, collected_by, collected_at,
        received_by, received_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      specimenId,
      barcodeId,
      parentSpecimen.patient_id,
      parentSpecimen.order_id,
      parentSpecimen.specimen_type,
      id, // parent specimen ID
      containerType,
      volume,
      volumeUnits,
      parentSpecimen.priority,
      'stored', // Aliquots are created in stored status
      storageLocation || null,
      parentSpecimen.collected_by,
      parentSpecimen.collected_at,
      session.user.id, // Current user is the receiver
      new Date(), // Current time is the received time
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'laboratory_specimens',
      resourceId: result.insertId,
      details: { ...body, parentSpecimenId: id, type: 'aliquot' }
    });

    // Create specimen tracking entry
    await DB.query(
      `INSERT INTO laboratory_specimen_tracking (
        specimen_id, location, status, notes, performed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        result.insertId,
        storageLocation || 'Laboratory',
        'stored',
        `Aliquot created from specimen ${parentSpecimen.specimen_id}${notes ? ': ' + notes : ''}`,
        session.user.id
      ]
    );

    // Update parent specimen tracking
    await DB.query(
      `INSERT INTO laboratory_specimen_tracking (
        specimen_id, location, status, notes, performed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        id,
        parentSpecimen.storage_location || 'Laboratory',
        parentSpecimen.status,
        `Aliquot ${specimenId} created from this specimen`,
        session.user.id
      ]
    );

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:specimens:*');
    await CacheInvalidation.invalidatePattern(`diagnostic:lab:specimen:${id}:*`);

    // Get the created aliquot
    const createdAliquot = await DB.query(
      `SELECT s.*, 
              p.patient_id as patient_identifier, p.first_name, p.last_name, 
              u1.username as collected_by_name,
              u2.username as received_by_name,
              lo.order_number,
              ps.specimen_id as parent_specimen_identifier
       FROM laboratory_specimens s
       JOIN patients p ON s.patient_id = p.id
       LEFT JOIN users u1 ON s.collected_by = u1.id
       LEFT JOIN users u2 ON s.received_by = u2.id
       LEFT JOIN laboratory_orders lo ON s.order_id = lo.id
       LEFT JOIN laboratory_specimens ps ON s.parent_specimen_id = ps.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    return NextResponse.json(createdAliquot.results[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/specimens/:id/aliquot:', error);
    return NextResponse.json({
      error: 'Failed to create aliquot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/specimens/barcode
 * Generate barcode for a specimen
 */
export async function POST_BARCODE(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { specimenId } = body;

    // Validate required fields
    if (!specimenId) {
      return NextResponse.json({ error: 'Specimen ID is required' }, { status: 400 });
    }

    // Check if specimen exists
    const specimenCheck = await DB.query('SELECT * FROM laboratory_specimens WHERE id = ?', [specimenId]);
    if (specimenCheck.results.length === 0) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }

    const specimen = specimenCheck.results[0];

    // Generate barcode data if not already present
    let barcodeId = specimen.barcode_id;
    if (!barcodeId) {
      barcodeId = await generateBarcodeData(specimen.specimen_id);
      
      // Update specimen with barcode ID
      await DB.query(
        'UPDATE laboratory_specimens SET barcode_id = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
        [barcodeId, session.user.id, specimenId]
      );
      
      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:lab:specimens:*');
      await CacheInvalidation.invalidatePattern(`diagnostic:lab:specimen:${specimenId}:*`);
    }

    // Generate barcode image (base64)
    const barcodeImage = await generateBarcodeImage(barcodeId, specimen.specimen_id);

    // Log access
    await auditLog({
      userId: session.user.id,
      action: 'generate',
      resource: 'laboratory_specimen_barcode',
      resourceId: specimenId,
      details: { specimenId, barcodeId }
    });

    return NextResponse.json({
      barcodeId,
      specimenId: specimen.specimen_id,
      barcodeImage,
      format: 'CODE128'
    });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/specimens/barcode:', error);
    return NextResponse.json({
      error: 'Failed to generate barcode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to generate barcode image
async function generateBarcodeImage(barcodeId: string, specimenId: string): Promise<string> {
  // In a real implementation, this would use a barcode generation library
  // For this example, we'll return a placeholder
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
}
