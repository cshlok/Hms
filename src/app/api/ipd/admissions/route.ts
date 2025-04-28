import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/ipd/admissions - Get all admissions with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const doctorId = searchParams.get('doctor_id');
    const status = searchParams.get('status');
    
    const db = await getDB();
    
    let query = `
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, 
      u.first_name as doctor_first_name, u.last_name as doctor_last_name,
      b.bed_number, b.room_number, b.ward
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.primary_doctor_id = u.id
      JOIN beds b ON a.bed_id = b.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (patientId) {
      query += ' AND a.patient_id = ?';
      params.push(patientId);
    }
    
    if (doctorId) {
      query += ' AND a.primary_doctor_id = ?';
      params.push(doctorId);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    // If user is a doctor, only show their patients
    if (session.user.role === 'Doctor') {
      query += ' AND a.primary_doctor_id = ?';
      params.push(session.user.id);
    }
    
    query += ' ORDER BY a.admission_date DESC';
    
    const admissions = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(admissions.results);
  } catch (error) {
    console.error('Error fetching admissions:', error);
    return NextResponse.json({ error: 'Failed to fetch admissions' }, { status: 500 });
  }
}

// POST /api/ipd/admissions - Create a new admission
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    // Check authentication and permissions
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to create admissions
    const hasPermission = await session.hasPermission('admission:create');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['patient_id', 'admission_date', 'admission_type', 'primary_doctor_id', 'bed_id', 'diagnosis'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    const db = await getDB();
    
    // Check if patient exists
    const patient = await db.prepare('SELECT id FROM patients WHERE id = ?')
      .bind(data.patient_id)
      .first();
      
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if doctor exists
    const doctor = await db.prepare('SELECT id FROM users WHERE id = ? AND role = ?')
      .bind(data.primary_doctor_id, 'Doctor')
      .first();
      
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    
    // Check if bed exists and is available
    const bed = await db.prepare('SELECT id, status FROM beds WHERE id = ?')
      .bind(data.bed_id)
      .first();
      
    if (!bed) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }
    
    if (bed.status !== 'available') {
      return NextResponse.json({ error: 'Bed is not available' }, { status: 409 });
    }
    
    // Generate admission number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the last admission number for this month
    const lastAdmission = await db.prepare(`
      SELECT admission_number FROM admissions 
      WHERE admission_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).bind(`ADM-${year}${month}-%`).first();
    
    let admissionNumber;
    if (lastAdmission) {
      const lastNumber = parseInt(lastAdmission.admission_number.split('-')[2]);
      admissionNumber = `ADM-${year}${month}-${(lastNumber + 1).toString().padStart(4, '0')}`;
    } else {
      admissionNumber = `ADM-${year}${month}-0001`;
    }
    
    // Begin transaction
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Update bed status to occupied
      await db.prepare('UPDATE beds SET status = ? WHERE id = ?')
        .bind('occupied', data.bed_id)
        .run();
      
      // Insert new admission
      const result = await db.prepare(`
        INSERT INTO admissions (
          patient_id, admission_number, admission_date, admission_type, 
          primary_doctor_id, bed_id, diagnosis, estimated_stay, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.patient_id,
        admissionNumber,
        data.admission_date,
        data.admission_type,
        data.primary_doctor_id,
        data.bed_id,
        data.diagnosis,
        data.estimated_stay || null,
        'active'
      ).run();
      
      // Commit transaction
      await db.exec('COMMIT');
      
      // Get the newly created admission
      const newAdmission = await db.prepare(`
        SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, 
        u.first_name as doctor_first_name, u.last_name as doctor_last_name,
        b.bed_number, b.room_number, b.ward
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON a.primary_doctor_id = u.id
        JOIN beds b ON a.bed_id = b.id
        WHERE a.id = ?
      `).bind(result.meta.last_row_id).first();
      
      return NextResponse.json(newAdmission, { status: 201 });
    } catch (error) {
      // Rollback transaction on error
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating admission:', error);
    return NextResponse.json({ error: 'Failed to create admission' }, { status: 500 });
  }
}
