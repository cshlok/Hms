// Example API route for IPD (Inpatient Department) Management
import { NextRequest } from 'next/server';
import { getDb, initializeDb } from '@/lib/db'; // Using mock DB
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
    // Initialize DB (mock function)
    await initializeDb(); // Removed env argument
    
    // Get DB instance
    const db = await getDb(); // Fixed: Await the promise returned by getDb()
    
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
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    
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
    
    // Query to get admissions with patient and doctor names (using mock db.query)
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
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
    
    const admissionsResult = await db.query(query, params);
    
    return new Response(JSON.stringify(admissionsResult.rows || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error fetching IPD admissions:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch IPD admissions', 
      details: errorMessage
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize DB (mock function)
    await initializeDb(); // Removed env argument
    
    // Get DB instance
    const db = await getDb(); // Fixed: Await the promise returned by getDb()
    
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
    
    // Mock checks (replace with actual DB queries later)
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const patientCheckResult = await db.query('SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE', [admissionData.patient_id]);
    const patientCheck = patientCheckResult.rows && patientCheckResult.rows.length > 0;
    
    if (!patientCheck) {
      return new Response(JSON.stringify({ error: 'Patient not found or inactive' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    
    const doctorCheckResult = await db.query('SELECT d.doctor_id FROM Doctors d JOIN Users u ON d.user_id = u.user_id WHERE d.doctor_id = ? AND u.is_active = TRUE', [admissionData.doctor_id]);
    const doctorCheck = doctorCheckResult.rows && doctorCheckResult.rows.length > 0;
    
    if (!doctorCheck) {
      return new Response(JSON.stringify({ error: 'Doctor not found or inactive' }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    
    const bedCheckResult = await db.query('SELECT bed_id FROM Beds WHERE bed_id = ? AND status = \'Available\'', [admissionData.bed_id]);
    const bedCheck = bedCheckResult.rows && bedCheckResult.rows.length > 0;
    
    if (!bedCheck) {
      return new Response(JSON.stringify({ error: 'Bed not available' }), { status: 409, headers: { "Content-Type": "application/json" } });
    }
    
    // Mock transaction using sequential queries
    try {
      // Insert admission record
      // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
      await db.query(`
        INSERT INTO IPDAdmissions (
          patient_id, doctor_id, admission_date, expected_discharge_date, admission_reason, 
          admission_notes, ward_id, bed_id, admission_type, package_id, insurance_id, 
          insurance_approval_status, insurance_approval_number, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, CURRENT_TIMESTAMP)
      `, [
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
        1 // Mock user ID
      ]);
      
      // Update bed status
      // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
      await db.query('UPDATE Beds SET status = \'Occupied\' WHERE bed_id = ?', [admissionData.bed_id]);

      // Cannot get last_row_id from mock db.query
      const mockAdmissionId = Math.floor(Math.random() * 10000);

      return new Response(JSON.stringify({ 
        message: 'IPD Admission created successfully (mock operation)', 
        admission_id: mockAdmissionId 
      }), { 
        status: 201,
        headers: { "Content-Type": "application/json" }
      });

    } catch (txError) {
        console.error('Error during mock transaction:', txError);
        // No rollback needed for mock DB
        const errorMessage = txError instanceof Error ? txError.message : String(txError);
        return new Response(JSON.stringify({ error: 'Failed during admission creation database operations', details: errorMessage }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
  } catch (error) {
    console.error('Error creating IPD admission:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create IPD admission', 
      details: errorMessage
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

