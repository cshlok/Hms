import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/beds - Get all beds with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const ward = searchParams.get('ward');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    
    const db = await getDB();
    
    let query = 'SELECT * FROM beds WHERE 1=1';
    const params: any[] = [];
    
    if (ward) {
      query += ' AND ward = ?';
      params.push(ward);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ward, room_number, bed_number';
    
    const beds = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(beds.results);
  } catch (error) {
    console.error('Error fetching beds:', error);
    return NextResponse.json({ error: 'Failed to fetch beds' }, { status: 500 });
  }
}

// POST /api/ipd/beds - Create a new bed
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication and permissions
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to create beds
    const hasPermission = await session.hasPermission('bed:create');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['bed_number', 'room_number', 'ward', 'category', 'price_per_day'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if bed number already exists
    const existingBed = await db.prepare('SELECT id FROM beds WHERE bed_number = ? AND room_number = ?')
      .bind(data.bed_number, data.room_number)
      .first();
      
    if (existingBed) {
      return NextResponse.json({ error: 'Bed number already exists in this room' }, { status: 409 });
    }
    
    // Insert new bed
    const result = await db.prepare(`
      INSERT INTO beds (bed_number, room_number, ward, category, status, price_per_day, features)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.bed_number,
      data.room_number,
      data.ward,
      data.category,
      data.status || 'available',
      data.price_per_day,
      data.features || null
    ).run();
    
    // Get the newly created bed
    const newBed = await db.prepare('SELECT * FROM beds WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
    
    return NextResponse.json(newBed, { status: 201 });
  } catch (error) {
    console.error('Error creating bed:', error);
    return NextResponse.json({ error: 'Failed to create bed' }, { status: 500 });
  }
}
