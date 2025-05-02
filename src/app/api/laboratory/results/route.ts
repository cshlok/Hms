import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session'; // Using mock session

// Define interfaces for clarity
interface LabResultInput {
  id?: number; // For updates
  order_item_id: number;
  parameter_id?: number | null;
  result_value: string | number;
  is_abnormal?: boolean;
  notes?: string;
  verify?: boolean; // Flag to trigger verification
}

interface LabResult {
  id: number;
  order_item_id: number;
  parameter_id: number | null;
  result_value: string | number;
  is_abnormal: boolean;
  notes: string | null;
  performed_by: number;
  performed_at: string;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  test_id?: number;
  panel_id?: number | null;
  test_name?: string;
  parameter_name?: string;
  unit?: string;
  reference_range_male?: string;
  reference_range_female?: string;
  reference_range_child?: string;
  performed_by_name?: string;
  verified_by_name?: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  test_id: number | null;
  panel_id: number | null;
  status: string;
  // ... other fields
}

// Removed unused interfaces: TestParameter, LabTest

// GET /api/laboratory/results - Get laboratory results
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderItemId = searchParams.get('orderItemId');
    const patientId = searchParams.get('patientId');

    const db = await getDB();
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

    // FIX: Use specific type for params
    const params: (string | number)[] = [];
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

    // Role-based access control - Fixed: Use roleName
    if (session.user.roleName === 'Patient') { // Assuming 'Patient' role name
      conditions.push('o.patient_id = ?');
      params.push(session.user.userId); // Assuming userId is the correct ID
    } else if (session.user.roleName === 'Doctor') { // Assuming 'Doctor' role name
      // Doctors might see results for orders they placed or patients they manage
      // This might need refinement based on exact requirements
      conditions.push('(o.ordering_doctor_id = ? OR o.patient_id IN (SELECT patient_id FROM doctor_patient_assignments WHERE doctor_id = ?))');
      params.push(session.user.userId, session.user.userId);
    }
    // Admins, Lab Staff see all by default if no other filters applied

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC';

    const results = await db.query(query, params);
    return NextResponse.json(results.rows || []);

  } catch (error) {
    console.error('Error fetching laboratory results:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch laboratory results', details: errorMessage }, { status: 500 });
  }
}

// POST /api/laboratory/results - Create or update laboratory results
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fixed: Use roleName and check against expected role names
    const allowedRoles = ['Lab Technician', 'Lab Manager', 'Pathologist', 'Admin']; // Adjust role names as needed
    if (!allowedRoles.includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as LabResultInput;
    const db = await getDB();

    if (body.id) {
      // --- Update existing result ---
      const resultResult = await db.query('SELECT * FROM lab_results WHERE id = ?', [body.id]);
      const existingResult = (resultResult.rows && resultResult.rows.length > 0 ? resultResult.rows[0] : null) as LabResult | null;

      if (!existingResult) {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 });
      }

      const updates: string[] = [];
      // FIX: Use specific type for params
      const params: (string | number | boolean)[] = [];

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
      if (body.verify === true && !existingResult.verified_by) {
        // Fixed: Use roleName
        if (!['Pathologist', 'Lab Manager', 'Admin'].includes(session.user.roleName)) { // Adjust roles as needed
          return NextResponse.json({ error: 'Only Pathologists, Lab Managers, or Admins can verify results' }, { status: 403 });
        }
        updates.push('verified_by = ?', 'verified_at = CURRENT_TIMESTAMP');
        params.push(session.user.userId);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
      }

      params.push(body.id); // Add ID for WHERE clause
      await db.query(`UPDATE lab_results SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

      const updatedResultResult = await db.query('SELECT * FROM lab_results WHERE id = ?', [body.id]);
      const updatedResult = updatedResultResult.rows && updatedResultResult.rows.length > 0 ? updatedResultResult.rows[0] : null;
      return NextResponse.json(updatedResult);

    } else {
      // --- Create new result ---
      const requiredFields: (keyof LabResultInput)[] = ['order_item_id', 'result_value'];
      for (const field of requiredFields) {
        if (body[field] === undefined) {
          return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
        }
      }

      // Mock transaction - replace with real transaction logic if using a capable DB driver
      try {
        const orderItemResult = await db.query('SELECT * FROM lab_order_items WHERE id = ?', [body.order_item_id]);
        const orderItem = (orderItemResult.rows && orderItemResult.rows.length > 0 ? orderItemResult.rows[0] : null) as OrderItem | null;

        if (!orderItem) {
          return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
        }

        if (body.parameter_id) {
          const parameterResult = await db.query('SELECT * FROM lab_test_parameters WHERE id = ? AND test_id = ?', [body.parameter_id, orderItem.test_id]);
          if (!parameterResult.rows || parameterResult.rows.length === 0) {
            return NextResponse.json({ error: 'Parameter does not belong to the test' }, { status: 400 });
          }
        }

        // Insert result (mock DB doesn't return last_row_id reliably)
        await db.query(`
          INSERT INTO lab_results (order_item_id, parameter_id, result_value, is_abnormal, notes, performed_by, performed_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          body.order_item_id,
          body.parameter_id || null,
          body.result_value,
          body.is_abnormal || false,
          body.notes || '',
          session.user.userId
        ]);
        const mockNewResultId = Math.floor(Math.random() * 10000); // Mock ID

        // --- Update Order/Item Status Logic (Needs refinement for mock DB) ---
        let allItemParamsCompleted = false;
        if (orderItem.test_id) {
          const parametersResult = await db.query('SELECT id FROM lab_test_parameters WHERE test_id = ?', [orderItem.test_id]);
          const parameters = parametersResult.rows || [];

          if (parameters.length > 0) {
            // FIX: Cast parameters to the expected type before mapping
            const parameterIds = (parameters as Array<{ id: number }>).map((p) => p.id);
            const resultsCountResult = await db.query(
              `SELECT COUNT(*) as count FROM lab_results WHERE order_item_id = ? AND parameter_id IN (${parameterIds.map(() => '?').join(',')})`,
              [body.order_item_id, ...parameterIds]
            );
            // FIX: Define type for count result
            const resultCount = (resultsCountResult.rows && resultsCountResult.rows.length > 0) ? (resultsCountResult.rows[0] as { count: number }).count : 0;
            if (resultCount >= parameters.length) { // Use >= in case of re-entry
              allItemParamsCompleted = true;
            }
          } else {
            // Test has no defined parameters, so one result completes it
            allItemParamsCompleted = true;
          }
        }

        if (allItemParamsCompleted) {
          await db.query('UPDATE lab_order_items SET status = ? WHERE id = ?', ['completed', body.order_item_id]);
          orderItem.status = 'completed'; // Update local status for next check
        }

        // Check if all items in the order are completed
        const orderItemsResult = await db.query('SELECT status FROM lab_order_items WHERE order_id = ?', [orderItem.order_id]);
        // FIX: Cast rows to expected type before using .every()
        const allOrderItemsCompleted = (orderItemsResult.rows as Array<{ status: string }> || []).every((item) => item.status === 'completed');

        if (allOrderItemsCompleted) {
          await db.query('UPDATE lab_orders SET status = ? WHERE id = ?', ['completed', orderItem.order_id]);

          // Create report if needed (simplified mock logic)
          const reportResult = await db.query('SELECT id FROM lab_reports WHERE order_id = ?', [orderItem.order_id]);
          if (!reportResult.rows || reportResult.rows.length === 0) {
            const reportNumber = `REP${Date.now()}${Math.floor(Math.random() * 100)}`;
            await db.query(
              'INSERT INTO lab_reports (order_id, report_number, generated_by, status) VALUES (?, ?, ?, ?)',
              [orderItem.order_id, reportNumber, session.user.userId, 'preliminary']
            );
          }
        }
        // --- End Status Update Logic ---

        // Fetch the (mock) created result
        const newResultResult = await db.query('SELECT * FROM lab_results WHERE order_item_id = ? ORDER BY created_at DESC LIMIT 1', [body.order_item_id]); // Mock fetch
        const newResult = newResultResult.rows && newResultResult.rows.length > 0 ? newResultResult.rows[0] : { id: mockNewResultId, ...body };

        return NextResponse.json(newResult, { status: 201 });

      } catch (txError) {
        // No real rollback for mock DB
        console.error('Error during result creation transaction:', txError);
        throw txError; // Re-throw to be caught by outer handler
      }
    }
  } catch (error) {
    console.error('Error managing laboratory result:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to manage laboratory result', details: errorMessage }, { status: 500 });
  }
}

