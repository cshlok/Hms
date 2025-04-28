import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/bookings/[id]/staff - Get staff assigned to a specific OT booking
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const { results } = await DB.prepare(`
        SELECT 
            a.id, a.role, a.assigned_at,
            u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
        FROM OTStaffAssignments a
        JOIN Users u ON a.user_id = u.id
        WHERE a.booking_id = ?
        ORDER BY a.role ASC, u.name ASC
    `).bind(bookingId).all();

    return NextResponse.json(results || []);
  } catch (error) {
    console.error("Error fetching OT staff assignments:", error);
    return NextResponse.json({ message: "Error fetching OT staff assignments" }, { status: 500 });
  }
}

// POST /api/ot/bookings/[id]/staff - Assign staff to an OT booking
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json({ message: "User ID and role are required" }, { status: 400 });
    }

    // Validate role is one of the allowed values
    const validRoles = [
      "Surgeon", 
      "Assistant Surgeon", 
      "Anesthesiologist", 
      "Anesthesia Assistant", 
      "Scrub Nurse", 
      "Circulating Nurse", 
      "Technician", 
      "OT Assistant"
    ];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role. Must be one of: " + validRoles.join(", ") }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    
    // Check if booking exists
    const { results: bookingResults } = await DB.prepare("SELECT id FROM OTBookings WHERE id = ?").bind(bookingId).all();
    if (!bookingResults || bookingResults.length === 0) {
      return NextResponse.json({ message: "OT Booking not found" }, { status: 404 });
    }
    
    // Check if user exists
    const { results: userResults } = await DB.prepare("SELECT id FROM Users WHERE id = ?").bind(user_id).all();
    if (!userResults || userResults.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    // Check if assignment already exists
    const { results: existingResults } = await DB.prepare(
      "SELECT id FROM OTStaffAssignments WHERE booking_id = ? AND user_id = ? AND role = ?"
    ).bind(bookingId, user_id, role).all();
    
    if (existingResults && existingResults.length > 0) {
      return NextResponse.json({ message: "Staff member already assigned with this role" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OTStaffAssignments (id, booking_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, bookingId, user_id, role, now).run();

    // Fetch the newly created assignment with user details
    const { results } = await DB.prepare(`
        SELECT 
            a.id, a.role, a.assigned_at,
            u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
        FROM OTStaffAssignments a
        JOIN Users u ON a.user_id = u.id
        WHERE a.id = ?
    `).bind(id).all();

    if (results && results.length > 0) {
        return NextResponse.json(results[0], { status: 201 });
    } else {
        return NextResponse.json({ id, booking_id: bookingId, user_id, role, assigned_at: now }, { status: 201 });
    }

  } catch (error) {
    console.error("Error assigning staff to OT booking:", error);
    return NextResponse.json({ message: "Error assigning staff to OT booking" }, { status: 500 });
  }
}

// DELETE /api/ot/bookings/[id]/staff - Remove all staff from an OT booking
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const info = await DB.prepare("DELETE FROM OTStaffAssignments WHERE booking_id = ?").bind(bookingId).run();

    return NextResponse.json({ 
      message: "Staff assignments removed successfully", 
      count: info.meta.changes 
    }, { status: 200 });

  } catch (error) {
    console.error("Error removing staff assignments:", error);
    return NextResponse.json({ message: "Error removing staff assignments" }, { status: 500 });
  }
}
