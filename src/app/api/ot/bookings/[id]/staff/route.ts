import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for the POST request body
interface StaffAssignmentBody {
  user_id: string; // Assuming ID is string
  role: string;
}

// GET /api/ot/bookings/[id]/staff - Get staff assigned to a specific OT booking
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    const { results } = await DB.prepare(
      `
        SELECT 
            a.id, a.role, a.assigned_at,
            u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
        FROM OTStaffAssignments a
        JOIN Users u ON a.user_id = u.id
        WHERE a.booking_id = ?
        ORDER BY a.role ASC, u.name ASC
    `
    )
      .bind(bookingId)
      .all();

    return NextResponse.json(results || []);
  } catch (error: unknown) {
    console.error("Error fetching OT staff assignments:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching OT staff assignments", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/bookings/[id]/staff - Assign staff to an OT booking
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required" },
        { status: 400 }
      );
    }

    const body = (await _request.json()) as StaffAssignmentBody;
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { message: "User ID and role are required" },
        { status: 400 }
      );
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
      "OT Assistant",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: "Invalid role. Must be one of: " + validRoles.join(", ") },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;

    // Check if booking exists
    const { results: bookingResults } = await DB.prepare(
      "SELECT id FROM OTBookings WHERE id = ?"
    )
      .bind(bookingId)
      .all();
    if (!bookingResults || bookingResults.length === 0) {
      return NextResponse.json(
        { message: "OT Booking not found" },
        { status: 404 }
      );
    }

    // Check if user exists
    const { results: userResults } = await DB.prepare(
      "SELECT id FROM Users WHERE id = ?"
    )
      .bind(user_id)
      .all();
    if (!userResults || userResults.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if assignment already exists
    const { results: existingResults } = await DB.prepare(
      "SELECT id FROM OTStaffAssignments WHERE booking_id = ? AND user_id = ? AND role = ?"
    )
      .bind(bookingId, user_id, role)
      .all();

    if (existingResults && existingResults.length > 0) {
      return NextResponse.json(
        { message: "Staff member already assigned with this role" },
        { status: 409 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      "INSERT INTO OTStaffAssignments (id, booking_id, user_id, role, assigned_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, bookingId, user_id, role, now)
      .run();

    // Fetch the newly created assignment with user details
    const { results } = await DB.prepare(
      `
        SELECT 
            a.id, a.role, a.assigned_at,
            u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
        FROM OTStaffAssignments a
        JOIN Users u ON a.user_id = u.id
        WHERE a.id = ?
    `
    )
      .bind(id)
      .all();

    return results && results.length > 0
      ? NextResponse.json(results[0], { status: 201 })
      : // Fallback response if fetching the joined data fails
        NextResponse.json(
          { id, booking_id: bookingId, user_id, role, assigned_at: now },
          { status: 201 }
        );
  } catch (error: unknown) {
    console.error("Error assigning staff to OT booking:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error assigning staff to OT booking", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/ot/bookings/[id]/staff - Remove all staff from an OT booking
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!bookingId) {
      return NextResponse.json(
        { message: "Booking ID is required" },
        { status: 400 }
      );
    }

    const DB = process.env.DB as unknown as D1Database;
    await DB.prepare("DELETE FROM OTStaffAssignments WHERE booking_id = ?")
      .bind(bookingId)
      .run();

    return NextResponse.json(
      {
        message: "Staff assignments removed successfully",
        // D1 delete doesn\"t reliably return changes, so we might not have an accurate count
        // count: info.meta.changes
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error removing staff assignments:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error removing staff assignments", details: errorMessage },
      { status: 500 }
    );
  }
}

