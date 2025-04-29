import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Assuming db returns a promise
import { getSession, Session } from '@/lib/session';

// Define interfaces for data structures
interface Medication {
  id: string;
  item_code: string;
  generic_name: string;
  brand_name?: string | null;
  dosage_form: string;
  strength: string;
  route?: string | null;
  unit_of_measure: string;
  prescription_required: boolean;
  narcotic: boolean;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  manufacturer_id?: string | null;
  manufacturer_name?: string | null;
  total_stock?: number | null; // Calculated field
}

interface MedicationPostData {
  item_code?: string; // Optional, can be generated
  generic_name: string;
  brand_name?: string | null;
  category_id?: string | null;
  manufacturer_id?: string | null;
  dosage_form: string;
  strength: string;
  route?: string | null;
  unit_of_measure: string;
  prescription_required?: boolean;
  narcotic?: boolean;
  description?: string | null;
}
// Define interfaces for data structures

// GET /api/pharmacy/medications
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession() as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category_id = searchParams.get('category_id');
    const manufacturer_id = searchParams.get('manufacturer_id');
    const prescription_required = searchParams.get('prescription_required');

    const db = await getDB();

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

    const params: (string | number)[] = [];

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

    query += ` ORDER BY m.generic_name ASC`;

    // Execute the query - Adjust based on actual db library return type
    // Assuming .all() returns { results: T[] } or similar
    const result = await db.prepare(query).bind(...params).all();

    return NextResponse.json({
      medications: result.results || [] // Adapt based on actual return structure
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching medications:', error);
    return NextResponse.json({ error: `Failed to fetch medications: ${message}` }, { status: 500 });
  }
}

// POST /api/pharmacy/medications
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession() as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = ["admin", "pharmacy_admin"].includes(session!.user!.roleName); // Added non-null assertions

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json() as MedicationPostData;

    const requiredFields: (keyof MedicationPostData)[] = [
      'generic_name', 'dosage_form', 'strength', 'unit_of_measure'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const db = await getDB();
    let itemCode = data.item_code;

    if (itemCode) {
      const itemCodeExists = await db.prepare(
        `SELECT id FROM medications WHERE item_code = ?`
      ).bind(itemCode).first();

      if (itemCodeExists) {
        return NextResponse.json({ error: 'Item code already exists' }, { status: 409 });
      }
    } else {
      const prefix = data.generic_name.substring(0, 2).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      itemCode = `${prefix}${randomNum}`;
      // TODO: Add check to ensure generated itemCode is unique, potentially loop until unique
    }

    if (data.category_id) {
      const categoryExists = await db.prepare(
        `SELECT id FROM medication_categories WHERE id = ?`
      ).bind(data.category_id).first();

      if (!categoryExists) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    if (data.manufacturer_id) {
      const manufacturerExists = await db.prepare(
        `SELECT id FROM manufacturers WHERE id = ?`
      ).bind(data.manufacturer_id).first();

      if (!manufacturerExists) {
        return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
      }
    }

    const medicationId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await db.prepare(`
      INSERT INTO medications (
        id, item_code, generic_name, brand_name, category_id, manufacturer_id,
        dosage_form, strength, route, unit_of_measure, prescription_required,
        narcotic, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      medicationId,
      itemCode,
      data.generic_name,
      data.brand_name || null,
      data.category_id || null,
      data.manufacturer_id || null,
      data.dosage_form,
      data.strength,
      data.route || null,
      data.unit_of_measure,
      data.prescription_required ?? false, // Use ?? for boolean default
      data.narcotic ?? false,
      data.description || null
    ).run();

    // Fetch the created medication - Adjust based on actual db library return type
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

    if (!createdMedication) {
        // This shouldn't happen if insert succeeded, but good practice to check
        return NextResponse.json({ error: 'Failed to retrieve created medication' }, { status: 500 });
    }

    return NextResponse.json(createdMedication, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error creating medication:', error);
    return NextResponse.json({ error: `Failed to create medication: ${message}` }, { status: 500 });
  }
}

