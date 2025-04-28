import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// GET /api/ot/bookings/[id]/record - Get operation record for a booking
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const DB = (process.env.DB as unknown) as D1Database;
    
    // Fetch the OT record
    const { results } = await DB.prepare(`
        SELECT r.*, u.name as recorded_by_name
        FROM OTRecords r
        LEFT JOIN Users u ON r.recorded_by_id = u.id
        WHERE r.booking_id = ?
    `).bind(bookingId).all();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: "Operation record not found for this booking" }, { status: 404 });
    }

    // Parse JSON fields if present
    try {
        if (results[0].implants_used) {
            results[0].implants_used = JSON.parse(results[0].implants_used as string);
        }
        if (results[0].specimens_collected) {
            results[0].specimens_collected = JSON.parse(results[0].specimens_collected as string);
        }
    } catch (e) { /* ignore parse errors */ }

    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching operation record:", error);
    return NextResponse.json({ message: "Error fetching operation record" }, { status: 500 });
  }
}

// POST /api/ot/bookings/[id]/record - Create/Update operation record for a booking
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
    }

    const body = await request.json();
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
      recorded_by_id
    } = body;

    const DB = (process.env.DB as unknown) as D1Database;
    
    // Check if booking exists
    const { results: bookingResults } = await DB.prepare("SELECT id, status FROM OTBookings WHERE id = ?").bind(bookingId).all();
    if (!bookingResults || bookingResults.length === 0) {
      return NextResponse.json({ message: "OT Booking not found" }, { status: 404 });
    }

    // Update booking status to 'in_progress' if it's currently 'scheduled' or 'confirmed'
    if (actual_start_time && ['scheduled', 'confirmed'].includes(bookingResults[0].status as string)) {
        await DB.prepare("UPDATE OTBookings SET status = 'in_progress', updated_at = ? WHERE id = ?")
            .bind(new Date().toISOString(), bookingId)
            .run();
    }
    
    // Update booking status to 'completed' if actual_end_time is provided
    if (actual_end_time) {
        await DB.prepare("UPDATE OTBookings SET status = 'completed', updated_at = ? WHERE id = ?")
            .bind(new Date().toISOString(), bookingId)
            .run();
    }

    const now = new Date().toISOString();

    // Check if record already exists
    const { results: existingRecord } = await DB.prepare("SELECT id FROM OTRecords WHERE booking_id = ?").bind(bookingId).all();
    
    if (existingRecord && existingRecord.length > 0) {
        // Update existing record
        const recordId = existingRecord[0].id;
        
        // Build update query dynamically
        const fieldsToUpdate: { [key: string]: any } = {};
        if (actual_start_time !== undefined) fieldsToUpdate.actual_start_time = actual_start_time;
        if (actual_end_time !== undefined) fieldsToUpdate.actual_end_time = actual_end_time;
        if (anesthesia_start_time !== undefined) fieldsToUpdate.anesthesia_start_time = anesthesia_start_time;
        if (anesthesia_end_time !== undefined) fieldsToUpdate.anesthesia_end_time = anesthesia_end_time;
        if (anesthesia_type !== undefined) fieldsToUpdate.anesthesia_type = anesthesia_type;
        if (anesthesia_notes !== undefined) fieldsToUpdate.anesthesia_notes = anesthesia_notes;
        if (surgical_procedure_notes !== undefined) fieldsToUpdate.surgical_procedure_notes = surgical_procedure_notes;
        if (implants_used !== undefined) fieldsToUpdate.implants_used = JSON.stringify(implants_used);
        if (specimens_collected !== undefined) fieldsToUpdate.specimens_collected = JSON.stringify(specimens_collected);
        if (blood_loss_ml !== undefined) fieldsToUpdate.blood_loss_ml = blood_loss_ml;
        if (complications !== undefined) fieldsToUpdate.complications = complications;
        if (instrument_count_correct !== undefined) fieldsToUpdate.instrument_count_correct = instrument_count_correct;
        if (sponge_count_correct !== undefined) fieldsToUpdate.sponge_count_correct = sponge_count_correct;
        if (recorded_by_id !== undefined) fieldsToUpdate.recorded_by_id = recorded_by_id;
        fieldsToUpdate.updated_at = now;
        
        const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
        const values = Object.values(fieldsToUpdate);
        
        const updateQuery = `UPDATE OTRecords SET ${setClauses} WHERE id = ?`;
        values.push(recordId);
        
        await DB.prepare(updateQuery).bind(...values).run();
        
        // Fetch updated record
        const { results: updatedRecord } = await DB.prepare("SELECT * FROM OTRecords WHERE id = ?").bind(recordId).all();
        
        if (updatedRecord && updatedRecord.length > 0) {
            try {
                if (updatedRecord[0].implants_used) {
                    updatedRecord[0].implants_used = JSON.parse(updatedRecord[0].implants_used as string);
                }
                if (updatedRecord[0].specimens_collected) {
                    updatedRecord[0].specimens_collected = JSON.parse(updatedRecord[0].specimens_collected as string);
                }
            } catch (e) { /* ignore parse errors */ }
            
            return NextResponse.json(updatedRecord[0]);
        } else {
            return NextResponse.json({ message: "Record updated but failed to fetch details" }, { status: 200 });
        }
    } else {
        // Create new record
        const recordId = crypto.randomUUID();
        
        await DB.prepare(`
            INSERT INTO OTRecords (
                id, booking_id, actual_start_time, actual_end_time, 
                anesthesia_start_time, anesthesia_end_time, anesthesia_type, anesthesia_notes,
                surgical_procedure_notes, implants_used, specimens_collected, 
                blood_loss_ml, complications, instrument_count_correct, sponge_count_correct,
                recorded_by_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            recordId,
            bookingId,
            actual_start_time || null,
            actual_end_time || null,
            anesthesia_start_time || null,
            anesthesia_end_time || null,
            anesthesia_type || null,
            anesthesia_notes || null,
            surgical_procedure_notes || null,
            implants_used ? JSON.stringify(implants_used) : null,
            specimens_collected ? JSON.stringify(specimens_collected) : null,
            blood_loss_ml || null,
            complications || null,
            instrument_count_correct !== undefined ? instrument_count_correct : null,
            sponge_count_correct !== undefined ? sponge_count_correct : null,
            recorded_by_id || null,
            now,
            now
        ).run();
        
        // Fetch created record
        const { results: newRecord } = await DB.prepare("SELECT * FROM OTRecords WHERE id = ?").bind(recordId).all();
        
        if (newRecord && newRecord.length > 0) {
            try {
                if (newRecord[0].implants_used) {
                    newRecord[0].implants_used = JSON.parse(newRecord[0].implants_used as string);
                }
                if (newRecord[0].specimens_collected) {
                    newRecord[0].specimens_collected = JSON.parse(newRecord[0].specimens_collected as string);
                }
            } catch (e) { /* ignore parse errors */ }
            
            return NextResponse.json(newRecord[0], { status: 201 });
        } else {
            return NextResponse.json({ message: "Record created but failed to fetch details" }, { status: 201 });
        }
    }
  } catch (error) {
    console.error("Error saving operation record:", error);
    return NextResponse.json({ message: "Error saving operation record" }, { status: 500 });
  }
}
