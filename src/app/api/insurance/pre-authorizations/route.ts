import { NextRequest, NextResponse } from "next/server";

// Define interface for Pre-Authorization data
interface PreAuthorization {
  id: number | string;
  patient_insurance_id: number | string;
  requested_procedure: string;
  estimated_cost?: number | null;
  request_date: string; // ISO string
  status: string; // e.g., "Pending", "Approved", "Rejected", "More Info Required"
  authorization_number?: string | null;
  approved_amount?: number | null;
  expiry_date?: string | null; // ISO string
  notes?: string | null;
  referring_doctor_id?: number | string | null;
  diagnosis_code?: string | null;
  rejection_reason?: string | null;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

// Mock data store for pre-authorizations (replace with actual DB interaction)
const mockPreAuths: PreAuthorization[] = [
  {
    id: 1,
    patient_insurance_id: 101,
    requested_procedure: "Appendectomy",
    estimated_cost: 150000.00,
    request_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    status: "Approved", // e.g., "Pending", "Approved", "Rejected", "More Info Required"
    authorization_number: "AUTH12345",
    approved_amount: 140000.00,
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 25 days
    notes: "Approved with co-pay.",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Updated 3 days ago
  },
  {
    id: 2,
    patient_insurance_id: 102,
    requested_procedure: "MRI Brain",
    estimated_cost: 15000.00,
    request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: "Pending",
    authorization_number: null,
    approved_amount: null,
    expiry_date: null,
    notes: "Awaiting review.",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
let nextPreAuthId = 3;

// Define interface for pre-authorization creation input
interface PreAuthorizationInput {
  patient_insurance_id: number | string;
  requested_procedure: string;
  estimated_cost?: number;
  request_date?: string; // Optional, defaults to now
  referring_doctor_id?: number | string;
  diagnosis_code?: string;
  notes?: string;
}

// Define interface for pre-authorization update input
interface PreAuthorizationUpdateInput {
  status?: string;
  authorization_number?: string | null;
  approved_amount?: number | null;
  expiry_date?: string | null;
  notes?: string;
  rejection_reason?: string | null;
}

// Define interface for pre-authorization filters
interface PreAuthorizationFilters {
  status?: string | null;
  patient_insurance_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

// Helper function to simulate DB interaction (GET)
async function getPreAuthorizationsFromDB(filters: PreAuthorizationFilters = {}) {
  console.log("Simulating DB fetch for pre-authorizations with filters:", filters);
  // Apply filters if implemented
  let filteredPreAuths = [...mockPreAuths];
  
  if (filters.status) {
    filteredPreAuths = filteredPreAuths.filter(pa => pa.status.toLowerCase() === filters.status.toLowerCase());
  }
  if (filters.patient_insurance_id) {
    filteredPreAuths = filteredPreAuths.filter(pa => pa.patient_insurance_id === parseInt(filters.patient_insurance_id));
  }
  
  return filteredPreAuths.sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
}


// Helper function to simulate DB interaction (POST)
async function createPreAuthorizationInDB(data: PreAuthorizationInput) {
  console.log("Simulating DB create for pre-authorization:", data);
  const now = new Date().toISOString();
  const newPreAuth = {
    id: nextPreAuthId++,
    patient_insurance_id: data.patient_insurance_id,
    requested_procedure: data.requested_procedure,
    estimated_cost: data.estimated_cost || null,
    request_date: data.request_date || now,
    status: "Pending",
    authorization_number: null,
    approved_amount: null,
    expiry_date: null,
    notes: data.notes || "",
    referring_doctor_id: data.referring_doctor_id || null,
    diagnosis_code: data.diagnosis_code || null,
    rejection_reason: null,
    created_at: now,
    updated_at: now,
  };
  mockPreAuths.push(newPreAuth);
  return newPreAuth;
}


/**
 * GET /api/insurance/pre-authorizations
 * Retrieves a list of pre-authorization requests, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Example filters
    const filters = {
      status: searchParams.get("status"),
      patient_insurance_id: searchParams.get("patient_insurance_id"),
      date_from: searchParams.get("date_from"),
      date_to: searchParams.get("date_to"),
    };

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
    const body = await request.json();
    // Fixed: Apply type assertion
    const preAuthData = body as PreAuthorizationInput;

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

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
// The PUT handler below seems misplaced in this file which handles the collection (/api/insurance/pre-authorizations).
// It should likely be moved to /api/insurance/pre-authorizations/[id]/route.ts.

/**
 * PUT /api/insurance/pre-authorizations/[id]  <-- This handler likely belongs in [id]/route.ts
 * Updates an existing pre-authorization request.
 */
// export async function PUT(request: NextRequest) { // Commenting out as it's likely misplaced
//   try {
//     const path = request.nextUrl.pathname;
//     const idString = path.split("/").pop();
//     const id = idString ? parseInt(idString) : 0;
    
//     if (!id || id <= 0) {
//       return NextResponse.json({ error: "Invalid or missing pre-authorization request ID in URL path" }, { status: 400 });
//     }
    
//     const body = await request.json();
//     const updateData = body as PreAuthorizationUpdateInput;
    
//     // Simulate updating the pre-authorization request in the database
//     const updatedPreAuth = await updatePreAuthorizationInDB(id, updateData);

//     return NextResponse.json({ preAuthorization: updatedPreAuth });
//   } catch (error) {
//     console.error("Error updating pre-authorization request:", error);
//     let errorMessage = "An unknown error occurred";
//     if (error instanceof Error) {
//       errorMessage = error.message;
//       if (errorMessage === "Pre-authorization request not found") {
//         return NextResponse.json({ error: errorMessage }, { status: 404 });
//       }
//     }
//     return NextResponse.json(
//       { error: "Failed to update pre-authorization request", details: errorMessage },
//       { status: 500 }
//     );
//   }
// }

