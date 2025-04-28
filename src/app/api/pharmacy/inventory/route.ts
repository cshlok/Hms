import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/pharmacy/inventory
// Query parameters:
// - medication_id: Filter by medication
// - category_id: Filter by category
// - expiry_before: Filter by expiry date (before)
// - expiry_after: Filter by expiry date (after)
// - in_stock: Filter by stock availability (true/false)
// - low_stock: Filter by low stock (true/false)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const medication_id = searchParams.get('medication_id');
    const category_id = searchParams.get('category_id');
    const expiry_before = searchParams.get('expiry_before');
    const expiry_after = searchParams.get('expiry_after');
    const in_stock = searchParams.get('in_stock');
    const low_stock = searchParams.get('low_stock');
    
    const db = await getDB();
    
    // Build the query
    let query = `
      SELECT 
        ib.id as batch_id,
        ib.batch_number,
        ib.expiry_date,
        ib.manufacturing_date,
        ib.purchase_date,
        ib.purchase_price,
        ib.selling_price,
        ib.initial_quantity,
        ib.current_quantity,
        ib.supplier,
        ib.storage_location,
        m.id as medication_id,
        m.item_code,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.unit_of_measure,
        mc.id as category_id,
        mc.name as category_name,
        mfr.id as manufacturer_id,
        mfr.name as manufacturer_name
      FROM inventory_batches ib
      JOIN medications m ON ib.medication_id = m.id
      LEFT JOIN medication_categories mc ON m.category_id = mc.id
      LEFT JOIN manufacturers mfr ON m.manufacturer_id = mfr.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add filters
    if (medication_id) {
      query += ` AND m.id = ?`;
      params.push(medication_id);
    }
    
    if (category_id) {
      query += ` AND mc.id = ?`;
      params.push(category_id);
    }
    
    if (expiry_before) {
      query += ` AND ib.expiry_date <= ?`;
      params.push(expiry_before);
    }
    
    if (expiry_after) {
      query += ` AND ib.expiry_date >= ?`;
      params.push(expiry_after);
    }
    
    if (in_stock === 'true') {
      query += ` AND ib.current_quantity > 0`;
    } else if (in_stock === 'false') {
      query += ` AND ib.current_quantity = 0`;
    }
    
    if (low_stock === 'true') {
      // Assuming low stock is less than 20% of initial quantity
      query += ` AND ib.current_quantity > 0 AND ib.current_quantity < (ib.initial_quantity * 0.2)`;
    }
    
    // Order by expiry date (soonest first)
    query += ` ORDER BY ib.expiry_date ASC`;
    
    // Execute the query
    const result = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json({
      inventory: result.results || []
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST /api/pharmacy/inventory
// Create a new inventory batch
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has pharmacy admin or pharmacist role
    const hasPermission = session.user.roles.some(role => 
      ['admin', 'pharmacy_admin', 'pharmacist'].includes(role)
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'medication_id', 'batch_number', 'expiry_date', 'purchase_date',
      'purchase_price', 'selling_price', 'initial_quantity'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Validate expiry date is in the future
    const expiryDate = new Date(data.expiry_date);
    if (expiryDate <= new Date()) {
      return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 });
    }
    
    // Validate quantities are positive numbers
    if (data.initial_quantity <= 0) {
      return NextResponse.json({ error: 'Initial quantity must be a positive number' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Check if medication exists
    const medicationExists = await db.prepare(
      `SELECT id FROM medications WHERE id = ?`
    ).bind(data.medication_id).first();
    
    if (!medicationExists) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }
    
    // Check if batch number already exists for this medication
    const batchExists = await db.prepare(
      `SELECT id FROM inventory_batches WHERE medication_id = ? AND batch_number = ?`
    ).bind(data.medication_id, data.batch_number).first();
    
    if (batchExists) {
      return NextResponse.json({ error: 'Batch number already exists for this medication' }, { status: 409 });
    }
    
    // Generate a unique ID for the batch
    const batchId = `batch_${Date.now()}`;
    
    // Insert the new batch
    await db.prepare(`
      INSERT INTO inventory_batches (
        id, medication_id, batch_number, expiry_date, manufacturing_date,
        purchase_date, purchase_price, selling_price, initial_quantity,
        current_quantity, supplier, invoice_number, storage_location, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      batchId,
      data.medication_id,
      data.batch_number,
      data.expiry_date,
      data.manufacturing_date || null,
      data.purchase_date,
      data.purchase_price,
      data.selling_price,
      data.initial_quantity,
      data.initial_quantity, // current_quantity starts as initial_quantity
      data.supplier || null,
      data.invoice_number || null,
      data.storage_location || 'Main Pharmacy',
      data.notes || null
    ).run();
    
    // Record the transaction
    const transactionId = `trans_${Date.now()}`;
    await db.prepare(`
      INSERT INTO inventory_transactions (
        id, batch_id, transaction_type, quantity, reference_type,
        reference_id, user_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      batchId,
      'purchase',
      data.initial_quantity,
      'purchase',
      data.invoice_number || null,
      session.user.id,
      `Initial stock entry for batch ${data.batch_number}`
    ).run();
    
    // Fetch the created batch with medication details
    const createdBatch = await db.prepare(`
      SELECT 
        ib.id as batch_id,
        ib.batch_number,
        ib.expiry_date,
        ib.manufacturing_date,
        ib.purchase_date,
        ib.purchase_price,
        ib.selling_price,
        ib.initial_quantity,
        ib.current_quantity,
        ib.supplier,
        ib.storage_location,
        m.id as medication_id,
        m.item_code,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.unit_of_measure
      FROM inventory_batches ib
      JOIN medications m ON ib.medication_id = m.id
      WHERE ib.id = ?
    `).bind(batchId).first();
    
    return NextResponse.json(createdBatch, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory batch:', error);
    return NextResponse.json({ error: 'Failed to create inventory batch' }, { status: 500 });
  }
}
