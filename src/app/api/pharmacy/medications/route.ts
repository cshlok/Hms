import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/pharmacy/medications
// Query parameters:
// - search: Search by generic name, brand name, or item code
// - category_id: Filter by category
// - manufacturer_id: Filter by manufacturer
// - prescription_required: Filter by prescription requirement (true/false)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category_id = searchParams.get('category_id');
    const manufacturer_id = searchParams.get('manufacturer_id');
    const prescription_required = searchParams.get('prescription_required');
    
    const db = await getDB();
    
    // Build the query
    let query = `
      SELECT 
        m.id,
        m.item_code,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.route,
        m.unit_of_measure,
        m.prescription_required,
        m.narcotic,
        m.description,
        mc.id as category_id,
        mc.name as category_name,
        mfr.id as manufacturer_id,
        mfr.name as manufacturer_name,
        (
          SELECT SUM(current_quantity) 
          FROM inventory_batches 
          WHERE medication_id = m.id AND current_quantity > 0
        ) as total_stock
      FROM medications m
      LEFT JOIN medication_categories mc ON m.category_id = mc.id
      LEFT JOIN manufacturers mfr ON m.manufacturer_id = mfr.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add filters
    if (search) {
      query += ` AND (m.generic_name LIKE ? OR m.brand_name LIKE ? OR m.item_code LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category_id) {
      query += ` AND mc.id = ?`;
      params.push(category_id);
    }
    
    if (manufacturer_id) {
      query += ` AND mfr.id = ?`;
      params.push(manufacturer_id);
    }
    
    if (prescription_required === 'true') {
      query += ` AND m.prescription_required = 1`;
    } else if (prescription_required === 'false') {
      query += ` AND m.prescription_required = 0`;
    }
    
    // Order by generic name
    query += ` ORDER BY m.generic_name ASC`;
    
    // Execute the query
    const result = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json({
      medications: result.results || []
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 });
  }
}

// POST /api/pharmacy/medications
// Create a new medication
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has pharmacy admin role
    const hasPermission = session.user.roles.some(role => 
      ['admin', 'pharmacy_admin'].includes(role)
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'generic_name', 'dosage_form', 'strength', 'unit_of_measure'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if item_code already exists
    if (data.item_code) {
      const itemCodeExists = await db.prepare(
        `SELECT id FROM medications WHERE item_code = ?`
      ).bind(data.item_code).first();
      
      if (itemCodeExists) {
        return NextResponse.json({ error: 'Item code already exists' }, { status: 409 });
      }
    } else {
      // Generate a unique item code if not provided
      // Format: First 2 letters of generic name + random 4 digits
      const prefix = data.generic_name.substring(0, 2).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      data.item_code = `${prefix}${randomNum}`;
    }
    
    // Validate category_id if provided
    if (data.category_id) {
      const categoryExists = await db.prepare(
        `SELECT id FROM medication_categories WHERE id = ?`
      ).bind(data.category_id).first();
      
      if (!categoryExists) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }
    
    // Validate manufacturer_id if provided
    if (data.manufacturer_id) {
      const manufacturerExists = await db.prepare(
        `SELECT id FROM manufacturers WHERE id = ?`
      ).bind(data.manufacturer_id).first();
      
      if (!manufacturerExists) {
        return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
      }
    }
    
    // Generate a unique ID for the medication
    const medicationId = `med_${Date.now()}`;
    
    // Insert the new medication
    await db.prepare(`
      INSERT INTO medications (
        id, item_code, generic_name, brand_name, category_id, manufacturer_id,
        dosage_form, strength, route, unit_of_measure, prescription_required,
        narcotic, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      medicationId,
      data.item_code,
      data.generic_name,
      data.brand_name || null,
      data.category_id || null,
      data.manufacturer_id || null,
      data.dosage_form,
      data.strength,
      data.route || null,
      data.unit_of_measure,
      data.prescription_required || false,
      data.narcotic || false,
      data.description || null
    ).run();
    
    // Fetch the created medication with category and manufacturer details
    const createdMedication = await db.prepare(`
      SELECT 
        m.id,
        m.item_code,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.route,
        m.unit_of_measure,
        m.prescription_required,
        m.narcotic,
        m.description,
        mc.id as category_id,
        mc.name as category_name,
        mfr.id as manufacturer_id,
        mfr.name as manufacturer_name
      FROM medications m
      LEFT JOIN medication_categories mc ON m.category_id = mc.id
      LEFT JOIN manufacturers mfr ON m.manufacturer_id = mfr.id
      WHERE m.id = ?
    `).bind(medicationId).first();
    
    return NextResponse.json(createdMedication, { status: 201 });
  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json({ error: 'Failed to create medication' }, { status: 500 });
  }
}
