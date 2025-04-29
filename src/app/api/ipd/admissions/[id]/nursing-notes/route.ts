import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db'; // Using mock DB
import { getSession } from '@/lib/session';

// Define interface for POST request body
interface NursingNoteInput {
  note_date?: string; // Optional, defaults to now
  vital_signs?: string | null; // Assuming string, could be JSON
  intake_output?: string | null; // Assuming string, could be JSON
  medication_given?: string | null; // Assuming string, could be JSON
  procedures?: string | null;
  notes: string; // Required
}

// GET /api/ipd/admissions/[id]/nursing-notes - Get all nursing notes for an admission
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
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] : null;
    
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    // Check permissions (using mock session data)
    const isNurse = session.user.roleName === 'Nurse';
    const isDoctor = session.user.roleName === 'Doctor';
    const isAdmin = session.user.roleName === 'Admin';
    const canViewNotes = session.user.permissions.includes('nursing_notes:view');
    
    if (!isNurse && !isDoctor && !isAdmin && !canViewNotes) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get nursing notes using db.query
    const nursingNotesResult = await db.query(`
      SELECT nn.*, u.first_name as nurse_first_name, u.last_name as nurse_last_name
      FROM nursing_notes nn
      JOIN users u ON nn.nurse_id = u.id
      WHERE nn.admission_id = ?
      ORDER BY nn.note_date DESC
    `, [admissionId]);
    
    return NextResponse.json({
      admission,
      nursing_notes: nursingNotesResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching nursing notes:', error);
    return NextResponse.json({ error: 'Failed to fetch nursing notes' }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/nursing-notes - Create a new nursing note
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
    const canCreateNotes = session.user.permissions.includes('nursing_notes:create');

    if (!isNurse && !canCreateNotes) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const admissionId = params.id;
    // Fixed: Apply type assertion
    const data = await request.json() as NursingNoteInput;
    
    // Basic validation (using typed data)
    if (!data.notes) {
      return NextResponse.json({ error: 'Missing required field: notes' }, { status: 400 });
    }
    
    const db = getDB(); // Get mock DB
    
    // Check if admission exists and is active using db.query
    const admissionResult = await db.query('SELECT id, status FROM admissions WHERE id = ?', [admissionId]);
    const admission = admissionResult.rows && admissionResult.rows.length > 0 ? admissionResult.rows[0] as { id: string; status: string } : null;
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add nursing notes to a discharged admission' }, { status: 409 });
    }
    
    // Insert new nursing note using db.query
    // Mock query doesn't return last_row_id
    await db.query(`
      INSERT INTO nursing_notes (
        admission_id, nurse_id, note_date, vital_signs, intake_output, medication_given, procedures, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      admissionId,
      session.user.userId, // Changed from session.user.id
      data.note_date || new Date().toISOString(),
      data.vital_signs || null,
      data.intake_output || null,
      data.medication_given || null,
      data.procedures || null,
      data.notes
    ]);
    
    // Cannot reliably get the new record from mock DB
    return NextResponse.json({ message: 'Nursing note created (mock operation)' }, { status: 201 });

  } catch (error) {
    console.error('Error creating nursing note:', error);
    return NextResponse.json({ error: 'Failed to create nursing note' }, { status: 500 });
  }
}

