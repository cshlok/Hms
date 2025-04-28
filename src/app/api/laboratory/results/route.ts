import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/laboratory/results - Get laboratory results
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderItemId = searchParams.get('orderItemId');
    const patientId = searchParams.get('patientId');
    
    // Build query
    let query = `
      SELECT r.*, 
        oi.test_id, oi.panel_id,
        t.name as test_name,
        p.name as parameter_name,
        p.unit, p.reference_range_male, p.reference_range_female, p.reference_range_child,
        u1.first_name || ' ' || u1.last_name as performed_by_name,
        u2.first_name || ' ' || u2.last_name as verified_by_name
      FROM lab_results r
      JOIN lab_order_items oi ON r.order_item_id = oi.id
      JOIN lab_orders o ON oi.order_id = o.id
      LEFT JOIN lab_tests t ON oi.test_id = t.id
      LEFT JOIN lab_test_parameters p ON r.parameter_id = p.id
      LEFT JOIN users u1 ON r.performed_by = u1.id
      LEFT JOIN users u2 ON r.verified_by = u2.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (orderItemId) {
      conditions.push('r.order_item_id = ?');
      params.push(orderItemId);
    }
    
    if (orderId) {
      conditions.push('oi.order_id = ?');
      params.push(orderId);
    }
    
    if (patientId) {
      conditions.push('o.patient_id = ?');
      params.push(patientId);
    }
    
    // Role-based access control
    if (session.user.role === 'patient') {
      conditions.push('o.patient_id = ?');
      params.push(session.user.id);
    } else if (session.user.role === 'doctor') {
      conditions.push('o.ordering_doctor_id = ?');
      params.push(session.user.id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    // Execute query
    const results = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching laboratory results:', error);
    return NextResponse.json({ error: 'Failed to fetch laboratory results' }, { status: 500 });
  }
}

// POST /api/laboratory/results - Create or update laboratory results
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only lab staff and pathologists can manage results
    const allowedRoles = ['lab_technician', 'lab_manager', 'pathologist', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Check if this is an update to an existing result
    if (body.id) {
      // Update existing result
      const result = await db.prepare('SELECT * FROM lab_results WHERE id = ?').bind(body.id).first();
      
      if (!result) {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 });
      }
      
      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      
      if (body.result_value !== undefined) {
        updates.push('result_value = ?');
        params.push(body.result_value);
      }
      
      if (body.is_abnormal !== undefined) {
        updates.push('is_abnormal = ?');
        params.push(body.is_abnormal);
      }
      
      if (body.notes !== undefined) {
        updates.push('notes = ?');
        params.push(body.notes);
      }
      
      // Handle verification
      if (body.verify === true && !result.verified_by) {
        // Only pathologists and lab managers can verify results
        if (!['pathologist', 'lab_manager'].includes(session.user.role)) {
          return NextResponse.json({ error: 'Only pathologists and lab managers can verify results' }, { status: 403 });
        }
        
        updates.push('verified_by = ?');
        params.push(session.user.id);
        
        updates.push('verified_at = CURRENT_TIMESTAMP');
      }
      
      if (updates.length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
      }
      
      // Add id to params
      params.push(body.id);
      
      // Execute update
      await db.prepare(`
        UPDATE lab_results
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(...params).run();
      
      // Get updated result
      const updatedResult = await db.prepare('SELECT * FROM lab_results WHERE id = ?').bind(body.id).first();
      
      return NextResponse.json(updatedResult);
    } else {
      // Create new result
      // Validate required fields
      const requiredFields = ['order_item_id', 'result_value'];
      for (const field of requiredFields) {
        if (body[field] === undefined) {
          return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
        }
      }
      
      // Start transaction
      await db.exec('BEGIN TRANSACTION');
      
      try {
        // Get order item
        const orderItem = await db.prepare('SELECT * FROM lab_order_items WHERE id = ?').bind(body.order_item_id).first();
        
        if (!orderItem) {
          return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
        }
        
        // If parameter_id is provided, validate it belongs to the test
        if (body.parameter_id) {
          const parameter = await db.prepare('SELECT * FROM lab_test_parameters WHERE id = ? AND test_id = ?')
            .bind(body.parameter_id, orderItem.test_id).first();
          
          if (!parameter) {
            return NextResponse.json({ error: 'Parameter does not belong to the test' }, { status: 400 });
          }
        }
        
        // Insert result
        const resultInsert = await db.prepare(`
          INSERT INTO lab_results (
            order_item_id, parameter_id, result_value, is_abnormal, notes, performed_by, performed_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          body.order_item_id,
          body.parameter_id || null,
          body.result_value,
          body.is_abnormal || false,
          body.notes || '',
          session.user.id
        ).run();
        
        // Update order item status if all parameters have results
        if (orderItem.test_id) {
          const test = await db.prepare('SELECT * FROM lab_tests WHERE id = ?').bind(orderItem.test_id).first();
          
          // Get parameters for this test
          const parameters = await db.prepare('SELECT * FROM lab_test_parameters WHERE test_id = ?').bind(orderItem.test_id).all();
          
          // If test has parameters, check if all have results
          if (parameters.results.length > 0) {
            const parameterIds = parameters.results.map(p => p.id);
            
            // Count results for these parameters
            const resultCount = await db.prepare(`
              SELECT COUNT(*) as count FROM lab_results 
              WHERE order_item_id = ? AND parameter_id IN (${parameterIds.map(() => '?').join(',')})
            `).bind(body.order_item_id, ...parameterIds).first();
            
            // If all parameters have results, update order item status
            if (resultCount.count === parameters.results.length) {
              await db.prepare('UPDATE lab_order_items SET status = ? WHERE id = ?')
                .bind('completed', body.order_item_id).run();
            }
          } else {
            // If test has no parameters, this single result completes it
            await db.prepare('UPDATE lab_order_items SET status = ? WHERE id = ?')
              .bind('completed', body.order_item_id).run();
          }
        }
        
        // Check if all items in the order are completed
        const orderItems = await db.prepare('SELECT * FROM lab_order_items WHERE order_id = ?').bind(orderItem.order_id).all();
        const allCompleted = orderItems.results.every(item => item.status === 'completed');
        
        if (allCompleted) {
          // Update order status
          await db.prepare('UPDATE lab_orders SET status = ? WHERE id = ?')
            .bind('completed', orderItem.order_id).run();
          
          // Create report if it doesn't exist
          const existingReport = await db.prepare('SELECT * FROM lab_reports WHERE order_id = ?').bind(orderItem.order_id).first();
          
          if (!existingReport) {
            // Generate report number
            const timestamp = new Date().getTime();
            const reportNumber = `REP${timestamp}${Math.floor(Math.random() * 1000)}`;
            
            await db.prepare(`
              INSERT INTO lab_reports (
                order_id, report_number, generated_by, status
              ) VALUES (?, ?, ?, ?)
            `).bind(
              orderItem.order_id,
              reportNumber,
              session.user.id,
              'preliminary'
            ).run();
          }
        }
        
        // Commit transaction
        await db.exec('COMMIT');
        
        // Get the inserted result
        const result = await db.prepare('SELECT * FROM lab_results WHERE id = ?').bind(resultInsert.meta.last_row_id).first();
        
        return NextResponse.json(result, { status: 201 });
      } catch (error) {
        // Rollback on error
        await db.exec('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    console.error('Error managing laboratory result:', error);
    return NextResponse.json({ error: 'Failed to manage laboratory result: ' + error.message }, { status: 500 });
  }
}
