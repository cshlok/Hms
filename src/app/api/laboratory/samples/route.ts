import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/laboratory/samples - Get laboratory samples
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
    const barcode = searchParams.get('barcode');
    const status = searchParams.get('status');
    
    // Build query
    let query = `
      SELECT s.*, 
        o.patient_id,
        p.first_name || ' ' || p.last_name as patient_name,
        c.first_name || ' ' || c.last_name as collector_name,
        r.first_name || ' ' || r.last_name as receiver_name
      FROM lab_samples s
      JOIN lab_orders o ON s.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN users c ON s.collected_by = c.id
      LEFT JOIN users r ON s.received_by = r.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (orderId) {
      conditions.push('s.order_id = ?');
      params.push(orderId);
    }
    
    if (barcode) {
      conditions.push('s.barcode = ?');
      params.push(barcode);
    }
    
    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    // Execute query
    const samples = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(samples);
  } catch (error) {
    console.error('Error fetching laboratory samples:', error);
    return NextResponse.json({ error: 'Failed to fetch laboratory samples' }, { status: 500 });
  }
}

// POST /api/laboratory/samples - Create or update a laboratory sample
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only lab staff and admins can manage samples
    const allowedRoles = ['lab_technician', 'lab_manager', 'phlebotomist', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Check if this is an update to an existing sample
    if (body.id) {
      // Update existing sample
      const sample = await db.prepare('SELECT * FROM lab_samples WHERE id = ?').bind(body.id).first();
      
      if (!sample) {
        return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
      }
      
      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      
      if (body.status) {
        updates.push('status = ?');
        params.push(body.status);
        
        // If status is changing to 'collected', update collected_by and collected_at
        if (body.status === 'collected' && sample.status !== 'collected') {
          updates.push('collected_by = ?');
          params.push(session.user.id);
          
          updates.push('collected_at = CURRENT_TIMESTAMP');
        }
        
        // If status is changing to 'received', update received_by and received_at
        if (body.status === 'received' && sample.status !== 'received') {
          updates.push('received_by = ?');
          params.push(session.user.id);
          
          updates.push('received_at = CURRENT_TIMESTAMP');
        }
        
        // If status is changing to 'rejected', require rejection_reason
        if (body.status === 'rejected' && !body.rejection_reason) {
          return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }
      }
      
      if (body.rejection_reason) {
        updates.push('rejection_reason = ?');
        params.push(body.rejection_reason);
      }
      
      if (body.notes) {
        updates.push('notes = ?');
        params.push(body.notes);
      }
      
      if (updates.length === 0) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
      }
      
      // Add id to params
      params.push(body.id);
      
      // Execute update
      await db.prepare(`
        UPDATE lab_samples
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(...params).run();
      
      // Get updated sample
      const updatedSample = await db.prepare('SELECT * FROM lab_samples WHERE id = ?').bind(body.id).first();
      
      return NextResponse.json(updatedSample);
    } else {
      // Create new sample
      // Validate required fields
      const requiredFields = ['order_id', 'sample_type'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
        }
      }
      
      // Generate unique barcode
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 1000);
      const barcode = body.barcode || `LAB${timestamp}${random}`;
      
      // Insert new sample
      const result = await db.prepare(`
        INSERT INTO lab_samples (
          order_id, barcode, sample_type, collected_by, collected_at, status, notes
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      `).bind(
        body.order_id,
        barcode,
        body.sample_type,
        session.user.id,
        'collected', // New samples are automatically marked as collected
        body.notes || ''
      ).run();
      
      // Get the inserted sample
      const sample = await db.prepare('SELECT * FROM lab_samples WHERE id = ?').bind(result.meta.last_row_id).first();
      
      return NextResponse.json(sample, { status: 201 });
    }
  } catch (error) {
    console.error('Error managing laboratory sample:', error);
    return NextResponse.json({ error: 'Failed to manage laboratory sample' }, { status: 500 });
  }
}
