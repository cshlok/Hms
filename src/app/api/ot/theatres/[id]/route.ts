import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/theatres/[id] - Get details of a specific operation theatre
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const theatreId = params.id;
    if (!theatreId) {
      return NextResponse.json({ message: "Theatre ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const { results } = await DB.prepare("SELECT * FROM OperationTheatres WHERE id = ?").bind(theatreId).all();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "Operation theatre not found" }, { status: 404 });
    }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching operation theatre details:", error);
    return NextResponse.json({ message: "Error fetching operation theatre details" }, { status: 500 });
  }
}

// PUT /api/ot/theatres/[id] - Update an existing operation theatre
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const theatreId = params.id;
    if (!theatreId) {
      return NextResponse.json({ message: "Theatre ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, location, specialty, status, equipment } = body;

    // Basic validation - ensure at least one field is being updated
    if (!name && !location && !specialty && !status && !equipment) {
        return NextResponse.json({ message: "No update fields provided" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (location !== undefined) fieldsToUpdate.location = location;
    if (specialty !== undefined) fieldsToUpdate.specialty = specialty;
    if (status !== undefined) fieldsToUpdate.status = status;
    if (equipment !== undefined) fieldsToUpdate.equipment = equipment;
    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE OperationTheatres SET ${setClauses} WHERE id = ?`;
    values.push(theatreId);

    const info = await DB.prepare(updateQuery).bind(...values).run();

    if (info.meta.changes === 0) {
        return NextResponse.json({ message: "Operation theatre not found or no changes made" }, { status: 404 });
    }

    // Fetch the updated theatre details
    const { results } = await DB.prepare("SELECT * FROM OperationTheatres WHERE id = ?").bind(theatreId).all();

    if (!results || results.length === 0) {
        return NextResponse.json({ message: "Failed to fetch updated theatre details" }, { status: 500 });
    }

    return NextResponse.json(results[0]);

  } catch (error: any) {
    console.error("Error updating operation theatre:", error);
    if (error.message?.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ message: "Operation theatre name must be unique" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error updating operation theatre" }, { status: 500 });
  }
}

// DELETE /api/ot/theatres/[id] - Delete an operation theatre
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const theatreId = params.id;
    if (!theatreId) {
      return NextResponse.json({ message: "Theatre ID is required" }, { status: 400 });
    }

    // TODO: Add check - prevent deletion if theatre has active/future bookings?

    const DB = (process.env.DB as unknown) as D1Database;
    const info = await DB.prepare("DELETE FROM OperationTheatres WHERE id = ?").bind(theatreId).run();

    if (info.meta.changes === 0) {
      return NextResponse.json({ message: "Operation theatre not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Operation theatre deleted successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting operation theatre:", error);
    // Handle potential foreign key constraint errors if bookings exist
    if (error.message?.includes("FOREIGN KEY constraint failed")) {
        return NextResponse.json({ message: "Cannot delete theatre with existing bookings" }, { status: 409 });
    }
    return NextResponse.json({ message: "Error deleting operation theatre" }, { status: 500 });
  }
}

