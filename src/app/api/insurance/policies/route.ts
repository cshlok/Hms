import { NextRequest, NextResponse } from "next/server";

// Define interface for Insurance Provider data
interface InsuranceProvider {
  id: number | string;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: number; // Assuming 1 for active, 0 for inactive
}

// Define interface for Patient Insurance Policy data
interface InsurancePolicy {
  id: number | string;
  patient_id: number | string;
  provider_id: number | string;
  policy_number: string;
  group_number?: string | null;
  subscriber_name?: string | null;
  subscriber_dob?: string | null; // YYYY-MM-DD
  relationship_to_patient?: string;
  effective_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  coverage_details?: string | null;
  is_primary: number; // Assuming 1 for primary, 0 for secondary
  is_active: number; // Assuming 1 for active, 0 for inactive
  verification_status?: string | null; // e.g., "Verified", "Pending", "Rejected"
  verified_by_id?: number | string | null;
  verified_at?: string | null; // ISO string
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

// Mock data store for insurance providers (replace with actual DB interaction)
const mockProviders: InsuranceProvider[] = [
  { id: 1, name: "MediCare Insurance", contact_person: "Alice Brown", contact_email: "alice@medicare.com", contact_phone: "555-1111", address: "123 Insurance St", is_active: 1 },
  { id: 2, name: "HealthGuard Plus", contact_person: "Bob White", contact_email: "bob@healthguard.com", contact_phone: "555-2222", address: "456 Provider Ave", is_active: 1 },
];
// const nextProviderId = 3; // This seems unused in this file

// Mock data store for patient insurance policies (replace with actual DB interaction)
const mockPolicies: InsurancePolicy[] = [
  {
    id: 101,
    patient_id: 101,
    provider_id: 1,
    policy_number: "MC123456789",
    group_number: "GRP100",
    subscriber_name: "John Doe",
    subscriber_dob: "1980-05-15",
    relationship_to_patient: "Self",
    effective_date: "2024-01-01",
    expiry_date: "2024-12-31",
    coverage_details: "Full coverage, $500 deductible",
    is_primary: 1,
    is_active: 1,
    verification_status: "Verified",
    verified_by_id: 501, // User ID
    verified_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 102,
    patient_id: 102,
    provider_id: 2,
    policy_number: "HG987654321",
    group_number: "GRP200",
    subscriber_name: "Jane Smith",
    subscriber_dob: "1985-08-20",
    relationship_to_patient: "Self",
    effective_date: "2024-03-01",
    expiry_date: "2025-02-28",
    coverage_details: "Basic coverage, $1000 deductible",
    is_primary: 1,
    is_active: 1,
    verification_status: "Pending",
    verified_by_id: null,
    verified_at: null,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
let nextPolicyId = 103;

// Define interface for patient insurance policy creation input
interface InsurancePolicyInput {
  patient_id: number | string;
  provider_id: number | string;
  policy_number: string;
  group_number?: string;
  subscriber_name?: string;
  subscriber_dob?: string; // YYYY-MM-DD
  relationship_to_patient?: string;
  effective_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
  coverage_details?: string;
  is_primary?: boolean;
  is_active?: boolean; // Defaults to true
}

// Define interface for patient insurance policy update input
interface InsurancePolicyUpdateInput {
  provider_id?: number | string;
  policy_number?: string;
  group_number?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  relationship_to_patient?: string;
  effective_date?: string;
  expiry_date?: string;
  coverage_details?: string;
  is_primary?: boolean;
  is_active?: boolean;
  verification_status?: string; // e.g., "Verified", "Pending", "Rejected"
  verified_by_id?: number | string | null;
  verified_at?: string | null; // ISO string
}

// Define interface for patient insurance policy filters
interface InsurancePolicyFilters {
  patient_id?: string | null;
  provider_id?: string | null;
  is_active?: string | null; // Expecting "true" or "false"
}

// Helper function to simulate DB interaction (GET Policies)
async function getPatientInsurancePoliciesFromDB(filters: InsurancePolicyFilters = {}) {
  console.log("Simulating DB fetch for patient insurance policies with filters:", filters);
  let filteredPolicies = [...mockPolicies];
  
  if (filters.patient_id) {
    filteredPolicies = filteredPolicies.filter(p => p.patient_id === parseInt(filters.patient_id));
  }
  if (filters.provider_id) {
    filteredPolicies = filteredPolicies.filter(p => p.provider_id === parseInt(filters.provider_id));
  }
  if (filters.is_active !== undefined) {
    const activeBool = String(filters.is_active).toLowerCase() === "true";
    filteredPolicies = filteredPolicies.filter(p => (p.is_active === 1) === activeBool);
  }
  
  return filteredPolicies.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}


// Helper function to simulate DB interaction (POST Policy)
async function createPatientInsurancePolicyInDB(data: InsurancePolicyInput) {
  console.log("Simulating DB create for patient insurance policy:", data);
  const now = new Date().toISOString();
  const newPolicy = {
    id: nextPolicyId++,
    patient_id: data.patient_id,
    provider_id: data.provider_id,
    policy_number: data.policy_number,
    group_number: data.group_number || null,
    subscriber_name: data.subscriber_name || null,
    subscriber_dob: data.subscriber_dob || null,
    relationship_to_patient: data.relationship_to_patient || "Self",
    effective_date: data.effective_date,
    expiry_date: data.expiry_date,
    coverage_details: data.coverage_details || null,
    is_primary: data.is_primary ? 1 : 0,
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, // Default active
    verification_status: "Pending",
    verified_by_id: null,
    verified_at: null,
    created_at: now,
    updated_at: now,
  };
  mockPolicies.push(newPolicy);
  return newPolicy;
}


/**
 * GET /api/insurance/policies
 * Retrieves a list of patient insurance policies, potentially filtered by patient_id.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Example filters
    const filters = {
      patient_id: searchParams.get("patient_id"),
      provider_id: searchParams.get("provider_id"),
      is_active: searchParams.get("is_active"), // "true" or "false"
    };

    const policies = await getPatientInsurancePoliciesFromDB(filters);
    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Error fetching patient insurance policies:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch patient insurance policies", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insurance/policies
 * Creates a new patient insurance policy.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Fixed: Apply type assertion
    const policyData = body as InsurancePolicyInput;

    // Basic validation (add more comprehensive validation)
    if (!policyData.patient_id || !policyData.provider_id || !policyData.policy_number || !policyData.effective_date || !policyData.expiry_date) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, provider_id, policy_number, effective_date, expiry_date)" },
        { status: 400 }
      );
    }

    // Simulate creating the patient insurance policy in the database
    const newPolicy = await createPatientInsurancePolicyInDB(policyData);

    return NextResponse.json({ policy: newPolicy }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient insurance policy:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create patient insurance policy", details: errorMessage },
      { status: 500 }
    );
  }
}

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
// The PUT handler below seems misplaced in this file which handles the collection (/api/insurance/policies).
// It should likely be moved to /api/insurance/policies/[id]/route.ts.

/**
 * PUT /api/insurance/policies/[id]  <-- This handler likely belongs in [id]/route.ts
 * Updates an existing patient insurance policy.
 */
// export async function PUT(request: NextRequest) { // Commenting out as it's likely misplaced
//   try {
//     const path = request.nextUrl.pathname;
//     const idString = path.split("/").pop();
//     const id = idString ? parseInt(idString) : 0;
    
//     if (!id || id <= 0) {
//       return NextResponse.json({ error: "Invalid or missing patient insurance policy ID in URL path" }, { status: 400 });
//     }
    
//     const body = await request.json();
//     const updateData = body as InsurancePolicyUpdateInput;
    
//     // Simulate updating the patient insurance policy in the database
//     const updatedPolicy = await updatePatientInsurancePolicyInDB(id, updateData);

//     return NextResponse.json({ policy: updatedPolicy });
//   } catch (error) {
//     console.error("Error updating patient insurance policy:", error);
//     let errorMessage = "An unknown error occurred";
//     if (error instanceof Error) {
//       errorMessage = error.message;
//       if (errorMessage === "Patient insurance policy not found") {
//         return NextResponse.json({ error: errorMessage }, { status: 404 });
//       }
//     }
//     return NextResponse.json(
//       { error: "Failed to update patient insurance policy", details: errorMessage },
//       { status: 500 }
//     );
//   }
// }

