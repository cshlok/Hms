// src/app/api/billing/service-items/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages";
import { getCurrentUser, hasPermission, PERMISSIONS } from "@/lib/auth";

// Mock data for development
const mockServiceItems = [
  { id: "si_001", item_code: "CONS01", item_name: "General Consultation", description: "Standard doctor consultation", category: "Consultation", unit_price: 500, is_taxable: 0, is_discountable: 1, is_active: 1 },
  { id: "si_002", item_code: "LAB01", item_name: "Complete Blood Count (CBC)", description: "", category: "Laboratory", unit_price: 350, is_taxable: 0, is_discountable: 0, is_active: 1 },
  { id: "si_003", item_code: "RAD01", item_name: "Chest X-Ray", description: "PA view", category: "Radiology", unit_price: 800, is_taxable: 0, is_discountable: 0, is_active: 1 },
  { id: "si_004", item_code: "PROC01", item_name: "Wound Dressing", description: "Minor wound dressing", category: "Procedure", unit_price: 250, is_taxable: 0, is_discountable: 1, is_active: 1 },
  { id: "si_005", item_code: "PHARM01", item_name: "Paracetamol 500mg Tablet", description: "", category: "Pharmacy", unit_price: 2, is_taxable: 1, is_discountable: 0, is_active: 1 },
  { id: "si_006", item_code: "ROOM01", item_name: "General Ward Bed Charge", description: "Per day", category: "Room Charge", unit_price: 1500, is_taxable: 0, is_discountable: 0, is_active: 1 },
];
let nextItemId = 7;

/**
 * GET /api/billing/service-items
 * Retrieves a list of service items, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    // Note: Assuming hasPermission expects the request object to derive the user
    if (!(await hasPermission(request, PERMISSIONS.BILLING_VIEW_INVOICE))) {
      // Attempt to get user for logging/context if needed, but handle potential null
      const user = await getCurrentUser(request);
      if (!user) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
      }
      return NextResponse.json(
        { error: "You don\'t have permission to access this resource" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase();
    
    // const { env } = getRequestContext(); // Cloudflare specific
    
    // Mock implementation for development without Cloudflare
    let filteredItems = mockServiceItems.filter(item => item.is_active === 1);

    if (search) {
      filteredItems = filteredItems.filter(item => 
        item.item_name.toLowerCase().includes(search) || 
        item.item_code.toLowerCase().includes(search)
      );
    }

    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Sort results
    filteredItems.sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      if (a.item_name < b.item_name) return -1;
      if (a.item_name > b.item_name) return 1;
      return 0;
    });
    
    return NextResponse.json({ serviceItems: filteredItems });
  } catch (error) {
    console.error("Error fetching service items:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch service items", details: errorMessage },
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
    // Check authentication and permissions
    // Note: Assuming hasPermission expects the request object to derive the user
    if (!(await hasPermission(request, PERMISSIONS.BILLING_CREATE_INVOICE))) {
      const user = await getCurrentUser(request); // Get user for logging if needed
       if (!user) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
      }
      return NextResponse.json(
        { error: "You don\'t have permission to create service items" },
        { status: 403 }
      );
    }
    
    // Get user ID after permission check for logging/audit
    const user = await getCurrentUser(request);
    if (!user) { // Should not happen if hasPermission passed, but good practice
        return NextResponse.json({ error: "Authentication failed after permission check" }, { status: 500 });
    }

    const itemData = await request.json();

    // Enhanced validation
    if (!itemData.item_code || !itemData.item_name || !itemData.category || itemData.unit_price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (item_code, item_name, category, unit_price)" },
        { status: 400 }
      );
    }

    // Validate data types and formats
    if (typeof itemData.item_code !== 'string' || itemData.item_code.length > 50) {
      return NextResponse.json(
        { error: "Invalid item_code format" },
        { status: 400 }
      );
    }

    if (typeof itemData.item_name !== 'string' || itemData.item_name.length > 255) {
      return NextResponse.json(
        { error: "Invalid item_name format" },
        { status: 400 }
      );
    }

    if (typeof itemData.unit_price !== 'number' || itemData.unit_price < 0) {
      return NextResponse.json(
        { error: "Unit price must be a positive number" },
        { status: 400 }
      );
    }

    // const { env } = getRequestContext(); // Cloudflare specific
    
    // Mock implementation for development without Cloudflare
    // Check if item_code already exists in mock data
    const existingItem = mockServiceItems.find(item => item.item_code === itemData.item_code);
    
    if (existingItem) {
      return NextResponse.json(
        { error: "Item code already exists" },
        { status: 400 }
      );
    }
    
    // Create the new service item in mock data
    const newItem = {
      id: `si_${String(nextItemId++).padStart(3, '0')}`,
      item_code: itemData.item_code,
      item_name: itemData.item_name,
      description: itemData.description || "",
      category: itemData.category,
      unit_price: itemData.unit_price,
      is_taxable: itemData.is_taxable ? 1 : 0,
      is_discountable: itemData.is_discountable ? 1 : 0,
      is_active: 1,
      // created_by: user.id, // Would use user.id in real implementation
      // created_at: new Date().toISOString() // Would use current time
    };
    
    mockServiceItems.push(newItem);

    // Log the action (mock)
    console.log(`Audit Log: User ${user.id} CREATE service_item ${newItem.id}`, { item_code: newItem.item_code, item_name: newItem.item_name });

    return NextResponse.json({ serviceItem: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating service item:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to create service item", details: errorMessage },
      { status: 500 }
    );
  }
}

