import { NextRequest, NextResponse } from "next/server";
// import { v4 as uuidv4 } from "uuid"; // Unused import

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
// FIX: Changed let to const for prefer-const rule
const mockProviders: InsuranceProvider[] = [
  {
    id: 1,
    name: "MediCare Insurance",
    contact_person: "Alice Brown",
    contact_email: "alice@medicare.com",
    contact_phone: "555-1111",
    address: "123 Insurance St",
    is_active: 1,
  },
  {
    id: 2,
    name: "HealthGuard Plus",
    contact_person: "Bob White",
    contact_email: "bob@healthguard.com",
    contact_phone: "555-2222",
    address: "456 Provider Ave",
    is_active: 1,
  },
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

// Define interface for insurance provider update input - Belongs in [id]/route.ts
// interface InsuranceProviderUpdateInput {
//   name?: string;
//   contact_person?: string;
//   contact_email?: string;
//   contact_phone?: string;
//   address?: string;
//   is_active?: boolean;
// }

// Define interface for insurance provider filters
interface InsuranceProviderFilters {
  is_active?: string | null; // Expecting "true" or "false"
}

// Helper function to simulate DB interaction (GET)
async function getInsuranceProvidersFromDB(
  filters: InsuranceProviderFilters = {}
) {
  console.log(
    "Simulating DB fetch for insurance providers with filters:",
    filters
  );
  let filteredProviders = [...mockProviders];
  // FIX: Check filters.is_active before using (TS18049)
  if (filters.is_active !== undefined && filters.is_active !== undefined) {
    const activeBool = String(filters.is_active).toLowerCase() === "true";
    filteredProviders = filteredProviders.filter(
      (p) => (p.is_active === 1) === activeBool
    );
  }
  return filteredProviders.sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to simulate DB interaction (GET by ID) - Belongs in [id]/route.ts
// async function getInsuranceProviderByIdFromDB(id: number) { // Unused function
//   console.log("Simulating DB fetch for insurance provider ID:", id);
//   const provider = mockProviders.find(p => p.id === id);
//   if (!provider) {
//     throw new Error("Insurance provider not found");
//   }
//   return provider;
// }

// Helper function to simulate DB interaction (POST)
async function createInsuranceProviderInDB(
  data: InsuranceProviderInput
): Promise<InsuranceProvider> {
  // Added return type
  console.log("Simulating DB create for insurance provider:", data);
  // const now = new Date().toISOString(); // Unused variable
  // FIX: Ensure created object matches InsuranceProvider interface
  const newProvider: InsuranceProvider = {
    id: nextProviderId++,
    name: data.name,
    contact_person: data.contact_person || undefined,
    contact_email: data.contact_email || undefined,
    contact_phone: data.contact_phone || undefined,
    address: data.address || undefined,
    is_active: data.is_active === undefined ? 1 : data.is_active ? 1 : 0, // Default active
    // created_at: now, // Add if needed
    // updated_at: now, // Add if needed
  };
  mockProviders.push(newProvider);
  return newProvider;
}

// Helper function to simulate DB interaction (PUT) - Belongs in [id]/route.ts
// async function updateInsuranceProviderInDB(id: number, data: InsuranceProviderUpdateInput) { // Unused function
//   console.log(`Simulating DB update for insurance provider ID ${id}:`, data);
//   const providerIndex = mockProviders.findIndex((p) => p.id === id);
//   if (providerIndex === -1) {
//     throw new Error("Insurance provider not found");
//   }

//   // Handle boolean conversion if necessary
//   const updatePayload: Partial<InsuranceProvider> = { ...data };
//   if (data.is_active !== undefined) {
//     updatePayload.is_active = data.is_active ? 1 : 0;
//   }

//   const updatedProvider = {
//     ...mockProviders[providerIndex],
//     ...updatePayload, // Apply updates
//     // updated_at: new Date().toISOString(), // Add if needed
//   };
//   mockProviders[providerIndex] = updatedProvider;
//   return updatedProvider;
// }

/**
 * GET /api/insurance/providers
 * Retrieves a list of insurance providers, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: InsuranceProviderFilters = {
      is_active: searchParams.get("is_active"), // "true" or "false"
    };

    const providers = await getInsuranceProvidersFromDB(filters);
    return NextResponse.json({ providers });
  } catch (error: unknown) {
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
    // Apply type assertion
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
  } catch (error: unknown) {
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
