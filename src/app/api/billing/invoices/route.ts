// Note: This file seems to contain OT Booking logic, not Billing Invoices.
// Path: /home/ubuntu/Hms/src/app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
// import { D1Database } from "@cloudflare/workers-types"; // Commented out Cloudflare dependency

export const runtime = "edge";

// Mock Database Interface (replace with your actual DB client if not using Cloudflare D1)
interface MockDB {
  prepare: (query: string) => MockStatement;
}
interface MockStatement {
  bind: (...values: any[]) => MockStatement;
  run: () => Promise<{ meta: { changes: number } }>;
  all: () => Promise<{ results: any[] }>;
}

// Mock DB implementation
const createMockDB = (): MockDB => ({
  prepare: (query: string) => {
    console.log(`[Mock DB] Prepare: ${query}`);
    let boundValues: any[] = [];
    const mockStatement: MockStatement = {
      bind: (...values: any[]) => {
        boundValues = values;
        console.log(`[Mock DB] Bind: ${values}`);
        return mockStatement;
      },
      run: async () => {
        console.log(`[Mock DB] Run with: ${boundValues}`);
        // Simulate changes based on query type
        const changes = query.toLowerCase().startsWith("update") || query.toLowerCase().startsWith("delete") ? 1 : 0;
        return { meta: { changes } };
      },
      all: async () => {
        console.log(`[Mock DB] All with: ${boundValues}`);
        // Simulate returning data based on query
        if (query.includes("SELECT") && query.includes("OTBookings")) {
            // Mock data for GET /api/ot/bookings/[id]
            if (boundValues[0] === "booking_123") { // Example ID
                return { results: [{
                    id: "booking_123",
                    patient_id: "patient_abc",
                    surgery_type_id: "surgery_xyz",
                    theatre_id: "theatre_1",
                    lead_surgeon_id: "surgeon_1",
                    scheduled_start_time: new Date().toISOString(),
                    status: "scheduled",
                    patient_name: "Mock Patient",
                    patient_mrn: "MRN_MOCK",
                    patient_dob: "1990-01-01",
                    patient_gender: "Other",
                    surgery_name: "Mock Surgery",
                    estimated_duration_minutes: 120,
                    theatre_name: "OT 1",
                    surgeon_name: "Dr. Mock",
                    anesthesiologist_name: "Dr. Anes Mock",
                    created_by_name: "Admin Mock"
                }] };
            }
        }
        return { results: [] };
      },
    };
    return mockStatement;
  },
});

// Use Mock DB
const DB = createMockDB();

// GET /api/ot/bookings/[id] - Get details of a specific OT booking
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead
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
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: "Error fetching OT booking details", details: errorMessage }, { status: 500 });
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

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead
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
        // Simulate returning the updated data based on input for mock
        const updatedBooking = { id: bookingId, ...fieldsToUpdate };
        return NextResponse.json(updatedBooking);
        // return NextResponse.json({ message: "Failed to fetch updated booking details" }, { status: 500 });
    }

    return NextResponse.json(results[0]);

  } catch (error: any) {
    console.error("Error updating OT booking:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // TODO: Add specific error handling for time conflicts
    return NextResponse.json({ message: "Error updating OT booking", details: errorMessage }, { status: 500 });
  }
}

// DELETE /api/ot/bookings/[id] - Cancel an OT booking (soft delete or status update)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead
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
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: "Error cancelling OT booking", details: errorMessage }, { status: 500 });
  }
}

