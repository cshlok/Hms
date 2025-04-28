// src/app/api/ipd/admissions/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getAdmissionsFromDB(filters: any) {
  console.log("Simulating fetching admissions with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT a.*, p.name as patient_name, b.name as bed_name, w.name as ward_name " +
  //   "FROM admissions a " +
  //   "JOIN patients p ON a.patient_id = p.id " +
  //   "LEFT JOIN beds b ON a.bed_id = b.id " +
  //   "LEFT JOIN wards w ON b.ward_id = w.id " +
  //   "WHERE a.status = ? ORDER BY a.admission_date DESC"
  // ).bind(filters.status || "active").all();
  // return results;
  
  // Return mock data for now
  return [
    {
      id: 1,
      admission_number: "IPD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      bed_id: 15,
      bed_name: "Bed 15",
      ward_name: "General Ward",
      admission_date: "2025-04-25T08:30:00Z",
      expected_discharge_date: "2025-04-30T12:00:00Z",
      actual_discharge_date: null,
      admission_diagnosis: "Acute appendicitis",
      attending_doctor_id: 5,
      attending_doctor_name: "Dr. Robert Johnson",
      status: "active",
      notes: "Patient admitted for appendectomy"
    },
    {
      id: 2,
      admission_number: "IPD-20250427-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      bed_id: 23,
      bed_name: "Bed 23",
      ward_name: "Surgical Ward",
      admission_date: "2025-04-27T14:15:00Z",
      expected_discharge_date: "2025-05-02T12:00:00Z",
      actual_discharge_date: null,
      admission_diagnosis: "Fractured femur",
      attending_doctor_id: 8,
      attending_doctor_name: "Dr. Sarah Williams",
      status: "active",
      notes: "Post-operative care after ORIF procedure"
    },
    {
      id: 3,
      admission_number: "IPD-20250426-003",
      patient_id: 103,
      patient_name: "Charlie Brown",
      bed_id: 7,
      bed_name: "Bed 7",
      ward_name: "Medical Ward",
      admission_date: "2025-04-26T09:45:00Z",
      expected_discharge_date: "2025-04-29T12:00:00Z",
      actual_discharge_date: null,
      admission_diagnosis: "Pneumonia",
      attending_doctor_id: 3,
      attending_doctor_name: "Dr. Emily Chen",
      status: "active",
      notes: "On IV antibiotics and oxygen support"
    }
  ].filter(admission => {
    if (filters.status && filters.status !== admission.status) return false;
    if (filters.patientId && filters.patientId !== admission.patient_id.toString()) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        admission.patient_name.toLowerCase().includes(searchTerm) ||
        admission.admission_number.toLowerCase().includes(searchTerm) ||
        admission.admission_diagnosis.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });
}

// Placeholder function to simulate creating an admission
async function createAdmissionInDB(admissionData: any) {
  console.log("Simulating creating admission:", admissionData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO admissions (patient_id, bed_id, admission_date, expected_discharge_date, admission_diagnosis, attending_doctor_id, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   admissionData.patient_id,
  //   admissionData.bed_id,
  //   admissionData.admission_date,
  //   admissionData.expected_discharge_date,
  //   admissionData.admission_diagnosis,
  //   admissionData.attending_doctor_id,
  //   "active",
  //   admissionData.notes
  // ).run();
  // return { id: info.meta.last_row_id, ...admissionData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const admissionNumber = `IPD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newId.toString().padStart(3, '0')}`;
  return {
    id: newId,
    admission_number: admissionNumber,
    ...admissionData,
    status: "active",
    created_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single admission
async function getAdmissionByIdFromDB(id: number) {
  console.log("Simulating fetching admission by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT a.*, p.name as patient_name, b.name as bed_name, w.name as ward_name " +
  //   "FROM admissions a " +
  //   "JOIN patients p ON a.patient_id = p.id " +
  //   "LEFT JOIN beds b ON a.bed_id = b.id " +
  //   "LEFT JOIN wards w ON b.ward_id = w.id " +
  //   "WHERE a.id = ?"
  // ).bind(id).all();
  // return results[0];
  
  // Return mock data for now
  const mockAdmissions = [
    {
      id: 1,
      admission_number: "IPD-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      bed_id: 15,
      bed_name: "Bed 15",
      ward_name: "General Ward",
      admission_date: "2025-04-25T08:30:00Z",
      expected_discharge_date: "2025-04-30T12:00:00Z",
      actual_discharge_date: null,
      admission_diagnosis: "Acute appendicitis",
      attending_doctor_id: 5,
      attending_doctor_name: "Dr. Robert Johnson",
      status: "active",
      notes: "Patient admitted for appendectomy",
      vital_signs: [
        { timestamp: "2025-04-25T10:30:00Z", temperature: 37.8, pulse: 88, respiration: 18, blood_pressure: "130/85", spo2: 98 },
        { timestamp: "2025-04-25T14:30:00Z", temperature: 37.5, pulse: 82, respiration: 16, blood_pressure: "125/80", spo2: 99 },
        { timestamp: "2025-04-26T06:30:00Z", temperature: 37.2, pulse: 76, respiration: 16, blood_pressure: "120/80", spo2: 99 }
      ],
      medications: [
        { name: "Ceftriaxone", dosage: "1g", frequency: "BD", route: "IV", start_date: "2025-04-25T09:00:00Z", end_date: null },
        { name: "Paracetamol", dosage: "1g", frequency: "QID", route: "Oral", start_date: "2025-04-25T09:00:00Z", end_date: null }
      ],
      progress_notes: [
        { timestamp: "2025-04-25T14:00:00Z", note: "Patient stable post-op. Pain well controlled. Afebrile.", doctor_name: "Dr. Robert Johnson" },
        { timestamp: "2025-04-26T09:00:00Z", note: "Wound clean. No signs of infection. Tolerating oral diet.", doctor_name: "Dr. Robert Johnson" }
      ]
    },
    {
      id: 2,
      admission_number: "IPD-20250427-002",
      patient_id: 102,
      patient_name: "Bob Johnson",
      bed_id: 23,
      bed_name: "Bed 23",
      ward_name: "Surgical Ward",
      admission_date: "2025-04-27T14:15:00Z",
      expected_discharge_date: "2025-05-02T12:00:00Z",
      actual_discharge_date: null,
      admission_diagnosis: "Fractured femur",
      attending_doctor_id: 8,
      attending_doctor_name: "Dr. Sarah Williams",
      status: "active",
      notes: "Post-operative care after ORIF procedure",
      vital_signs: [
        { timestamp: "2025-04-27T16:30:00Z", temperature: 37.2, pulse: 92, respiration: 18, blood_pressure: "135/85", spo2: 97 },
        { timestamp: "2025-04-27T20:30:00Z", temperature: 37.4, pulse: 88, respiration: 17, blood_pressure: "130/80", spo2: 98 }
      ],
      medications: [
        { name: "Morphine", dosage: "5mg", frequency: "PRN", route: "IV", start_date: "2025-04-27T15:00:00Z", end_date: null },
        { name: "Enoxaparin", dosage: "40mg", frequency: "OD", route: "SC", start_date: "2025-04-27T20:00:00Z", end_date: null }
      ],
      progress_notes: [
        { timestamp: "2025-04-27T18:00:00Z", note: "Post-op X-ray confirms good position of hardware. Neurovascular status intact.", doctor_name: "Dr. Sarah Williams" }
      ]
    }
  ];
  
  return mockAdmissions.find(admission => admission.id === id) || null;
}

// Placeholder function to simulate updating an admission
async function updateAdmissionInDB(id: number, updateData: any) {
  console.log("Simulating updating admission:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // await env.DB.prepare(
  //   `UPDATE admissions SET ${updateFields} WHERE id = ?`
  // ).bind(...updateValues, id).run();
  // return { id, ...updateData };
  
  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString()
  };
}

/**
 * GET /api/ipd/admissions
 * Retrieves a list of admissions, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { status, patientId, search };
    
    // Check if this is a request for a specific admission
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/ipd\/admissions\/\d+$/)) {
      const id = parseInt(path.split('/').pop() || '0');
      if (id > 0) {
        const admission = await getAdmissionByIdFromDB(id);
        if (!admission) {
          return NextResponse.json({ error: "Admission not found" }, { status: 404 });
        }
        return NextResponse.json({ admission });
      }
    }
    
    // Otherwise, return filtered list
    const admissions = await getAdmissionsFromDB(filters);

    return NextResponse.json({ admissions });
  } catch (error) {
    console.error("Error fetching admissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch admissions", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ipd/admissions
 * Creates a new admission.
 */
export async function POST(request: NextRequest) {
  try {
    const admissionData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!admissionData.patient_id || !admissionData.bed_id || !admissionData.admission_diagnosis || !admissionData.attending_doctor_id) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, bed_id, admission_diagnosis, attending_doctor_id)" },
        { status: 400 }
      );
    }

    // Simulate creating the admission in the database
    const newAdmission = await createAdmissionInDB(admissionData);

    return NextResponse.json({ admission: newAdmission }, { status: 201 });
  } catch (error) {
    console.error("Error creating admission:", error);
    return NextResponse.json(
      { error: "Failed to create admission", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ipd/admissions/[id]
 * Updates an existing admission.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split('/').pop() || '0');
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid admission ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the admission in the database
    const updatedAdmission = await updateAdmissionInDB(id, updateData);

    return NextResponse.json({ admission: updatedAdmission });
  } catch (error) {
    console.error("Error updating admission:", error);
    return NextResponse.json(
      { error: "Failed to update admission", details: error.message },
      { status: 500 }
    );
  }
}
