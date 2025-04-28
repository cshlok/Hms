import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/laboratory/tests - Get all laboratory tests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');
    
    // Build query
    let query = 'SELECT t.*, c.name as category_name FROM lab_tests t JOIN lab_test_categories c ON t.category_id = c.id';
    const params: any[] = [];
    
    // Add filters
    const conditions: string[] = [];
    
    if (categoryId) {
      conditions.push('t.category_id = ?');
      params.push(categoryId);
    }
    
    if (isActive !== null) {
      conditions.push('t.is_active = ?');
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.name ASC';
    
    // Execute query
    const tests = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching laboratory tests:', error);
    return NextResponse.json({ error: 'Failed to fetch laboratory tests' }, { status: 500 });
  }
}

// POST /api/laboratory/tests - Create a new laboratory test
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only lab managers and admins can create tests
    if (!['admin', 'lab_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['category_id', 'code', 'name', 'sample_type', 'price'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Insert new test
    const result = await db.prepare(`
      INSERT INTO lab_tests (
        category_id, code, name, description, sample_type, 
        sample_volume, processing_time, price, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.category_id,
      body.code,
      body.name,
      body.description || '',
      body.sample_type,
      body.sample_volume || '',
      body.processing_time || null,
      body.price,
      body.is_active !== undefined ? body.is_active : true
    ).run();
    
    // Get the inserted test
    const test = await db.prepare('SELECT * FROM lab_tests WHERE id = ?').bind(result.meta.last_row_id).first();
    
    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Error creating laboratory test:', error);
    return NextResponse.json({ error: 'Failed to create laboratory test' }, { status: 500 });
  }
}
