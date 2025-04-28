import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions/[id]/vital-signs - Get all vital signs for an admission
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
    
    // Check if user has permission to view this admission's vital signs
    const isNurse = session.user.role === 'Nurse';
    const isDoctor = session.user.role === 'Doctor';
    const isAdmin = session.user.role === 'Admin';
    
    if (!isNurse && !isDoctor && !isAdmin) {
      const hasPermission = await session.hasPermission('vital_signs:view');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get vital signs
    const vitalSigns = await db.prepare(`
      SELECT vs.*, u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name
      FROM vital_signs_records vs
      JOIN users u ON vs.recorded_by = u.id
      WHERE vs.admission_id = ?
      ORDER BY vs.record_time DESC
    `).bind(admissionId).all();
    
    return NextResponse.json({
      admission,
      vital_signs: vitalSigns.results
    });
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    return NextResponse.json({ error: 'Failed to fetch vital signs' }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/vital-signs - Create a new vital signs record
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
    
    // Check if user is a nurse or doctor or has permission to create vital signs
    const isNurse = session.user.role === 'Nurse';
    const isDoctor = session.user.role === 'Doctor';
    if (!isNurse && !isDoctor) {
      const hasPermission = await session.hasPermission('vital_signs:create');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const admissionId = params.id;
    const data = await request.json();
    
    // Validate at least one vital sign is provided
    if (!data.temperature && !data.pulse && !data.respiratory_rate && 
        !data.blood_pressure && !data.oxygen_saturation && !data.pain_level) {
      return NextResponse.json({ error: 'At least one vital sign must be provided' }, { status: 400 });
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
      return NextResponse.json({ error: 'Cannot add vital signs to a discharged admission' }, { status: 409 });
    }
    
    // Insert new vital signs record
    const result = await db.prepare(`
      INSERT INTO vital_signs_records (
        admission_id, recorded_by, record_time, temperature, pulse, respiratory_rate, 
        blood_pressure, oxygen_saturation, pain_level, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      admissionId,
      session.user.id,
      data.record_time || new Date().toISOString(),
      data.temperature || null,
      data.pulse || null,
      data.respiratory_rate || null,
      data.blood_pressure || null,
      data.oxygen_saturation || null,
      data.pain_level || null,
      data.notes || null
    ).run();
    
    // Get the newly created vital signs record
    const newVitalSigns = await db.prepare(`
      SELECT vs.*, u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name
      FROM vital_signs_records vs
      JOIN users u ON vs.recorded_by = u.id
      WHERE vs.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return NextResponse.json(newVitalSigns, { status: 201 });
  } catch (error) {
    console.error('Error creating vital signs record:', error);
    return NextResponse.json({ error: 'Failed to create vital signs record' }, { status: 500 });
  }
}
