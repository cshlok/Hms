import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database"; // Using mock DB
import { getSession } from "@/lib/session";

// Interface for the request body when creating a lab test
interface LabTestCreateBody {
  category_id: number;
  code: string;
  name: string;
  description?: string;
  sample_type: string;
  sample_volume?: string;
  processing_time?: number | null;
  price: number;
  is_active?: boolean;
}

// GET /api/laboratory/tests - Get all laboratory tests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const isActive = searchParams.get("isActive");

    // Build query
    let query =
      "SELECT t.*, c.name as category_name FROM lab_tests t JOIN lab_test_categories c ON t.category_id = c.id";
    // FIX: Use specific type for params
    const parameters: (string | number | boolean)[] = [];

    // Add filters
    const conditions: string[] = [];

    if (categoryId) {
      conditions.push("t.category_id = ?");
      parameters.push(categoryId);
    }

    if (isActive !== undefined) {
      conditions.push("t.is_active = ?");
      parameters.push(isActive === "true" ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY t.name ASC";

    // Execute query using DB.query
    const testsResult = await DB.query(query, parameters);

    return NextResponse.json(testsResult.results || []); // Changed .rows to .results
  } catch (error: unknown) {
    console.error("Error fetching laboratory tests:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch laboratory tests", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/laboratory/tests - Create a new laboratory test
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only lab managers and admins can create tests
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body and assert type
    const body = (await request.json()) as LabTestCreateBody;

    // Validate required fields
    const requiredFields: (keyof LabTestCreateBody)[] = [
      "category_id",
      "code",
      "name",
      "sample_type",
      "price",
    ];
    for (const field of requiredFields) {
      if (
        !(field in body) ||
        body[field] === undefined ||
        body[field] === undefined ||
        body[field] === ""
      ) {
        return NextResponse.json(
          { error: `Missing or invalid required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Insert new test using DB.query
    const insertQuery = `
      INSERT INTO lab_tests (
        category_id, code, name, description, sample_type, 
        sample_volume, processing_time, price, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParameters = [
      body.category_id,
      body.code,
      body.name,
      body.description || "",
      body.sample_type,
      body.sample_volume || "",
      body.processing_time === undefined ? undefined : body.processing_time, // Handle undefined for optional number
      body.price,
      body.is_active === undefined ? true : body.is_active,
    ];

    await DB.query(insertQuery, insertParameters);

    // Mock response as we cannot get last_row_id from mock DB.query
    const mockTestId = Math.floor(Math.random() * 10_000);
    const mockCreatedTest = {
      id: mockTestId,
      ...body, // Include other details from the request body
      is_active: body.is_active === undefined ? true : body.is_active, // Ensure is_active is set
      description: body.description || "",
      sample_volume: body.sample_volume || "",
      processing_time:
        body.processing_time === undefined ? undefined : body.processing_time,
    };

    return NextResponse.json(mockCreatedTest, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating laboratory test:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create laboratory test", details: errorMessage },
      { status: 500 }
    );
  }
}

