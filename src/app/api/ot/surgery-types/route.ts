import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for required staff/equipment (re-used from [id] route, consider moving to a shared types file)
interface RequiredResource {
  role?: string; // For staff
  name?: string; // For equipment
  count?: number;
}

// Interface for the POST request body
interface SurgeryTypeCreateBody {
  name: string;
  description?: string | null;
  specialty?: string | null;
  estimated_duration_minutes?: number | null;
  required_staff?: RequiredResource[] | null;
  required_equipment?: RequiredResource[] | null;
}

// GET /api/ot/surgery-types - List all surgery types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");
    // TODO: Add pagination parameters (page, limit)

    const DB = process.env.DB as unknown as D1Database;
    let query =
      "SELECT id, name, description, specialty, estimated_duration_minutes, updated_at FROM SurgeryTypes";
    const parameters: string[] = [];

    if (specialty) {
      query += " WHERE specialty = ?";
      parameters.push(specialty);
    }

    query += " ORDER BY name ASC";
    // TODO: Add LIMIT and OFFSET for pagination

    const { results } = await DB.prepare(query)
      .bind(...parameters)
      .all();

    return NextResponse.json(results || []); // Ensure empty array if results is null/undefined
  } catch (error: unknown) {
    console.error("Error fetching surgery types:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching surgery types", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/surgery-types - Create a new surgery type
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SurgeryTypeCreateBody;
    const {
      name,
      description,
      specialty,
      estimated_duration_minutes,
      required_staff,
      required_equipment,
    } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Surgery type name is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO SurgeryTypes (id, name, description, specialty, estimated_duration_minutes, required_staff, required_equipment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        name,
        description || undefined,
        specialty || undefined,
        estimated_duration_minutes === undefined
          ? undefined
          : estimated_duration_minutes, // Handle undefined for optional number
        required_staff ? JSON.stringify(required_staff) : undefined,
        required_equipment ? JSON.stringify(required_equipment) : undefined,
        now,
        now
      )
      .run();

    // Fetch the newly created surgery type
    const { results } = await DB.prepare(
      "SELECT * FROM SurgeryTypes WHERE id = ?"
    )
      .bind(id)
      .all();

    if (results && results.length > 0) {
      const newSurgeryType = results[0];
      // Parse JSON fields before returning
      try {
        if (
          newSurgeryType.required_staff &&
          typeof newSurgeryType.required_staff === "string"
        ) {
          newSurgeryType.required_staff = JSON.parse(
            newSurgeryType.required_staff
          );
        }
        if (
          newSurgeryType.required_equipment &&
          typeof newSurgeryType.required_equipment === "string"
        ) {
          newSurgeryType.required_equipment = JSON.parse(
            newSurgeryType.required_equipment
          );
        }
      } catch (error: unknown) {
        console.error(
          "Failed to parse JSON fields for new surgery type:",
          id,
          error
        );
      }
      return NextResponse.json(newSurgeryType, { status: 201 });
    } else {
      // Fallback response if fetching fails
      return NextResponse.json(
        {
          id,
          name,
          description,
          specialty,
          estimated_duration_minutes,
          required_staff,
          required_equipment,
          created_at: now,
          updated_at: now,
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error creating surgery type:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("UNIQUE constraint failed")) {
      // FIX: Check errorMessage
      return NextResponse.json(
        { message: "Surgery type name must be unique", details: errorMessage },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error creating surgery type", details: errorMessage },
      { status: 500 }
    );
  }
}
