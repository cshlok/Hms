import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions/[id]/discharge - Get discharge summary for an admission
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
    
    // Check if user has permission to view this admission's discharge summary
    const isDoctor = session.user.role === 'Doctor';
    const isNurse = session.user.role === 'Nurse';
    const isAdmin = session.user.role === 'Admin';
    
    if (!isDoctor && !isNurse && !isAdmin) {
      const hasPermission = await session.hasPermission('discharge_summary:view');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get discharge summary
    const dischargeSummary = await db.prepare(`
      SELECT ds.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM discharge_summaries ds
      JOIN users u ON ds.doctor_id = u.id
      WHERE ds.admission_id = ?
    `).bind(admissionId).first();
    
    return NextResponse.json({
      admission,
      discharge_summary: dischargeSummary || null
    });
  } catch (error) {
    console.error('Error fetching discharge summary:', error);
    return NextResponse.json({ error: 'Failed to fetch discharge summary' }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/discharge - Create a discharge summary and discharge the patient
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
    
    // Check if user is a doctor or has permission to create discharge summaries
    const isDoctor = session.user.role === 'Doctor';
    if (!isDoctor) {
      const hasPermission = await session.hasPermission('discharge_summary:create');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const admissionId = params.id;
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['discharge_diagnosis', 'treatment_summary', 'medications'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if admission exists and is active
    const admission = await db.prepare(`
      SELECT a.*, b.id as bed_id
      FROM admissions a
      JOIN beds b ON a.bed_id = b.id
      WHERE a.id = ?
    `).bind(admissionId).first();
      
    if (!admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }
    
    if (admission.status !== 'active') {
      return NextResponse.json({ error: 'Patient is already discharged' }, { status: 409 });
    }
    
    // If user is a doctor, check if they are the primary doctor for this admission
    if (isDoctor && admission.primary_doctor_id !== session.user.id) {
      const hasPermission = await session.hasPermission('discharge_summary:create_all');
      if (!hasPermission) {
        return NextResponse.json({ error: 'You are not authorized to discharge this patient' }, { status: 403 });
      }
    }
    
    // Begin transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Update admission status to discharged
      await db.prepare(`
        UPDATE admissions 
        SET status = 'discharged', discharge_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        data.discharge_date || new Date().toISOString(),
        admissionId
      ).run();
      
      // Update bed status to available
      await db.prepare(`
        UPDATE beds
        SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(admission.bed_id).run();
      
      // Insert discharge summary
      const result = await db.prepare(`
        INSERT INTO discharge_summaries (
          admission_id, discharge_date, discharge_diagnosis, treatment_summary, 
          medications, follow_up, home_care_instructions, doctor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        admissionId,
        data.discharge_date || new Date().toISOString(),
        data.discharge_diagnosis,
        data.treatment_summary,
        data.medications,
        data.follow_up || null,
        data.home_care_instructions || null,
        session.user.id
      ).run();
      
      // Commit transaction
      await db.exec('COMMIT');
      
      // Get the newly created discharge summary
      const newDischargeSummary = await db.prepare(`
        SELECT ds.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM discharge_summaries ds
        JOIN users u ON ds.doctor_id = u.id
        WHERE ds.id = ?
      `).bind(result.meta.last_row_id).first();
      
      return NextResponse.json({
        message: 'Patient successfully discharged',
        discharge_summary: newDischargeSummary
      }, { status: 201 });
    } catch (error) {
      // Rollback transaction on error
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating discharge summary:', error);
    return NextResponse.json({ error: 'Failed to create discharge summary' }, { status: 500 });
  }
}
