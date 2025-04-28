import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/surgery-types/[id] - Get details of a specific surgery type
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const surgeryTypeId = params.id;
    if (!surgeryTypeId) {
      return NextResponse.json({ message: "Surgery Type ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const { results } = await DB.prepare("SELECT * FROM SurgeryTypes WHERE id = ?").bind(surgeryTypeId).all();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "Surgery type not found" }, { status: 404 });
    }

    // Parse JSON fields
    try {
        if (results[0].required_staff) {
            results[0].required_staff = JSON.parse(results[0].required_staff as string);
        }
        if (results[0].required_equipment) {
            results[0].required_equipment = JSON.parse(results[0].required_equipment as string);
        }
    } catch (e) { /* ignore parse errors */ }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching surgery type details:", error);
    return NextResponse.json({ message: "Error fetching surgery type details" }, { status: 500 });
  }
}

// PUT /api/ot/surgery-types/[id] - Update an existing surgery type
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const surgeryTypeId = params.id;
    if (!surgeryTypeId) {
      return NextResponse.json({ message: "Surgery Type ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, specialty, estimated_duration_minutes, required_staff, required_equipment } = body;

    // Basic validation
    if (!name && !description && !specialty && estimated_duration_minutes === undefined && !required_staff && !required_equipment) {
        return NextResponse.json({ message: "No update fields provided" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (specialty !== undefined) fieldsToUpdate.specialty = specialty;
    if (estimated_duration_minutes !== undefined) fieldsToUpdate.estimated_duration_minutes = estimated_duration_minutes;
    if (required_staff !== undefined) fieldsToUpdate.required_staff = JSON.stringify(required_staff);
    if (required_equipment !== undefined) fieldsToUpdate.required_equipment = JSON.stringify(required_equipment);
    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE SurgeryTypes SET ${setClauses} WHERE id = ?`;
    values.push(surgeryTypeId);

    const info = await DB.prepare(updateQuery).bind(...values).run();

    if (info.meta.changes === 0) {
        return NextResponse.json({ message: "Surgery type not found or no changes made" }, { status: 404 });
    }

    // Fetch the updated surgery type details
    const { results } = await DB.prepare("SELECT * FROM SurgeryTypes WHERE id = ?").bind(surgeryTypeId).all();

    if (!results || results.length === 0) {
        return NextResponse.json({ message: "Failed to fetch updated surgery type details" }, { status: 500 });
    }

    // Parse JSON fields
    try {
        if (results[0].required_staff) {
            results[0].required_staff = JSON.parse(results[0].required_staff as string);
        }
        if (results[0].required_equipment) {
            results[0].required_equipment = JSON.parse(results[0].required_equipment as string);
        }
    } catch (e) { /* ignore parse errors */ }

    return NextResponse.json(results[0]);

  } catch (error: any) {
    console.error("Error updating surgery type:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Surgery type name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error updating surgery type" }, { status: 500 });
  }
}

// DELETE /api/ot/surgery-types/[id] - Delete a surgery type
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const surgeryTypeId = params.id;
    if (!surgeryTypeId) {
      return NextResponse.json({ message: "Surgery Type ID is required" }, { status: 400 });
    }

    // TODO: Check if surgery type is used in any bookings before deleting?

    const DB = (process.env.DB as unknown) as D1Database;
    const info = await DB.prepare("DELETE FROM SurgeryTypes WHERE id = ?").bind(surgeryTypeId).run();

    if (info.meta.changes === 0) {
      return NextResponse.json({ message: "Surgery type not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Surgery type deleted successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting surgery type:", error);
    // Handle potential foreign key constraint errors if bookings exist
    if (error.message?.includes("FOREIGN KEY constraint failed")) {
        return NextResponse.json({ message: "Cannot delete surgery type with existing bookings" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error deleting surgery type" }, { status: 500 });
  }
}

