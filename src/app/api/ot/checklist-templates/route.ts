import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for checklist item (re-used from [id] route, consider moving to a shared types file)
interface ChecklistItem {
  id: string; // Unique ID for the item within the template
  text: string;
  type: "checkbox" | "text" | "number" | "select"; // Example types
  options?: string[]; // For select type
  required?: boolean;
}

// Interface for the POST request body
interface ChecklistTemplateCreateBody {
  name: string;
  phase: "pre-op" | "intra-op" | "post-op";
  items: ChecklistItem[];
}

// GET /api/ot/checklist-templates - List all checklist templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase");

    const DB = process.env.DB as unknown as D1Database;
    let query = "SELECT id, name, phase, updated_at FROM OTChecklistTemplates";
    const parameters: string[] = [];

    if (phase) {
      query += " WHERE phase = ?";
      parameters.push(phase);
    }

    query += " ORDER BY phase ASC, name ASC";

    const { results } = await DB.prepare(query)
      .bind(...parameters)
      .all();

    return NextResponse.json(results || []);
  } catch (error: unknown) {
    console.error("Error fetching checklist templates:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching checklist templates", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/checklist-templates - Create a new checklist template
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChecklistTemplateCreateBody;
    const { name, phase, items } = body;

    if (
      !name ||
      !phase ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { message: "Name, phase, and a non-empty array of items are required" },
        { status: 400 }
      );
    }

    // Validate phase
    const validPhases = ["pre-op", "intra-op", "post-op"]; // Add specific intra-op phases if needed
    if (!validPhases.includes(phase)) {
      return NextResponse.json(
        { message: "Invalid phase. Must be one of: " + validPhases.join(", ") },
        { status: 400 }
      );
    }

    // Validate items structure (basic check)
    if (
      !items.every(
        (item) =>
          typeof item === "object" &&
          item !== undefined &&
          item.id &&
          item.text &&
          item.type
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Each item must be an object with id, text, and type properties",
        },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OTChecklistTemplates (id, name, phase, items, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(id, name, phase, JSON.stringify(items), now, now)
      .run();

    // Fetch the newly created template
    const { results } = await DB.prepare(
      "SELECT * FROM OTChecklistTemplates WHERE id = ?"
    )
      .bind(id)
      .all();

    if (results && results.length > 0) {
      const newTemplate = results[0];
      // Parse items JSON before sending response
      try {
        if (newTemplate.items && typeof newTemplate.items === "string") {
          newTemplate.items = JSON.parse(newTemplate.items);
        }
      } catch (parseError) {
        console.error("Error parsing checklist items JSON:", parseError);
        // Return raw string if parsing fails
      }
      return NextResponse.json(newTemplate, { status: 201 });
    } else {
      // Fallback response if fetching fails
      return NextResponse.json(
        { id, name, phase, items, created_at: now, updated_at: now },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error creating checklist template:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        {
          message: "Checklist template name must be unique",
          details: errorMessage,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error creating checklist template", details: errorMessage },
      { status: 500 }
    );
  }
}
