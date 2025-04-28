import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/theatres - List all operation theatres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    // TODO: Add pagination parameters (page, limit)

    const DB = (process.env.DB as unknown) as D1Database;
    let query = "SELECT id, name, location, specialty, status, updated_at FROM OperationTheatres";
    const params: string[] = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY name ASC";
    // TODO: Add LIMIT and OFFSET for pagination

    const { results } = await DB.prepare(query).bind(...params).all();

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching operation theatres:", error);
    return NextResponse.json({ message: "Error fetching operation theatres" }, { status: 500 });
  }
}

// POST /api/ot/theatres - Create a new operation theatre
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, specialty, equipment } = body;

    if (!name) {
      return NextResponse.json({ message: "Theatre name is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const id = crypto.randomUUID(); // Generate UUID
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OperationTheatres (id, name, location, specialty, equipment, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, name, location || null, specialty || null, equipment || null, "available", now, now).run();

    // Fetch the newly created theatre to return it
    const { results } = await DB.prepare("SELECT * FROM OperationTheatres WHERE id = ?").bind(id).all();

    if (results && results.length > 0) {
        return NextResponse.json(results[0], { status: 201 });
    } else {
        // Fallback if select fails immediately after insert
        return NextResponse.json({ id, name, location, specialty, equipment, status: "available", created_at: now, updated_at: now }, { status: 201 });
    }

  } catch (error: any) {
    console.error("Error creating operation theatre:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Operation theatre name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error creating operation theatre" }, { status: 500 });
  }
}

