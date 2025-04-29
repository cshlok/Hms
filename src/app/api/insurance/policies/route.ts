// src/app/api/insurance/policies/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getPatientInsurancePoliciesFromDB(filters: any) {
  console.log("Simulating fetching patient insurance policies with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // let query = `
  //   SELECT pi.*, p.name as patient_name, ip.name as provider_name 
  //   FROM patient_insurance pi
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
  // if (filters.is_active !== undefined) {
  //   query += " AND pi.is_active = ?";
  //   params.push(filters.is_active);
  // }
  // 
  // query += " ORDER BY pi.expiry_date DESC";
  // 
  // const { results } = await env.DB.prepare(query).bind(...params).all();
  // return results;
  
  // Return mock data for now
  const mockPatientInsurancePolicies = [
    {
      id: 1,
      patient_id: 101,
      patient_name: "Alice Smith",
      provider_id: 1,
      provider_name: "National Health Insurance",
      policy_number: "NHI12345678",
      plan_name: "Gold Health Plan",
      subscriber_name: "Alice Smith",
      relationship_to_subscriber: "Self",
      effective_date: "2025-01-01",
      expiry_date: "2025-12-31",
      coverage_details: "Covers hospitalization, surgeries, and outpatient consultations. 80% coverage for medications. Annual limit of ₹500,000.",
      is_active: true,
      created_at: "2024-12-15T10:30:00Z",
      updated_at: "2024-12-15T10:30:00Z"
    },
    {
      id: 2,
      patient_id: 102,
      patient_name: "Bob Johnson",
      provider_id: 3,
      provider_name: "Health Secure Insurance",
      policy_number: "HSI87654321",
      plan_name: "Family Health Shield",
      subscriber_name: "Bob Johnson",
      relationship_to_subscriber: "Self",
      effective_date: "2025-02-01",
      expiry_date: "2026-01-31",
      coverage_details: "Family floater plan covering hospitalization, surgeries, and maternity benefits. 90% coverage for medications. Annual limit of ₹1,000,000.",
      is_active: true,
      created_at: "2025-01-20T14:45:00Z",
      updated_at: "2025-01-20T14:45:00Z"
    },
    {
      id: 3,
      patient_id: 103,
      patient_name: "Charlie Brown",
      provider_id: 5,
      provider_name: "Star Health Insurance",
      policy_number: "SHI56789012",
      plan_name: "Comprehensive Health",
      subscriber_name: "Charlie Brown",
      relationship_to_subscriber: "Self",
      effective_date: "2024-11-01",
      expiry_date: "2025-10-31",
      coverage_details: "Covers hospitalization, surgeries, and critical illness. 75% coverage for medications. Annual limit of ₹750,000.",
      is_active: true,
      created_at: "2024-10-15T09:20:00Z",
      updated_at: "2024-10-15T09:20:00Z"
    },
    {
      id: 4,
      patient_id: 104,
      patient_name: "Diana Miller",
      provider_id: 1,
      provider_name: "National Health Insurance",
      policy_number: "NHI23456789",
      plan_name: "Silver Health Plan",
      subscriber_name: "James Miller",
      relationship_to_subscriber: "Spouse",
      effective_date: "2025-03-01",
      expiry_date: "2026-02-28",
      coverage_details: "Covers hospitalization and surgeries. 70% coverage for medications. Annual limit of ₹300,000.",
      is_active: true,
      created_at: "2025-02-15T11:10:00Z",
      updated_at: "2025-02-15T11:10:00Z"
    },
    {
      id: 5,
      patient_id: 105,
      patient_name: "Edward Wilson",
      provider_id: 3,
      provider_name: "Health Secure Insurance",
      policy_number: "HSI98765432",
      plan_name: "Senior Care",
      subscriber_name: "Edward Wilson",
      relationship_to_subscriber: "Self",
      effective_date: "2024-09-01",
      expiry_date: "2025-08-31",
      coverage_details: "Specialized plan for seniors. Covers hospitalization, surgeries, and chronic disease management. 85% coverage for medications. Annual limit of ₹600,000.",
      is_active: false, // Expired or cancelled
      created_at: "2024-08-20T13:30:00Z",
      updated_at: "2025-03-15T16:45:00Z" // Updated when marked as inactive
    }
  ];
  
  return mockPatientInsurancePolicies.filter(policy => {
    // Apply patient filter
    if (filters.patient_id && policy.patient_id.toString() !== filters.patient_id) return false;
    
    // Apply provider filter
    if (filters.provider_id && policy.provider_id.toString() !== filters.provider_id) return false;
    
    // Apply active status filter
    if (filters.is_active !== undefined && policy.is_active !== filters.is_active) return false;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        policy.patient_name.toLowerCase().includes(searchTerm) ||
        policy.provider_name.toLowerCase().includes(searchTerm) ||
        policy.policy_number.toLowerCase().includes(searchTerm) ||
        policy.plan_name.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });
}

// Placeholder function to simulate creating a patient insurance policy
async function createPatientInsurancePolicyInDB(policyData: any) {
  console.log("Simulating creating patient insurance policy:", policyData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   `INSERT INTO patient_insurance (
  //     patient_id, provider_id, policy_number, plan_name, subscriber_name, 
  //     relationship_to_subscriber, effective_date, expiry_date, coverage_details, is_active
  //   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  // ).bind(
  //   policyData.patient_id,
  //   policyData.provider_id,
  //   policyData.policy_number,
  //   policyData.plan_name || null,
  //   policyData.subscriber_name || null,
  //   policyData.relationship_to_subscriber || "Self",
  //   policyData.effective_date,
  //   policyData.expiry_date,
  //   policyData.coverage_details || null,
  //   policyData.is_active !== undefined ? policyData.is_active : true
  // ).run();
  // return { id: info.meta.last_row_id, ...policyData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  
  // Fetch mock patient and provider names for the response
  let patientName = "Unknown Patient";
  let providerName = "Unknown Provider";
  
  // In a real implementation, these would be fetched from the database
  if (policyData.patient_id === 101) patientName = "Alice Smith";
  else if (policyData.patient_id === 102) patientName = "Bob Johnson";
  else if (policyData.patient_id === 103) patientName = "Charlie Brown";
  
  if (policyData.provider_id === 1) providerName = "National Health Insurance";
  else if (policyData.provider_id === 3) providerName = "Health Secure Insurance";
  else if (policyData.provider_id === 5) providerName = "Star Health Insurance";
  
  return {
    id: newId,
    ...policyData,
    patient_name: patientName,
    provider_name: providerName,
    is_active: policyData.is_active !== undefined ? policyData.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Placeholder function to simulate getting a single patient insurance policy
async function getPatientInsurancePolicyByIdFromDB(id: number) {
  console.log("Simulating fetching patient insurance policy by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(`
  //   SELECT pi.*, p.name as patient_name, ip.name as provider_name 
  //   FROM patient_insurance pi
  //   JOIN patients p ON pi.patient_id = p.id
  //   JOIN insurance_providers ip ON pi.provider_id = ip.id
  //   WHERE pi.id = ?
  // `).bind(id).all();
  // 
  // if (results.length === 0) return null;
  // return results[0];
  
  // Return mock data for now
  const mockPatientInsurancePolicies = [
    {
      id: 1,
      patient_id: 101,
      patient_name: "Alice Smith",
      provider_id: 1,
      provider_name: "National Health Insurance",
      policy_number: "NHI12345678",
      plan_name: "Gold Health Plan",
      subscriber_name: "Alice Smith",
      relationship_to_subscriber: "Self",
      effective_date: "2025-01-01",
      expiry_date: "2025-12-31",
      coverage_details: "Covers hospitalization, surgeries, and outpatient consultations. 80% coverage for medications. Annual limit of ₹500,000.",
      is_active: true,
      created_at: "2024-12-15T10:30:00Z",
      updated_at: "2024-12-15T10:30:00Z",
      // Additional details that might be fetched for a single policy
      patient_details: {
        age: 35,
        gender: "Female",
        contact: "+91-9876543210",
        medical_record_number: "MRN00101"
      },
      provider_details: {
        contact_person: "John Smith",
        phone: "+91-9876543210",
        email: "john.smith@nhi.com"
      },
      claims_history: [
        {
          id: 101,
          submission_date: "2025-02-15",
          amount: 25000,
          status: "paid",
          payment_date: "2025-03-01"
        },
        {
          id: 203,
          submission_date: "2025-04-10",
          amount: 15000,
          status: "processing",
          payment_date: null
        }
      ]
    },
    {
      id: 3,
      patient_id: 103,
      patient_name: "Charlie Brown",
      provider_id: 5,
      provider_name: "Star Health Insurance",
      policy_number: "SHI56789012",
      plan_name: "Comprehensive Health",
      subscriber_name: "Charlie Brown",
      relationship_to_subscriber: "Self",
      effective_date: "2024-11-01",
      expiry_date: "2025-10-31",
      coverage_details: "Covers hospitalization, surgeries, and critical illness. 75% coverage for medications. Annual limit of ₹750,000.",
      is_active: true,
      created_at: "2024-10-15T09:20:00Z",
      updated_at: "2024-10-15T09:20:00Z",
      // Additional details that might be fetched for a single policy
      patient_details: {
        age: 28,
        gender: "Male",
        contact: "+91-9876543212",
        medical_record_number: "MRN00103"
      },
      provider_details: {
        contact_person: "Vikram Singh",
        phone: "+91-9876543214",
        email: "vikram.singh@starhealth.com"
      },
      claims_history: [
        {
          id: 152,
          submission_date: "2025-01-20",
          amount: 35000,
          status: "paid",
          payment_date: "2025-02-05"
        }
      ]
    }
  ];
  
  return mockPatientInsurancePolicies.find(policy => policy.id === id) || null;
}

// Placeholder function to simulate updating a patient insurance policy
async function updatePatientInsurancePolicyInDB(id: number, updateData: any) {
  console.log("Simulating updating patient insurance policy:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  // 
  // await env.DB.prepare(
  //   `UPDATE patient_insurance SET ${updateFields}, updated_at = ? WHERE id = ?`
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
 * GET /api/insurance/policies
 * Retrieves a list of patient insurance policies, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get("patient_id");
    const provider_id = searchParams.get("provider_id");
    const is_active = searchParams.get("is_active") === "true" ? true : 
                     searchParams.get("is_active") === "false" ? false : undefined;
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { patient_id, provider_id, is_active, search };
    
    // Check if this is a request for a specific patient insurance policy
    const path = request.nextUrl.pathname;
    if (path.match(/\/api\/insurance\/policies\/\d+$/)) {
      const id = parseInt(path.split('/').pop() || '0');
      if (id > 0) {
        const policy = await getPatientInsurancePolicyByIdFromDB(id);
        if (!policy) {
          return NextResponse.json({ error: "Patient insurance policy not found" }, { status: 404 });
        }
        return NextResponse.json({ policy });
      }
    }
    
    // Otherwise, return filtered list
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
    const policyData = await request.json();

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

/**
 * PUT /api/insurance/policies/[id]
 * Updates an existing patient insurance policy.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = parseInt(path.split('/').pop() || '0');
    
    if (id <= 0) {
      return NextResponse.json({ error: "Invalid patient insurance policy ID" }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Simulate updating the patient insurance policy in the database
    const updatedPolicy = await updatePatientInsurancePolicyInDB(id, updateData);

    return NextResponse.json({ policy: updatedPolicy });
  } catch (error) {
    console.error("Error updating patient insurance policy:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update patient insurance policy", details: errorMessage },
      { status: 500 }
    );
  }
}
