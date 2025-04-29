import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session';

// Define interface for POST request body
interface ProgressNoteInput {
  note_date?: string; // Optional, defaults to now
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// GET /api/ipd/admissions/[id]/progress-notes - Get all progress notes for an admission
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
    
    const db = getDB(); // Get mock DB
    
    // Check if admission exists using db.query
    const admissionResult = await db.query(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `, [admissionId]);
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] as { id: string; primary_doctor_id: number } : null;
    
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    // Check permissions (using mock session data)
    const isDoctor = session.user.roleName === 'Doctor';
    const isNurse = session.user.roleName === 'Nurse';
    const isAdmin = session.user.roleName === 'Admin';
    const canViewAll = session.user.permissions.includes('progress_notes:view_all');
    const canViewOwn = session.user.permissions.includes('progress_notes:view');

    let forbidden = false;
    if (isDoctor && admission.primary_doctor_id !== session.user.userId && !canViewAll) {
      forbidden = true;
    }
    if (!isDoctor && !isNurse && !isAdmin && !canViewOwn) { // Allow Nurse/Admin/Viewer by default unless specific check fails
        forbidden = true;
    }
    // Add more specific checks if needed

    if (forbidden) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get progress notes using db.query
    const progressNotesResult = await db.query(`
      SELECT pn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM progress_notes pn
      JOIN users u ON pn.doctor_id = u.id
      WHERE pn.admission_id = ?
      ORDER BY pn.note_date DESC
    `, [admissionId]);
    
    return NextResponse.json({
      admission,
      progress_notes: progressNotesResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    return NextResponse.json({ error: 'Failed to fetch progress notes' }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/progress-notes - Create a new progress note
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
    const isDoctor = session.user.roleName === 'Doctor';
    const canCreate = session.user.permissions.includes('progress_notes:create');
    const canCreateAll = session.user.permissions.includes('progress_notes:create_all');

    if (!isDoctor && !canCreate) { // Must be doctor or have general create permission
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const admissionId = params.id;
    // Fixed: Apply type assertion
    const data = await request.json() as ProgressNoteInput;
    
    // Basic validation (using typed data)
    const requiredFields: (keyof ProgressNoteInput)[] = ['subjective', 'objective', 'assessment', 'plan'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = getDB(); // Get mock DB
    
    // Check if admission exists and is active using db.query
    const admissionResult = await db.query('SELECT id, status, primary_doctor_id FROM admissions WHERE id = ?', [admissionId]);
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] as { id: string; status: string; primary_doctor_id: number } : null;
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add progress notes to a discharged admission' }, { status: 409 });
    }
    
    // If user is a doctor, check if they are the primary doctor for this admission or have override permission
    if (isDoctor && admission.primary_doctor_id !== session.user.userId && !canCreateAll) {
        return NextResponse.json({ error: 'You are not authorized to add progress notes for this patient' }, { status: 403 });
    }
    
    // Insert new progress note using db.query
    // Mock query doesn't return last_row_id
    await db.query(`
      INSERT INTO progress_notes (
        admission_id, doctor_id, note_date, subjective, objective, assessment, plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      admissionId,
      session.user.userId, // Changed from session.user.id
      data.note_date || new Date().toISOString(),
      data.subjective,
      data.objective,
      data.assessment,
      data.plan
    ]);
    
    // Cannot reliably get the new record from mock DB
    return NextResponse.json({ message: 'Progress note created (mock operation)' }, { status: 201 });

  } catch (error) {
    console.error('Error creating progress note:', error);
    return NextResponse.json({ error: 'Failed to create progress note' }, { status: 500 });
  }
}

