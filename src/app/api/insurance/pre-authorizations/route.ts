// src/app/api/insurance/pre-authorizations/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getPreAuthorizationsFromDB(filters: any) {
  console.log("Simulating fetching pre-authorizations with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // let query = `
  //   SELECT pa.*, pi.policy_number, p.name as patient_name, ip.name as provider_name 
  //   FROM pre_authorizations pa
  //   JOIN patient_insurance pi ON pa.patient_insurance_id = pi.id
  //   JOIN patients p ON pi.patient_id = p.id
  //   JOIN insurance_providers ip ON pi.provider_id = ip.id
  //   WHERE 1=1
  // `;
  // 
  // const params = [];
  // 
  // if (filters.patient_id) {
  //   query += " AND pi.patient_id = ?";
  //   params.push(filters.patient_id);
  // }
  // 
  // if (filters.provider_id) {
  //   query += " AND pi.provider_id = ?";
  //   params.push(filters.provider_id);
  // }
  // 
  // if (filters.status) {
  //   query += " AND pa.status = ?";
  //   params.push(filters.status);
  // }
  // 
  // query += " ORDER BY pa.request_date DESC";
  // 
  // const { results } = await env.DB.prepare(query).bind(...params).all();
  // return results;
  
  // Return mock data for now
  const mockPreAuthorizations = [
    {
      id: 1,
      patient_insurance_id: 1,
      policy_number: "NHI12345678",
      patient_name: "Alice Smith",
      provider_name: "National Health Insurance",
      request_date: "2025-04-01T10:00:00Z",
      requested_procedure: "Appendectomy",
      estimated_cost: 75000,
      requesting_doctor_id: 201,
      status: "approved",
      provider_reference_number: "PREAUTH-NHI-001",
      approval_date: "2025-04-02T15:30:00Z",
      rejection_reason: null,
      approved_amount: 70000,
      notes: "Approved for standard appendectomy procedure.",
      created_at: "2025-04-01T10:00:00Z",
      updated_at: "2025-04-02T15:30:00Z"
    },
    {
      id: 2,
      patient_insurance_id: 2,
      policy_number: "HSI87654321",
      patient_name: "Bob Johnson",
      provider_name: "Health Secure Insurance",
      request_date: "2025-04-05T11:30:00Z",
      requested_procedure: "Knee Replacement Surgery",
      estimated_cost: 250000,
      requesting_doctor_id: 202,
      status: "pending",
      provider_reference_number: null,
      approval_date: null,
      rejection_reason: null,
      approved_amount: null,
      notes: "Awaiting review from insurance provider.",
      created_at: "2025-04-05T11:30:00Z",
      updated_at: "2025-04-05T11:30:00Z"
    },
    {
      id: 3,
      patient_insurance_id: 3,
      policy_number: "SHI56789012",
      patient_name: "Charlie Brown",
      provider_name: "Star Health Insurance",
      request_date: "2025-04-10T09:15:00Z",
      requested_procedure: "Cardiac Catheterization",
      estimated_cost: 150000,
      requesting_doctor_id: 203,
      status: "rejected",
      provider_reference_number: "PREAUTH-SHI-003",
      approval_date: null,
      rejection_reason: "Procedure not covered under current plan terms.",
      approved_amount: null,
      notes: "Patient advised to check policy exclusions.",
      created_at: "2025-04-10T09:15:00Z",
      updated_at: "2025-04-12T14:00:00Z"
    },
    {
      id: 4,
      patient_insurance_id: 4,
      policy_number: "NHI23456789",
      patient_name: "Diana Miller",
      provider_name: "National Health Insurance",
      request_date: "2025-04-15T16:00:00Z",
      requested_procedure: "Gallbladder Removal",
      estimated_cost: 90000,
      requesting_doctor_id: 201,
      status: "more_info_required",
      provider_reference_number: "PREAUTH-NHI-004",
      approval_date: null,
      rejection_reason: null,
      approved_amount: null,
      notes: "Provider requested additional diagnostic reports.",
      created_at: "2025-04-15T16:00:00Z",
      updated_at: "2025-04-17T10:45:00Z"
    }
  ];
  
  return mockPreAuthorizations.filter(preAuth => {
    // Apply patient insurance filter (using patient_insurance_id instead of patient_id)
    if (filters.patient_id && preAuth.patient_insurance_id.toString() !== filters.patient_id) return false;
    
    // Skip provider filter as provider_id is not directly available in the mock data
    // We could implement this by adding provider_id to the mock data or using a different approach
    
    // Apply status filter
    if (filters.status && preAuth.status !== filters.status) return false;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        preAuth.patient_name.toLowerCase().includes(searchTerm) ||
        preAuth.provider_name.toLowerCase().includes(searchTerm) ||
        preAuth.policy_number.toLowerCase().includes(searchTerm) ||
        preAuth.requested_procedure.toLowerCase().includes(searchTerm) ||
        (preAuth.provider_reference_number && preAuth.provider_reference_number.toLowerCase().includes(searchTerm))
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating a pre-authorization request
async function createPreAuthorizationInDB(preAuthData: any) {
  console.log("Simulating creating pre-authorization request:", preAuthData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   `INSERT INTO pre_authorizations (
  //     patient_insurance_id, requested_procedure, estimated_cost, requesting_doctor_id, status, notes
  //   ) VALUES (?, ?, ?, ?, ?, ?)`
  // ).bind(
  //   preAuthData.patient_insurance_id,
  //   preAuthData.requested_procedure,
  //   preAuthData.estimated_cost || null,
  //   preAuthData.requesting_doctor_id || null,
  //   preAuthData.status || "pending",
  //   preAuthData.notes || null
  // ).run();
  // return { id: info.meta.last_row_id, ...preAuthData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  
  // Fetch mock patient and provider names for the response
  let patientName = "Unknown Patient";
  let providerName = "Unknown Provider";
  let policyNumber = "Unknown Policy";
  
  // In a real implementation, these would be fetched from the database
  if (preAuthData.patient_insurance_id === 1) {
    patientName = "Alice Smith";
    providerName = "National Health Insurance";
    policyNumber = "NHI12345678";
  } else if (preAuthData.patient_insurance_id === 2) {
    patientName = "Bob Johnson";
    providerName = "Health Secure Insurance";
    policyNumber = "HSI87654321";
  }
  
  return {
    id: newId,
    ...preAuthData,
    patient_name: patientName,
    provider_name: providerName,
    policy_number: policyNumber,
    status: preAuthData.status || "pending",
    request_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single pre-authorization request
async function getPreAuthorizationByIdFromDB(id: number) {
  console.log("Simulating fetching pre-authorization by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(`
  //   SELECT pa.*, pi.policy_number, p.name as patient_name, ip.name as provider_name 
  //   FROM pre_authorizations pa
  //   JOIN patient_insurance pi ON pa.patient_insurance_id = pi.id
  //   JOIN patients p ON pi.patient_id = p.id
  //   JOIN insurance_providers ip ON pi.provider_id = ip.id
  //   WHERE pa.id = ?
  // `).bind(id).all();
  // 
  // if (results.length === 0) return null;
  // return results[0];
  
  // Return mock data for now
  const mockPreAuthorizations = [
    {
      id: 1,
      patient_insurance_id: 1,
      policy_number: "NHI12345678",
      patient_name: "Alice Smith",
      provider_name: "National Health Insurance",
      request_date: "2025-04-01T10:00:00Z",
      requested_procedure: "Appendectomy",
      estimated_cost: 75000,
      requesting_doctor_id: 201,
      status: "approved",
      provider_reference_number: "PREAUTH-NHI-001",
      approval_date: "2025-04-02T15:30:00Z",
      rejection_reason: null,
      approved_amount: 70000,
      notes: "Approved for standard appendectomy procedure.",
      created_at: "2025-04-01T10:00:00Z",
      updated_at: "2025-04-02T15:30:00Z",
      // Additional details for single view
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101"
      },
      doctor_details: {
        name: "Dr. Emily Carter",
        specialty: "General Surgery"
      },
      policy_details: {
        plan_name: "Gold Health Plan",
        expiry_date: "2025-12-31"
      }
    },
    {
      id: 2,
      patient_insurance_id: 2,
      policy_number: "HSI87654321",
      patient_name: "Bob Johnson",
      provider_name: "Health Secure Insurance",
      request_date: "2025-04-05T11:30:00Z",
      requested_procedure: "Knee Replacement Surgery",
      estimated_cost: 250000,
      requesting_doctor_id: 202,
      status: "pending",
      provider_reference_number: null,
      approval_date: null,
      rejection_reason: null,
      approved_amount: null,
      notes: "Awaiting review from insurance provider.",
      created_at: "2025-04-05T11:30:00Z",
      updated_at: "2025-04-05T11:30:00Z",
      // Additional details for single view
      patient_details: {
        age: 55,
        gender: "Male",
        contact: "+91-9876543211",
        medical_record_number: "MRN00102"
      },
      doctor_details: {
        name: "Dr. Alan Grant",
        specialty: "Orthopedics"
      },
      policy_details: {
        plan_name: "Family Health Shield",
        expiry_date: "2026-01-31"
      }
    }
  ];
  
  return mockPreAuthorizations.find(preAuth => preAuth.id === id) || null;
}

// Placeholder function to simulate updating a pre-authorization request
async function updatePreAuthorizationInDB(id: number, updateData: any) {
  console.log("Simulating updating pre-authorization request:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // 
  // await env.DB.prepare(
  //   `UPDATE pre_authorizations SET ${updateFields}, updated_at = ? WHERE id = ?`
  // ).bind(...updateValues, new Date().toISOString(), id).run();
  // 
  // return { id, ...updateData };
  
  // Return mock success response
  return {
    id,
    ...updateData,
    updated_at: new Date().toISOString()
  };
}

/**
 * GET /api/insurance/pre-authorizations
 * Retrieves a list of pre-authorization requests, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get("patient_id");
    const provider_id = searchParams.get("provider_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { patient_id, provider_id, status, search };
    
    // Check if this is a request for a specific pre-authorization
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/insurance\/pre-authorizations\/\d+$/)) {
      const id = parseInt(path.split("/").pop() || "0");
      if (id > 0) {
        const preAuth = await getPreAuthorizationByIdFromDB(id);
        if (!preAuth) {
          return NextResponse.json({ error: "Pre-authorization request not found" }, { status: 404 });
        }
        return NextResponse.json({ preAuthorization: preAuth });
      }
    }
    
    // Otherwise, return filtered list
    const preAuthorizations = await getPreAuthorizationsFromDB(filters);

    return NextResponse.json({ preAuthorizations });
  } catch (error) {
    console.error("Error fetching pre-authorization requests:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch pre-authorization requests", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insurance/pre-authorizations
 * Creates a new pre-authorization request.
 */
export async function POST(request: NextRequest) {
  try {
    const preAuthData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!preAuthData.patient_insurance_id || !preAuthData.requested_procedure) {
      return NextResponse.json(
        { error: "Missing required fields (patient_insurance_id, requested_procedure)" },
        { status: 400 }
      );
    }

    // Simulate creating the pre-authorization request in the database
    const newPreAuth = await createPreAuthorizationInDB(preAuthData);

    return NextResponse.json({ preAuthorization: newPreAuth }, { status: 201 });
  } catch (error) {
    console.error("Error creating pre-authorization request:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create pre-authorization request", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/insurance/pre-authorizations/[id]
 * Updates an existing pre-authorization request.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split("/").pop() || "0");
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid pre-authorization request ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the pre-authorization request in the database
    const updatedPreAuth = await updatePreAuthorizationInDB(id, updateData);

    return NextResponse.json({ preAuthorization: updatedPreAuth });
  } catch (error) {
    console.error("Error updating pre-authorization request:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update pre-authorization request", details: errorMessage },
      { status: 500 }
    );
  }
}
