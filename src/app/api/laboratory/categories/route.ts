import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/laboratory/categories - Get all laboratory test categories
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Execute query
    const categories = await db.prepare('SELECT * FROM lab_test_categories ORDER BY name ASC').all();
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching laboratory test categories:', error);
    return NextResponse.json({ error: 'Failed to fetch laboratory test categories' }, { status: 500 });
  }
}

// POST /api/laboratory/categories - Create a new laboratory test category
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only lab managers and admins can create categories
    if (!['admin', 'lab_manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    
    // Insert new category
    const result = await db.prepare(`
      INSERT INTO lab_test_categories (name, description)
      VALUES (?, ?)
    `).bind(
      body.name,
      body.description || ''
    ).run();
    
    // Get the inserted category
    const category = await db.prepare('SELECT * FROM lab_test_categories WHERE id = ?').bind(result.meta.last_row_id).first();
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating laboratory test category:', error);
    return NextResponse.json({ error: 'Failed to create laboratory test category' }, { status: 500 });
  }
}
