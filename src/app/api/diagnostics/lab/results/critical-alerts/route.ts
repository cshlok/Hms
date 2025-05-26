import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';

/**
 * GET /api/diagnostics/lab/results/critical-alerts
 * Get critical result alerts
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
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Cache key
    const cacheKey = `diagnostic:lab:critical-alerts:${status || 'all'}:${assignedTo || 'all'}:${page}:${pageSize}:${session.user.id}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT ca.*, 
                 lr.result_value, lr.units, lr.result_date,
                 lt.test_name, lt.test_code, lt.loinc_code,
                 p.patient_id, p.first_name, p.last_name, p.date_of_birth,
                 u.username as assigned_to_username,
                 cv.min_value, cv.max_value, cv.severity
          FROM laboratory_critical_alerts ca
          JOIN laboratory_results lr ON ca.result_id = lr.id
          JOIN laboratory_tests lt ON lr.test_id = lt.id
          JOIN patients p ON lr.patient_id = p.id
          LEFT JOIN users u ON ca.assigned_to = u.id
          JOIN laboratory_critical_values cv ON ca.critical_value_id = cv.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add status filter if provided
        if (status) {
          query += ' AND ca.status = ?';
          params.push(status);
        }

        // Add assigned_to filter if provided
        if (assignedTo) {
          if (assignedTo === 'me') {
            query += ' AND ca.assigned_to = ?';
            params.push(session.user.id);
          } else if (assignedTo === 'unassigned') {
            query += ' AND ca.assigned_to IS NULL';
          } else {
            query += ' AND ca.assigned_to = ?';
            params.push(assignedTo);
          }
        }

        // Add role-based filtering
        if (!['admin', 'lab_manager', 'lab_supervisor'].includes(session.user.roleName)) {
          // Regular users can only see alerts assigned to them or unassigned
          query += ' AND (ca.assigned_to = ? OR ca.assigned_to IS NULL)';
          params.push(session.user.id);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY ca.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM laboratory_critical_alerts ca
          WHERE 1=1
          ${status ? ' AND ca.status = ?' : ''}
          ${assignedTo ? (assignedTo === 'me' ? ' AND ca.assigned_to = ?' : 
                         (assignedTo === 'unassigned' ? ' AND ca.assigned_to IS NULL' : 
                         ' AND ca.assigned_to = ?')) : ''}
          ${!['admin', 'lab_manager', 'lab_supervisor'].includes(session.user.roleName) ? 
            ' AND (ca.assigned_to = ? OR ca.assigned_to IS NULL)' : ''}
        `;
        
        const countParams = [...params.slice(0, -2)];
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Decrypt sensitive data
        const alerts = result.results.map(alert => {
          // Decrypt any encrypted fields if necessary
          return {
            ...alert,
            // Add any decryption logic here if needed
          };
        });

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'laboratory_critical_alerts',
          details: { status, assignedTo, page, pageSize }
        });

        return {
          alerts,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages
          }
        };
      },
      300 // 5 minutes cache - shorter for critical alerts
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/lab/results/critical-alerts:', error);
    return NextResponse.json({
      error: 'Failed to fetch critical alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/results/critical-alerts
 * Create a new critical result alert
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { resultId, criticalValueId, notes, assignedTo } = body;

    // Validate required fields
    if (!resultId || !criticalValueId) {
      return NextResponse.json({ error: 'Result ID and Critical Value ID are required' }, { status: 400 });
    }

    // Check if result exists
    const resultCheck = await DB.query('SELECT * FROM laboratory_results WHERE id = ?', [resultId]);
    if (resultCheck.results.length === 0) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Check if critical value exists
    const criticalValueCheck = await DB.query('SELECT * FROM laboratory_critical_values WHERE id = ?', [criticalValueId]);
    if (criticalValueCheck.results.length === 0) {
      return NextResponse.json({ error: 'Critical value not found' }, { status: 404 });
    }

    // Check if alert already exists for this result
    const existingAlertCheck = await DB.query(
      'SELECT id FROM laboratory_critical_alerts WHERE result_id = ? AND status != ?',
      [resultId, 'resolved']
    );
    
    if (existingAlertCheck.results.length > 0) {
      return NextResponse.json({ error: 'An active alert already exists for this result' }, { status: 409 });
    }

    // Insert critical alert
    const query = `
      INSERT INTO laboratory_critical_alerts (
        result_id, critical_value_id, notes, status, assigned_to, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      resultId,
      criticalValueId,
      notes || null,
      'pending',
      assignedTo || null,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'laboratory_critical_alerts',
      resourceId: result.insertId,
      details: body
    });

    // Send notifications
    if (assignedTo) {
      await notifyUsers({
        userIds: [assignedTo],
        title: 'Critical Result Alert',
        message: 'You have been assigned a critical result alert that requires your attention',
        type: 'critical_alert',
        resourceId: result.insertId,
        resourceType: 'laboratory_critical_alerts',
        priority: 'high'
      });
    } else {
      // Notify all lab supervisors and managers if unassigned
      const supervisors = await DB.query(
        'SELECT id FROM users WHERE role_id IN (SELECT id FROM roles WHERE name IN (?, ?))',
        ['lab_supervisor', 'lab_manager']
      );
      
      const supervisorIds = supervisors.results.map(user => user.id);
      
      if (supervisorIds.length > 0) {
        await notifyUsers({
          userIds: supervisorIds,
          title: 'Unassigned Critical Result Alert',
          message: 'A new critical result alert requires assignment',
          type: 'critical_alert',
          resourceId: result.insertId,
          resourceType: 'laboratory_critical_alerts',
          priority: 'high'
        });
      }
    }

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:critical-alerts:*');

    // Get the created alert
    const createdAlert = await DB.query(
      `SELECT ca.*, 
              lr.result_value, lr.units, lr.result_date,
              lt.test_name, lt.test_code, lt.loinc_code,
              p.patient_id, p.first_name, p.last_name, p.date_of_birth,
              u.username as assigned_to_username,
              cv.min_value, cv.max_value, cv.severity
       FROM laboratory_critical_alerts ca
       JOIN laboratory_results lr ON ca.result_id = lr.id
       JOIN laboratory_tests lt ON lr.test_id = lt.id
       JOIN patients p ON lr.patient_id = p.id
       LEFT JOIN users u ON ca.assigned_to = u.id
       JOIN laboratory_critical_values cv ON ca.critical_value_id = cv.id
       WHERE ca.id = ?`,
      [result.insertId]
    );

    return NextResponse.json(createdAlert.results[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/results/critical-alerts:', error);
    return NextResponse.json({
      error: 'Failed to create critical alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/diagnostics/lab/results/critical-alerts/:id
 * Update a critical result alert
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
    const { status, notes, assignedTo, acknowledgement } = body;

    // Check if alert exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_critical_alerts WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Critical alert not found' }, { status: 404 });
    }

    const existingAlert = existingCheck.results[0];

    // Authorization
    const isAssignedToUser = existingAlert.assigned_to === session.user.id;
    const isManager = ['admin', 'lab_manager', 'lab_supervisor'].includes(session.user.roleName);
    
    if (!isAssignedToUser && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (status !== undefined) {
      // Only managers or assigned users can change status
      if (!isManager && !isAssignedToUser) {
        return NextResponse.json({ error: 'Forbidden: Cannot change status' }, { status: 403 });
      }
      
      updateFields.push('status = ?');
      updateParams.push(status);
      
      // If resolving, require acknowledgement
      if (status === 'resolved' && !acknowledgement) {
        return NextResponse.json({ 
          error: 'Acknowledgement required to resolve critical alert' 
        }, { status: 400 });
      }
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }

    if (assignedTo !== undefined) {
      // Only managers can reassign
      if (!isManager) {
        return NextResponse.json({ error: 'Forbidden: Cannot reassign alert' }, { status: 403 });
      }
      
      updateFields.push('assigned_to = ?');
      updateParams.push(assignedTo || null);
    }

    if (acknowledgement) {
      updateFields.push('acknowledged_at = NOW()');
      updateFields.push('acknowledged_by = ?');
      updateParams.push(session.user.id);
    }

    updateFields.push('updated_by = ?');
    updateParams.push(session.user.id);

    updateFields.push('updated_at = NOW()');

    // Add ID to params
    updateParams.push(id);

    // Execute update
    if (updateFields.length > 0) {
      const query = `UPDATE laboratory_critical_alerts SET ${updateFields.join(', ')} WHERE id = ?`;
      await DB.query(query, updateParams);

      // Log update
      await auditLog({
        userId: session.user.id,
        action: 'update',
        resource: 'laboratory_critical_alerts',
        resourceId: id,
        details: body
      });

      // Send notifications for assignment changes
      if (assignedTo !== undefined && assignedTo !== existingAlert.assigned_to) {
        if (assignedTo) {
          await notifyUsers({
            userIds: [assignedTo],
            title: 'Critical Result Alert Assignment',
            message: 'You have been assigned a critical result alert that requires your attention',
            type: 'critical_alert',
            resourceId: id,
            resourceType: 'laboratory_critical_alerts',
            priority: 'high'
          });
        }
      }

      // Send notifications for status changes
      if (status !== undefined && status !== existingAlert.status) {
        // Notify relevant parties about status change
        const notifyIds = [];
        
        // Always notify the creator
        if (existingAlert.created_by !== session.user.id) {
          notifyIds.push(existingAlert.created_by);
        }
        
        // Notify the assigned user if they didn't make the change
        if (existingAlert.assigned_to && existingAlert.assigned_to !== session.user.id) {
          notifyIds.push(existingAlert.assigned_to);
        }
        
        if (notifyIds.length > 0) {
          await notifyUsers({
            userIds: notifyIds,
            title: 'Critical Alert Status Update',
            message: `Critical alert status changed to ${status}`,
            type: 'critical_alert_update',
            resourceId: id,
            resourceType: 'laboratory_critical_alerts',
            priority: 'medium'
          });
        }
      }

      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:lab:critical-alerts:*');
    }

    // Get the updated alert
    const updatedAlert = await DB.query(
      `SELECT ca.*, 
              lr.result_value, lr.units, lr.result_date,
              lt.test_name, lt.test_code, lt.loinc_code,
              p.patient_id, p.first_name, p.last_name, p.date_of_birth,
              u.username as assigned_to_username,
              cv.min_value, cv.max_value, cv.severity
       FROM laboratory_critical_alerts ca
       JOIN laboratory_results lr ON ca.result_id = lr.id
       JOIN laboratory_tests lt ON lr.test_id = lt.id
       JOIN patients p ON lr.patient_id = p.id
       LEFT JOIN users u ON ca.assigned_to = u.id
       JOIN laboratory_critical_values cv ON ca.critical_value_id = cv.id
       WHERE ca.id = ?`,
      [id]
    );

    return NextResponse.json(updatedAlert.results[0]);
  } catch (error) {
    console.error('Error in PUT /api/diagnostics/lab/results/critical-alerts/:id:', error);
    return NextResponse.json({
      error: 'Failed to update critical alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
