import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session';

// Define interface for POST request body
interface VitalSignsInput {
  record_time?: string; // Optional, defaults to now
  temperature?: number | null;
  pulse?: number | null;
  respiratory_rate?: number | null;
  blood_pressure?: string | null; // e.g., "120/80"
  oxygen_saturation?: number | null;
  pain_level?: number | null; // e.g., 0-10
  notes?: string | null;
}

// GET /api/ipd/admissions/[id]/vital-signs - Get all vital signs for an admission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(); // Removed request argument
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const admissionId = params.id;
    
    const db = await getDB(); // Fixed: Await the promise returned by getDB()
    
    // Check if admission exists using db.query
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const admissionResult = await db.query(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `, [admissionId]);
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] : null;
    
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    // Check permissions (using mock session data)
    const isNurse = session.user.roleName === 'Nurse';
    const isDoctor = session.user.roleName === 'Doctor';
    const isAdmin = session.user.roleName === 'Admin';
    // Assuming permissions are correctly populated in the mock session
    const canViewVitals = session.user.permissions?.includes('vital_signs:view') ?? false;
    
    if (!isNurse && !isDoctor && !isAdmin && !canViewVitals) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get vital signs using db.query
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const vitalSignsResult = await db.query(`
      SELECT vs.*, u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name
      FROM vital_signs_records vs
      JOIN users u ON vs.recorded_by = u.id
      WHERE vs.admission_id = ?
      ORDER BY vs.record_time DESC
    `, [admissionId]);
    
    return NextResponse.json({
      admission,
      vital_signs: vitalSignsResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch vital signs', details: errorMessage }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/vital-signs - Create a new vital signs record
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(); // Removed request argument
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check permissions (using mock session data)
    const isNurse = session.user.roleName === 'Nurse';
    const isDoctor = session.user.roleName === 'Doctor';
    // Assuming permissions are correctly populated in the mock session
    const canCreateVitals = session.user.permissions?.includes('vital_signs:create') ?? false;

    if (!isNurse && !isDoctor && !canCreateVitals) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const admissionId = params.id;
    // Fixed: Apply type assertion
    const data = await request.json() as VitalSignsInput;
    
    // Basic validation (using typed data)
    if (!data.temperature && !data.pulse && !data.respiratory_rate && 
        !data.blood_pressure && !data.oxygen_saturation && !data.pain_level) {
      return NextResponse.json({ error: 'At least one vital sign must be provided' }, { status: 400 });
    }
    
    const db = await getDB(); // Fixed: Await the promise returned by getDB()
    
    // Check if admission exists and is active using db.query
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const admissionResult = await db.query('SELECT id, status FROM admissions WHERE id = ?', [admissionId]);
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] as { id: string; status: string } : null;
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add vital signs to a non-active admission' }, { status: 409 }); // Updated error message
    }
    
    // Insert new vital signs record using db.query
    // Mock query doesn't return last_row_id
    await db.query(`
      INSERT INTO vital_signs_records (
        admission_id, recorded_by, record_time, temperature, pulse, respiratory_rate, 
        blood_pressure, oxygen_saturation, pain_level, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      admissionId,
      session.user.userId, // Ensure userId exists on session.user
      data.record_time || new Date().toISOString(),
      data.temperature || null,
      data.pulse || null,
      data.respiratory_rate || null,
      data.blood_pressure || null,
      data.oxygen_saturation || null,
      data.pain_level || null,
      data.notes || null
    ]);
    
    // Cannot reliably get the new record from mock DB
    return NextResponse.json({ message: 'Vital signs recorded (mock operation)' }, { status: 201 });

  } catch (error) {
    console.error('Error creating vital signs record:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to create vital signs record', details: errorMessage }, { status: 500 });
  }
}

