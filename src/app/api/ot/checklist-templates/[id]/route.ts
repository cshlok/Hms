import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for checklist item
interface ChecklistItem {
  id: string; // Unique ID for the item within the template
  text: string;
  type: "checkbox" | "text" | "number" | "select"; // Example types
  options?: string[]; // For select type
  required?: boolean;
}

// Interface for the PUT request body
interface ChecklistTemplateUpdateBody {
  name?: string;
  phase?: "pre-op" | "intra-op" | "post-op";
  items?: ChecklistItem[];
}

// GET /api/ot/checklist-templates/[id] - Get details of a specific checklist template
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: templateId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!templateId) {
      return NextResponse.json(
        { message: "Template ID is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const { results } = await DB.prepare(
      "SELECT * FROM OTChecklistTemplates WHERE id = ?"
    )
      .bind(templateId)
      .all();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { message: "Checklist template not found" },
        { status: 404 }
      );
    }

    const template = results[0];
    // Parse items JSON before sending response
    try {
      if (template.items && typeof template.items === "string") {
        template.items = JSON.parse(template.items);
      }
    } catch (parseError) {
      console.error("Error parsing checklist items JSON:", parseError);
      // Return raw string if parsing fails
    }

    return NextResponse.json(template);
  } catch (error: unknown) {
    console.error("Error fetching checklist template details:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        message: "Error fetching checklist template details",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// PUT /api/ot/checklist-templates/[id] - Update an existing checklist template
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: templateId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!templateId) {
      return NextResponse.json(
        { message: "Template ID is required" },
        { status: 400 }
      );
    }

    const body = (await _request.json()) as ChecklistTemplateUpdateBody;
    const { name, phase, items } = body;

    // Basic validation
    if (name === undefined && phase === undefined && items === undefined) {
      return NextResponse.json(
        { message: "No update fields provided" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    // FIX: Use specific type for fieldsToUpdate
    const fieldsToUpdate: { [key: string]: string } = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (phase !== undefined) {
      const validPhases = ["pre-op", "intra-op", "post-op"];
      if (!validPhases.includes(phase)) {
        return NextResponse.json({ message: "Invalid phase" }, { status: 400 });
      }
      fieldsToUpdate.phase = phase;
    }
    if (items !== undefined) {
      // Add more robust validation for items structure if needed
      if (
        !Array.isArray(items) ||
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
              "Invalid items format. Each item must have id, text, and type.",
          },
          { status: 400 }
        );
      }
      fieldsToUpdate.items = JSON.stringify(items);
    }
    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE OTChecklistTemplates SET ${setClauses} WHERE id = ?`;
    values.push(templateId);

    const info = await DB.prepare(updateQuery)
      .bind(...values)
      .run();

    if (info.meta.changes === 0) {
      // Check if the template actually exists before returning 404
      const { results: checkExists } = await DB.prepare(
        "SELECT id FROM OTChecklistTemplates WHERE id = ?"
      )
        .bind(templateId)
        .all();
      if (!checkExists || checkExists.length === 0) {
        return NextResponse.json(
          { message: "Checklist template not found" },
          { status: 404 }
        );
      }
      // If it exists but no changes were made (e.g., same data sent), return 200 OK with current data
    }

    // Fetch the updated template details
    const { results } = await DB.prepare(
      "SELECT * FROM OTChecklistTemplates WHERE id = ?"
    )
      .bind(templateId)
      .all();

    if (!results || results.length === 0) {
      // This case should ideally not happen if the update was successful or the check above passed
      return NextResponse.json(
        { message: "Failed to fetch updated template details after update" },
        { status: 500 }
      );
    }

    const updatedTemplate = results[0];
    // Parse items JSON before sending response
    try {
      if (updatedTemplate.items && typeof updatedTemplate.items === "string") {
        updatedTemplate.items = JSON.parse(updatedTemplate.items);
      }
    } catch (parseError) {
      console.error("Error parsing updated checklist items JSON:", parseError);
    }

    return NextResponse.json(updatedTemplate);
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error updating checklist template:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("UNIQUE constraint failed")) {
      // FIX: Check errorMessage instead of error.message
      return NextResponse.json(
        {
          message: "Checklist template name must be unique",
          details: errorMessage,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error updating checklist template", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/ot/checklist-templates/[id] - Delete a checklist template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: templateId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!templateId) {
      return NextResponse.json(
        { message: "Template ID is required" },
        { status: 400 }
      );
    }

    // TODO: Check if template is in use by any responses before deleting?

    const DB = process.env.DB as unknown as D1Database;
    const info = await DB.prepare(
      "DELETE FROM OTChecklistTemplates WHERE id = ?"
    )
      .bind(templateId)
      .run();

    if (info.meta.changes === 0) {
      return NextResponse.json(
        { message: "Checklist template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Checklist template deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error deleting checklist template:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Handle potential foreign key constraint errors if responses exist
    if (errorMessage?.includes("FOREIGN KEY constraint failed")) {
      // FIX: Check errorMessage instead of error.message
      return NextResponse.json(
        {
          message: "Cannot delete template with existing responses",
          details: errorMessage,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting checklist template", details: errorMessage },
      { status: 500 }
    );
  }
}

