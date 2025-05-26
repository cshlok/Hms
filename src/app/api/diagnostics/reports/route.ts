import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';
import { generateFhirResource } from '@/lib/fhir';

/**
 * GET /api/diagnostics/reports
 * Get diagnostic reports with optional filtering
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
    const reportType = searchParams.get('reportType');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const authorId = searchParams.get('authorId');
    const search = searchParams.get('search');
    const format = searchParams.get('format') || 'json'; // json or fhir
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Cache key
    const cacheKey = `diagnostic:reports:${patientId || ''}:${reportType || ''}:${status || ''}:${fromDate || ''}:${toDate || ''}:${authorId || ''}:${search || ''}:${format}:${page}:${pageSize}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT r.*, 
                 p.patient_id as patient_identifier, p.first_name, p.last_name, 
                 u1.username as author_name,
                 u2.username as verifier_name
          FROM diagnostic_reports r
          JOIN patients p ON r.patient_id = p.id
          LEFT JOIN users u1 ON r.author_id = u1.id
          LEFT JOIN users u2 ON r.verifier_id = u2.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add filters
        if (patientId) {
          query += ' AND r.patient_id = ?';
          params.push(patientId);
        }

        if (reportType) {
          query += ' AND r.report_type = ?';
          params.push(reportType);
        }

        if (status) {
          query += ' AND r.status = ?';
          params.push(status);
        }

        if (fromDate) {
          query += ' AND r.report_date >= ?';
          params.push(fromDate);
        }

        if (toDate) {
          query += ' AND r.report_date <= ?';
          params.push(toDate);
        }

        if (authorId) {
          query += ' AND r.author_id = ?';
          params.push(authorId);
        }

        if (search) {
          query += ' AND (r.title LIKE ? OR r.conclusion LIKE ? OR p.patient_id LIKE ? OR CONCAT(p.first_name, " ", p.last_name) LIKE ?)';
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY r.report_date DESC, r.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM diagnostic_reports r
          JOIN patients p ON r.patient_id = p.id
          WHERE 1=1
          ${patientId ? ' AND r.patient_id = ?' : ''}
          ${reportType ? ' AND r.report_type = ?' : ''}
          ${status ? ' AND r.status = ?' : ''}
          ${fromDate ? ' AND r.report_date >= ?' : ''}
          ${toDate ? ' AND r.report_date <= ?' : ''}
          ${authorId ? ' AND r.author_id = ?' : ''}
          ${search ? ' AND (r.title LIKE ? OR r.conclusion LIKE ? OR p.patient_id LIKE ? OR CONCAT(p.first_name, " ", p.last_name) LIKE ?)' : ''}
        `;
        
        const countParams = params.slice(0, -2);
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Decrypt sensitive data
        const reports = result.results.map(report => {
          // Decrypt any encrypted fields
          return {
            ...report,
            content: report.content ? decryptSensitiveData(report.content) : null,
            findings: report.findings ? decryptSensitiveData(report.findings) : null,
            conclusion: report.conclusion ? decryptSensitiveData(report.conclusion) : null
          };
        });

        // Convert to FHIR format if requested
        let formattedReports = reports;
        if (format === 'fhir') {
          formattedReports = reports.map(report => generateFhirResource('DiagnosticReport', report));
        }

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'diagnostic_reports',
          details: { patientId, reportType, status, page, pageSize, format }
        });

        return {
          reports: formattedReports,
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
    console.error('Error in GET /api/diagnostics/reports:', error);
    return NextResponse.json({
      error: 'Failed to fetch diagnostic reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/reports
 * Create a new diagnostic report
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'physician', 'radiologist', 'pathologist', 'lab_technician'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      patientId, 
      reportType, 
      title,
      content,
      findings,
      conclusion,
      orderId,
      templateId,
      status,
      criticalFindings,
      criticalFindingsAcknowledged,
      criticalFindingsAcknowledgedBy,
      criticalFindingsAcknowledgedAt,
      reportDate,
      multimedia
    } = body;

    // Validate required fields
    if (!patientId || !reportType || !title) {
      return NextResponse.json({ 
        error: 'Patient ID, report type, and title are required' 
      }, { status: 400 });
    }

    // Check if patient exists
    const patientCheck = await DB.query('SELECT id FROM patients WHERE id = ?', [patientId]);
    if (patientCheck.results.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if order exists if provided
    if (orderId) {
      let orderTable;
      if (reportType === 'radiology') {
        orderTable = 'radiology_orders';
      } else if (reportType === 'laboratory') {
        orderTable = 'laboratory_orders';
      } else {
        orderTable = 'diagnostic_orders';
      }
      
      const orderCheck = await DB.query(`SELECT id FROM ${orderTable} WHERE id = ?`, [orderId]);
      if (orderCheck.results.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    // Check if template exists if provided
    if (templateId) {
      const templateCheck = await DB.query('SELECT id FROM report_templates WHERE id = ?', [templateId]);
      if (templateCheck.results.length === 0) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    // Encrypt sensitive data
    const encryptedContent = content ? encryptSensitiveData(content) : null;
    const encryptedFindings = findings ? encryptSensitiveData(findings) : null;
    const encryptedConclusion = conclusion ? encryptSensitiveData(conclusion) : null;

    // Insert report
    const query = `
      INSERT INTO diagnostic_reports (
        patient_id, report_type, title, content, findings, conclusion,
        order_id, template_id, status, critical_findings,
        critical_findings_acknowledged, critical_findings_acknowledged_by,
        critical_findings_acknowledged_at, report_date, author_id,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      patientId,
      reportType,
      title,
      encryptedContent,
      encryptedFindings,
      encryptedConclusion,
      orderId || null,
      templateId || null,
      status || 'draft',
      criticalFindings || false,
      criticalFindingsAcknowledged || false,
      criticalFindingsAcknowledgedBy || null,
      criticalFindingsAcknowledgedAt || null,
      reportDate || new Date().toISOString().split('T')[0],
      session.user.id,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);
    const reportId = result.insertId;

    // Handle multimedia attachments if provided
    if (multimedia && Array.isArray(multimedia) && multimedia.length > 0) {
      for (const item of multimedia) {
        await DB.query(
          `INSERT INTO report_multimedia (
            report_id, media_type, url, caption, sequence_number,
            created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            reportId,
            item.mediaType,
            item.url,
            item.caption || null,
            item.sequenceNumber || 0,
            session.user.id,
            session.user.id
          ]
        );
      }
    }

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'diagnostic_reports',
      resourceId: reportId,
      details: {
        patientId,
        reportType,
        title,
        status: status || 'draft',
        criticalFindings: criticalFindings || false
      }
    });

    // If critical findings are present, notify relevant parties
    if (criticalFindings) {
      // Determine who to notify based on report type
      let notifyRoles = [];
      if (reportType === 'radiology') {
        notifyRoles = ['radiologist', 'physician'];
      } else if (reportType === 'laboratory') {
        notifyRoles = ['pathologist', 'physician'];
      } else {
        notifyRoles = ['physician'];
      }
      
      // Get users with relevant roles
      const usersQuery = `
        SELECT u.id FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name IN (${notifyRoles.map(() => '?').join(',')})
      `;
      
      const usersResult = await DB.query(usersQuery, notifyRoles);
      const userIds = usersResult.results.map(user => user.id);
      
      if (userIds.length > 0) {
        await notifyUsers({
          userIds,
          title: 'Critical Finding in Diagnostic Report',
          message: `Critical finding reported in ${reportType} report: ${title}`,
          type: 'critical_finding',
          resourceId: reportId,
          resourceType: 'diagnostic_reports',
          priority: 'high'
        });
      }
    }

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:reports:*');

    // Get the created report
    const createdReport = await DB.query(
      `SELECT r.*, 
              p.patient_id as patient_identifier, p.first_name, p.last_name, 
              u1.username as author_name,
              u2.username as verifier_name
       FROM diagnostic_reports r
       JOIN patients p ON r.patient_id = p.id
       LEFT JOIN users u1 ON r.author_id = u1.id
       LEFT JOIN users u2 ON r.verifier_id = u2.id
       WHERE r.id = ?`,
      [reportId]
    );

    // Decrypt sensitive data
    const report = {
      ...createdReport.results[0],
      content: createdReport.results[0].content ? 
        decryptSensitiveData(createdReport.results[0].content) : null,
      findings: createdReport.results[0].findings ? 
        decryptSensitiveData(createdReport.results[0].findings) : null,
      conclusion: createdReport.results[0].conclusion ? 
        decryptSensitiveData(createdReport.results[0].conclusion) : null
    };

    // Get multimedia attachments
    const multimediaResult = await DB.query(
      `SELECT * FROM report_multimedia WHERE report_id = ? ORDER BY sequence_number ASC`,
      [reportId]
    );

    report.multimedia = multimediaResult.results;

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/reports:', error);
    return NextResponse.json({
      error: 'Failed to create diagnostic report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/diagnostics/reports/:id
 * Get a specific diagnostic report by ID
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or fhir

    // Cache key
    const cacheKey = `diagnostic:report:${id}:${format}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Get report
        const query = `
          SELECT r.*, 
                 p.patient_id as patient_identifier, p.first_name, p.last_name, 
                 u1.username as author_name,
                 u2.username as verifier_name
          FROM diagnostic_reports r
          JOIN patients p ON r.patient_id = p.id
          LEFT JOIN users u1 ON r.author_id = u1.id
          LEFT JOIN users u2 ON r.verifier_id = u2.id
          WHERE r.id = ?
        `;

        const result = await DB.query(query, [id]);

        if (result.results.length === 0) {
          throw new Error('Report not found');
        }

        // Decrypt sensitive data
        const report = {
          ...result.results[0],
          content: result.results[0].content ? 
            decryptSensitiveData(result.results[0].content) : null,
          findings: result.results[0].findings ? 
            decryptSensitiveData(result.results[0].findings) : null,
          conclusion: result.results[0].conclusion ? 
            decryptSensitiveData(result.results[0].conclusion) : null
        };

        // Get multimedia attachments
        const multimediaResult = await DB.query(
          `SELECT * FROM report_multimedia WHERE report_id = ? ORDER BY sequence_number ASC`,
          [id]
        );

        report.multimedia = multimediaResult.results;

        // Convert to FHIR format if requested
        let formattedReport = report;
        if (format === 'fhir') {
          formattedReport = generateFhirResource('DiagnosticReport', report);
        }

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'diagnostic_reports',
          resourceId: id,
          details: { id, format }
        });

        return formattedReport;
      },
      1800 // 30 minutes cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/reports/:id:', error);
    return NextResponse.json({
      error: 'Failed to fetch diagnostic report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/diagnostics/reports/:id
 * Update a diagnostic report
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
      title,
      content,
      findings,
      conclusion,
      status,
      criticalFindings,
      criticalFindingsAcknowledged,
      criticalFindingsAcknowledgedBy,
      criticalFindingsAcknowledgedAt,
      reportDate,
      verifierId,
      verifiedAt,
      multimedia
    } = body;

    // Check if report exists
    const reportCheck = await DB.query('SELECT * FROM diagnostic_reports WHERE id = ?', [id]);
    if (reportCheck.results.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const existingReport = reportCheck.results[0];

    // Authorization
    const isAuthor = existingReport.author_id === session.user.id;
    const isVerifier = existingReport.verifier_id === session.user.id;
    const isAdmin = ['admin', 'radiology_manager', 'lab_manager'].includes(session.user.roleName);
    
    // Only certain roles can update reports
    if (!isAuthor && !isVerifier && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent modification of verified reports unless by admin
    if (existingReport.status === 'verified' && !isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot modify a verified report' 
      }, { status: 403 });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let statusChanged = false;
    let oldStatus = existingReport.status;
    let criticalStatusChanged = false;

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(title);
    }

    if (content !== undefined) {
      updateFields.push('content = ?');
      updateParams.push(content ? encryptSensitiveData(content) : null);
    }

    if (findings !== undefined) {
      updateFields.push('findings = ?');
      updateParams.push(findings ? encryptSensitiveData(findings) : null);
    }

    if (conclusion !== undefined) {
      updateFields.push('conclusion = ?');
      updateParams.push(conclusion ? encryptSensitiveData(conclusion) : null);
    }

    if (status !== undefined && status !== existingReport.status) {
      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        'draft': ['preliminary', 'final', 'verified', 'cancelled'],
        'preliminary': ['final', 'verified', 'cancelled'],
        'final': ['verified', 'cancelled'],
        'verified': ['cancelled'],
        'cancelled': []
      };

      if (!validTransitions[existingReport.status].includes(status)) {
        return NextResponse.json({ 
          error: `Invalid status transition from ${existingReport.status} to ${status}` 
        }, { status: 400 });
      }

      updateFields.push('status = ?');
      updateParams.push(status);
      statusChanged = true;
      
      // If transitioning to verified status, set verifier and verification time
      if (status === 'verified') {
        if (!verifierId && !existingReport.verifier_id) {
          updateFields.push('verifier_id = ?');
          updateParams.push(session.user.id);
        }
        
        if (!verifiedAt && !existingReport.verified_at) {
          updateFields.push('verified_at = NOW()');
        }
      }
    }

    if (criticalFindings !== undefined && criticalFindings !== existingReport.critical_findings) {
      updateFields.push('critical_findings = ?');
      updateParams.push(criticalFindings);
      criticalStatusChanged = true;
    }

    if (criticalFindingsAcknowledged !== undefined) {
      updateFields.push('critical_findings_acknowledged = ?');
      updateParams.push(criticalFindingsAcknowledged);
      
      if (criticalFindingsAcknowledged && !existingReport.critical_findings_acknowledged) {
        updateFields.push('critical_findings_acknowledged_by = ?');
        updateParams.push(criticalFindingsAcknowledgedBy || session.user.id);
        
        updateFields.push('critical_findings_acknowledged_at = ?');
        updateParams.push(criticalFindingsAcknowledgedAt || new Date().toISOString());
      }
    }

    if (reportDate !== undefined) {
      updateFields.push('report_date = ?');
      updateParams.push(reportDate);
    }

    if (verifierId !== undefined && (isAdmin || status === 'verified')) {
      updateFields.push('verifier_id = ?');
      updateParams.push(verifierId);
    }

    if (verifiedAt !== undefined && (isAdmin || status === 'verified')) {
      updateFields.push('verified_at = ?');
      updateParams.push(verifiedAt);
    }

    updateFields.push('updated_by = ?');
    updateParams.push(session.user.id);

    updateFields.push('updated_at = NOW()');

    // Add ID to params
    updateParams.push(id);

    // Execute update
    if (updateFields.length > 0) {
      const query = `UPDATE diagnostic_reports SET ${updateFields.join(', ')} WHERE id = ?`;
      await DB.query(query, updateParams);

      // Log update
      await auditLog({
        userId: session.user.id,
        action: 'update',
        resource: 'diagnostic_reports',
        resourceId: id,
        details: {
          ...body,
          statusChanged,
          oldStatus: statusChanged ? oldStatus : undefined,
          newStatus: statusChanged ? status : undefined,
          criticalStatusChanged
        }
      });

      // Handle multimedia attachments if provided
      if (multimedia && Array.isArray(multimedia)) {
        // Delete existing multimedia
        await DB.query('DELETE FROM report_multimedia WHERE report_id = ?', [id]);
        
        // Insert new multimedia
        for (const item of multimedia) {
          await DB.query(
            `INSERT INTO report_multimedia (
              report_id, media_type, url, caption, sequence_number,
              created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              item.mediaType,
              item.url,
              item.caption || null,
              item.sequenceNumber || 0,
              session.user.id,
              session.user.id
            ]
          );
        }
      }

      // If critical findings status changed to true, notify relevant parties
      if (criticalStatusChanged && criticalFindings) {
        // Determine who to notify based on report type
        let notifyRoles = [];
        if (existingReport.report_type === 'radiology') {
          notifyRoles = ['radiologist', 'physician'];
        } else if (existingReport.report_type === 'laboratory') {
          notifyRoles = ['pathologist', 'physician'];
        } else {
          notifyRoles = ['physician'];
        }
        
        // Get users with relevant roles
        const usersQuery = `
          SELECT u.id FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE r.name IN (${notifyRoles.map(() => '?').join(',')})
        `;
        
        const usersResult = await DB.query(usersQuery, notifyRoles);
        const userIds = usersResult.results.map(user => user.id);
        
        if (userIds.length > 0) {
          await notifyUsers({
            userIds,
            title: 'Critical Finding in Diagnostic Report',
            message: `Critical finding reported in ${existingReport.report_type} report: ${existingReport.title}`,
            type: 'critical_finding',
            resourceId: id,
            resourceType: 'diagnostic_reports',
            priority: 'high'
          });
        }
      }

      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:reports:*');
      await CacheInvalidation.invalidatePattern(`diagnostic:report:${id}:*`);
    }

    // Get the updated report
    const updatedReport = await DB.query(
      `SELECT r.*, 
              p.patient_id as patient_identifier, p.first_name, p.last_name, 
              u1.username as author_name,
              u2.username as verifier_name
       FROM diagnostic_reports r
       JOIN patients p ON r.patient_id = p.id
       LEFT JOIN users u1 ON r.author_id = u1.id
       LEFT JOIN users u2 ON r.verifier_id = u2.id
       WHERE r.id = ?`,
      [id]
    );

    // Decrypt sensitive data
    const report = {
      ...updatedReport.results[0],
      content: updatedReport.results[0].content ? 
        decryptSensitiveData(updatedReport.results[0].content) : null,
      findings: updatedReport.results[0].findings ? 
        decryptSensitiveData(updatedReport.results[0].findings) : null,
      conclusion: updatedReport.results[0].conclusion ? 
        decryptSensitiveData(updatedReport.results[0].conclusion) : null
    };

    // Get multimedia attachments
    const multimediaResult = await DB.query(
      `SELECT * FROM report_multimedia WHERE report_id = ? ORDER BY sequence_number ASC`,
      [id]
    );

    report.multimedia = multimediaResult.results;

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error in PUT /api/diagnostics/reports/:id:', error);
    return NextResponse.json({
      error: 'Failed to update diagnostic report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/reports/:id/acknowledge-critical
 * Acknowledge critical findings in a report
 */
export async function POST_ACKNOWLEDGE_CRITICAL(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'physician', 'radiologist', 'pathologist'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { acknowledgementNotes } = body;

    // Check if report exists and has critical findings
    const reportCheck = await DB.query(
      'SELECT * FROM diagnostic_reports WHERE id = ? AND critical_findings = true',
      [id]
    );
    
    if (reportCheck.results.length === 0) {
      return NextResponse.json({ 
        error: 'Report not found or does not have critical findings' 
      }, { status: 404 });
    }

    const report = reportCheck.results[0];

    // Check if already acknowledged
    if (report.critical_findings_acknowledged) {
      return NextResponse.json({ 
        error: 'Critical findings already acknowledged',
        acknowledgedBy: report.critical_findings_acknowledged_by,
        acknowledgedAt: report.critical_findings_acknowledged_at
      }, { status: 409 });
    }

    // Update report to acknowledge critical findings
    await DB.query(
      `UPDATE diagnostic_reports 
       SET critical_findings_acknowledged = true,
           critical_findings_acknowledged_by = ?,
           critical_findings_acknowledged_at = NOW(),
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [session.user.id, session.user.id, id]
    );

    // Log acknowledgement
    await auditLog({
      userId: session.user.id,
      action: 'acknowledge',
      resource: 'diagnostic_reports_critical',
      resourceId: id,
      details: { 
        reportId: id,
        acknowledgementNotes: acknowledgementNotes || null
      }
    });

    // Create acknowledgement record with notes if provided
    if (acknowledgementNotes) {
      await DB.query(
        `INSERT INTO critical_findings_acknowledgements (
          report_id, acknowledged_by, acknowledged_at, notes
        ) VALUES (?, ?, NOW(), ?)`,
        [id, session.user.id, acknowledgementNotes]
      );
    }

    // Notify report author
    if (report.author_id !== session.user.id) {
      await notifyUsers({
        userIds: [report.author_id],
        title: 'Critical Finding Acknowledged',
        message: `Critical findings in report "${report.title}" have been acknowledged`,
        type: 'critical_finding_acknowledged',
        resourceId: id,
        resourceType: 'diagnostic_reports',
        priority: 'medium'
      });
    }

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:reports:*');
    await CacheInvalidation.invalidatePattern(`diagnostic:report:${id}:*`);

    return NextResponse.json({
      success: true,
      message: 'Critical findings acknowledged successfully',
      acknowledgedBy: session.user.id,
      acknowledgedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/reports/:id/acknowledge-critical:', error);
    return NextResponse.json({
      error: 'Failed to acknowledge critical findings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
