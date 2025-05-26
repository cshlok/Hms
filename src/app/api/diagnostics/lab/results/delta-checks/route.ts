import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';

/**
 * GET /api/diagnostics/lab/results/delta-checks
 * Get delta check configurations
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
    const cacheKey = `diagnostic:lab:delta-checks:${testId || 'all'}:${page}:${pageSize}`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Build query
        let query = `
          SELECT dc.*, lt.test_name, lt.test_code, lt.loinc_code
          FROM laboratory_delta_checks dc
          JOIN laboratory_tests lt ON dc.test_id = lt.id
          WHERE 1=1
        `;
        const params: any[] = [];

        // Add test filter if provided
        if (testId) {
          query += ' AND dc.test_id = ?';
          params.push(testId);
        }

        // Add pagination
        const offset = (page - 1) * pageSize;
        query += ' ORDER BY lt.test_name, dc.time_window DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // Execute query
        const result = await DB.query(query, params);

        // Get total count for pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM laboratory_delta_checks dc
          WHERE 1=1
          ${testId ? ' AND dc.test_id = ?' : ''}
        `;
        const countParams = testId ? [testId] : [];
        const countResult = await DB.query(countQuery, countParams);

        const totalCount = countResult.results[0].total;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'laboratory_delta_checks',
          details: { testId, page, pageSize }
        });

        return {
          deltaChecks: result.results,
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
    console.error('Error in GET /api/diagnostics/lab/results/delta-checks:', error);
    return NextResponse.json({
      error: 'Failed to fetch delta checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/results/delta-checks
 * Create a new delta check configuration
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
    const { 
      testId, 
      absoluteDelta, 
      percentDelta, 
      timeWindow, 
      gender, 
      minAge, 
      maxAge, 
      severity, 
      action 
    } = body;

    // Validate required fields
    if (!testId || (!absoluteDelta && !percentDelta) || !timeWindow) {
      return NextResponse.json({ 
        error: 'Test ID, delta threshold (absolute or percent), and time window are required' 
      }, { status: 400 });
    }

    // Check if test exists
    const testCheck = await DB.query('SELECT id FROM laboratory_tests WHERE id = ?', [testId]);
    if (testCheck.results.length === 0) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check for duplicate delta check configuration
    const duplicateCheck = await DB.query(
      `SELECT id FROM laboratory_delta_checks 
       WHERE test_id = ? 
       AND time_window = ? 
       AND (gender = ? OR gender IS NULL)
       AND (min_age = ? OR min_age IS NULL)
       AND (max_age = ? OR max_age IS NULL)`,
      [testId, timeWindow, gender || null, minAge || null, maxAge || null]
    );

    if (duplicateCheck.results.length > 0) {
      return NextResponse.json({ 
        error: 'A delta check configuration with these parameters already exists' 
      }, { status: 409 });
    }

    // Insert delta check
    const query = `
      INSERT INTO laboratory_delta_checks (
        test_id, absolute_delta, percent_delta, time_window, 
        gender, min_age, max_age, severity, action, 
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      testId,
      absoluteDelta || null,
      percentDelta || null,
      timeWindow,
      gender || null,
      minAge || null,
      maxAge || null,
      severity || 'warning',
      action || 'flag',
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'laboratory_delta_checks',
      resourceId: result.insertId,
      details: body
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:delta-checks:*');

    // Get the created delta check
    const createdDeltaCheck = await DB.query(
      `SELECT dc.*, lt.test_name, lt.test_code, lt.loinc_code
       FROM laboratory_delta_checks dc
       JOIN laboratory_tests lt ON dc.test_id = lt.id
       WHERE dc.id = ?`,
      [result.insertId]
    );

    return NextResponse.json(createdDeltaCheck.results[0], { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/results/delta-checks:', error);
    return NextResponse.json({
      error: 'Failed to create delta check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/diagnostics/lab/results/delta-checks/:id
 * Update a delta check configuration
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
    const { 
      absoluteDelta, 
      percentDelta, 
      timeWindow, 
      gender, 
      minAge, 
      maxAge, 
      severity, 
      action 
    } = body;

    // Check if delta check exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_delta_checks WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Delta check not found' }, { status: 404 });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (absoluteDelta !== undefined) {
      updateFields.push('absolute_delta = ?');
      updateParams.push(absoluteDelta || null);
    }

    if (percentDelta !== undefined) {
      updateFields.push('percent_delta = ?');
      updateParams.push(percentDelta || null);
    }

    if (timeWindow !== undefined) {
      updateFields.push('time_window = ?');
      updateParams.push(timeWindow);
    }

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

    if (severity !== undefined) {
      updateFields.push('severity = ?');
      updateParams.push(severity || 'warning');
    }

    if (action !== undefined) {
      updateFields.push('action = ?');
      updateParams.push(action || 'flag');
    }

    updateFields.push('updated_by = ?');
    updateParams.push(session.user.id);

    updateFields.push('updated_at = NOW()');

    // Add ID to params
    updateParams.push(id);

    // Execute update
    if (updateFields.length > 0) {
      const query = `UPDATE laboratory_delta_checks SET ${updateFields.join(', ')} WHERE id = ?`;
      await DB.query(query, updateParams);

      // Log update
      await auditLog({
        userId: session.user.id,
        action: 'update',
        resource: 'laboratory_delta_checks',
        resourceId: id,
        details: body
      });

      // Invalidate cache
      await CacheInvalidation.invalidatePattern('diagnostic:lab:delta-checks:*');
    }

    // Get the updated delta check
    const updatedDeltaCheck = await DB.query(
      `SELECT dc.*, lt.test_name, lt.test_code, lt.loinc_code
       FROM laboratory_delta_checks dc
       JOIN laboratory_tests lt ON dc.test_id = lt.id
       WHERE dc.id = ?`,
      [id]
    );

    return NextResponse.json(updatedDeltaCheck.results[0]);
  } catch (error) {
    console.error('Error in PUT /api/diagnostics/lab/results/delta-checks/:id:', error);
    return NextResponse.json({
      error: 'Failed to update delta check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/diagnostics/lab/results/delta-checks/:id
 * Delete a delta check configuration
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

    // Check if delta check exists
    const existingCheck = await DB.query('SELECT * FROM laboratory_delta_checks WHERE id = ?', [id]);
    if (existingCheck.results.length === 0) {
      return NextResponse.json({ error: 'Delta check not found' }, { status: 404 });
    }

    // Delete delta check
    await DB.query('DELETE FROM laboratory_delta_checks WHERE id = ?', [id]);

    // Log deletion
    await auditLog({
      userId: session.user.id,
      action: 'delete',
      resource: 'laboratory_delta_checks',
      resourceId: id,
      details: { id }
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:lab:delta-checks:*');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/diagnostics/lab/results/delta-checks/:id:', error);
    return NextResponse.json({
      error: 'Failed to delete delta check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/lab/results/delta-checks/evaluate
 * Evaluate a result against delta check rules
 */
export async function POST_EVALUATE(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      testId, 
      patientId, 
      resultValue, 
      resultUnits, 
      resultDate,
      gender,
      age
    } = body;

    // Validate required fields
    if (!testId || !patientId || resultValue === undefined || !resultUnits) {
      return NextResponse.json({ 
        error: 'Test ID, patient ID, result value, and result units are required' 
      }, { status: 400 });
    }

    // Get applicable delta check rules
    const rulesQuery = `
      SELECT * FROM laboratory_delta_checks
      WHERE test_id = ?
      AND (gender IS NULL OR gender = ?)
      AND (min_age IS NULL OR min_age <= ?)
      AND (max_age IS NULL OR max_age >= ?)
      ORDER BY time_window ASC
    `;

    const rulesResult = await DB.query(rulesQuery, [testId, gender || null, age || 0, age || 999]);
    const deltaRules = rulesResult.results;

    if (deltaRules.length === 0) {
      // No applicable delta check rules
      return NextResponse.json({
        passed: true,
        message: 'No applicable delta check rules found',
        details: null
      });
    }

    // Get previous results for this test and patient
    const previousResultsQuery = `
      SELECT r.*, t.test_name, t.test_code
      FROM laboratory_results r
      JOIN laboratory_tests t ON r.test_id = t.id
      WHERE r.test_id = ? AND r.patient_id = ?
      AND r.result_value IS NOT NULL
      AND r.result_date < ?
      ORDER BY r.result_date DESC
      LIMIT 10
    `;

    const previousResultsResult = await DB.query(previousResultsQuery, [
      testId, 
      patientId, 
      resultDate || new Date().toISOString()
    ]);
    const previousResults = previousResultsResult.results;

    if (previousResults.length === 0) {
      // No previous results to compare against
      return NextResponse.json({
        passed: true,
        message: 'No previous results found for comparison',
        details: null
      });
    }

    // Evaluate delta checks
    const violations = [];

    for (const rule of deltaRules) {
      // Find previous results within the time window
      const timeWindowHours = rule.time_window;
      const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
      const resultDateMs = resultDate ? new Date(resultDate).getTime() : Date.now();
      const cutoffDateMs = resultDateMs - timeWindowMs;

      const applicableResults = previousResults.filter(result => {
        const resultDateMs = new Date(result.result_date).getTime();
        return resultDateMs >= cutoffDateMs;
      });

      if (applicableResults.length === 0) {
        continue; // No results within this time window
      }

      // Compare with the most recent result in the time window
      const previousResult = applicableResults[0];
      
      // Skip if units don't match and we can't convert
      if (previousResult.units !== resultUnits) {
        // In a real system, we would attempt unit conversion here
        continue;
      }

      // Calculate absolute and percent delta
      const currentValue = parseFloat(resultValue);
      const previousValue = parseFloat(previousResult.result_value);
      
      const absoluteDelta = Math.abs(currentValue - previousValue);
      const percentDelta = previousValue !== 0 ? 
        Math.abs((currentValue - previousValue) / previousValue * 100) : 
        100; // If previous value was 0, consider it a 100% change
      
      // Check if delta exceeds thresholds
      let violated = false;
      
      if (rule.absolute_delta !== null && absoluteDelta > rule.absolute_delta) {
        violated = true;
      }
      
      if (rule.percent_delta !== null && percentDelta > rule.percent_delta) {
        violated = true;
      }
      
      if (violated) {
        violations.push({
          rule: rule,
          previousResult: previousResult,
          absoluteDelta,
          percentDelta,
          timeWindowHours: timeWindowHours
        });
        
        // If action is 'block', stop checking further rules
        if (rule.action === 'block') {
          break;
        }
      }
    }

    // Log evaluation
    await auditLog({
      userId: session.user.id,
      action: 'evaluate',
      resource: 'laboratory_delta_checks',
      details: {
        testId,
        patientId,
        resultValue,
        resultUnits,
        violations: violations.length
      }
    });

    if (violations.length === 0) {
      return NextResponse.json({
        passed: true,
        message: 'All delta checks passed',
        details: null
      });
    } else {
      // Return the most severe violation
      const sortedViolations = violations.sort((a, b) => {
        const severityOrder = { critical: 3, high: 2, warning: 1 };
        return severityOrder[b.rule.severity] - severityOrder[a.rule.severity];
      });
      
      const worstViolation = sortedViolations[0];
      
      return NextResponse.json({
        passed: false,
        message: `Delta check violation: ${worstViolation.rule.severity} severity`,
        details: {
          rule: worstViolation.rule,
          previousResult: worstViolation.previousResult,
          absoluteDelta: worstViolation.absoluteDelta,
          percentDelta: worstViolation.percentDelta,
          timeWindowHours: worstViolation.timeWindowHours,
          action: worstViolation.rule.action,
          allViolations: violations
        }
      });
    }
  } catch (error) {
    console.error('Error in POST /api/diagnostics/lab/results/delta-checks/evaluate:', error);
    return NextResponse.json({
      error: 'Failed to evaluate delta checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
