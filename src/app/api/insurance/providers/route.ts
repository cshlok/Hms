// src/app/api/insurance/providers/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getInsuranceProvidersFromDB(filters: any) {
  console.log("Simulating fetching insurance providers with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT * FROM insurance_providers " +
  //   "WHERE (? IS NULL OR is_tpa = ?) " +
  //   "ORDER BY name ASC"
  // ).bind(
  //   filters.is_tpa !== undefined ? filters.is_tpa : null,
  //   filters.is_tpa !== undefined ? filters.is_tpa : null
  // ).all();
  // return results;
  
  // Return mock data for now
  const mockInsuranceProviders = [
    {
      id: 1,
      name: "National Health Insurance",
      contact_person: "John Smith",
      phone: "+91-9876543210",
      email: "john.smith@nhi.com",
      address: "123 Insurance Plaza, Mumbai, 400001",
      is_tpa: false,
      created_at: "2025-01-10T10:30:00Z",
      updated_at: "2025-01-10T10:30:00Z"
    },
    {
      id: 2,
      name: "MediAssist TPA",
      contact_person: "Priya Sharma",
      phone: "+91-9876543211",
      email: "priya.sharma@mediassist.com",
      address: "456 TPA Tower, Bangalore, 560001",
      is_tpa: true,
      created_at: "2025-01-15T11:45:00Z",
      updated_at: "2025-01-15T11:45:00Z"
    },
    {
      id: 3,
      name: "Health Secure Insurance",
      contact_person: "Rajesh Kumar",
      phone: "+91-9876543212",
      email: "rajesh.kumar@healthsecure.com",
      address: "789 Insurance House, Delhi, 110001",
      is_tpa: false,
      created_at: "2025-02-05T09:20:00Z",
      updated_at: "2025-02-05T09:20:00Z"
    },
    {
      id: 4,
      name: "Family Health TPA",
      contact_person: "Anita Desai",
      phone: "+91-9876543213",
      email: "anita.desai@familyhealth.com",
      address: "101 Care Building, Chennai, 600001",
      is_tpa: true,
      created_at: "2025-02-20T14:10:00Z",
      updated_at: "2025-02-20T14:10:00Z"
    },
    {
      id: 5,
      name: "Star Health Insurance",
      contact_person: "Vikram Singh",
      phone: "+91-9876543214",
      email: "vikram.singh@starhealth.com",
      address: "202 Star Tower, Hyderabad, 500001",
      is_tpa: false,
      created_at: "2025-03-10T16:30:00Z",
      updated_at: "2025-03-10T16:30:00Z"
    }
  ];
  
  return mockInsuranceProviders.filter(provider => {
    // Apply TPA filter
    if (filters.is_tpa !== undefined && provider.is_tpa !== filters.is_tpa) return false;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        provider.name.toLowerCase().includes(searchTerm) ||
        provider.contact_person.toLowerCase().includes(searchTerm) ||
        provider.email.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating an insurance provider
async function createInsuranceProviderInDB(providerData: any) {
  console.log("Simulating creating insurance provider:", providerData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO insurance_providers (name, contact_person, phone, email, address, is_tpa) VALUES (?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   providerData.name,
  //   providerData.contact_person || null,
  //   providerData.phone || null,
  //   providerData.email || null,
  //   providerData.address || null,
  //   providerData.is_tpa || false
  // ).run();
  // return { id: info.meta.last_row_id, ...providerData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  
  return {
    id: newId,
    ...providerData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single insurance provider
async function getInsuranceProviderByIdFromDB(id: number) {
  console.log("Simulating fetching insurance provider by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT * FROM insurance_providers WHERE id = ?"
  // ).bind(id).all();
  // return results[0];
  
  // Return mock data for now
  const mockInsuranceProviders = [
    {
      id: 1,
      name: "National Health Insurance",
      contact_person: "John Smith",
      phone: "+91-9876543210",
      email: "john.smith@nhi.com",
      address: "123 Insurance Plaza, Mumbai, 400001",
      is_tpa: false,
      created_at: "2025-01-10T10:30:00Z",
      updated_at: "2025-01-10T10:30:00Z",
      // Additional details that might be fetched for a single provider
      website: "https://www.nhi.com",
      registration_number: "INS12345",
      active_policies_count: 1250,
      average_claim_processing_time: "7 days"
    },
    {
      id: 3,
      name: "Health Secure Insurance",
      contact_person: "Rajesh Kumar",
      phone: "+91-9876543212",
      email: "rajesh.kumar@healthsecure.com",
      address: "789 Insurance House, Delhi, 110001",
      is_tpa: false,
      created_at: "2025-02-05T09:20:00Z",
      updated_at: "2025-02-05T09:20:00Z",
      // Additional details that might be fetched for a single provider
      website: "https://www.healthsecure.com",
      registration_number: "INS67890",
      active_policies_count: 980,
      average_claim_processing_time: "10 days"
    }
  ];
  
  return mockInsuranceProviders.find(provider => provider.id === id) || null;
}

// Placeholder function to simulate updating an insurance provider
async function updateInsuranceProviderInDB(id: number, updateData: any) {
  console.log("Simulating updating insurance provider:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // 
  // await env.DB.prepare(
  //   `UPDATE insurance_providers SET ${updateFields}, updated_at = ? WHERE id = ?`
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
 * GET /api/insurance/providers
 * Retrieves a list of insurance providers, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const is_tpa = searchParams.get("is_tpa") === "true" ? true : 
                  searchParams.get("is_tpa") === "false" ? false : undefined;
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { is_tpa, search };
    
    // Check if this is a request for a specific insurance provider
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/insurance\/providers\/\d+$/)) {
      const id = parseInt(path.split('/').pop() || '0');
      if (id > 0) {
        const provider = await getInsuranceProviderByIdFromDB(id);
        if (!provider) {
          return NextResponse.json({ error: "Insurance provider not found" }, { status: 404 });
        }
        return NextResponse.json({ provider });
      }
    }
    
    // Otherwise, return filtered list
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
    const providerData = await request.json();

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

/**
 * PUT /api/insurance/providers/[id]
 * Updates an existing insurance provider.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split('/').pop() || '0');
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid insurance provider ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the insurance provider in the database
    const updatedProvider = await updateInsuranceProviderInDB(id, updateData);

    return NextResponse.json({ provider: updatedProvider });
  } catch (error) {
    console.error("Error updating insurance provider:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update insurance provider", details: errorMessage },
      { status: 500 }
    );
  }
}
