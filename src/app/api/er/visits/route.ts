// src/app/api/er/visits/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getERVisitsFromDB(filters: any) {
  console.log("Simulating fetching ER visits with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT v.*, p.name as patient_name " +
  //   "FROM er_visits v " +
  //   "JOIN patients p ON v.patient_id = p.id " +
  //   "WHERE (? IS NULL OR v.status = ?) " +
  //   "ORDER BY v.arrival_time DESC"
  // ).bind(
  //   filters.status || null,
  //   filters.status || null
  // ).all();
  // return results;
  
  // Return mock data for now
  const mockERVisits = [
    {
      id: 1,
      visit_number: "ER-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      arrival_time: "2025-04-28T08:15:00Z",
      triage_level: "urgent", // e.g., immediate, emergent, urgent, semi-urgent, non-urgent
      triage_time: "2025-04-28T08:20:00Z",
      chief_complaint: "Severe abdominal pain",
      vital_signs: {
        temperature: 37.8,
        pulse: 110,
        respiration: 22,
        blood_pressure: "140/90",
        spo2: 98
      },
      attending_doctor_id: 5,
      attending_doctor_name: "Dr. Robert Johnson",
      status: "in_treatment", // e.g., waiting, triaged, in_treatment, admitted, discharged, transferred, left
      location: "ER Bay 3",
      notes: "Patient reports pain started 6 hours ago, progressively worsening",
      created_at: "2025-04-28T08:15:00Z",
      updated_at: "2025-04-28T08:45:00Z"
    },
    {
      id: 2,
      visit_number: "ER-20250428-002",
      patient_id: 105,
      patient_name: "Edward Norton",
      arrival_time: "2025-04-28T09:30:00Z",
      triage_level: "semi-urgent",
      triage_time: "2025-04-28T09:40:00Z",
      chief_complaint: "Laceration on right forearm",
      vital_signs: {
        temperature: 36.9,
        pulse: 82,
        respiration: 16,
        blood_pressure: "125/75",
        spo2: 99
      },
      attending_doctor_id: 6,
      attending_doctor_name: "Dr. Lisa Brown",
      status: "waiting",
      location: "Waiting Area",
      notes: "Laceration approximately 5cm, bleeding controlled",
      created_at: "2025-04-28T09:30:00Z",
      updated_at: "2025-04-28T09:40:00Z"
    },
    {
      id: 3,
      visit_number: "ER-20250428-003",
      patient_id: 106,
      patient_name: "Frank Miller",
      arrival_time: "2025-04-28T07:45:00Z",
      triage_level: "emergent",
      triage_time: "2025-04-28T07:50:00Z",
      chief_complaint: "Chest pain and shortness of breath",
      vital_signs: {
        temperature: 37.2,
        pulse: 118,
        respiration: 24,
        blood_pressure: "160/95",
        spo2: 92
      },
      attending_doctor_id: 7,
      attending_doctor_name: "Dr. Michael Lee",
      status: "admitted",
      location: "Transferred to CCU",
      notes: "ECG shows ST elevation, suspected MI, transferred to cardiology",
      created_at: "2025-04-28T07:45:00Z",
      updated_at: "2025-04-28T08:30:00Z"
    }
  ];
  
  return mockERVisits.filter(visit => {
    // Apply status filter
    if (filters.status && visit.status !== filters.status) return false;
    
    // Apply triage level filter
    if (filters.triageLevel && visit.triage_level !== filters.triageLevel) return false;
    
    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      const arrivalDate = new Date(visit.arrival_time);
      if (arrivalDate < startDate) return false;
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      const arrivalDate = new Date(visit.arrival_time);
      if (arrivalDate > endDate) return false;
    }
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        visit.patient_name.toLowerCase().includes(searchTerm) ||
        visit.visit_number.toLowerCase().includes(searchTerm) ||
        visit.chief_complaint.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating an ER visit
async function createERVisitInDB(visitData: any) {
  console.log("Simulating creating ER visit:", visitData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO er_visits (patient_id, arrival_time, chief_complaint, status) VALUES (?, ?, ?, ?)"
  // ).bind(
  //   visitData.patient_id,
  //   visitData.arrival_time || new Date().toISOString(),
  //   visitData.chief_complaint,
  //   "waiting"
  // ).run();
  // return { id: info.meta.last_row_id, ...visitData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const visitNumber = `ER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${newId.toString().padStart(3, '0')}`;
  return {
    id: newId,
    visit_number: visitNumber,
    ...visitData,
    arrival_time: visitData.arrival_time || new Date().toISOString(),
    status: "waiting",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single ER visit
async function getERVisitByIdFromDB(id: number) {
  console.log("Simulating fetching ER visit by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT v.*, p.name as patient_name " +
  //   "FROM er_visits v " +
  //   "JOIN patients p ON v.patient_id = p.id " +
  //   "WHERE v.id = ?"
  // ).bind(id).all();
  // return results[0];
  
  // Return mock data for now
  const mockERVisits = [
    {
      id: 1,
      visit_number: "ER-20250428-001",
      patient_id: 101,
      patient_name: "Alice Smith",
      arrival_time: "2025-04-28T08:15:00Z",
      triage_level: "urgent",
      triage_time: "2025-04-28T08:20:00Z",
      chief_complaint: "Severe abdominal pain",
      vital_signs: {
        temperature: 37.8,
        pulse: 110,
        respiration: 22,
        blood_pressure: "140/90",
        spo2: 98
      },
      attending_doctor_id: 5,
      attending_doctor_name: "Dr. Robert Johnson",
      status: "in_treatment",
      location: "ER Bay 3",
      notes: "Patient reports pain started 6 hours ago, progressively worsening",
      created_at: "2025-04-28T08:15:00Z",
      updated_at: "2025-04-28T08:45:00Z",
      patient_details: {
        age: 35,
        gender: "Female",
        allergies: "Penicillin",
        medical_history: "Appendectomy (2020), Hypertension"
      },
      treatment_notes: [
        {
          timestamp: "2025-04-28T08:30:00Z",
          note: "Initial assessment completed. Ordered CBC, CMP, urinalysis, and abdominal CT.",
          provider: "Dr. Robert Johnson"
        },
        {
          timestamp: "2025-04-28T08:45:00Z",
          note: "IV access established. Started IV fluids. Administered morphine 4mg IV for pain.",
          provider: "Nurse Sarah Thompson"
        }
      ]
    },
    {
      id: 3,
      visit_number: "ER-20250428-003",
      patient_id: 106,
      patient_name: "Frank Miller",
      arrival_time: "2025-04-28T07:45:00Z",
      triage_level: "emergent",
      triage_time: "2025-04-28T07:50:00Z",
      chief_complaint: "Chest pain and shortness of breath",
      vital_signs: {
        temperature: 37.2,
        pulse: 118,
        respiration: 24,
        blood_pressure: "160/95",
        spo2: 92
      },
      attending_doctor_id: 7,
      attending_doctor_name: "Dr. Michael Lee",
      status: "admitted",
      location: "Transferred to CCU",
      notes: "ECG shows ST elevation, suspected MI, transferred to cardiology",
      created_at: "2025-04-28T07:45:00Z",
      updated_at: "2025-04-28T08:30:00Z",
      patient_details: {
        age: 62,
        gender: "Male",
        allergies: "None",
        medical_history: "Hypertension, Type 2 Diabetes, Previous MI (2022)"
      },
      treatment_notes: [
        {
          timestamp: "2025-04-28T07:55:00Z",
          note: "ECG performed showing ST elevation in leads II, III, aVF. Administered aspirin 325mg PO, nitroglycerin 0.4mg SL.",
          provider: "Dr. Michael Lee"
        },
        {
          timestamp: "2025-04-28T08:10:00Z",
          note: "Cardiology consulted. Decision made to activate cath lab for primary PCI.",
          provider: "Dr. Michael Lee"
        },
        {
          timestamp: "2025-04-28T08:25:00Z",
          note: "Patient transferred to CCU for immediate cardiac catheterization.",
          provider: "Nurse David Wilson"
        }
      ]
    }
  ];
  
  return mockERVisits.find(visit => visit.id === id) || null;
}

// Placeholder function to simulate updating an ER visit
async function updateERVisitInDB(id: number, updateData: any) {
  console.log("Simulating updating ER visit:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // await env.DB.prepare(
  //   `UPDATE er_visits SET ${updateFields}, updated_at = ? WHERE id = ?`
  // ).bind(...updateValues, new Date().toISOString(), id).run();
  // return { id, ...updateData };
  
  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString()
  };
}

/**
 * GET /api/er/visits
 * Retrieves a list of ER visits, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const triageLevel = searchParams.get("triageLevel");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { status, triageLevel, startDate, endDate, search };
    
    // Check if this is a request for a specific ER visit
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/er\/visits\/\d+$/)) {
      const id = parseInt(path.split('/').pop() || '0');
      if (id > 0) {
        const visit = await getERVisitByIdFromDB(id);
        if (!visit) {
          return NextResponse.json({ error: "ER visit not found" }, { status: 404 });
        }
        return NextResponse.json({ visit });
      }
    }
    
    // Otherwise, return filtered list
    const visits = await getERVisitsFromDB(filters);

    return NextResponse.json({ visits });
  } catch (error) {
    console.error("Error fetching ER visits:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch ER visits", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/er/visits
 * Creates a new ER visit.
 */
export async function POST(request: NextRequest) {
  try {
    const visitData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!visitData.patient_id || !visitData.chief_complaint) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, chief_complaint)" },
        { status: 400 }
      );
    }

    // Simulate creating the ER visit in the database
    const newVisit = await createERVisitInDB(visitData);

    return NextResponse.json({ visit: newVisit }, { status: 201 });
  } catch (error) {
    console.error("Error creating ER visit:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create ER visit", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/er/visits/[id]
 * Updates an existing ER visit.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split('/').pop() || '0');
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid ER visit ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the ER visit in the database
    const updatedVisit = await updateERVisitInDB(id, updateData);

    return NextResponse.json({ visit: updatedVisit });
  } catch (error) {
    console.error("Error updating ER visit:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update ER visit", details: errorMessage },
      { status: 500 }
    );
  }
}
