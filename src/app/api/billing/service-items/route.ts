import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentUser } from "@/lib/auth"; // Assuming auth helpers exist
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Mock data store for service items (replace with actual DB interaction)
const mockServiceItems = [
  {
    id: "si_001",
    item_code: "CONSULT",
    item_name: "Doctor Consultation",
    description: "Standard consultation fee",
    category: "Consultation",
    unit_price: 500,
    is_taxable: 0,
    is_discountable: 1,
    is_active: 1,
  },
  {
    id: "si_002",
    item_code: "XRAY_CHEST",
    item_name: "X-Ray Chest PA View",
    description: "",
    category: "Radiology",
    unit_price: 800,
    is_taxable: 1,
    is_discountable: 0,
    is_active: 1,
  },
  {
    id: "si_003",
    item_code: "CBC",
    item_name: "Complete Blood Count",
    description: "",
    category: "Laboratory",
    unit_price: 350,
    is_taxable: 1,
    is_discountable: 0,
    is_active: 1,
  },
  {
    id: "si_004",
    item_code: "ROOM_GEN",
    item_name: "General Ward Room Charge",
    description: "Per day charge",
    category: "Room Charge",
    unit_price: 2000,
    is_taxable: 0,
    is_discountable: 0,
    is_active: 1,
  },
];
let nextItemId = 5;

// Define interface for service item input
interface ServiceItemInput {
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  unit_price: number;
  is_taxable?: boolean;
  is_discountable?: boolean;
  is_active?: boolean; // Usually managed internally, but might be settable
}

// GET /api/billing/service-items - Get list of service items
export async function GET(request: NextRequest) {
  try {
    // Permission check (example: only admin or billing staff)
    if (!(await hasPermission(request, ["billing:read", "admin"]))) {
      return NextResponse.json(
        {
          error: "Forbidden: You do not have permission to view service items.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.toLowerCase();
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active"); // e.g., "true" or "false"

    let filteredItems = mockServiceItems;

    if (query) {
      filteredItems = filteredItems.filter(
        (item) =>
          item.item_code.toLowerCase().includes(query) ||
          item.item_name.toLowerCase().includes(query)
      );
    }

    if (category) {
      filteredItems = filteredItems.filter(
        (item) => item.category === category
      );
    }

    if (isActive !== undefined && isActive !== null) {
      const activeBool = isActive.toLowerCase() === "true";
      filteredItems = filteredItems.filter(
        (item) => (item.is_active === 1) === activeBool
      );
    }

    // Simple pagination (optional, add if needed)
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    return NextResponse.json({
      serviceItems: paginatedItems,
      total: filteredItems.length, // Total matching items before pagination
      page,
      limit,
    });
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

// POST /api/billing/service-items - Create a new service item
export async function POST(request: NextRequest) {
  try {
    // Permission check (example: only admin or billing manager)
    if (!(await hasPermission(request, ["billing:manage", "admin"]))) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have permission to create service items.",
        },
        { status: 403 }
      );
    }

    // Get user ID after permission check for logging/audit
    const user = await getCurrentUser(request);
    if (!user) {
      // Should not happen if hasPermission passed, but good practice
      return NextResponse.json(
        { error: "Authentication failed after permission check" },
        { status: 500 }
      );
    }

    const body = await request.json();
    // Fixed: Apply type assertion
    const itemData = body as ServiceItemInput;

    // Enhanced validation
    if (
      !itemData.item_code ||
      !itemData.item_name ||
      !itemData.category ||
      itemData.unit_price === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (item_code, item_name, category, unit_price)",
        },
        { status: 400 }
      );
    }

    // Validate data types and formats
    if (
      typeof itemData.item_code !== "string" ||
      itemData.item_code.length > 50
    ) {
      return NextResponse.json(
        { error: "Invalid item_code format" },
        { status: 400 }
      );
    }

    if (
      typeof itemData.item_name !== "string" ||
      itemData.item_name.length > 255
    ) {
      return NextResponse.json(
        { error: "Invalid item_name format" },
        { status: 400 }
      );
    }

    if (typeof itemData.unit_price !== "number" || itemData.unit_price < 0) {
      return NextResponse.json(
        { error: "Unit price must be a positive number" },
        { status: 400 }
      );
    }

    // const { env } = getRequestContext(); // Cloudflare specific

    // Mock implementation for development without Cloudflare
    // Check if item_code already exists in mock data
    const existingItem = mockServiceItems.find(
      (item) => item.item_code === itemData.item_code
    );

    if (existingItem) {
      return NextResponse.json(
        { error: "Item code already exists" },
        { status: 400 }
      );
    }

    // Create the new service item in mock data
    const newItem = {
      id: `si_${String(nextItemId++).padStart(3, "0")}`,
      item_code: itemData.item_code,
      item_name: itemData.item_name,
      description: itemData.description || "",
      category: itemData.category,
      unit_price: itemData.unit_price,
      is_taxable: itemData.is_taxable ? 1 : 0,
      is_discountable: itemData.is_discountable ? 1 : 0,
      is_active: 1, // Default to active
      // created_by: user.id, // Would use user.id in real implementation
      // created_at: new Date().toISOString() // Would use current time
    };

    mockServiceItems.push(newItem);

    // Log the action (mock)
    console.log(
      `Audit Log: User ${user.id} CREATE service_item ${newItem.id}`,
      { item_code: newItem.item_code, item_name: newItem.item_name }
    );

    return NextResponse.json({ serviceItem: newItem }, { status: 201 });
  } catch (error: unknown) {
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
