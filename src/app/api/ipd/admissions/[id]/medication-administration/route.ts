import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions/[id]/medication-administration - Get all medication administration records for an admission
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
    
    // Check if user has permission to view this admission's medication records
    const isNurse = session.user.role === 'Nurse';
    const isDoctor = session.user.role === 'Doctor';
    const isAdmin = session.user.role === 'Admin';
    
    if (!isNurse && !isDoctor && !isAdmin) {
      const hasPermission = await session.hasPermission('medication_administration:view');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get medication administration records
    const medicationRecords = await db.prepare(`
      SELECT ma.*, 
             pi.item_name as medication_name, 
             u.first_name as administered_by_first_name, 
             u.last_name as administered_by_last_name
      FROM medication_administration ma
      JOIN pharmacy_inventory pi ON ma.medication_id = pi.id
      JOIN users u ON ma.administered_by = u.id
      WHERE ma.admission_id = ?
      ORDER BY ma.administered_time DESC
    `).bind(admissionId).all();
    
    return NextResponse.json({
      admission,
      medication_administration: medicationRecords.results
    });
  } catch (error) {
    console.error('Error fetching medication administration records:', error);
    return NextResponse.json({ error: 'Failed to fetch medication administration records' }, { status: 500 });
  }
}

// POST /api/ipd/admissions/[id]/medication-administration - Create a new medication administration record
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
    
    // Check if user is a nurse or doctor or has permission to record medication administration
    const isNurse = session.user.role === 'Nurse';
    const isDoctor = session.user.role === 'Doctor';
    if (!isNurse && !isDoctor) {
      const hasPermission = await session.hasPermission('medication_administration:create');
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const admissionId = params.id;
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['medication_id', 'dosage', 'route'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
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
      return NextResponse.json({ error: 'Cannot record medication administration for a discharged admission' }, { status: 409 });
    }
    
    // Check if medication exists in inventory
    const medication = await db.prepare('SELECT id FROM pharmacy_inventory WHERE id = ?')
      .bind(data.medication_id)
      .first();
      
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found in inventory' }, { status: 404 });
    }
    
    // Insert new medication administration record
    const result = await db.prepare(`
      INSERT INTO medication_administration (
        admission_id, medication_id, administered_by, administered_time, dosage, route, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      admissionId,
      data.medication_id,
      session.user.id,
      data.administered_time || new Date().toISOString(),
      data.dosage,
      data.route,
      data.notes || null
    ).run();
    
    // Get the newly created medication administration record
    const newMedicationRecord = await db.prepare(`
      SELECT ma.*, 
             pi.item_name as medication_name, 
             u.first_name as administered_by_first_name, 
             u.last_name as administered_by_last_name
      FROM medication_administration ma
      JOIN pharmacy_inventory pi ON ma.medication_id = pi.id
      JOIN users u ON ma.administered_by = u.id
      WHERE ma.id = ?
    `).bind(result.meta.last_row_id).first();
    
    return NextResponse.json(newMedicationRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating medication administration record:', error);
    return NextResponse.json({ error: 'Failed to create medication administration record' }, { status: 500 });
  }
}
