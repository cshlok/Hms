import { NextRequest, NextResponse } from "next/server";
// import { v4 as uuidv4 } from "uuid"; // Unused import

// Define interface for Insurance Claim data
interface InsuranceClaim {
  id: number | string;
  patient_insurance_id: number | string;
  invoice_id: number | string;
  claim_number: string;
  claim_date: string; // ISO string (Submission date)
  claim_amount: number;
  approved_amount?: number; // Use undefined for optional numbers
  status: string; // e.g., "Submitted", "Approved", "Rejected", "Pending Information"
  approval_date?: string | null; // ISO string or null
  rejection_date?: string | null; // ISO string or null
  rejection_reason?: string | null;
  payment_date?: string | null; // ISO string or null
  payment_reference?: string | null;
  notes?: string;
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

// Mock data store for insurance claims (replace with actual DB interaction)
const mockClaims: InsuranceClaim[] = [
  {
    id: 1,
    patient_insurance_id: 101,
    invoice_id: 201,
    claim_amount: 5000,
    status: "Submitted", // Renamed from claim_status
    claim_number: "CLM001",
    claim_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Renamed from submission_date
    approval_date: undefined,
    rejection_date: undefined,
    rejection_reason: undefined,
    approved_amount: undefined, // Changed from null
    payment_date: undefined,
    payment_reference: undefined,
    notes: "Initial claim submission",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    patient_insurance_id: 102,
    invoice_id: 202,
    claim_amount: 8500,
    status: "Approved", // Renamed from claim_status
    claim_number: "CLM002",
    claim_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Renamed from submission_date
    approval_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    rejection_date: undefined,
    rejection_reason: undefined,
    approved_amount: 8000,
    payment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    payment_reference: "PAY123456",
    notes: "Partial approval due to policy limits",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
let nextClaimId = 3;

// Define interface for insurance claim creation input
interface InsuranceClaimInput {
  patient_insurance_id: number | string;
  invoice_id: number | string;
  claim_amount: number;
  status?: string; // Optional, defaults to "Submitted"
  claim_number?: string; // Optional, might be auto-generated
  claim_date?: string; // Optional, defaults to now (Submission date)
  notes?: string;
}

// Define interface for insurance claim update input
// interface InsuranceClaimUpdateInput { // Likely belongs in [id]/route.ts
//   status?: string;
//   approval_date?: string | null;
//   rejection_date?: string | null;
//   rejection_reason?: string | null;
//   approved_amount?: number | null;
//   payment_date?: string | null;
//   payment_reference?: string | null;
//   notes?: string;
// }

// Define interface for insurance claim filters
interface InsuranceClaimFilters {
  status?: string | null;
  patient_insurance_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

// Helper function to simulate DB interaction (GET)
async function getInsuranceClaimsFromDB(filters: InsuranceClaimFilters = {}) {
  console.log(
    "Simulating DB fetch for insurance claims with filters:",
    filters
  );
  let filteredClaims = [...mockClaims];

  // FIX: Check if filters.status exists before using it (TS18049)
  if (filters.status) {
    // FIX: Use status field, check filters.status before toLowerCase (TS2339)
    filteredClaims = filteredClaims.filter(
      (c) => c.status.toLowerCase() === filters.status!.toLowerCase()
    );
  }

  // FIX: Check if filters.patient_insurance_id exists before parsing (TS2345)
  if (filters.patient_insurance_id) {
    const patientInsuranceId = Number.parseInt(filters.patient_insurance_id);
    if (!Number.isNaN(patientInsuranceId)) {
      filteredClaims = filteredClaims.filter(
        (c) => c.patient_insurance_id === patientInsuranceId
      );
    }
  }

  // Add date filtering if needed (using claim_date)
  if (filters.date_from) {
    filteredClaims = filteredClaims.filter(
      (c) => new Date(c.claim_date) >= new Date(filters.date_from!)
    );
  }
  if (filters.date_to) {
    filteredClaims = filteredClaims.filter(
      (c) => new Date(c.claim_date) <= new Date(filters.date_to!)
    );
  }

  // FIX: Sort using claim_date (TS2339)
  return filteredClaims.sort(
    (a, b) =>
      new Date(b.claim_date).getTime() - new Date(a.claim_date).getTime()
  );
}

// Helper function to simulate DB interaction (GET by ID) - Likely belongs in [id]/route.ts
// async function getInsuranceClaimByIdFromDB(id: number) { // Commented out - unused
//   console.log("Simulating DB fetch for insurance claim ID:", id);
//   const claim = mockClaims.find(c => c.id === id);
//   if (!claim) {
//     throw new Error("Insurance claim not found");
//   }
//   return claim;
// }

// Helper function to simulate DB interaction (POST)
async function createInsuranceClaimInDB(
  data: InsuranceClaimInput
): Promise<InsuranceClaim> {
  // Added return type
  console.log("Simulating DB create for insurance claim:", data);
  const now = new Date().toISOString();
  // FIX: Ensure created object matches InsuranceClaim interface (TS2345)
  const newClaim: InsuranceClaim = {
    id: nextClaimId++,
    patient_insurance_id: data.patient_insurance_id,
    invoice_id: data.invoice_id,
    claim_amount: data.claim_amount,
    status: data.status || "Submitted", // Use status
    claim_number:
      data.claim_number || `CLM${String(nextClaimId - 1).padStart(3, "0")}`,
    claim_date: data.claim_date || now, // Use claim_date
    // Initialize optional fields explicitly if needed, otherwise they are undefined
    // approval_date: null,
    // rejection_date: null,
    // rejection_reason: null,
    // approved_amount: undefined,
    // payment_date: null,
    // payment_reference: null,
    notes: data.notes || "",
    created_at: now,
    updated_at: now,
  };
  mockClaims.push(newClaim);
  return newClaim;
}

// Helper function to simulate DB interaction (PUT) - Likely belongs in [id]/route.ts
// async function updateInsuranceClaimInDB(id: number, data: InsuranceClaimUpdateInput) { // Commented out - unused
//   console.log("Simulating DB update for insurance claim ID:", id, "with data:", data);
//   const claimIndex = mockClaims.findIndex(c => c.id === id);
//   if (claimIndex === -1) {
//     throw new Error("Insurance claim not found");
//   }
//   const now = new Date().toISOString();
//   // FIX: Ensure updated object matches InsuranceClaim interface
//   const updatedClaim = {
//     ...mockClaims[claimIndex],
//     ...data,
//     // Ensure null is allowed for optional number fields if needed, or handle conversion
//     approved_amount: data.approved_amount === undefined ? undefined : data.approved_amount,
//     updated_at: now
//   };
//   mockClaims[claimIndex] = updatedClaim;
//   return updatedClaim;
// }

/**
 * GET /api/insurance/claims
 * Retrieves a list of insurance claims, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: InsuranceClaimFilters = {
      status: searchParams.get("status"),
      patient_insurance_id: searchParams.get("patient_insurance_id"),
      date_from: searchParams.get("date_from"),
      date_to: searchParams.get("date_to"),
    };

    const claims = await getInsuranceClaimsFromDB(filters);
    return NextResponse.json({ claims });
  } catch (error) {
    console.error("Error fetching insurance claims:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch insurance claims", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insurance/claims
 * Creates a new insurance claim.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Apply type assertion
    const claimData = body as InsuranceClaimInput;

    // Basic validation (add more comprehensive validation)
    if (
      !claimData.patient_insurance_id ||
      !claimData.invoice_id ||
      !claimData.claim_amount
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (patient_insurance_id, invoice_id, claim_amount)",
        },
        { status: 400 }
      );
    }

    // Simulate creating the insurance claim in the database
    const newClaim = await createInsuranceClaimInDB(claimData);

    return NextResponse.json({ claim: newClaim }, { status: 201 });
  } catch (error) {
    console.error("Error creating insurance claim:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create insurance claim", details: errorMessage },
      { status: 500 }
    );
  }
}

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
