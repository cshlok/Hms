// Example API route using the new database access pattern
import { NextRequest } from 'next/server';
import { getDb, initializeDb } from '@/lib/db';
import { z } from 'zod';

// Schema for patient data validation
const PatientSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["Male", "Female", "Other"]),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  contact_number: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  allergies: z.string().optional(),
  medical_history: z.string().optional()
});

export async function GET(request: NextRequest, { params }: { params: { id?: string } }) {
  try {
    // Get Cloudflare bindings from request context
    const env = (request as any).cf?.env;
    
    // Initialize DB if we have bindings
    if (env && env.DB) {
      initializeDb(env);
    }
    
    // Get DB instance
    const db = getDb();
    
    // Check if we're fetching a specific patient or listing patients
    if (params.id) {
      const patient = await db.prepare(
        "SELECT * FROM Patients WHERE patient_id = ?"
      ).bind(params.id).first();
      
      if (!patient) {
        return new Response(JSON.stringify({ error: "Patient not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify(patient), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // Get query parameters for pagination
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");
      const search = searchParams.get("search") || "";
      
      // Build query based on search parameter
      let query = "SELECT * FROM Patients";
      let params: any[] = [];
      
      if (search) {
        query += " WHERE full_name LIKE ? OR contact_number LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      
      const patients = await db.prepare(query).bind(...params).all();
      
      return new Response(JSON.stringify(patients.results), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error("Error fetching patients:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch patients", 
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
    
    // Parse and validate request body
    const data = await request.json();
    const validationResult = PatientSchema.safeParse(data);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid patient data", 
        details: validationResult.error.format() 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const patientData = validationResult.data;
    
    // Insert patient record
    const result = await db.prepare(`
      INSERT INTO Patients (
        full_name, 
        gender, 
        date_of_birth, 
        contact_number, 
        email, 
        address, 
        emergency_contact, 
        blood_group, 
        allergies, 
        medical_history,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      patientData.full_name,
      patientData.gender,
      patientData.date_of_birth,
      patientData.contact_number || null,
      patientData.email || null,
      patientData.address || null,
      patientData.emergency_contact || null,
      patientData.blood_group || null,
      patientData.allergies || null,
      patientData.medical_history || null
    ).run();
    
    const patientId = result.meta.last_row_id;
    
    return new Response(JSON.stringify({ 
      message: "Patient created successfully", 
      patient_id: patientId 
    }), { 
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to create patient", 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
