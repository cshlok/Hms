import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/checklist-templates - List all checklist templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase");

    const DB = (process.env.DB as unknown) as D1Database;
    let query = "SELECT id, name, phase, updated_at FROM OTChecklistTemplates";
    const params: string[] = [];

    if (phase) {
      query += " WHERE phase = ?";
      params.push(phase);
    }

    query += " ORDER BY phase ASC, name ASC";

    const { results } = await DB.prepare(query).bind(...params).all();

    return NextResponse.json(results || []);
  } catch (error) {
    console.error("Error fetching checklist templates:", error);
    return NextResponse.json({ message: "Error fetching checklist templates" }, { status: 500 });
  }
}

// POST /api/ot/checklist-templates - Create a new checklist template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phase, items } = body;

    if (!name || !phase || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Name, phase, and a non-empty array of items are required" }, { status: 400 });
    }

    // Validate phase
    const validPhases = ["pre-op", "intra-op", "post-op"]; // Add specific intra-op phases if needed
    if (!validPhases.includes(phase)) {
        return NextResponse.json({ message: "Invalid phase. Must be one of: " + validPhases.join(", ") }, { status: 400 });
    }

    // Validate items structure (basic check)
    if (!items.every(item => typeof item === "object" && item !== null && item.id && item.text)) {
        return NextResponse.json({ message: "Each item must be an object with 'id' and 'text' properties" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OTChecklistTemplates (id, name, phase, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, name, phase, JSON.stringify(items), now, now).run();

    // Fetch the newly created template
    const { results } = await DB.prepare("SELECT * FROM OTChecklistTemplates WHERE id = ?").bind(id).all();

    if (results && results.length > 0) {
        // Parse items JSON before sending response
        try {
            results[0].items = JSON.parse(results[0].items as string);
        } catch (parseError) {
            console.error("Error parsing checklist items JSON:", parseError);
            // Return raw string if parsing fails
        }
        return NextResponse.json(results[0], { status: 201 });
    } else {
        return NextResponse.json({ id, name, phase, items, created_at: now, updated_at: now }, { status: 201 });
    }

  } catch (error: any) {
    console.error("Error creating checklist template:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Checklist template name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error creating checklist template" }, { status: 500 });
  }
}

