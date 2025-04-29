import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/bookings/[id] - Get details of a specific OT booking
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    // Fetch booking details, joining with related tables for context
    const { results } = await DB.prepare(`
        SELECT 
            b.*, 
            p.name as patient_name, p.mrn as patient_mrn, p.date_of_birth as patient_dob, p.gender as patient_gender,
            s.name as surgery_name, s.estimated_duration_minutes,
            t.name as theatre_name, 
            u_surgeon.name as surgeon_name,
            u_anes.name as anesthesiologist_name,
            u_creator.name as created_by_name
        FROM OTBookings b
        JOIN Patients p ON b.patient_id = p.id
        JOIN SurgeryTypes s ON b.surgery_type_id = s.id
        JOIN OperationTheatres t ON b.theatre_id = t.id
        JOIN Users u_surgeon ON b.lead_surgeon_id = u_surgeon.id
        LEFT JOIN Users u_anes ON b.anesthesiologist_id = u_anes.id
        LEFT JOIN Users u_creator ON b.created_by_id = u_creator.id
        WHERE b.id = ?
    `).bind(bookingId).all();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "OT Booking not found" }, { status: 404 });
    }

    // TODO: Fetch assigned staff separately if needed
    // TODO: Fetch checklist responses separately if needed

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching OT booking details:", error);
    return NextResponse.json({ message: "Error fetching OT booking details" }, { status: 500 });
  }
}

// PUT /api/ot/bookings/[id] - Update an existing OT booking (e.g., status, times, staff)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const body = await request.json();
    // Allow updating specific fields like status, times, staff, notes
    const {
      theatre_id,
      lead_surgeon_id,
      anesthesiologist_id,
      scheduled_start_time,
      scheduled_end_time,
      status,
      priority,
      pre_op_assessment_notes,
      consent_obtained,
      booking_notes
    } = body;

    const DB = (process.env.DB as unknown) as D1Database;
    const now = new Date().toISOString();

    // Construct the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (theatre_id !== undefined) fieldsToUpdate.theatre_id = theatre_id;
    if (lead_surgeon_id !== undefined) fieldsToUpdate.lead_surgeon_id = lead_surgeon_id;
    if (anesthesiologist_id !== undefined) fieldsToUpdate.anesthesiologist_id = anesthesiologist_id;
    if (scheduled_start_time !== undefined) fieldsToUpdate.scheduled_start_time = scheduled_start_time;
    if (scheduled_end_time !== undefined) fieldsToUpdate.scheduled_end_time = scheduled_end_time;
    if (status !== undefined) fieldsToUpdate.status = status;
    if (priority !== undefined) fieldsToUpdate.priority = priority;
    if (pre_op_assessment_notes !== undefined) fieldsToUpdate.pre_op_assessment_notes = pre_op_assessment_notes;
    if (consent_obtained !== undefined) fieldsToUpdate.consent_obtained = consent_obtained;
    if (booking_notes !== undefined) fieldsToUpdate.booking_notes = booking_notes;
    
    // Ensure at least one field is being updated
    if (Object.keys(fieldsToUpdate).length === 0) {
        return NextResponse.json({ message: "No update fields provided" }, { status: 400 });
    }

    fieldsToUpdate.updated_at = now;

    // TODO: Add validation for time conflicts if times/theatre are changed

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE OTBookings SET ${setClauses} WHERE id = ?`;
    values.push(bookingId);

    const info = await DB.prepare(updateQuery).bind(...values).run();

    if (info.meta.changes === 0) {
        return NextResponse.json({ message: "OT Booking not found or no changes made" }, { status: 404 });
    }

    // Fetch the updated booking details
    const { results } = await DB.prepare(`
        SELECT b.*, p.name as patient_name, s.name as surgery_name, t.name as theatre_name 
        FROM OTBookings b
        JOIN Patients p ON b.patient_id = p.id
        JOIN SurgeryTypes s ON b.surgery_type_id = s.id
        JOIN OperationTheatres t ON b.theatre_id = t.id
        WHERE b.id = ?
    `).bind(bookingId).all();

    if (!results || results.length === 0) {
        return NextResponse.json({ message: "Failed to fetch updated booking details" }, { status: 500 });
    }

    return NextResponse.json(results[0]);

  } catch (error: any) {
    console.error("Error updating OT booking:", error);
    // TODO: Add specific error handling for time conflicts
    return NextResponse.json({ message: "Error updating OT booking" }, { status: 500 });
  }
}

// DELETE /api/ot/bookings/[id] - Cancel an OT booking (soft delete or status update)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    const now = new Date().toISOString();

    // Option 1: Hard delete (if allowed)
    // const info = await DB.prepare("DELETE FROM OTBookings WHERE id = ?").bind(bookingId).run();

    // Option 2: Soft delete (update status to 'cancelled')
    // Fixed SQL syntax: added single quotes around string literals
    const info = await DB.prepare("UPDATE OTBookings SET status = ?, updated_at = ? WHERE id = ? AND status NOT IN ('completed', 'in_progress')")
                       .bind("cancelled", now, bookingId)
                       .run();

    if (info.meta.changes === 0) {
      return NextResponse.json({ message: "OT Booking not found or cannot be cancelled (e.g., already completed/in progress)" }, { status: 404 });
    }

    return NextResponse.json({ message: "OT Booking cancelled successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error cancelling OT booking:", error);
    return NextResponse.json({ message: "Error cancelling OT booking" }, { status: 500 });
  }
}

