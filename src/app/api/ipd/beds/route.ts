import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session';

// Define interface for POST request body
interface BedInput {
  bed_number: string;
  room_number: string;
  ward: string;
  category: string;
  price_per_day: number;
  status?: string; // Optional, defaults to 'available'
  features?: string | null;
}

// GET /api/ipd/beds - Get all beds with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(); // Removed request argument
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const ward = searchParams.get('ward');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    
    const db = getDB(); // Get mock DB
    
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
    
    // Use db.query instead of db.prepare
    const bedsResult = await db.query(query, params);
    
    return NextResponse.json(bedsResult.rows || []);
  } catch (error) {
    console.error('Error fetching beds:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch beds', details: errorMessage }, { status: 500 });
  }
}

// POST /api/ipd/beds - Create a new bed
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(); // Removed request argument
    
    // Check authentication and permissions
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check permissions (using mock session data)
    const canCreateBed = session.user.permissions.includes('bed:create');
    if (!canCreateBed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fixed: Apply type assertion
    const data = await request.json() as BedInput;
    
    // Basic validation (using typed data)
    const requiredFields: (keyof BedInput)[] = ['bed_number', 'room_number', 'ward', 'category', 'price_per_day'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = getDB(); // Get mock DB
    
    // Check if bed number already exists using db.query
    const existingBedResult = await db.query('SELECT id FROM beds WHERE bed_number = ? AND room_number = ?', [data.bed_number, data.room_number]);
    const existingBed = existingBedResult.rows && existingBedResult.rows.length > 0 ? existingBedResult.rows[0] : null;
      
    if (existingBed) {
      return NextResponse.json({ error: 'Bed number already exists in this room' }, { status: 409 });
    }
    
    // Insert new bed using db.query
    // Mock query doesn't return last_row_id
    await db.query(`
      INSERT INTO beds (bed_number, room_number, ward, category, status, price_per_day, features)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.bed_number,
      data.room_number,
      data.ward,
      data.category,
      data.status || 'available',
      data.price_per_day,
      data.features || null
    ]);
    
    // Cannot reliably get the new record from mock DB
    return NextResponse.json({ message: 'Bed created (mock operation)' }, { status: 201 });

  } catch (error) {
    console.error('Error creating bed:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to create bed', details: errorMessage }, { status: 500 });
  }
}

