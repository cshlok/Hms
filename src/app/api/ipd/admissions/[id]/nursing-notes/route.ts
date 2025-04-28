import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions/[id]/nursing-notes - Get all nursing notes for an admission
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
    
    // Check if user has permission to view this admission's nursing notes
    const isNurse = session.user.role === 'Nurse';
    const isDoctor = session.user.role === 'Doctor';
    const isAdmin = session.user.role === 'Admin';
    
    if (!isNurse && !isDoctor && !isAdmin) {
      const hasPermission = await session.hasPermission('nursing_notes:view');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get nursing notes
    const nursingNotes = await db.prepare(`
      SELECT nn.*, u.first_name as nurse_first_name, u.last_name as nurse_last_name
      FROM nursing_notes nn
      JOIN users u ON nn.nurse_id = u.id
      WHERE nn.admission_id = ?
      ORDER BY nn.note_date DESC
    `).bind(admissionId).all();
    
    return NextResponse.json({
      admission,
      nursing_notes: nursingNotes.results
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
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is a nurse or has permission to create nursing notes
    const isNurse = session.user.role === 'Nurse';
    if (!isNurse) {
      const hasPermission = await session.hasPermission('nursing_notes:create');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const admissionId = params.id;
    const data = await request.json();
    
    // Validate required fields
    if (!data.notes) {
      return NextResponse.json({ error: 'Missing required field: notes' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Check if admission exists and is active
    const admission = await db.prepare('SELECT id, status FROM admissions WHERE id = ?')
      .bind(admissionId)
      .first();
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add nursing notes to a discharged admission' }, { status: 409 });
    }
    
    // Insert new nursing note
    const result = await db.prepare(`
      INSERT INTO nursing_notes (
        admission_id, nurse_id, note_date, vital_signs, intake_output, medication_given, procedures, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      admissionId,
      session.user.id,
      data.note_date || new Date().toISOString(),
      data.vital_signs || null,
      data.intake_output || null,
      data.medication_given || null,
      data.procedures || null,
      data.notes
    ).run();
    
    // Get the newly created nursing note
    const newNursingNote = await db.prepare(`
      SELECT nn.*, u.first_name as nurse_first_name, u.last_name as nurse_last_name
      FROM nursing_notes nn
      JOIN users u ON nn.nurse_id = u.id
      WHERE nn.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return NextResponse.json(newNursingNote, { status: 201 });
  } catch (error) {
    console.error('Error creating nursing note:', error);
    return NextResponse.json({ error: 'Failed to create nursing note' }, { status: 500 });
  }
}
