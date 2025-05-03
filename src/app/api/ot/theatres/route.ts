import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for the POST request body
interface TheatreCreateBody {
  name: string;
  location?: string | null;
  specialty?: string | null;
  equipment?: string | null; // Assuming JSON string or simple text for equipment list
}

// GET /api/ot/theatres - List all operation theatres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    // TODO: Add pagination parameters (page, limit)

    const DB = process.env.DB as unknown as D1Database;
    let query =
      "SELECT id, name, location, specialty, status, updated_at FROM OperationTheatres";
    const parameters: string[] = [];

    if (status) {
      query += " WHERE status = ?";
      parameters.push(status);
    }

    query += " ORDER BY name ASC";
    // TODO: Add LIMIT and OFFSET for pagination

    const { results } = await DB.prepare(query)
      .bind(...parameters)
      .all();

    return NextResponse.json(results || []); // Ensure empty array if results is null/undefined
  } catch (error: unknown) {
    console.error("Error fetching operation theatres:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching operation theatres", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/theatres - Create a new operation theatre
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TheatreCreateBody;
    const { name, location, specialty, equipment } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Theatre name is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const id = crypto.randomUUID(); // Generate UUID
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OperationTheatres (id, name, location, specialty, equipment, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        name,
        location || undefined,
        specialty || undefined,
        equipment || undefined,
        "available",
        now,
        now
      )
      .run();

    // Fetch the newly created theatre to return it
    const { results } = await DB.prepare(
      "SELECT * FROM OperationTheatres WHERE id = ?"
    )
      .bind(id)
      .all();

    return results && results.length > 0
      ? NextResponse.json(results[0], { status: 201 })
      : // Fallback if select fails immediately after insert
        NextResponse.json(
          {
            id,
            name,
            location,
            specialty,
            equipment,
            status: "available",
            created_at: now,
            updated_at: now,
          },
          { status: 201 }
        );
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error creating operation theatre:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("UNIQUE constraint failed")) {
      // FIX: Check errorMessage
      return NextResponse.json(
        {
          message: "Operation theatre name must be unique",
          details: errorMessage,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error creating operation theatre", details: errorMessage },
      { status: 500 }
    );
  }
}
