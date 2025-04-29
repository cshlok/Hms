import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mock data store for insurance claims (replace with actual DB interaction)
let mockClaims: any[] = [
  {
    id: 1,
    patient_insurance_id: 101,
    invoice_id: 201,
    claim_amount: 5000.00,
    claim_status: "Submitted",
    claim_number: "CLM001",
    submission_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    approval_date: null,
    rejection_date: null,
    rejection_reason: null,
    approved_amount: null,
    payment_date: null,
    payment_reference: null,
    notes: "Initial claim submission",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    patient_insurance_id: 102,
    invoice_id: 202,
    claim_amount: 8500.00,
    claim_status: "Approved",
    claim_number: "CLM002",
    submission_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    approval_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    rejection_date: null,
    rejection_reason: null,
    approved_amount: 8000.00,
    payment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
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
  claim_status?: string; // Optional, defaults to "Submitted"
  claim_number?: string; // Optional, might be auto-generated
  submission_date?: string; // Optional, defaults to now
  notes?: string;
}

// Define interface for insurance claim update input
interface InsuranceClaimUpdateInput {
  claim_status?: string;
  approval_date?: string | null;
  rejection_date?: string | null;
  rejection_reason?: string | null;
  approved_amount?: number | null;
  payment_date?: string | null;
  payment_reference?: string | null;
  notes?: string;
}

// Helper function to simulate DB interaction (GET)
async function getInsuranceClaimsFromDB(filters: any = {}) {
  console.log("Simulating DB fetch for insurance claims with filters:", filters);
  // Apply filters if implemented
  let filteredClaims = [...mockClaims];
  
  if (filters.status) {
    filteredClaims = filteredClaims.filter(c => c.claim_status.toLowerCase() === filters.status.toLowerCase());
  }
  
  if (filters.patient_insurance_id) {
    filteredClaims = filteredClaims.filter(c => c.patient_insurance_id === parseInt(filters.patient_insurance_id));
  }
  
  return filteredClaims.sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime());
}

// Helper function to simulate DB interaction (GET by ID)
async function getInsuranceClaimByIdFromDB(id: number) {
  console.log("Simulating DB fetch for insurance claim ID:", id);
  return mockClaims.find((c) => c.id === id);
}

// Helper function to simulate DB interaction (POST)
async function createInsuranceClaimInDB(data: InsuranceClaimInput) {
  console.log("Simulating DB create for insurance claim:", data);
  const now = new Date().toISOString();
  const newClaim = {
    id: nextClaimId++,
    patient_insurance_id: data.patient_insurance_id,
    invoice_id: data.invoice_id,
    claim_amount: data.claim_amount,
    claim_status: data.claim_status || "Submitted",
    claim_number: data.claim_number || `CLM${String(nextClaimId-1).padStart(3, "0")}`,
    submission_date: data.submission_date || now,
    approval_date: null,
    rejection_date: null,
    rejection_reason: null,
    approved_amount: null,
    payment_date: null,
    payment_reference: null,
    notes: data.notes || "",
    created_at: now,
    updated_at: now,
  };
  mockClaims.push(newClaim);
  return newClaim;
}

// Helper function to simulate DB interaction (PUT)
async function updateInsuranceClaimInDB(id: number, data: InsuranceClaimUpdateInput) {
  console.log(`Simulating DB update for insurance claim ID ${id}:`, data);
  const claimIndex = mockClaims.findIndex((c) => c.id === id);
  if (claimIndex === -1) {
    throw new Error("Insurance claim not found");
  }
  const updatedClaim = { 
    ...mockClaims[claimIndex], 
    ...data, // Apply updates
    updated_at: new Date().toISOString(),
  };
  mockClaims[claimIndex] = updatedClaim;
  return updatedClaim;
}

/**
 * GET /api/insurance/claims
 * Retrieves a list of insurance claims, potentially filtered.
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
    // Fixed: Apply type assertion
    const claimData = body as InsuranceClaimInput;

    // Basic validation (add more comprehensive validation)
    if (!claimData.patient_insurance_id || !claimData.invoice_id || !claimData.claim_amount) {
      return NextResponse.json(
        { error: "Missing required fields (patient_insurance_id, invoice_id, claim_amount)" },
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
// The PUT handler below seems misplaced in this file which handles the collection (/api/insurance/claims).
// It should likely be moved to /api/insurance/claims/[id]/route.ts.

/**
 * PUT /api/insurance/claims/[id]  <-- This handler likely belongs in [id]/route.ts
 * Updates an existing insurance claim.
 */
// export async function PUT(request: NextRequest) { // Commenting out as it's likely misplaced
//   try {
//     const path = request.nextUrl.pathname;
//     const idString = path.split("/").pop();
//     const id = idString ? parseInt(idString) : 0;
    
//     if (!id || id <= 0) {
//       return NextResponse.json({ error: "Invalid or missing insurance claim ID in URL path" }, { status: 400 });
//     }
    
//     const body = await request.json();
//     const updateData = body as InsuranceClaimUpdateInput;
    
//     // Simulate updating the insurance claim in the database
//     const updatedClaim = await updateInsuranceClaimInDB(id, updateData);

//     return NextResponse.json({ claim: updatedClaim });
//   } catch (error) {
//     console.error("Error updating insurance claim:", error);
//     let errorMessage = "An unknown error occurred";
//     if (error instanceof Error) {
//       errorMessage = error.message;
//       if (errorMessage === "Insurance claim not found") {
//         return NextResponse.json({ error: errorMessage }, { status: 404 });
//       }
//     }
//     return NextResponse.json(
//       { error: "Failed to update insurance claim", details: errorMessage },
//       { status: 500 }
//     );
//   }
// }
