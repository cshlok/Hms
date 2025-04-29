// src/app/api/insurance/claims/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getInsuranceClaimsFromDB(filters: any) {
  console.log("Simulating fetching insurance claims with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // let query = `
  //   SELECT ic.*, pi.policy_number, p.name as patient_name, ip.name as provider_name, inv.invoice_number, inv.total_amount as invoice_amount
  //   FROM insurance_claims ic
  //   JOIN patient_insurance pi ON ic.patient_insurance_id = pi.id
  //   JOIN patients p ON pi.patient_id = p.id
  //   JOIN insurance_providers ip ON pi.provider_id = ip.id
  //   JOIN invoices inv ON ic.invoice_id = inv.id
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
  // if (filters.invoice_id) {
  //   query += " AND ic.invoice_id = ?";
  //   params.push(filters.invoice_id);
  // }
  // 
  // if (filters.status) {
  //   query += " AND ic.status = ?";
  //   params.push(filters.status);
  // }
  // 
  // query += " ORDER BY ic.claim_submission_date DESC";
  // 
  // const { results } = await env.DB.prepare(query).bind(...params).all();
  // return results;
  
  // Return mock data for now
  const mockInsuranceClaims = [
    {
      id: 1,
      patient_insurance_id: 1,
      policy_number: "NHI12345678",
      patient_name: "Alice Smith",
      provider_name: "National Health Insurance",
      invoice_id: 1001,
      invoice_number: "INV-2025-1001",
      invoice_amount: 75000,
      claim_submission_date: "2025-04-10T10:00:00Z",
      claim_amount: 75000,
      status: "paid",
      provider_claim_number: "CLAIM-NHI-001",
      approved_amount: 70000,
      paid_amount: 70000,
      rejection_reason: null,
      payment_date: "2025-04-25T14:00:00Z",
      notes: "Claim processed and paid successfully.",
      created_at: "2025-04-10T10:00:00Z",
      updated_at: "2025-04-25T14:00:00Z"
    },
    {
      id: 2,
      patient_insurance_id: 2,
      policy_number: "HSI87654321",
      patient_name: "Bob Johnson",
      provider_name: "Health Secure Insurance",
      invoice_id: 1002,
      invoice_number: "INV-2025-1002",
      invoice_amount: 250000,
      claim_submission_date: "2025-04-15T11:30:00Z",
      claim_amount: 250000,
      status: "processing",
      provider_claim_number: "CLAIM-HSI-002",
      approved_amount: null,
      paid_amount: null,
      rejection_reason: null,
      payment_date: null,
      notes: "Claim under review by the provider.",
      created_at: "2025-04-15T11:30:00Z",
      updated_at: "2025-04-15T11:30:00Z"
    },
    {
      id: 3,
      patient_insurance_id: 3,
      policy_number: "SHI56789012",
      patient_name: "Charlie Brown",
      provider_name: "Star Health Insurance",
      invoice_id: 1003,
      invoice_number: "INV-2025-1003",
      invoice_amount: 150000,
      claim_submission_date: "2025-04-20T09:15:00Z",
      claim_amount: 150000,
      status: "rejected",
      provider_claim_number: "CLAIM-SHI-003",
      approved_amount: null,
      paid_amount: null,
      rejection_reason: "Pre-authorization was rejected.",
      payment_date: null,
      notes: "Claim rejected due to prior pre-auth rejection.",
      created_at: "2025-04-20T09:15:00Z",
      updated_at: "2025-04-22T16:00:00Z"
    },
    {
      id: 4,
      patient_insurance_id: 4,
      policy_number: "NHI23456789",
      patient_name: "Diana Miller",
      provider_name: "National Health Insurance",
      invoice_id: 1004,
      invoice_number: "INV-2025-1004",
      invoice_amount: 90000,
      claim_submission_date: "2025-04-25T16:00:00Z",
      claim_amount: 90000,
      status: "partially_approved",
      provider_claim_number: "CLAIM-NHI-004",
      approved_amount: 63000, // 70% of 90000
      paid_amount: 63000,
      rejection_reason: "Partial rejection based on policy coverage limits for specific items.",
      payment_date: "2025-05-10T10:00:00Z",
      notes: "Claim partially approved and paid.",
      created_at: "2025-04-25T16:00:00Z",
      updated_at: "2025-05-10T10:00:00Z"
    }
  ];
  
  return mockInsuranceClaims.filter(claim => {
    // Apply patient insurance filter (using patient_insurance_id instead of patient_id)
    if (filters.patient_id && claim.patient_insurance_id.toString() !== filters.patient_id) return false;
    
    // Skip provider filter as provider_id is not directly available in the mock data
    // We could implement this by adding provider_id to the mock data or using a different approach
    
    // Apply invoice filter
    if (filters.invoice_id && claim.invoice_id.toString() !== filters.invoice_id) return false;
    
    // Apply status filter
    if (filters.status && claim.status !== filters.status) return false;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        claim.patient_name.toLowerCase().includes(searchTerm) ||
        claim.provider_name.toLowerCase().includes(searchTerm) ||
        claim.policy_number.toLowerCase().includes(searchTerm) ||
        claim.invoice_number.toLowerCase().includes(searchTerm) ||
        (claim.provider_claim_number && claim.provider_claim_number.toLowerCase().includes(searchTerm))
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating an insurance claim
async function createInsuranceClaimInDB(claimData: any) {
  console.log("Simulating creating insurance claim:", claimData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   `INSERT INTO insurance_claims (
  //     patient_insurance_id, invoice_id, claim_amount, status, notes
  //   ) VALUES (?, ?, ?, ?, ?)`
  // ).bind(
  //   claimData.patient_insurance_id,
  //   claimData.invoice_id,
  //   claimData.claim_amount,
  //   claimData.status || "submitted",
  //   claimData.notes || null
  // ).run();
  // return { id: info.meta.last_row_id, ...claimData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  
  // Fetch mock patient, provider, policy, invoice details for the response
  let patientName = "Unknown Patient";
  let providerName = "Unknown Provider";
  let policyNumber = "Unknown Policy";
  let invoiceNumber = "Unknown Invoice";
  let invoiceAmount = 0;
  
  // In a real implementation, these would be fetched from the database
  if (claimData.patient_insurance_id === 1) {
    patientName = "Alice Smith";
    providerName = "National Health Insurance";
    policyNumber = "NHI12345678";
  } else if (claimData.patient_insurance_id === 2) {
    patientName = "Bob Johnson";
    providerName = "Health Secure Insurance";
    policyNumber = "HSI87654321";
  }
  
  if (claimData.invoice_id === 1001) {
    invoiceNumber = "INV-2025-1001";
    invoiceAmount = 75000;
  } else if (claimData.invoice_id === 1002) {
    invoiceNumber = "INV-2025-1002";
    invoiceAmount = 250000;
  }
  
  return {
    id: newId,
    ...claimData,
    patient_name: patientName,
    provider_name: providerName,
    policy_number: policyNumber,
    invoice_number: invoiceNumber,
    invoice_amount: invoiceAmount,
    status: claimData.status || "submitted",
    claim_submission_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single insurance claim
async function getInsuranceClaimByIdFromDB(id: number) {
  console.log("Simulating fetching insurance claim by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(`
  //   SELECT ic.*, pi.policy_number, p.name as patient_name, ip.name as provider_name, inv.invoice_number, inv.total_amount as invoice_amount
  //   FROM insurance_claims ic
  //   JOIN patient_insurance pi ON ic.patient_insurance_id = pi.id
  //   JOIN patients p ON pi.patient_id = p.id
  //   JOIN insurance_providers ip ON pi.provider_id = ip.id
  //   JOIN invoices inv ON ic.invoice_id = inv.id
  //   WHERE ic.id = ?
  // `).bind(id).all();
  // 
  // if (results.length === 0) return null;
  // return results[0];
  
  // Return mock data for now
  const mockInsuranceClaims = [
    {
      id: 1,
      patient_insurance_id: 1,
      policy_number: "NHI12345678",
      patient_name: "Alice Smith",
      provider_name: "National Health Insurance",
      invoice_id: 1001,
      invoice_number: "INV-2025-1001",
      invoice_amount: 75000,
      claim_submission_date: "2025-04-10T10:00:00Z",
      claim_amount: 75000,
      status: "paid",
      provider_claim_number: "CLAIM-NHI-001",
      approved_amount: 70000,
      paid_amount: 70000,
      rejection_reason: null,
      payment_date: "2025-04-25T14:00:00Z",
      notes: "Claim processed and paid successfully.",
      created_at: "2025-04-10T10:00:00Z",
      updated_at: "2025-04-25T14:00:00Z",
      // Additional details for single view
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101"
      },
      invoice_details: {
        date: "2025-04-08",
        items: [
          { description: "Appendectomy Procedure", amount: 60000 },
          { description: "Room Charges (2 days)", amount: 10000 },
          { description: "Medications", amount: 5000 }
        ]
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
      invoice_id: 1002,
      invoice_number: "INV-2025-1002",
      invoice_amount: 250000,
      claim_submission_date: "2025-04-15T11:30:00Z",
      claim_amount: 250000,
      status: "processing",
      provider_claim_number: "CLAIM-HSI-002",
      approved_amount: null,
      paid_amount: null,
      rejection_reason: null,
      payment_date: null,
      notes: "Claim under review by the provider.",
      created_at: "2025-04-15T11:30:00Z",
      updated_at: "2025-04-15T11:30:00Z",
      // Additional details for single view
      patient_details: {
        age: 55,
        gender: "Male",
        contact: "+91-9876543211",
        medical_record_number: "MRN00102"
      },
      invoice_details: {
        date: "2025-04-12",
        items: [
          { description: "Knee Replacement Surgery", amount: 200000 },
          { description: "Room Charges (5 days)", amount: 25000 },
          { description: "Medications & Consumables", amount: 25000 }
        ]
      },
      policy_details: {
        plan_name: "Family Health Shield",
        expiry_date: "2026-01-31"
      }
    }
  ];
  
  return mockInsuranceClaims.find(claim => claim.id === id) || null;
}

// Placeholder function to simulate updating an insurance claim
async function updateInsuranceClaimInDB(id: number, updateData: any) {
  console.log("Simulating updating insurance claim:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // 
  // await env.DB.prepare(
  //   `UPDATE insurance_claims SET ${updateFields}, updated_at = ? WHERE id = ?`
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
 * GET /api/insurance/claims
 * Retrieves a list of insurance claims, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get("patient_id");
    const provider_id = searchParams.get("provider_id");
    const invoice_id = searchParams.get("invoice_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { patient_id, provider_id, invoice_id, status, search };
    
    // Check if this is a request for a specific insurance claim
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/insurance\/claims\/\d+$/)) {
      const id = parseInt(path.split("/").pop() || "0");
      if (id > 0) {
        const claim = await getInsuranceClaimByIdFromDB(id);
        if (!claim) {
          return NextResponse.json({ error: "Insurance claim not found" }, { status: 404 });
        }
        return NextResponse.json({ claim });
      }
    }
    
    // Otherwise, return filtered list
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
    const claimData = await request.json();

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

/**
 * PUT /api/insurance/claims/[id]
 * Updates an existing insurance claim.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split("/").pop() || "0");
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid insurance claim ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the insurance claim in the database
    const updatedClaim = await updateInsuranceClaimInDB(id, updateData);

    return NextResponse.json({ claim: updatedClaim });
  } catch (error) {
    console.error("Error updating insurance claim:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update insurance claim", details: errorMessage },
      { status: 500 }
    );
  }
}
