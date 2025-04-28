// src/app/api/patients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * GET /api/patients
 * Retrieves a list of patients, potentially filtered by search term.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { env } = getRequestContext();
    
    // Build the SQL query based on search parameter
    let sql = `
      SELECT 
        id, 
        mrn, 
        first_name, 
        last_name, 
        date_of_birth, 
        gender, 
        phone, 
        email
      FROM patients
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add search filter if provided
    if (search) {
      sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? OR phone LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add order by and pagination
    sql += ` ORDER BY first_name, last_name LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Prepare and execute the query
    let stmt = env.DB.prepare(sql);
    
    // Bind parameters if any
    if (params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        stmt = stmt.bind(params[i]);
      }
    }
    
    const { results } = await stmt.all();
    
    // Format the results to include full name
    const formattedResults = results.map(patient => ({
      ...patient,
      name: `${patient.first_name} ${patient.last_name}`
    }));
    
    return NextResponse.json({ patients: formattedResults });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients
 * Creates a new patient.
 */
export async function POST(request: NextRequest) {
  try {
    const patientData = await request.json();

    // Basic validation
    if (!patientData.first_name || !patientData.last_name || !patientData.date_of_birth || !patientData.gender) {
      return NextResponse.json(
        { error: "Missing required fields (first_name, last_name, date_of_birth, gender)" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();
    
    // Generate a unique MRN (Medical Record Number)
    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM patients"
    ).first<{ count: number }>();
    const count = (countResult?.count || 0) + 1;
    const mrn = `P${count.toString().padStart(5, '0')}`;
    
    // Insert the new patient
    const info = await env.DB.prepare(`
      INSERT INTO patients (
        mrn,
        first_name, 
        last_name, 
        date_of_birth, 
        gender, 
        address,
        phone,
        email,
        emergency_contact,
        blood_group,
        allergies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      mrn,
      patientData.first_name,
      patientData.last_name,
      patientData.date_of_birth,
      patientData.gender,
      patientData.address || "",
      patientData.phone || "",
      patientData.email || "",
      patientData.emergency_contact || "",
      patientData.blood_group || "",
      patientData.allergies || ""
    ).run();
    
    // Get the newly created patient
    const newPatient = await env.DB.prepare(
      "SELECT * FROM patients WHERE id = ?"
    ).bind(info.meta.last_row_id).first();

    return NextResponse.json({ patient: newPatient }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: "Failed to create patient", details: error.message },
      { status: 500 }
    );
  }
}
