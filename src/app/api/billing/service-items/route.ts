// src/app/api/billing/service-items/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Import when ready to use D1

// Placeholder function to simulate database interaction
async function getServiceItemsFromDB(filters: any) {
  console.log("Simulating fetching service items with filters:", filters);
  // Replace with actual D1 query when DB is configured
  // const { env } = getRequestContext();
  // const { results } = await env.DB.prepare(
  //   "SELECT * FROM service_items WHERE is_active = 1 ORDER BY category, item_name"
  // ).all();
  // return results;
  
  // Return mock data for now
  return [
    {
      id: 1,
      item_code: "CONS001",
      item_name: "General Physician Consultation",
      description: "Consultation with general physician",
      category: "Consultation",
      unit_price: 500.00,
      is_taxable: true,
      is_discountable: true,
      is_active: true
    },
    {
      id: 2,
      item_code: "LAB001",
      item_name: "Complete Blood Count (CBC)",
      description: "Complete blood count test",
      category: "Laboratory",
      unit_price: 350.00,
      is_taxable: true,
      is_discountable: true,
      is_active: true
    },
    {
      id: 3,
      item_code: "RAD001",
      item_name: "Chest X-Ray",
      description: "Single view chest X-ray",
      category: "Radiology",
      unit_price: 800.00,
      is_taxable: true,
      is_discountable: true,
      is_active: true
    },
    {
      id: 4,
      item_code: "ROOM001",
      item_name: "General Ward Bed Charges",
      description: "Per day charges for general ward bed",
      category: "Room Charges",
      unit_price: 1200.00,
      is_taxable: true,
      is_discountable: true,
      is_active: true
    },
    {
      id: 5,
      item_code: "MED001",
      item_name: "Paracetamol 500mg",
      description: "Paracetamol 500mg tablet",
      category: "Medication",
      unit_price: 2.50,
      is_taxable: true,
      is_discountable: false,
      is_active: true
    }
  ];
}

// Placeholder function to simulate creating a service item
async function createServiceItemInDB(itemData: any) {
  console.log("Simulating creating service item:", itemData);
  // Replace with actual D1 insert query when DB is configured
  // const { env } = getRequestContext();
  // const info = await env.DB.prepare(
  //   "INSERT INTO service_items (item_code, item_name, description, category, unit_price, is_taxable, is_discountable, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  // ).bind(
  //   itemData.item_code,
  //   itemData.item_name,
  //   itemData.description,
  //   itemData.category,
  //   itemData.unit_price,
  //   itemData.is_taxable ? 1 : 0,
  //   itemData.is_discountable ? 1 : 0,
  //   1
  // ).run();
  // return { id: info.meta.last_row_id, ...itemData };
  
  // Return mock success response
  const newId = Math.floor(Math.random() * 1000) + 10;
  return {
    id: newId,
    ...itemData,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * GET /api/billing/service-items
 * Retrieves a list of service items, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    // Add other filters as needed

    const filters = { category, search };
    
    // Simulate fetching data from the database
    const serviceItems = await getServiceItemsFromDB(filters);

    return NextResponse.json({ serviceItems });
  } catch (error) {
    console.error("Error fetching service items:", error);
    return NextResponse.json(
      { error: "Failed to fetch service items", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/service-items
 * Creates a new service item.
 */
export async function POST(request: NextRequest) {
  try {
    const itemData = await request.json();

    // Basic validation (add more comprehensive validation)
    if (!itemData.item_code || !itemData.item_name || !itemData.category || itemData.unit_price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (item_code, item_name, category, unit_price)" },
        { status: 400 }
      );
    }

    // Simulate creating the service item in the database
    const newItem = await createServiceItemInDB(itemData);

    return NextResponse.json({ serviceItem: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating service item:", error);
    return NextResponse.json(
      { error: "Failed to create service item", details: error.message },
      { status: 500 }
    );
  }
}
