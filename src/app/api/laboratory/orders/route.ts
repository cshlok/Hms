import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/laboratory/orders - Get laboratory orders
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Build query
    let query = `
      SELECT o.*, 
        p.first_name || ' ' || p.last_name as patient_name,
        u.first_name || ' ' || u.last_name as doctor_name
      FROM lab_orders o
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN users u ON o.ordering_doctor_id = u.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (patientId) {
      conditions.push('o.patient_id = ?');
      params.push(patientId);
    }
    
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    
    if (source) {
      conditions.push('o.source = ?');
      params.push(source);
    }
    
    if (startDate) {
      conditions.push('o.order_date >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push('o.order_date <= ?');
      params.push(endDate);
    }
    
    // Add role-based filters
    if (session.user.role === 'doctor') {
      conditions.push('o.ordering_doctor_id = ?');
      params.push(session.user.id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY o.order_date DESC';
    
    // Execute query
    const orders = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching laboratory orders:', error);
    return NextResponse.json({ error: 'Failed to fetch laboratory orders' }, { status: 500 });
  }
}

// POST /api/laboratory/orders - Create a new laboratory order
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only doctors, lab staff, and admins can create orders
    const allowedRoles = ['doctor', 'lab_technician', 'lab_manager', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['patient_id', 'source', 'items'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Validate items array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one test or panel' }, { status: 400 });
    }
    
    // Start a transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Insert order
      const orderResult = await db.prepare(`
        INSERT INTO lab_orders (
          patient_id, ordering_doctor_id, status, priority, source, source_reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        body.patient_id,
        body.ordering_doctor_id || (session.user.role === 'doctor' ? session.user.id : null),
        body.status || 'pending',
        body.priority || 'routine',
        body.source,
        body.source_reference || null,
        body.notes || ''
      ).run();
      
      const orderId = orderResult.meta.last_row_id;
      
      // Insert order items
      for (const item of body.items) {
        if (!item.test_id && !item.panel_id) {
          throw new Error('Each item must have either test_id or panel_id');
        }
        
        if (item.test_id && item.panel_id) {
          throw new Error('Item cannot have both test_id and panel_id');
        }
        
        // Get price from test or panel
        let price = 0;
        if (item.test_id) {
          const test = await db.prepare('SELECT price FROM lab_tests WHERE id = ?').bind(item.test_id).first();
          if (!test) {
            throw new Error(`Test with ID ${item.test_id} not found`);
          }
          price = test.price;
        } else {
          const panel = await db.prepare('SELECT price FROM lab_test_panels WHERE id = ?').bind(item.panel_id).first();
          if (!panel) {
            throw new Error(`Panel with ID ${item.panel_id} not found`);
          }
          price = panel.price;
        }
        
        // Apply discount if provided
        const discount = item.discount || 0;
        
        // Insert order item
        await db.prepare(`
          INSERT INTO lab_order_items (
            order_id, test_id, panel_id, price, discount, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          orderId,
          item.test_id || null,
          item.panel_id || null,
          price,
          discount,
          'pending'
        ).run();
      }
      
      // Generate barcode and create sample record if needed
      if (body.create_sample) {
        // Generate unique barcode
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        const barcode = `LAB${timestamp}${random}`;
        
        await db.prepare(`
          INSERT INTO lab_samples (
            order_id, barcode, sample_type, status
          ) VALUES (?, ?, ?, ?)
        `).bind(
          orderId,
          barcode,
          body.sample_type || 'blood',
          'pending'
        ).run();
      }
      
      // Commit transaction
      await db.exec('COMMIT');
      
      // Get the complete order with items
      const order = await db.prepare(`
        SELECT * FROM lab_orders WHERE id = ?
      `).bind(orderId).first();
      
      const items = await db.prepare(`
        SELECT * FROM lab_order_items WHERE order_id = ?
      `).bind(orderId).all();
      
      return NextResponse.json({ ...order, items }, { status: 201 });
    } catch (error) {
      // Rollback transaction on error
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating laboratory order:', error);
    return NextResponse.json({ error: 'Failed to create laboratory order: ' + error.message }, { status: 500 });
  }
}
