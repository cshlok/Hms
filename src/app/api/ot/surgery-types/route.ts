import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/surgery-types - List all surgery types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");
    // TODO: Add pagination parameters (page, limit)

    const DB = (process.env.DB as unknown) as D1Database;
    let query = "SELECT id, name, description, specialty, estimated_duration_minutes, updated_at FROM SurgeryTypes";
    const params: string[] = [];

    if (specialty) {
      query += " WHERE specialty = ?";
      params.push(specialty);
    }

    query += " ORDER BY name ASC";
    // TODO: Add LIMIT and OFFSET for pagination

    const { results } = await DB.prepare(query).bind(...params).all();

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching surgery types:", error);
    return NextResponse.json({ message: "Error fetching surgery types" }, { status: 500 });
  }
}

// POST /api/ot/surgery-types - Create a new surgery type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, specialty, estimated_duration_minutes, required_staff, required_equipment } = body;

    if (!name) {
      return NextResponse.json({ message: "Surgery type name is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO SurgeryTypes (id, name, description, specialty, estimated_duration_minutes, required_staff, required_equipment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
        id, 
        name, 
        description || null, 
        specialty || null, 
        estimated_duration_minutes || null, 
        required_staff ? JSON.stringify(required_staff) : null, 
        required_equipment ? JSON.stringify(required_equipment) : null, 
        now, 
        now
    ).run();

    // Fetch the newly created surgery type
    const { results } = await DB.prepare("SELECT * FROM SurgeryTypes WHERE id = ?").bind(id).all();

    if (results && results.length > 0) {
        return NextResponse.json(results[0], { status: 201 });
    } else {
        return NextResponse.json({ id, name, description, specialty, estimated_duration_minutes, required_staff, required_equipment, created_at: now, updated_at: now }, { status: 201 });
    }

  } catch (error: any) {
    console.error("Error creating surgery type:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Surgery type name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error creating surgery type" }, { status: 500 });
  }
}

