import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';

/**
 * GET /api/diagnostics/lab/critical-values
 * Get critical value configurations
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
    const testId = searchParams.get('testId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Cache key
    const cacheKey = `diagnostic:lab:critical-values:${testId || 'all'}:${page}:${pageSize}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT cv.*, lt.test_name, lt.test_code, lt.loinc_code
          FROM laboratory_critical_values cv
          JOIN laboratory_tests lt ON cv.test_id = lt.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add test filter if provided
        if (testId) {
          query += ' AND cv.test_id = ?';
          params.push(testId);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY lt.test_name, cv.min_value LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM laboratory_critical_values cv
          WHERE 1=1
          ${testId ? ' AND cv.test_id = ?' : ''}
        `;
        const countParams = testId ? [testId] : [];
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'laboratory_critical_values',
          details: { testId, page, pageSize }
        });

        return {
          criticalValues: result.results,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages
          }
        };
      },
      3600 // 1 hour cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/lab/critical-values:', error);
    return NextResponse.json({
      error: 'Failed to fetch critical values',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/critical-values
 * Create a new critical value configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'lab_manager', 'lab_supervisor'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { testId, gender, minAge, maxAge, minValue, maxValue, units, severity, notificationMethod, message } = body;

    // Validate required fields
    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    if ((minValue === undefined && maxValue === undefined) || !units) {
      return NextResponse.json({ error: 'At least one threshold value and units are required' }, { status: 400 });
    }

    if (!severity || !['low', 'high', 'critical'].includes(severity)) {
      return NextResponse.json({ error: 'Valid severity level is required' }, { status: 400 });
    }

    // Check if test exists
    const testCheck = await DB.query('SELECT id FROM laboratory_tests WHERE id = ?', [testId]);
    if (testCheck.results.length === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Insert critical value
    const query = `
      INSERT INTO laboratory_critical_values (
        test_id, gender, min_age, max_age, min_value, max_value, 
        units, severity, notification_method, message, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      testId,
      gender || null,
      minAge || null,
      maxAge || null,
      minValue || null,
      maxValue || null,
      units,
      severity,
      notificationMethod || 'system',
      message || null,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'laboratory_critical_values',
      resourceId: result.insertId,
      details: body
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:critical-values:*');

    // Get the created critical value
    const createdValue = await DB.query(
      `SELECT cv.*, lt.test_name, lt.test_code, lt.loinc_code
       FROM laboratory_critical_values cv
       JOIN laboratory_tests lt ON cv.test_id = lt.id
       WHERE cv.id = ?`,
      [result.insertId]
    );

    return NextResponse.json(createdValue.results[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/critical-values:', error);
    return NextResponse.json({
      error: 'Failed to create critical value',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/diagnostics/lab/critical-values/:id
 * Update a critical value configuration
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'lab_manager', 'lab_supervisor'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { gender, minAge, maxAge, minValue, maxValue, units, severity, notificationMethod, message } = body;

    // Check if critical value exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_critical_values WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Critical value not found' }, { status: 404 });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateParams.push(gender || null);
    }

    if (minAge !== undefined) {
      updateFields.push('min_age = ?');
      updateParams.push(minAge || null);
    }

    if (maxAge !== undefined) {
      updateFields.push('max_age = ?');
      updateParams.push(maxAge || null);
    }

    if (minValue !== undefined) {
      updateFields.push('min_value = ?');
      updateParams.push(minValue || null);
    }

    if (maxValue !== undefined) {
      updateFields.push('max_value = ?');
      updateParams.push(maxValue || null);
    }

    if (units !== undefined) {
      updateFields.push('units = ?');
      updateParams.push(units);
    }

    if (severity !== undefined) {
      updateFields.push('severity = ?');
      updateParams.push(severity);
    }

    if (notificationMethod !== undefined) {
      updateFields.push('notification_method = ?');
      updateParams.push(notificationMethod || 'system');
    }

    if (message !== undefined) {
      updateFields.push('message = ?');
      updateParams.push(message || null);
    }

    updateFields.push('updated_by = ?');
    updateParams.push(session.user.id);

    updateFields.push('updated_at = NOW()');

    // Add ID to params
    updateParams.push(id);

    // Execute update
    if (updateFields.length > 0) {
      const query = `UPDATE laboratory_critical_values SET ${updateFields.join(', ')} WHERE id = ?`;
      await DB.query(query, updateParams);

      // Log update
      await auditLog({
        userId: session.user.id,
        action: 'update',
        resource: 'laboratory_critical_values',
        resourceId: id,
        details: body
      });

      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:lab:critical-values:*');
    }

    // Get the updated critical value
    const updatedValue = await DB.query(
      `SELECT cv.*, lt.test_name, lt.test_code, lt.loinc_code
       FROM laboratory_critical_values cv
       JOIN laboratory_tests lt ON cv.test_id = lt.id
       WHERE cv.id = ?`,
      [id]
    );

    return NextResponse.json(updatedValue.results[0]);
  } catch (error) {
    console.error('Error in PUT /api/diagnostics/lab/critical-values/:id:', error);
    return NextResponse.json({
      error: 'Failed to update critical value',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/diagnostics/lab/critical-values/:id
 * Delete a critical value configuration
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'lab_manager'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if critical value exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_critical_values WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Critical value not found' }, { status: 404 });
    }

    // Delete critical value
    await DB.query('DELETE FROM laboratory_critical_values WHERE id = ?', [id]);

    // Log deletion
    await auditLog({
      userId: session.user.id,
      action: 'delete',
      resource: 'laboratory_critical_values',
      resourceId: id,
      details: { id }
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:critical-values:*');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/diagnostics/lab/critical-values/:id:', error);
    return NextResponse.json({
      error: 'Failed to delete critical value',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
