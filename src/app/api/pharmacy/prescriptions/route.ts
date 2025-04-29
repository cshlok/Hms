import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Assuming db returns a promise
import { getSession, SessionData } from '@/lib/session'; // Assuming SessionData is defined

// Define interfaces
interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed_quantity?: number; // Optional, might not be present initially
  instructions?: string | null;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  // Fields from joined medication table
  generic_name?: string;
  brand_name?: string | null;
  dosage_form?: string;
  strength?: string;
  unit_of_measure?: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  prescription_date: string; // ISO date string
  source: 'OPD' | 'IPD';
  source_id?: string | null;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  notes?: string | null;
  patient_id: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_id: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  item_count?: number; // Calculated field
  items?: PrescriptionItem[]; // Added for POST response
}

interface PrescriptionItemPostData {
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string | null;
}

interface PrescriptionPostData {
  patient_id: string;
  source: 'OPD' | 'IPD';
  source_id?: string | null;
  prescription_date?: string; // Optional, defaults to now
  notes?: string | null;
  items: PrescriptionItemPostData[];
}

// Assuming SessionData includes user with roles
interface AuthenticatedSession extends SessionData {
  user: {
    id: string;
    roles: string[];
    // Add other user properties if needed
  };
}

// GET /api/pharmacy/prescriptions
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request) as AuthenticatedSession | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    const doctor_id = searchParams.get('doctor_id');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const db = await getDB();

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

    const params: (string | number)[] = [];

    if (patient_id) {
      query += ` AND p.patient_id = ?`;
      params.push(patient_id);
    }

    if (doctor_id) {
      query += ` AND p.doctor_id = ?`;
      params.push(doctor_id);
    }

    if (status) {
      // Basic validation for status
      if (['pending', 'dispensed', 'partially_dispensed', 'cancelled'].includes(status)) {
        query += ` AND p.status = ?`;
        params.push(status);
      }
    }

    if (source) {
      if (['OPD', 'IPD'].includes(source)) {
        query += ` AND p.source = ?`;
        params.push(source);
      }
    }

    if (date_from) {
      // Basic validation for date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(date_from)) {
        query += ` AND p.prescription_date >= ?`;
        params.push(date_from);
      }
    }

    if (date_to) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
        query += ` AND p.prescription_date <= ?`;
        params.push(date_to);
      }
    }

    query += ` ORDER BY p.prescription_date DESC`;

    const result = await db.prepare(query).bind(...params).all<Omit<Prescription, 'items'>>();

    return NextResponse.json({
      prescriptions: result.results || []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json({ error: `Failed to fetch prescriptions: ${message}` }, { status: 500 });
  }
}

// POST /api/pharmacy/prescriptions
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request) as AuthenticatedSession | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasPermission = session.user.roles.some(role =>
      ['admin', 'doctor'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: Only doctors or admins can create prescriptions' }, { status: 403 });
    }

    const data = await request.json() as PrescriptionPostData;

    const requiredFields: (keyof PrescriptionPostData)[] = [
      'patient_id', 'source', 'items'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: 'Prescription must contain at least one item' }, { status: 400 });
    }

    for (const item of data.items) {
      const itemRequiredFields: (keyof PrescriptionItemPostData)[] = ['medication_id', 'dosage', 'frequency', 'duration', 'quantity'];
      for (const field of itemRequiredFields) {
        if (!item[field]) {
          return NextResponse.json({ error: `Missing required field in prescription item: ${field}` }, { status: 400 });
        }
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
      }
    }

    const db = await getDB();

    const patientExists = await db.prepare(
      `SELECT id FROM patients WHERE id = ?`
    ).bind(data.patient_id).first<{ id: string }>();

    if (!patientExists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (!['OPD', 'IPD'].includes(data.source)) {
      return NextResponse.json({ error: 'Invalid source. Must be OPD or IPD' }, { status: 400 });
    }

    if (data.source_id) {
      const sourceTable = data.source === 'OPD' ? 'appointments' : 'admissions';
      const sourceExists = await db.prepare(
        `SELECT id FROM ${sourceTable} WHERE id = ?`
      ).bind(data.source_id).first<{ id: string }>();

      if (!sourceExists) {
        return NextResponse.json({ error: `${data.source} record not found` }, { status: 404 });
      }
    }

    const prescriptionId = `presc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prescriptionNumber = `PRSC-${dateStr}-${randomNum}`;

    // Use transaction
    await db.exec('BEGIN TRANSACTION');

    try {
      await db.prepare(`
        INSERT INTO prescriptions (
          id, prescription_number, patient_id, doctor_id, prescription_date,
          source, source_id, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        prescriptionId,
        prescriptionNumber,
        data.patient_id,
        session.user.id,
        data.prescription_date || new Date().toISOString().split('T')[0], // Use YYYY-MM-DD format
        data.source,
        data.source_id || null,
        'pending',
        data.notes || null
      ).run();

      for (const item of data.items) {
        const itemId = `prescitem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const medicationExists = await db.prepare(
          `SELECT id FROM medications WHERE id = ?`
        ).bind(item.medication_id).first<{ id: string }>();

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

      await db.exec('COMMIT');

      // Fetch the created prescription with details
      const createdPrescription = await db.prepare(`
        SELECT
          p.id, p.prescription_number, p.prescription_date, p.source, p.source_id,
          p.status, p.notes, pt.id as patient_id, pt.first_name as patient_first_name,
          pt.last_name as patient_last_name, u.id as doctor_id,
          u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ?
      `).bind(prescriptionId).first<Omit<Prescription, 'items'>>();

      if (!createdPrescription) {
        throw new Error('Failed to retrieve created prescription details');
      }

      // Fetch prescription items with medication details
      const prescriptionItemsResult = await db.prepare(`
        SELECT
          pi.id, pi.dosage, pi.frequency, pi.duration, pi.quantity,
          pi.dispensed_quantity, pi.instructions, pi.status, m.id as medication_id,
          m.generic_name, m.brand_name, m.dosage_form, m.strength, m.unit_of_measure
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = ?
      `).bind(prescriptionId).all<PrescriptionItem>();

      const responseData: Prescription = {
        ...createdPrescription,
        items: prescriptionItemsResult.results || []
      };

      return NextResponse.json(responseData, { status: 201 });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error; // Rethrow to be caught by the outer catch block
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error creating prescription:', error);
    return NextResponse.json({ error: `Failed to create prescription: ${message}` }, { status: 500 });
  }
}

