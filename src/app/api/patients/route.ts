// src/app/api/patients/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages";
import { v4 as uuidv4 } from "uuid"; // Import uuid for generating IDs

// Interface for Patient data (adjust based on actual schema)
interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  allergies?: string;
}

// Interface for POST request body
interface PatientCreateBody {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  allergies?: string;
}

// Mock data for development
let mockPatients: Patient[] = [
  { id: "pat_001", mrn: "P00001", first_name: "John", last_name: "Doe", date_of_birth: "1985-05-15", gender: "Male", phone: "555-1234", email: "john.doe@example.com", address: "123 Main St", emergency_contact: "Jane Doe 555-5678", blood_group: "O+", allergies: "Penicillin" },
  { id: "pat_002", mrn: "P00002", first_name: "Jane", last_name: "Smith", date_of_birth: "1992-08-22", gender: "Female", phone: "555-9876", email: "jane.smith@example.com", address: "456 Oak Ave", emergency_contact: "John Smith 555-1122", blood_group: "A-", allergies: "None" },
  { id: "pat_003", mrn: "P00003", first_name: "Alice", last_name: "Johnson", date_of_birth: "1978-12-01", gender: "Female", phone: "555-3456", email: "alice.j@example.com", address: "789 Pine Ln", emergency_contact: "Bob Johnson 555-7788", blood_group: "B+", allergies: "Peanuts" },
];
let nextPatientId = 4;

/**
 * GET /api/patients
 * Retrieves a list of patients, potentially filtered by search term.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // const { env } = getRequestContext(); // Cloudflare specific
    
    // Mock implementation for development without Cloudflare
    let filteredPatients = mockPatients;

    if (search) {
      filteredPatients = mockPatients.filter(patient => 
        patient.first_name.toLowerCase().includes(search) || 
        patient.last_name.toLowerCase().includes(search) || 
        patient.mrn.toLowerCase().includes(search) || 
        (patient.phone && patient.phone.includes(search))
      );
    }
    
    // Apply pagination
    const paginatedPatients = filteredPatients.slice(offset, offset + limit);
    
    // Format the results to include full name
    const formattedResults = paginatedPatients.map(patient => ({
      ...patient,
      name: `${patient.first_name} ${patient.last_name}`
    }));
    
    return NextResponse.json({ patients: formattedResults });
  } catch (error) {
    console.error("Error fetching patients:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch patients", details: errorMessage },
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
    const patientData = await request.json() as PatientCreateBody;

    // Basic validation
    if (!patientData.first_name || !patientData.last_name || !patientData.date_of_birth || !patientData.gender) {
      return NextResponse.json(
        { error: "Missing required fields (first_name, last_name, date_of_birth, gender)" },
        { status: 400 }
      );
    }

    // const { env } = getRequestContext(); // Cloudflare specific
    
    // Mock implementation for development without Cloudflare
    // Generate a unique MRN (Medical Record Number)
    const count = mockPatients.length + 1;
    const mrn = `P${count.toString().padStart(5, "0")}`;
    
    // Create the new patient in mock data
    const newPatient: Patient = {
      id: `pat_${String(nextPatientId++).padStart(3, "0")}`,
      mrn: mrn,
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      date_of_birth: patientData.date_of_birth,
      gender: patientData.gender,
      address: patientData.address || "",
      phone: patientData.phone || "",
      email: patientData.email || "",
      emergency_contact: patientData.emergency_contact || "",
      blood_group: patientData.blood_group || "",
      allergies: patientData.allergies || ""
    };
    
    mockPatients.push(newPatient);

    return NextResponse.json({ patient: newPatient }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create patient", details: errorMessage },
      { status: 500 }
    );
  }
}

