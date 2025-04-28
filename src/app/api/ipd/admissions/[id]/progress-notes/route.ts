import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions/[id]/progress-notes - Get all progress notes for an admission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const admissionId = params.id;
    
    const db = await getDB();
    
    // Check if admission exists and user has access
    const admission = await db.prepare(`
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `).bind(admissionId).first();
    
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    // Check if user has permission to view this admission's progress notes
    const isDoctor = session.user.role === 'Doctor';
    const isNurse = session.user.role === 'Nurse';
    const isAdmin = session.user.role === 'Admin';
    
    if (isDoctor && admission.primary_doctor_id !== session.user.id) {
      const hasPermission = await session.hasPermission('progress_notes:view_all');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    if (isNurse) {
      const hasPermission = await session.hasPermission('progress_notes:view');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get progress notes
    const progressNotes = await db.prepare(`
      SELECT pn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM progress_notes pn
      JOIN users u ON pn.doctor_id = u.id
      WHERE pn.admission_id = ?
      ORDER BY pn.note_date DESC
    `).bind(admissionId).all();
    
    return NextResponse.json({
      admission,
      progress_notes: progressNotes.results
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
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is a doctor or has permission to create progress notes
    const isDoctor = session.user.role === 'Doctor';
    if (!isDoctor) {
      const hasPermission = await session.hasPermission('progress_notes:create');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const admissionId = params.id;
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['subjective', 'objective', 'assessment', 'plan'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if admission exists and is active
    const admission = await db.prepare('SELECT id, status, primary_doctor_id FROM admissions WHERE id = ?')
      .bind(admissionId)
      .first();
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add progress notes to a discharged admission' }, { status: 409 });
    }
    
    // If user is a doctor, check if they are the primary doctor for this admission
    if (isDoctor && admission.primary_doctor_id !== session.user.id) {
      const hasPermission = await session.hasPermission('progress_notes:create_all');
      if (!hasPermission) {
        return NextResponse.json({ error: 'You are not authorized to add progress notes for this patient' }, { status: 403 });
      }
    }
    
    // Insert new progress note
    const result = await db.prepare(`
      INSERT INTO progress_notes (
        admission_id, doctor_id, note_date, subjective, objective, assessment, plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      admissionId,
      session.user.id,
      data.note_date || new Date().toISOString(),
      data.subjective,
      data.objective,
      data.assessment,
      data.plan
    ).run();
    
    // Get the newly created progress note
    const newProgressNote = await db.prepare(`
      SELECT pn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM progress_notes pn
      JOIN users u ON pn.doctor_id = u.id
      WHERE pn.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return NextResponse.json(newProgressNote, { status: 201 });
  } catch (error) {
    console.error('Error creating progress note:', error);
    return NextResponse.json({ error: 'Failed to create progress note' }, { status: 500 });
  }
}
