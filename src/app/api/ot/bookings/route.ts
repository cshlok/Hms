import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for the POST request body
interface OTBookingBody {
  patient_id: string; // Assuming ID is string
  surgery_type_id: string; // Assuming ID is string
  theatre_id: string; // Assuming ID is string
  lead_surgeon_id: string; // Assuming ID is string
  anesthesiologist_id?: string | null; // Assuming ID is string, optional
  scheduled_start_time: string; // ISO string format
  scheduled_end_time: string; // ISO string format
  booking_type?: string | null; // e.g., 'elective', 'emergency'
  priority?: string | null; // e.g., 'routine', 'urgent'
  booking_notes?: string | null;
  created_by_id?: string | null; // Assuming ID is string, optional
}

// GET /api/ot/bookings - List OT bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const theatreId = searchParams.get("theatreId");
    const surgeonId = searchParams.get("surgeonId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate"); // Expected format: YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // Expected format: YYYY-MM-DD
    // TODO: Add pagination parameters (page, limit)

    const DB = process.env.DB as unknown as D1Database;
    let query = `
      SELECT 
        b.id, b.scheduled_start_time, b.scheduled_end_time, b.status, b.priority, 
        p.name as patient_name, p.mrn as patient_mrn, 
        s.name as surgery_name, 
        t.name as theatre_name, 
        u_surgeon.name as surgeon_name
      FROM OTBookings b
      JOIN Patients p ON b.patient_id = p.id
      JOIN SurgeryTypes s ON b.surgery_type_id = s.id
      JOIN OperationTheatres t ON b.theatre_id = t.id
      JOIN Users u_surgeon ON b.lead_surgeon_id = u_surgeon.id
    `;
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (theatreId) {
      conditions.push("b.theatre_id = ?");
      parameters.push(theatreId);
    }
    if (surgeonId) {
      conditions.push("b.lead_surgeon_id = ?");
      parameters.push(surgeonId);
    }
    if (patientId) {
      conditions.push("b.patient_id = ?");
      parameters.push(patientId);
    }
    if (status) {
      conditions.push("b.status = ?");
      parameters.push(status);
    }
    if (startDate) {
      conditions.push("date(b.scheduled_start_time) >= date(?)");
      parameters.push(startDate);
    }
    if (endDate) {
      conditions.push("date(b.scheduled_start_time) <= date(?)");
      parameters.push(endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY b.scheduled_start_time ASC";
    // TODO: Add LIMIT and OFFSET for pagination

    const { results } = await DB.prepare(query)
      .bind(...parameters)
      .all();

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("Error fetching OT bookings:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching OT bookings", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/bookings - Create a new OT booking
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OTBookingBody;
    const {
      patient_id,
      surgery_type_id,
      theatre_id,
      lead_surgeon_id,
      anesthesiologist_id,
      scheduled_start_time,
      scheduled_end_time,
      booking_type,
      priority,
      booking_notes,
      created_by_id, // Assuming this comes from authenticated user context in a real app
    } = body;

    // Basic validation
    if (
      !patient_id ||
      !surgery_type_id ||
      !theatre_id ||
      !lead_surgeon_id ||
      !scheduled_start_time ||
      !scheduled_end_time
    ) {
      return NextResponse.json(
        { message: "Missing required booking fields" },
        { status: 400 }
      );
    }

    // TODO: Add validation for time conflicts in the selected theatre

    const DB = process.env.DB as unknown as D1Database;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await DB.prepare(
      `INSERT INTO OTBookings (
        id, patient_id, surgery_type_id, theatre_id, lead_surgeon_id, anesthesiologist_id, 
        scheduled_start_time, scheduled_end_time, booking_type, priority, status, 
        booking_notes, created_by_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        patient_id,
        surgery_type_id,
        theatre_id,
        lead_surgeon_id,
        anesthesiologist_id || undefined,
        scheduled_start_time,
        scheduled_end_time,
        booking_type || "elective",
        priority || "routine",
        "scheduled", // Initial status
        booking_notes || undefined,
        created_by_id || undefined, // Replace with actual user ID
        now,
        now
      )
      .run();

    // Fetch the newly created booking details (joining with related tables for context)
    const { results } = await DB.prepare(
      `
        SELECT 
            b.*, 
            p.name as patient_name, 
            s.name as surgery_name, 
            t.name as theatre_name, 
            u_surgeon.name as surgeon_name,
            u_anes.name as anesthesiologist_name
        FROM OTBookings b
        JOIN Patients p ON b.patient_id = p.id
        JOIN SurgeryTypes s ON b.surgery_type_id = s.id
        JOIN OperationTheatres t ON b.theatre_id = t.id
        JOIN Users u_surgeon ON b.lead_surgeon_id = u_surgeon.id
        LEFT JOIN Users u_anes ON b.anesthesiologist_id = u_anes.id
        WHERE b.id = ?
    `
    )
      .bind(id)
      .all();

    return results && results.length > 0
      ? NextResponse.json(results[0], { status: 201 })
      : // Fallback if select fails
        NextResponse.json(
          { message: "Booking created, but failed to fetch details" },
          { status: 201 }
        );
  } catch (error: unknown) {
    // FIX: Remove explicit any
    console.error("Error creating OT booking:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // TODO: Add specific error handling for time conflicts if validation is implemented
    return NextResponse.json(
      { message: "Error creating OT booking", details: errorMessage },
      { status: 500 }
    );
  }
}
