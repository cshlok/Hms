// src/app/api/pharmacy/inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// FIX: Define interface for filters
interface MedicationFilters {
  category?: string | null;
  status?: string | null;
  manufacturer?: string | null;
  search?: string | null;
}

// Placeholder function to simulate database interaction
async function getMedicationsFromDB(filters: MedicationFilters) {
  // FIX: Use MedicationFilters interface
  console.log("Simulating fetching medications with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT * FROM pharmacy_inventory " +
  //   "WHERE (? IS NULL OR category = ?) " +
  //   "ORDER BY name ASC"
  // ).bind(
  //   filters.category || null,
  //   filters.category || null
  // ).all();
  // return results;

  // Return mock data for now
  const mockMedications = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      generic_name: "Paracetamol",
      category: "Analgesic",
      form: "Tablet",
      strength: "500mg",
      manufacturer: "ABC Pharmaceuticals",
      batch_number: "BN20250315",
      expiry_date: "2027-03-15",
      current_stock: 1250,
      reorder_level: 200,
      unit_price: 2.5,
      location: "Shelf A-12",
      status: "active", // active, low_stock, out_of_stock, expired
      created_at: "2025-01-15T10:30:00Z",
      updated_at: "2025-04-15T14:20:00Z",
    },
    {
      id: 2,
      name: "Amoxicillin 250mg",
      generic_name: "Amoxicillin",
      category: "Antibiotic",
      form: "Capsule",
      strength: "250mg",
      manufacturer: "XYZ Pharma",
      batch_number: "BN20250220",
      expiry_date: "2026-02-20",
      current_stock: 180,
      reorder_level: 150,
      unit_price: 5.75,
      location: "Shelf B-05",
      status: "low_stock",
      created_at: "2025-02-20T09:15:00Z",
      updated_at: "2025-04-20T11:30:00Z",
    },
    {
      id: 3,
      name: "Atorvastatin 10mg",
      generic_name: "Atorvastatin",
      category: "Statin",
      form: "Tablet",
      strength: "10mg",
      manufacturer: "PQR Laboratories",
      batch_number: "BN20250110",
      expiry_date: "2027-01-10",
      current_stock: 450,
      reorder_level: 100,
      unit_price: 8.25,
      location: "Shelf C-08",
      status: "active",
      created_at: "2025-01-10T13:45:00Z",
      updated_at: "2025-04-10T16:20:00Z",
    },
    {
      id: 4,
      name: "Insulin Glargine 100IU/ml",
      generic_name: "Insulin Glargine",
      category: "Hormone",
      form: "Injection",
      strength: "100IU/ml",
      manufacturer: "LMN Biologics",
      batch_number: "BN20250405",
      expiry_date: "2026-04-05",
      current_stock: 75,
      reorder_level: 50,
      unit_price: 120,
      location: "Refrigerator 2",
      status: "active",
      created_at: "2025-04-05T08:30:00Z",
      updated_at: "2025-04-25T09:15:00Z",
    },
    {
      id: 5,
      name: "Salbutamol 100mcg",
      generic_name: "Salbutamol",
      category: "Bronchodilator",
      form: "Inhaler",
      strength: "100mcg",
      manufacturer: "RST Medical",
      batch_number: "BN20250210",
      expiry_date: "2027-02-10",
      current_stock: 0,
      reorder_level: 30,
      unit_price: 85.5,
      location: "Shelf D-03",
      status: "out_of_stock",
      created_at: "2025-02-10T11:20:00Z",
      updated_at: "2025-04-18T15:45:00Z",
    },
  ];

  return mockMedications.filter((medication) => {
    // Apply category filter
    if (filters.category && medication.category !== filters.category)
      return false;

    // Apply status filter
    if (filters.status && medication.status !== filters.status) return false;

    // Apply manufacturer filter
    if (
      filters.manufacturer &&
      medication.manufacturer !== filters.manufacturer
    )
      return false;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        medication.name.toLowerCase().includes(searchTerm) ||
        medication.generic_name.toLowerCase().includes(searchTerm) ||
        medication.category.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });
}

// Placeholder function to simulate creating a medication
interface MedicationInput {
  name: string;
  generic_name: string;
  category: string;
  form: string;
  strength: string;
  manufacturer?: string;
  batch_number?: string;
  expiry_date?: string;
  current_stock?: number;
  reorder_level?: number;
  unit_price?: number;
  location?: string;
  // status is usually derived, not input directly
}

// FIX: Define interface for update data
interface MedicationUpdateData extends Partial<MedicationInput> {
  status?: string; // Allow status update directly in mock
  transaction_type?: string; // For stock history
  quantity?: number; // For stock history
  reference_id?: string; // For stock history
}

async function createMedicationInDB(medicationData: MedicationInput) {
  console.log("Simulating creating medication:", medicationData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO pharmacy_inventory (name, generic_name, category, form, strength, manufacturer, batch_number, expiry_date, current_stock, reorder_level, unit_price, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   medicationData.name,
  //   medicationData.generic_name,
  //   medicationData.category,
  //   medicationData.form,
  //   medicationData.strength,
  //   medicationData.manufacturer,
  //   medicationData.batch_number,
  //   medicationData.expiry_date,
  //   medicationData.current_stock || 0,
  //   medicationData.reorder_level || 0,
  //   medicationData.unit_price || 0,
  //   medicationData.location || "",
  //   medicationData.current_stock > 0 ? (medicationData.current_stock <= medicationData.reorder_level ? "low_stock" : "active") : "out_of_stock"
  // ).run();
  // return { id: info.meta.last_row_id, ...medicationData };

  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  const status =
    (medicationData.current_stock ?? 0) > 0
      ? (medicationData.current_stock ?? 0) <=
        (medicationData.reorder_level ?? 0)
        ? "low_stock"
        : "active"
      : "out_of_stock";

  return {
    id: newId,
    ...medicationData,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Placeholder function to simulate getting a single medication
async function getMedicationByIdFromDB(id: number) {
  console.log("Simulating fetching medication by ID:", id);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT * FROM pharmacy_inventory WHERE id = ?"
  // ).bind(id).all();
  // return results[0];

  // Return mock data for now
  const mockMedications = [
    {
      id: 1,
      name: "Paracetamol 500mg",
      generic_name: "Paracetamol",
      category: "Analgesic",
      form: "Tablet",
      strength: "500mg",
      manufacturer: "ABC Pharmaceuticals",
      batch_number: "BN20250315",
      expiry_date: "2027-03-15",
      current_stock: 1250,
      reorder_level: 200,
      unit_price: 2.5,
      location: "Shelf A-12",
      status: "active",
      created_at: "2025-01-15T10:30:00Z",
      updated_at: "2025-04-15T14:20:00Z",
      stock_history: [
        {
          date: "2025-01-15",
          transaction_type: "purchase",
          quantity: 2000,
          batch_number: "BN20250315",
        },
        {
          date: "2025-02-20",
          transaction_type: "dispense",
          quantity: -350,
          prescription_id: "RX20250220-001",
        },
        {
          date: "2025-03-10",
          transaction_type: "dispense",
          quantity: -200,
          prescription_id: "RX20250310-005",
        },
        {
          date: "2025-04-05",
          transaction_type: "dispense",
          quantity: -200,
          prescription_id: "RX20250405-012",
        },
      ],
    },
    {
      id: 3,
      name: "Atorvastatin 10mg",
      generic_name: "Atorvastatin",
      category: "Statin",
      form: "Tablet",
      strength: "10mg",
      manufacturer: "PQR Laboratories",
      batch_number: "BN20250110",
      expiry_date: "2027-01-10",
      current_stock: 450,
      reorder_level: 100,
      unit_price: 8.25,
      location: "Shelf C-08",
      status: "active",
      created_at: "2025-01-10T13:45:00Z",
      updated_at: "2025-04-10T16:20:00Z",
      stock_history: [
        {
          date: "2025-01-10",
          transaction_type: "purchase",
          quantity: 500,
          batch_number: "BN20250110",
        },
        {
          date: "2025-02-15",
          transaction_type: "dispense",
          quantity: -30,
          prescription_id: "RX20250215-003",
        },
        {
          date: "2025-03-20",
          transaction_type: "dispense",
          quantity: -20,
          prescription_id: "RX20250320-008",
        },
      ],
    },
  ];

  return mockMedications.find((medication) => medication.id === id) || undefined;
}

// Placeholder function to simulate updating a medication
async function updateMedicationInDB(
  id: number,
  updateData: MedicationUpdateData
) {
  // FIX: Use MedicationUpdateData interface
  console.log("Simulating updating medication:", id, updateData);
  // Replace with actual D1 update query when DB is configured
  // const { env } = getRequestContext();
  // const updateFields = Object.entries(updateData)
  //   .map(([key, _]) => `${key} = ?`)
  //   .join(", ");
  // const updateValues = Object.values(updateData);
  //
  // // Update status based on current_stock if it's being updated
  // if (updateData.current_stock !== undefined) {
  //   const { results } = await env.DB.prepare(
  //     "SELECT reorder_level FROM pharmacy_inventory WHERE id = ?"
  //   ).bind(id).all();
  //
  //   if (results.length > 0) {
  //     const reorderLevel = results[0].reorder_level;
  //     let status;
  //     if (updateData.current_stock <= 0) {
  //       status = "out_of_stock";
  //     } else if (updateData.current_stock <= reorderLevel) {
  //       status = "low_stock";
  //     } else {
  //       status = "active";
  //     }
  //
  //     updateFields += ", status = ?";
  //     updateValues.push(status);
  //   }
  // }
  //
  // await env.DB.prepare(
  //   `UPDATE pharmacy_inventory SET ${updateFields}, updated_at = ? WHERE id = ?`
  // ).bind(...updateValues, new Date().toISOString(), id).run();
  //
  // // If this is a stock transaction, record it in history
  // if (updateData.transaction_type && updateData.quantity) {
  //   await env.DB.prepare(
  //     "INSERT INTO pharmacy_stock_history (medication_id, transaction_date, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?, ?)"
  //   ).bind(
  //     id,
  //     new Date().toISOString(),
  //     updateData.transaction_type,
  //     updateData.quantity,
  //     updateData.reference_id || null
  //   ).run();
  // }
  //
  // return { id, ...updateData };

  // Return mock success response
  let status = updateData.status;

  // Update status based on current_stock if it's being updated
  if (
    updateData.current_stock !== undefined &&
    updateData.reorder_level !== undefined
  ) {
    if (updateData.current_stock <= 0) {
      status = "out_of_stock";
    } else if (updateData.current_stock <= updateData.reorder_level) {
      status = "low_stock";
    } else {
      status = "active";
    }
  }

  return {
    id,
    ...updateData,
    status: status || updateData.status,
    updated_at: new Date().toISOString(),
  };
}

/**
 * GET /api/pharmacy/inventory
 * Retrieves a list of medications, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const manufacturer = searchParams.get("manufacturer");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters: MedicationFilters = {
      category,
      status,
      manufacturer,
      search,
    }; // FIX: Use interface

    // Check if this is a request for a specific medication
    const path = request.nextUrl.pathname;
    if (/\/api\/pharmacy\/inventory\/\d+$/.test(path)) {
      const id = Number.parseInt(path.split("/").pop() || "0"); // FIX: Removed unnecessary escapes
      if (id > 0) {
        const medication = await getMedicationByIdFromDB(id);
        if (!medication) {
          return NextResponse.json(
            { error: "Medication not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ medication });
      }
    }

    // Otherwise, return filtered list
    const medications = await getMedicationsFromDB(filters);

    return NextResponse.json({ medications });
  } catch (error: unknown) {
    // Added type annotation
    console.error("Error fetching medications:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"; // Handle unknown error type
    return NextResponse.json(
      { error: "Failed to fetch medications", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pharmacy/inventory
 * Creates a new medication.
 */
export async function POST(request: NextRequest) {
  try {
    const medicationData = (await request.json()) as MedicationInput;

    // Basic validation (add more comprehensive validation)
    if (
      !medicationData.name ||
      !medicationData.generic_name ||
      !medicationData.category ||
      !medicationData.form ||
      !medicationData.strength
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (name, generic_name, category, form, strength)",
        },
        { status: 400 }
      );
    }

    // Simulate creating the medication in the database
    const newMedication = await createMedicationInDB(medicationData);

    return NextResponse.json({ medication: newMedication }, { status: 201 });
  } catch (error: unknown) {
    // Added type annotation
    console.error("Error creating medication:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"; // Handle unknown error type
    return NextResponse.json(
      { error: "Failed to create medication", details: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pharmacy/inventory/[id]
 * Updates an existing medication.
 */
export async function PUT(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const id = Number.parseInt(path.split("/").pop() || "0"); // FIX: Removed unnecessary escapes

    if (id <= 0) {
      return NextResponse.json(
        { error: "Invalid medication ID" },
        { status: 400 }
      );
    }

    const updateData = (await request.json()) as MedicationUpdateData; // FIX: Use interface

    // Simulate updating the medication in the database
    const updatedMedication = await updateMedicationInDB(id, updateData);

    return NextResponse.json({ medication: updatedMedication });
  } catch (error: unknown) {
    // Added type annotation
    console.error("Error updating medication:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred"; // Handle unknown error type
    return NextResponse.json(
      { error: "Failed to update medication", details: message },
      { status: 500 }
    );
  }
}
