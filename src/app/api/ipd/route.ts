// Example API route for IPD (Inpatient Department) Management
import { NextRequest } from 'next/server';
import { getDb, initializeDb } from '@/lib/db';
import { z } from 'zod';

// Schema for IPD Admission
const AdmissionSchema = z.object({
  patient_id: z.number(),
  doctor_id: z.number(),
  admission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  expected_discharge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  admission_reason: z.string(),
  admission_notes: z.string().optional(),
  ward_id: z.number(),
  bed_id: z.number(),
  admission_type: z.enum(['Emergency', 'Planned', 'Transfer']),
  package_id: z.number().optional(),
  insurance_id: z.number().optional(),
  insurance_approval_status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  insurance_approval_number: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Get Cloudflare bindings from request context
    const env = (request as any).cf?.env;
    
    // Initialize DB if we have bindings
    if (env && env.DB) {
      initializeDb(env);
    }
    
    // Get DB instance
    const db = getDb();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query conditions
    let conditions = [];
    let params: any[] = [];
    
    if (patientId) {
      conditions.push('a.patient_id = ?');
      params.push(patientId);
    }
    
    if (doctorId) {
      conditions.push('a.doctor_id = ?');
      params.push(doctorId);
    }
    
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    
    if (dateFrom) {
      conditions.push('a.admission_date >= ?');
      params.push(dateFrom);
    }
    
    if (dateTo) {
      conditions.push('a.admission_date <= ?');
      params.push(dateTo);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query to get admissions with patient and doctor names
    const query = `
      SELECT 
        a.admission_id, 
        a.patient_id, 
        p.full_name as patient_name,
        a.doctor_id, 
        d.full_name as doctor_name,
        a.admission_date, 
        a.expected_discharge_date,
        a.actual_discharge_date,
        a.admission_reason,
        a.status,
        a.ward_id,
        w.ward_name,
        a.bed_id,
        b.bed_number,
        a.admission_type
      FROM 
        IPDAdmissions a
      JOIN 
        Patients p ON a.patient_id = p.patient_id
      JOIN 
        Users d ON a.doctor_id = d.user_id
      JOIN 
        Wards w ON a.ward_id = w.ward_id
      JOIN 
        Beds b ON a.bed_id = b.bed_id
      ${whereClause}
      ORDER BY 
        a.admission_date DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const admissions = await db.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(admissions.results), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error fetching IPD admissions:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch IPD admissions', 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare bindings from request context
    const env = (request as any).cf?.env;
    
    // Initialize DB if we have bindings
    if (env && env.DB) {
      initializeDb(env);
    }
    
    // Get DB instance
    const db = getDb();
    
    const data = await request.json();
    
    // Validate input data
    const validationResult = AdmissionSchema.safeParse(data);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input data', 
        details: validationResult.error.format() 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const admissionData = validationResult.data;
    
    // Check if patient exists and is active
    const patientCheck = await db.prepare(
      'SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE'
    ).bind(admissionData.patient_id).first();
    
    if (!patientCheck) {
      return new Response(JSON.stringify({ 
        error: 'Patient not found or inactive' 
      }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check if doctor exists and is active
    const doctorCheck = await db.prepare(`
      SELECT d.doctor_id FROM Doctors d 
      JOIN Users u ON d.user_id = u.user_id 
      WHERE d.doctor_id = ? AND u.is_active = TRUE
    `).bind(admissionData.doctor_id).first();
    
    if (!doctorCheck) {
      return new Response(JSON.stringify({ 
        error: 'Doctor not found or inactive' 
      }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check if bed is available
    const bedCheck = await db.prepare(`
      SELECT bed_id FROM Beds 
      WHERE bed_id = ? AND status = 'Available'
    `).bind(admissionData.bed_id).first();
    
    if (!bedCheck) {
      return new Response(JSON.stringify({ 
        error: 'Bed not available' 
      }), { 
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Begin transaction
    const tx = db.batch([
      // Insert admission record
      db.prepare(`
        INSERT INTO IPDAdmissions (
          patient_id, 
          doctor_id, 
          admission_date, 
          expected_discharge_date, 
          admission_reason, 
          admission_notes, 
          ward_id, 
          bed_id, 
          admission_type, 
          package_id, 
          insurance_id, 
          insurance_approval_status, 
          insurance_approval_number,
          status,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, CURRENT_TIMESTAMP)
      `).bind(
        admissionData.patient_id,
        admissionData.doctor_id,
        admissionData.admission_date,
        admissionData.expected_discharge_date || null,
        admissionData.admission_reason,
        admissionData.admission_notes || null,
        admissionData.ward_id,
        admissionData.bed_id,
        admissionData.admission_type,
        admissionData.package_id || null,
        admissionData.insurance_id || null,
        admissionData.insurance_approval_status || null,
        admissionData.insurance_approval_number || null,
        1 // Assuming user ID 1 for now, should be replaced with actual user ID from session
      ),
      
      // Update bed status to 'Occupied'
      db.prepare(`
        UPDATE Beds SET status = 'Occupied' WHERE bed_id = ?
      `).bind(admissionData.bed_id)
    ]);
    
    const results = await tx.run();
    const admissionId = results[0].meta.last_row_id;
    
    return new Response(JSON.stringify({ 
      message: 'IPD Admission created successfully', 
      admission_id: admissionId 
    }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error creating IPD admission:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create IPD admission', 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
