import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session';

// Define interface for POST request body
interface CategoryInput {
  name: string;
  description?: string;
}

// GET /api/laboratory/categories - Get all laboratory test categories
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = getDB(); // Get mock DB
    
    // Execute query using db.query
    const categoriesResult = await db.query('SELECT * FROM lab_test_categories ORDER BY name ASC');
    
    return NextResponse.json(categoriesResult.rows || []);
  } catch (error) {
    console.error('Error fetching laboratory test categories:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to fetch laboratory test categories', details: errorMessage }, { status: 500 });
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
    
    // Check permissions (using mock session data)
    const canCreateCategory = session.user.permissions.includes('lab_category:create') || session.user.roleName === 'Admin' || session.user.roleName === 'Lab Manager'; // Adjusted roles/permissions
    if (!canCreateCategory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body with type assertion
    const body = await request.json() as CategoryInput;
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }
    
    const db = getDB(); // Get mock DB
    
    // Insert new category using db.query
    // Mock query doesn't return last_row_id
    await db.query(`
      INSERT INTO lab_test_categories (name, description)
      VALUES (?, ?)
    `, [
      body.name,
      body.description || ''
    ]);
    
    // Cannot reliably get the new record from mock DB
    return NextResponse.json({ message: 'Category created (mock operation)' }, { status: 201 });

  } catch (error) {
    console.error('Error creating laboratory test category:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'Failed to create laboratory test category', details: errorMessage }, { status: 500 });
  }
}

