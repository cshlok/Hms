// src/app/api/ot/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"; // FIX: Import NextRequest
// import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// GET /api/ot/bookings/[id] - Get a specific OT booking by ID
export async function GET(
  _request: NextRequest, // FIX: Use NextRequest
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext();
    // const DB = env.DB;
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)

    // Placeholder for database query
    /*
    const booking = await DB
      .prepare("SELECT * FROM OTBookings WHERE id = ?")
      .bind(bookingId)
      .first();
    */

    // Mock data for development
    const booking = {
      id: bookingId,
      patient_id: "patient_123",
      surgeon_id: "doctor_456",
      procedure_id: "proc_789",
      scheduled_date: new Date().toISOString(),
      duration_minutes: 120,
      status: "scheduled",
      notes: "Patient has allergies to latex",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (!booking) {
      return NextResponse.json(
        { message: "OT Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error fetching OT booking:", error);
    // FIX: Handle error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching OT booking", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/ot/bookings/[id] - Update a specific OT booking
export async function PUT(
  _request: NextRequest, // FIX: Use NextRequest
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext();
    // const DB = env.DB;
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    const updateData = await _request.json();

    // Validate required fields
    if (!updateData) {
      return NextResponse.json(
        { message: "No update data provided" },
        { status: 400 }
      );
    }

    // Placeholder for database update
    /*
    const info = await DB
      .prepare(`
        UPDATE OTBookings 
        SET 
          surgeon_id = COALESCE(?, surgeon_id),
          procedure_id = COALESCE(?, procedure_id),
          scheduled_date = COALESCE(?, scheduled_date),
          duration_minutes = COALESCE(?, duration_minutes),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = ?
        WHERE id = ?
      `)
      .bind(
        updateData.surgeon_id || null,
        updateData.procedure_id || null,
        updateData.scheduled_date || null,
        updateData.duration_minutes || null,
        updateData.status || null,
        updateData.notes || null,
        new Date().toISOString(),
        bookingId
      )
      .run();
    */

    // Mock update for development
    const updatedBooking = {
      id: bookingId,
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(updatedBooking);
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error updating OT booking:", error);
    // FIX: Handle error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error updating OT booking", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/ot/bookings/[id] - Cancel a specific OT booking
export async function DELETE(
  _request: NextRequest, // FIX: Use NextRequest
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext();
    // const DB = env.DB;
    const { id: bookingId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    // const now = new Date().toISOString(); // Unused variable

    // Option 1: Hard delete (if allowed)
    // const info = await DB.prepare("DELETE FROM OTBookings WHERE id = ?").bind(bookingId).run();

    // Option 2: Soft delete (update status to \'cancelled\')
    // Mock implementation for development
    console.log(`Cancelling booking ${bookingId}`);

    // Return success response
    return NextResponse.json(
      { message: "OT Booking cancelled successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error cancelling OT booking:", error);
    // FIX: Handle error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error cancelling OT booking", details: errorMessage },
      { status: 500 }
    );
  }
}

