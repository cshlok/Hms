import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/checklist-templates/[id] - Get details of a specific checklist template
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json({ message: "Template ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const { results } = await DB.prepare("SELECT * FROM OTChecklistTemplates WHERE id = ?").bind(templateId).all();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "Checklist template not found" }, { status: 404 });
    }

    // Parse items JSON before sending response
    try {
        results[0].items = JSON.parse(results[0].items as string);
    } catch (parseError) {
        console.error("Error parsing checklist items JSON:", parseError);
        // Return raw string if parsing fails
    }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching checklist template details:", error);
    return NextResponse.json({ message: "Error fetching checklist template details" }, { status: 500 });
  }
}

// PUT /api/ot/checklist-templates/[id] - Update an existing checklist template
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json({ message: "Template ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, phase, items } = body;

    // Basic validation
    if (!name && !phase && !items) {
        return NextResponse.json({ message: "No update fields provided" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (phase !== undefined) {
        const validPhases = ["pre-op", "intra-op", "post-op"];
        if (!validPhases.includes(phase)) {
            return NextResponse.json({ message: "Invalid phase" }, { status: 400 });
        }
        fieldsToUpdate.phase = phase;
    }
    if (items !== undefined) {
        if (!Array.isArray(items) || !items.every(item => typeof item === "object" && item !== null && item.id && item.text)) {
            return NextResponse.json({ message: "Invalid items format" }, { status: 400 });
        }
        fieldsToUpdate.items = JSON.stringify(items);
    }
    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE OTChecklistTemplates SET ${setClauses} WHERE id = ?`;
    values.push(templateId);

    const info = await DB.prepare(updateQuery).bind(...values).run();

    if (info.meta.changes === 0) {
        return NextResponse.json({ message: "Checklist template not found or no changes made" }, { status: 404 });
    }

    // Fetch the updated template details
    const { results } = await DB.prepare("SELECT * FROM OTChecklistTemplates WHERE id = ?").bind(templateId).all();

    if (!results || results.length === 0) {
        return NextResponse.json({ message: "Failed to fetch updated template details" }, { status: 500 });
    }
    
    // Parse items JSON before sending response
    try {
        results[0].items = JSON.parse(results[0].items as string);
    } catch (parseError) {
        // Ignore parsing error on fetch
    }

    return NextResponse.json(results[0]);

  } catch (error: any) {
    console.error("Error updating checklist template:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Checklist template name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error updating checklist template" }, { status: 500 });
  }
}

// DELETE /api/ot/checklist-templates/[id] - Delete a checklist template
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json({ message: "Template ID is required" }, { status: 400 });
    }

    // TODO: Check if template is in use by any responses before deleting?

    const DB = (process.env.DB as unknown) as D1Database;
    const info = await DB.prepare("DELETE FROM OTChecklistTemplates WHERE id = ?").bind(templateId).run();

    if (info.meta.changes === 0) {
      return NextResponse.json({ message: "Checklist template not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Checklist template deleted successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting checklist template:", error);
    // Handle potential foreign key constraint errors if responses exist
    if (error.message?.includes("FOREIGN KEY constraint failed")) {
        return NextResponse.json({ message: "Cannot delete template with existing responses" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error deleting checklist template" }, { status: 500 });
  }
}

