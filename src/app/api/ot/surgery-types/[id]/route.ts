import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for required staff/equipment (example)
interface RequiredResource {
  role?: string; // For staff
  name?: string; // For equipment
  count?: number;
}

// Interface for the PUT request body
interface SurgeryTypeUpdateBody {
  name?: string;
  description?: string;
  specialty?: string;
  estimated_duration_minutes?: number | null;
  required_staff?: RequiredResource[] | null;
  required_equipment?: RequiredResource[] | null;
}

// GET /api/ot/surgery-types/[id] - Get details of a specific surgery type
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: surgeryTypeId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!surgeryTypeId) {
      return NextResponse.json(
        { message: "Surgery Type ID is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const { results } = await DB.prepare(
      "SELECT * FROM SurgeryTypes WHERE id = ?"
    )
      .bind(surgeryTypeId)
      .all();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { message: "Surgery type not found" },
        { status: 404 }
      );
    }

    const surgeryType = results[0];
    // Parse JSON fields
    try {
      if (
        surgeryType.required_staff &&
        typeof surgeryType.required_staff === "string"
      ) {
        surgeryType.required_staff = JSON.parse(surgeryType.required_staff);
      }
      if (
        surgeryType.required_equipment &&
        typeof surgeryType.required_equipment === "string"
      ) {
        surgeryType.required_equipment = JSON.parse(
          surgeryType.required_equipment
        );
      }
    } catch (error: unknown) {
      console.error(
        "Failed to parse JSON fields for surgery type:",
        surgeryTypeId,
        error
      );
    }

    return NextResponse.json(surgeryType);
  } catch (error: unknown) {
    console.error("Error fetching surgery type details:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching surgery type details", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/ot/surgery-types/[id] - Update an existing surgery type
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: surgeryTypeId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!surgeryTypeId) {
      return NextResponse.json(
        { message: "Surgery Type ID is required" },
        { status: 400 }
      );
    }

    const body = (await _request.json()) as SurgeryTypeUpdateBody;
    const {
      name,
      description,
      specialty,
      estimated_duration_minutes,
      required_staff,
      required_equipment,
    } = body;

    // Basic validation
    if (
      name === undefined &&
      description === undefined &&
      specialty === undefined &&
      estimated_duration_minutes === undefined &&
      required_staff === undefined &&
      required_equipment === undefined
    ) {
      return NextResponse.json(
        { message: "No update fields provided" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    // FIX: Use specific type for fieldsToUpdate
    const fieldsToUpdate: { [key: string]: string | number | null } = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (specialty !== undefined) fieldsToUpdate.specialty = specialty;
    if (estimated_duration_minutes !== undefined)
      fieldsToUpdate.estimated_duration_minutes = estimated_duration_minutes;
    if (required_staff !== undefined)
      fieldsToUpdate.required_staff = JSON.stringify(required_staff);
    if (required_equipment !== undefined)
      fieldsToUpdate.required_equipment = JSON.stringify(required_equipment);
    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE SurgeryTypes SET ${setClauses} WHERE id = ?`;
    values.push(surgeryTypeId);

    const info = await DB.prepare(updateQuery)
      .bind(...values)
      .run();

    if (info.meta.changes === 0) {
      // Check if the type actually exists before returning 404
      const { results: checkExists } = await DB.prepare(
        "SELECT id FROM SurgeryTypes WHERE id = ?"
      )
        .bind(surgeryTypeId)
        .all();
      if (!checkExists || checkExists.length === 0) {
        return NextResponse.json(
          { message: "Surgery type not found" },
          { status: 404 }
        );
      }
      // If it exists but no changes were made, return 200 OK with current data
    }

    // Fetch the updated surgery type details
    const { results } = await DB.prepare(
      "SELECT * FROM SurgeryTypes WHERE id = ?"
    )
      .bind(surgeryTypeId)
      .all();

    if (!results || results.length === 0) {
      return NextResponse.json(
        {
          message: "Failed to fetch updated surgery type details after update",
        },
        { status: 500 }
      );
    }

    const updatedSurgeryType = results[0];
    // Parse JSON fields
    try {
      if (
        updatedSurgeryType.required_staff &&
        typeof updatedSurgeryType.required_staff === "string"
      ) {
        updatedSurgeryType.required_staff = JSON.parse(
          updatedSurgeryType.required_staff
        );
      }
      if (
        updatedSurgeryType.required_equipment &&
        typeof updatedSurgeryType.required_equipment === "string"
      ) {
        updatedSurgeryType.required_equipment = JSON.parse(
          updatedSurgeryType.required_equipment
        );
      }
    } catch (error: unknown) {
      console.error(
        "Failed to parse JSON fields for updated surgery type:",
        surgeryTypeId,
        error
      );
    }

    return NextResponse.json(updatedSurgeryType);
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error updating surgery type:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("UNIQUE constraint failed")) {
      // FIX: Check errorMessage
      return NextResponse.json(
        { message: "Surgery type name must be unique", details: errorMessage },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error updating surgery type", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/ot/surgery-types/[id] - Delete a surgery type
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: surgeryTypeId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!surgeryTypeId) {
      return NextResponse.json(
        { message: "Surgery Type ID is required" },
        { status: 400 }
      );
    }

    // TODO: Check if surgery type is used in any bookings before deleting?

    const DB = process.env.DB as unknown as D1Database;
    const info = await DB.prepare("DELETE FROM SurgeryTypes WHERE id = ?")
      .bind(surgeryTypeId)
      .run();

    if (info.meta.changes === 0) {
      return NextResponse.json(
        { message: "Surgery type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Surgery type deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error deleting surgery type:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Handle potential foreign key constraint errors if bookings exist
    if (errorMessage?.includes("FOREIGN KEY constraint failed")) {
      // FIX: Check errorMessage
      return NextResponse.json(
        {
          message: "Cannot delete surgery type with existing bookings",
          details: errorMessage,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting surgery type", details: errorMessage },
      { status: 500 }
    );
  }
}

