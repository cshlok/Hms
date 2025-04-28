import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/pharmacy/prescriptions
// Query parameters:
// - patient_id: Filter by patient
// - doctor_id: Filter by doctor
// - status: Filter by status (pending, dispensed, partially_dispensed, cancelled)
// - source: Filter by source (OPD, IPD)
// - date_from: Filter by prescription date (from)
// - date_to: Filter by prescription date (to)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    const doctor_id = searchParams.get('doctor_id');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    
    const db = await getDB();
    
    // Build the query
    let query = `
      SELECT 
        p.id,
        p.prescription_number,
        p.prescription_date,
        p.source,
        p.source_id,
        p.status,
        p.notes,
        pt.id as patient_id,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        u.id as doctor_id,
        u.first_name as doctor_first_name,
        u.last_name as doctor_last_name,
        (
          SELECT COUNT(*) 
          FROM prescription_items 
          WHERE prescription_id = p.id
        ) as item_count
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users u ON p.doctor_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add filters
    if (patient_id) {
      query += ` AND p.patient_id = ?`;
      params.push(patient_id);
    }
    
    if (doctor_id) {
      query += ` AND p.doctor_id = ?`;
      params.push(doctor_id);
    }
    
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    
    if (source) {
      query += ` AND p.source = ?`;
      params.push(source);
    }
    
    if (date_from) {
      query += ` AND p.prescription_date >= ?`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND p.prescription_date <= ?`;
      params.push(date_to);
    }
    
    // Order by prescription date (newest first)
    query += ` ORDER BY p.prescription_date DESC`;
    
    // Execute the query
    const result = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json({
      prescriptions: result.results || []
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 });
  }
}

// POST /api/pharmacy/prescriptions
// Create a new prescription
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has doctor role
    const hasPermission = session.user.roles.some(role => 
      ['admin', 'doctor'].includes(role)
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Only doctors can create prescriptions' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'patient_id', 'source', 'items'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Validate items array
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: 'Prescription must contain at least one item' }, { status: 400 });
    }
    
    for (const item of data.items) {
      const itemRequiredFields = ['medication_id', 'dosage', 'frequency', 'duration', 'quantity'];
      for (const field of itemRequiredFields) {
        if (!item[field]) {
          return NextResponse.json({ error: `Missing required field in prescription item: ${field}` }, { status: 400 });
        }
      }
      
      // Validate quantity is a positive number
      if (item.quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if patient exists
    const patientExists = await db.prepare(
      `SELECT id FROM patients WHERE id = ?`
    ).bind(data.patient_id).first();
    
    if (!patientExists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Validate source
    if (!['OPD', 'IPD'].includes(data.source)) {
      return NextResponse.json({ error: 'Invalid source. Must be OPD or IPD' }, { status: 400 });
    }
    
    // Validate source_id if provided
    if (data.source_id) {
      if (data.source === 'OPD') {
        const appointmentExists = await db.prepare(
          `SELECT id FROM appointments WHERE id = ?`
        ).bind(data.source_id).first();
        
        if (!appointmentExists) {
          return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }
      } else if (data.source === 'IPD') {
        const admissionExists = await db.prepare(
          `SELECT id FROM admissions WHERE id = ?`
        ).bind(data.source_id).first();
        
        if (!admissionExists) {
          return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
        }
      }
    }
    
    // Generate a unique ID for the prescription
    const prescriptionId = `presc_${Date.now()}`;
    
    // Generate a prescription number (format: PRSC-YYYYMMDD-XXXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prescriptionNumber = `PRSC-${dateStr}-${randomNum}`;
    
    // Start a transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Insert the prescription
      await db.prepare(`
        INSERT INTO prescriptions (
          id, prescription_number, patient_id, doctor_id, prescription_date,
          source, source_id, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        prescriptionId,
        prescriptionNumber,
        data.patient_id,
        session.user.id, // doctor_id is the current user
        data.prescription_date || new Date().toISOString(),
        data.source,
        data.source_id || null,
        'pending',
        data.notes || null
      ).run();
      
      // Insert prescription items
      for (const item of data.items) {
        const itemId = `prescitem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Check if medication exists
        const medicationExists = await db.prepare(
          `SELECT id FROM medications WHERE id = ?`
        ).bind(item.medication_id).first();
        
        if (!medicationExists) {
          throw new Error(`Medication not found: ${item.medication_id}`);
        }
        
        await db.prepare(`
          INSERT INTO prescription_items (
            id, prescription_id, medication_id, dosage, frequency,
            duration, quantity, instructions, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          itemId,
          prescriptionId,
          item.medication_id,
          item.dosage,
          item.frequency,
          item.duration,
          item.quantity,
          item.instructions || null,
          'pending'
        ).run();
      }
      
      // Commit the transaction
      await db.exec('COMMIT');
      
      // Fetch the created prescription with items
      const createdPrescription = await db.prepare(`
        SELECT 
          p.id,
          p.prescription_number,
          p.prescription_date,
          p.source,
          p.source_id,
          p.status,
          p.notes,
          pt.id as patient_id,
          pt.first_name as patient_first_name,
          pt.last_name as patient_last_name,
          u.id as doctor_id,
          u.first_name as doctor_first_name,
          u.last_name as doctor_last_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ?
      `).bind(prescriptionId).first();
      
      // Fetch prescription items
      const prescriptionItems = await db.prepare(`
        SELECT 
          pi.id,
          pi.dosage,
          pi.frequency,
          pi.duration,
          pi.quantity,
          pi.dispensed_quantity,
          pi.instructions,
          pi.status,
          m.id as medication_id,
          m.generic_name,
          m.brand_name,
          m.dosage_form,
          m.strength,
          m.unit_of_measure
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = ?
      `).bind(prescriptionId).all();
      
      return NextResponse.json({
        ...createdPrescription,
        items: prescriptionItems.results || []
      }, { status: 201 });
    } catch (error) {
      // Rollback the transaction in case of error
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json({ error: 'Failed to create prescription: ' + error.message }, { status: 500 });
  }
}
