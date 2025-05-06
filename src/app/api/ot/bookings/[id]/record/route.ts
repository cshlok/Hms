import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for the POST request body
interface OTRecordBody {
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  anesthesia_start_time?: string | null;
  anesthesia_end_time?: string | null;
  anesthesia_type?: string | null;
  anesthesia_notes?: string | null;
  surgical_procedure_notes?: string | null;
  // FIX: Use unknown[] instead of any[]
  implants_used?: unknown[] | null; // Assuming array of objects/strings
  specimens_collected?: unknown[] | null; // Assuming array of objects/strings
  blood_loss_ml?: number | null;
  complications?: string | null;
  instrument_count_correct?: boolean | null;
  sponge_count_correct?: boolean | null;
  recorded_by_id?: string | null; // Assuming ID is string
}

// GET /api/ot/bookings/[id]/record - Get operation record for a booking
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

    // Fetch the OT record
    const { results } = await DB.prepare(
      `
        SELECT r.*, u.name as recorded_by_name
        FROM OTRecords r
        LEFT JOIN Users u ON r.recorded_by_id = u.id
        WHERE r.booking_id = ?
    `
    )
      .bind(bookingId)
      .all();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { message: "Operation record not found for this booking" },
        { status: 404 }
      );
    }

    // Parse JSON fields if present
    const record = results[0];
    try {
      if (record.implants_used && typeof record.implants_used === "string") {
        record.implants_used = JSON.parse(record.implants_used);
      }
      if (
        record.specimens_collected &&
        typeof record.specimens_collected === "string"
      ) {
        record.specimens_collected = JSON.parse(record.specimens_collected);
      }
    } catch (error: unknown) {
      console.error(
        "Failed to parse JSON fields for record:",
        record.id,
        error
      );
    }

    return NextResponse.json(record);
  } catch (error: unknown) {
    console.error("Error fetching operation record:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching operation record", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/bookings/[id]/record - Create/Update operation record for a booking
export async function POST(
  request: NextRequest,
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

    const body = (await request.json()) as OTRecordBody;
    const {
      actual_start_time,
      actual_end_time,
      anesthesia_start_time,
      anesthesia_end_time,
      anesthesia_type,
      anesthesia_notes,
      surgical_procedure_notes,
      implants_used,
      specimens_collected,
      blood_loss_ml,
      complications,
      instrument_count_correct,
      sponge_count_correct,
      recorded_by_id,
    } = body;

    const DB = process.env.DB as unknown as D1Database;

    // Check if booking exists
    const { results: bookingResults } = await DB.prepare(
      "SELECT id, status FROM OTBookings WHERE id = ?"
    )
      .bind(bookingId)
      .all();
    if (!bookingResults || bookingResults.length === 0) {
      return NextResponse.json(
        { message: "OT Booking not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update booking status based on times provided
    if (
      actual_start_time &&
      ["scheduled", "confirmed"].includes(bookingResults[0].status as string)
    ) {
      await DB.prepare(
        "UPDATE OTBookings SET status = 'in_progress', updated_at = ? WHERE id = ?"
      )
        .bind(now, bookingId)
        .run();
    }
    if (actual_end_time) {
      await DB.prepare(
        "UPDATE OTBookings SET status = 'completed', updated_at = ? WHERE id = ?"
      )
        .bind(now, bookingId)
        .run();
    }

    // Check if record already exists
    const { results: existingRecord } = await DB.prepare(
      "SELECT id FROM OTRecords WHERE booking_id = ?"
    )
      .bind(bookingId)
      .all();

    let recordId: string;
    let isNewRecord = false;

    if (existingRecord && existingRecord.length > 0 && existingRecord[0].id) {
      // Update existing record
      recordId = existingRecord[0].id as string;

      // Build update query dynamically
      // FIX: Use a more specific type for fieldsToUpdate values
      const fieldsToUpdate: {
        [key: string]: string | number | boolean | null;
      } = {};
      if (actual_start_time !== undefined)
        fieldsToUpdate.actual_start_time = actual_start_time;
      if (actual_end_time !== undefined)
        fieldsToUpdate.actual_end_time = actual_end_time;
      if (anesthesia_start_time !== undefined)
        fieldsToUpdate.anesthesia_start_time = anesthesia_start_time;
      if (anesthesia_end_time !== undefined)
        fieldsToUpdate.anesthesia_end_time = anesthesia_end_time;
      if (anesthesia_type !== undefined)
        fieldsToUpdate.anesthesia_type = anesthesia_type;
      if (anesthesia_notes !== undefined)
        fieldsToUpdate.anesthesia_notes = anesthesia_notes;
      if (surgical_procedure_notes !== undefined)
        fieldsToUpdate.surgical_procedure_notes = surgical_procedure_notes;
      if (implants_used !== undefined)
        fieldsToUpdate.implants_used = JSON.stringify(implants_used);
      if (specimens_collected !== undefined)
        fieldsToUpdate.specimens_collected =
          JSON.stringify(specimens_collected);
      if (blood_loss_ml !== undefined)
        fieldsToUpdate.blood_loss_ml = blood_loss_ml;
      if (complications !== undefined)
        fieldsToUpdate.complications = complications;
      if (instrument_count_correct !== undefined)
        fieldsToUpdate.instrument_count_correct = instrument_count_correct;
      if (sponge_count_correct !== undefined)
        fieldsToUpdate.sponge_count_correct = sponge_count_correct;
      if (recorded_by_id !== undefined)
        fieldsToUpdate.recorded_by_id = recorded_by_id;
      fieldsToUpdate.updated_at = now;

      if (Object.keys(fieldsToUpdate).length > 1) {
        // Only update if there are fields other than updated_at
        const setClauses = Object.keys(fieldsToUpdate)
          .map((key) => `${key} = ?`)
          .join(", ");
        const values = Object.values(fieldsToUpdate);

        const updateQuery = `UPDATE OTRecords SET ${setClauses} WHERE id = ?`;
        values.push(recordId);

        await DB.prepare(updateQuery)
          .bind(...values)
          .run();
      }
    } else {
      // Create new record
      isNewRecord = true;
      recordId = crypto.randomUUID();

      await DB.prepare(
        `
            INSERT INTO OTRecords (
                id, booking_id, actual_start_time, actual_end_time, 
                anesthesia_start_time, anesthesia_end_time, anesthesia_type, anesthesia_notes,
                surgical_procedure_notes, implants_used, specimens_collected, 
                blood_loss_ml, complications, instrument_count_correct, sponge_count_correct,
                recorded_by_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
        .bind(
          recordId,
          bookingId,
          actual_start_time || undefined,
          actual_end_time || undefined,
          anesthesia_start_time || undefined,
          anesthesia_end_time || undefined,
          anesthesia_type || undefined,
          anesthesia_notes || undefined,
          surgical_procedure_notes || undefined,
          implants_used ? JSON.stringify(implants_used) : undefined,
          specimens_collected ? JSON.stringify(specimens_collected) : undefined,
          blood_loss_ml || undefined,
          complications || undefined,
          instrument_count_correct === undefined
            ? undefined
            : instrument_count_correct,
          sponge_count_correct === undefined ? undefined : sponge_count_correct,
          recorded_by_id || undefined,
          now,
          now
        )
        .run();
    }

    // Fetch the created/updated record
    const { results: finalRecordResult } = await DB.prepare(
      "SELECT * FROM OTRecords WHERE id = ?"
    )
      .bind(recordId)
      .all();

    if (finalRecordResult && finalRecordResult.length > 0) {
      const finalRecord = finalRecordResult[0];
      try {
        if (
          finalRecord.implants_used &&
          typeof finalRecord.implants_used === "string"
        ) {
          finalRecord.implants_used = JSON.parse(finalRecord.implants_used);
        }
        if (
          finalRecord.specimens_collected &&
          typeof finalRecord.specimens_collected === "string"
        ) {
          finalRecord.specimens_collected = JSON.parse(
            finalRecord.specimens_collected
          );
        }
      } catch (error: unknown) {
        console.error(
          "Failed to parse JSON fields for final record:",
          recordId,
          error
        );
      }
      return NextResponse.json(finalRecord, {
        status: isNewRecord ? 201 : 200,
      });
    } else {
      return NextResponse.json(
        {
          message: `Record ${isNewRecord ? "created" : "updated"} but failed to fetch details`,
        },
        { status: isNewRecord ? 201 : 200 }
      );
    }
  } catch (error: unknown) {
    console.error("Error saving operation record:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error saving operation record", details: errorMessage },
      { status: 500 }
    );
  }
}

