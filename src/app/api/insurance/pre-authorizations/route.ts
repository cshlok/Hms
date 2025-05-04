import { NextRequest, NextResponse } from "next/server";
// import { v4 as uuidv4 } from "uuid"; // Unused import

// Define interface for Pre-Authorization data
interface PreAuthorization {
  id: number | string;
  patient_insurance_id: number | string;
  requested_procedure: string;
  estimated_cost?: number | undefined;
  request_date: string; // ISO string
  status: string; // e.g., "Pending", "Approved", "Rejected", "More Info Required"
  authorization_number?: string | undefined;
  approved_amount?: number | undefined;
  expiry_date?: string | undefined; // ISO string
  notes?: string | undefined;
  referring_doctor_id?: number | string | undefined;
  diagnosis_code?: string | undefined;
  rejection_reason?: string | undefined;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

// Mock data store for pre-authorizations (replace with actual DB interaction)
// FIX: Changed let to const for prefer-const rule
const mockPreAuths: PreAuthorization[] = [
  {
    id: 1,
    patient_insurance_id: 101,
    requested_procedure: "Appendectomy",
    estimated_cost: 150_000,
    request_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    status: "Approved", // e.g., "Pending", "Approved", "Rejected", "More Info Required"
    authorization_number: "AUTH12345",
    approved_amount: 140_000,
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 25 days
    notes: "Approved with co-pay.",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Updated 3 days ago
  },
  {
    id: 2,
    patient_insurance_id: 102,
    requested_procedure: "MRI Brain",
    estimated_cost: 15_000,
    request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: "Pending",
    authorization_number: undefined,
    approved_amount: undefined,
    expiry_date: undefined,
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

// Define interface for pre-authorization update input - Belongs in [id]/route.ts
// interface PreAuthorizationUpdateInput {
//   status?: string;
//   authorization_number?: string | null;
//   approved_amount?: number | null;
//   expiry_date?: string | null;
//   notes?: string;
//   rejection_reason?: string | null;
// }

// Define interface for pre-authorization filters
interface PreAuthorizationFilters {
  status?: string | undefined;
  patient_insurance_id?: string | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
}

// Helper function to simulate DB interaction (GET)
async function getPreAuthorizationsFromDB(
  filters: PreAuthorizationFilters = {}
) {
  console.log(
    "Simulating DB fetch for pre-authorizations with filters:",
    filters
  );
  let filteredPreAuths = [...mockPreAuths];

  // FIX: Check filters.status before using (TS18049)
  if (filters.status) {
    filteredPreAuths = filteredPreAuths.filter(
      (pa) => pa.status.toLowerCase() === filters.status!.toLowerCase()
    );
  }
  // FIX: Check filters.patient_insurance_id before parsing (TS2345)
  if (filters.patient_insurance_id) {
       const patientInsuranceId = Number.parseInt(filters.patient_insurance_id);
    if (!Number.isNaN(patientInsuranceId)) {
      filteredPreAuths = filteredPreAuths.filter(
        (pa) => pa.patient_insurance_id === patientInsuranceId
      );
    }
  }

  // Add date filtering if needed
  if (filters.date_from) {
    filteredPreAuths = filteredPreAuths.filter(
      (pa) => new Date(pa.request_date) >= new Date(filters.date_from!)
    );
  }
  if (filters.date_to) {
    filteredPreAuths = filteredPreAuths.filter(
      (pa) => new Date(pa.request_date) <= new Date(filters.date_to!)
    );
  }

  return filteredPreAuths.sort(
    (a, b) =>
      new Date(b.request_date).getTime() - new Date(a.request_date).getTime()
  );
}

// Helper function to simulate DB interaction (GET by ID) - Belongs in [id]/route.ts
// async function getPreAuthorizationByIdFromDB(id: number) { // Unused function
//   console.log("Simulating DB fetch for pre-authorization ID:", id);
//   const preAuth = mockPreAuths.find(pa => pa.id === id);
//   if (!preAuth) {
//     throw new Error("Pre-authorization request not found");
//   }
//   return preAuth;
// }

// Helper function to simulate DB interaction (POST)
async function createPreAuthorizationInDB(
  data: PreAuthorizationInput
): Promise<PreAuthorization> {
  // Added return type
  console.log("Simulating DB create for pre-authorization:", data);
  const now = new Date().toISOString();
  // FIX: Ensure created object matches PreAuthorization interface
  const newPreAuth: PreAuthorization = {
    id: nextPreAuthId++,
    patient_insurance_id: data.patient_insurance_id,
    requested_procedure: data.requested_procedure,
    estimated_cost: data.estimated_cost ?? undefined, // Use nullish coalescing for optional number
    request_date: data.request_date || now,
    status: "Pending",
    authorization_number: undefined,
    approved_amount: undefined,
    expiry_date: undefined,
    notes: data.notes || undefined, // Use null for optional string
    referring_doctor_id: data.referring_doctor_id || undefined,
    diagnosis_code: data.diagnosis_code || undefined,
    rejection_reason: undefined,
    created_at: now,
    updated_at: now,
  };
  mockPreAuths.push(newPreAuth);
  return newPreAuth;
}

// Helper function to simulate DB interaction (PUT) - Belongs in [id]/route.ts
// async function updatePreAuthorizationInDB(id: number, data: PreAuthorizationUpdateInput) { // Unused function
//   console.log("Simulating DB update for pre-authorization ID:", id, "with data:", data);
//   const preAuthIndex = mockPreAuths.findIndex(pa => pa.id === id);
//   if (preAuthIndex === -1) {
//     throw new Error("Pre-authorization request not found");
//   }
//   const now = new Date().toISOString();
//   // FIX: Ensure updated object matches PreAuthorization interface
//   const updatedPreAuth = {
//     ...mockPreAuths[preAuthIndex],
//     ...data,
//     approved_amount: data.approved_amount === undefined ? null : data.approved_amount, // Allow null
//     updated_at: now
//   };
//   mockPreAuths[preAuthIndex] = updatedPreAuth;
//   return updatedPreAuth;
// }

/**
 * GET /api/insurance/pre-authorizations
 * Retrieves a list of pre-authorization requests, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: PreAuthorizationFilters = {
      status: searchParams.get("status") ?? undefined,
      patient_insurance_id: searchParams.get("patient_insurance_id") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
    };

    const preAuthorizations = await getPreAuthorizationsFromDB(filters);
    return NextResponse.json({ preAuthorizations });
  } catch (error: unknown) {
    console.error("Error fetching pre-authorization requests:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        error: "Failed to fetch pre-authorization requests",
        details: errorMessage,
      },
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
    // Apply type assertion
    const preAuthData = body as PreAuthorizationInput;

    // Basic validation (add more comprehensive validation)
    if (!preAuthData.patient_insurance_id || !preAuthData.requested_procedure) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (patient_insurance_id, requested_procedure)",
        },
        { status: 400 }
      );
    }

    // Simulate creating the pre-authorization request in the database
    const newPreAuth = await createPreAuthorizationInDB(preAuthData);

    return NextResponse.json({ preAuthorization: newPreAuth }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating pre-authorization request:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      {
        error: "Failed to create pre-authorization request",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
