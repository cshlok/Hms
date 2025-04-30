import { NextRequest, NextResponse } from "next/server";

// Define interface for Insurance Provider data
interface InsuranceProvider {
  id: number | string;
  name: string;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  is_active: number; // Assuming 1 for active, 0 for inactive
}

// Mock data store for insurance providers (replace with actual DB interaction)
const mockProviders: InsuranceProvider[] = [
  { id: 1, name: "MediCare Insurance", contact_person: "Alice Brown", contact_email: "alice@medicare.com", contact_phone: "555-1111", address: "123 Insurance St", is_active: 1 },
  { id: 2, name: "HealthGuard Plus", contact_person: "Bob White", contact_email: "bob@healthguard.com", contact_phone: "555-2222", address: "456 Provider Ave", is_active: 1 },
];
let nextProviderId = 3;

// Define interface for insurance provider creation input
interface InsuranceProviderInput {
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean; // Defaults to true
}

// Define interface for insurance provider update input
interface InsuranceProviderUpdateInput {
  name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
}

// Define interface for insurance provider filters
interface InsuranceProviderFilters {
  is_active?: string | null; // Expecting "true" or "false"
}

// Helper function to simulate DB interaction (GET)
async function getInsuranceProvidersFromDB(filters: InsuranceProviderFilters = {}) {
  console.log("Simulating DB fetch for insurance providers with filters:", filters);
  // Apply filters if implemented
  let filteredProviders = [...mockProviders];
  if (filters.is_active !== undefined) {
    const activeBool = String(filters.is_active).toLowerCase() === "true";
    filteredProviders = filteredProviders.filter(p => (p.is_active === 1) === activeBool);
  }
  return filteredProviders.sort((a, b) => a.name.localeCompare(b.name));
}


// Helper function to simulate DB interaction (POST)
async function createInsuranceProviderInDB(data: InsuranceProviderInput) {
  console.log("Simulating DB create for insurance provider:", data);
  // const now = new Date().toISOString(); // Not used in mock, but would be in real DB
  const newProvider = {
    id: nextProviderId++,
    name: data.name,
    contact_person: data.contact_person || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    address: data.address || null,
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, // Default active
    // created_at: now, // Add if needed
    // updated_at: now, // Add if needed
  };
  mockProviders.push(newProvider);
  return newProvider;
}

// Helper function to simulate DB interaction (PUT)
async function updateInsuranceProviderInDB(id: number, data: InsuranceProviderUpdateInput) {
  console.log(`Simulating DB update for insurance provider ID ${id}:`, data);
  const providerIndex = mockProviders.findIndex((p) => p.id === id);
  if (providerIndex === -1) {
    throw new Error("Insurance provider not found");
  }
  
  // Handle boolean conversion if necessary
  const updatePayload: Partial<InsuranceProvider> = { ...data };
  if (data.is_active !== undefined) {
    updatePayload.is_active = data.is_active ? 1 : 0;
  }
  
  const updatedProvider = { 
    ...mockProviders[providerIndex], 
    ...updatePayload, // Apply updates
    // updated_at: new Date().toISOString(), // Add if needed
  };
  mockProviders[providerIndex] = updatedProvider;
  return updatedProvider;
}

/**
 * GET /api/insurance/providers
 * Retrieves a list of insurance providers, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Example filters
    const filters = {
      is_active: searchParams.get("is_active"), // "true" or "false"
    };

    const providers = await getInsuranceProvidersFromDB(filters);
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Error fetching insurance providers:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch insurance providers", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insurance/providers
 * Creates a new insurance provider.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Fixed: Apply type assertion
    const providerData = body as InsuranceProviderInput;

    // Basic validation (add more comprehensive validation)
    if (!providerData.name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    // Simulate creating the insurance provider in the database
    const newProvider = await createInsuranceProviderInDB(providerData);

    return NextResponse.json({ provider: newProvider }, { status: 201 });
  } catch (error) {
    console.error("Error creating insurance provider:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create insurance provider", details: errorMessage },
      { status: 500 }
    );
  }
}

// Note: GET by ID, PUT, and DELETE handlers should be in the [id]/route.ts file.
// The PUT handler below seems misplaced in this file which handles the collection (/api/insurance/providers).
// It should likely be moved to /api/insurance/providers/[id]/route.ts.

/**
 * PUT /api/insurance/providers/[id]  <-- This handler likely belongs in [id]/route.ts
 * Updates an existing insurance provider.
 */
// export async function PUT(request: NextRequest) { // Commenting out as it's likely misplaced
//   try {
//     const path = request.nextUrl.pathname;
//     const idString = path.split("/").pop();
//     const id = idString ? parseInt(idString) : 0;
    
//     if (!id || id <= 0) {
//       return NextResponse.json({ error: "Invalid or missing insurance provider ID in URL path" }, { status: 400 });
//     }
    
//     const body = await request.json();
//     // Fixed: Apply type assertion
//     const updateData = body as InsuranceProviderUpdateInput;
    
//     // Simulate updating the insurance provider in the database
//     const updatedProvider = await updateInsuranceProviderInDB(id, updateData);

//     return NextResponse.json({ provider: updatedProvider });
//   } catch (error) {
//     console.error("Error updating insurance provider:", error);
//     let errorMessage = "An unknown error occurred";
//     if (error instanceof Error) {
//       errorMessage = error.message;
//       if (errorMessage === "Insurance provider not found") {
//         return NextResponse.json({ error: errorMessage }, { status: 404 });
//       }
//     }
//     return NextResponse.json(
//       { error: "Failed to update insurance provider", details: errorMessage },
//       { status: 500 }
//     );
//   }
// }

