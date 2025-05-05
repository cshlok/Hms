import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

// Interface for the POST request body
interface ChecklistResponseBody {
  checklist_template_id: string; // Assuming ID is string
  phase: string; // e.g., "Pre-Op", "Intra-Op", "Post-Op"
  responses: Record<string, unknown>; // JSON object { "itemId": responseValue, ... }
  completed_by_id?: string; // Optional, assuming ID is string
}

// GET /api/ot/bookings/[id]/checklist-responses - Get checklist responses for a booking
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const phase = searchParams.get("phase");

    const DB = process.env.DB as unknown as D1Database;
    let query = `
        SELECT 
            r.id, r.phase, r.responses, r.completed_at, 
            t.name as template_name, 
            u.name as completed_by_name
        FROM OTChecklistResponses r
        JOIN OTChecklistTemplates t ON r.checklist_template_id = t.id
        LEFT JOIN Users u ON r.completed_by_id = u.id
        WHERE r.booking_id = ?
    `;
    const queryParameters: string[] = [bookingId];

    if (phase) {
      query += " AND r.phase = ?";
      queryParameters.push(phase);
    }

    query += " ORDER BY r.phase ASC, t.name ASC";

    const { results } = await DB.prepare(query)
      .bind(...queryParameters)
      .all();

    // Parse responses JSON
    const parsedResults =
      results?.map((result) => {
        try {
          // Ensure result.responses is treated as string before parsing
          if (typeof result.responses === "string") {
            result.responses = JSON.parse(result.responses);
          }
        } catch (error: unknown) {
          console.error(
            "Failed to parse responses JSON for result:",
            result.id,
            error
          );
          // Keep responses as original string if parsing fails
        }
        return result;
      }) || [];

    return NextResponse.json(parsedResults);
  } catch (error: unknown) {
    console.error("Error fetching checklist responses:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error fetching checklist responses", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/bookings/[id]/checklist-responses - Add/Update checklist responses for a booking
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

    const body = (await request.json()) as ChecklistResponseBody;
    const {
      checklist_template_id,
      phase,
      responses, // Expected: JSON object { "itemId": responseValue, ... }
      completed_by_id, // Assuming from authenticated user context
    } = body;

    if (!checklist_template_id || !phase || !responses) {
      return NextResponse.json(
        { message: "Template ID, phase, and responses are required" },
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

    // Check if template exists
    const { results: templateResults } = await DB.prepare(
      "SELECT id FROM OTChecklistTemplates WHERE id = ? AND phase = ?"
    )
      .bind(checklist_template_id, phase)
      .all();
    if (!templateResults || templateResults.length === 0) {
      return NextResponse.json(
        { message: "Checklist template not found for the specified phase" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const completedAt = completed_by_id ? now : undefined; // Set completion time if user is provided

    // Use UPSERT logic: Insert or Replace based on booking_id and checklist_template_id
    // D1 doesn't have native UPSERT, so we check existence first
    const { results: existing } = await DB.prepare(
      "SELECT id FROM OTChecklistResponses WHERE booking_id = ? AND checklist_template_id = ?"
    )
      .bind(bookingId, checklist_template_id)
      .all();

    let responseId: string;
    if (existing && existing.length > 0 && existing[0].id) {
      // Update existing response
      responseId = existing[0].id as string;
      await DB.prepare(
        `UPDATE OTChecklistResponses 
             SET responses = ?, completed_by_id = ?, completed_at = ?, updated_at = ? 
             WHERE id = ?`
      )
        .bind(
          JSON.stringify(responses),
          completed_by_id || undefined,
          completedAt,
          now,
          responseId
        )
        .run();
    } else {
      // Insert new response
      responseId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO OTChecklistResponses (
                id, booking_id, checklist_template_id, phase, responses, 
                completed_by_id, completed_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          responseId,
          bookingId,
          checklist_template_id,
          phase,
          JSON.stringify(responses),
          completed_by_id || undefined,
          completedAt,
          now,
          now
        )
        .run();
    }

    // Fetch the created/updated response
    const { results: finalResult } = await DB.prepare(
      "SELECT * FROM OTChecklistResponses WHERE id = ?"
    )
      .bind(responseId)
      .all();

    if (finalResult && finalResult.length > 0) {
      try {
        // Ensure finalResult[0].responses is treated as string before parsing
        if (typeof finalResult[0].responses === "string") {
          finalResult[0].responses = JSON.parse(finalResult[0].responses);
        }
      } catch (error: unknown) {
        console.error(
          "Failed to parse responses JSON for final result:",
          responseId,
          error
        );
        // Keep responses as original string if parsing fails
      }
      return NextResponse.json(finalResult[0], {
        status: existing && existing.length > 0 ? 200 : 201,
      });
    } else {
      return NextResponse.json(
        { message: "Checklist response saved, but failed to fetch details" },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    console.error("Error saving checklist response:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error saving checklist response", details: errorMessage },
      { status: 500 }
    );
  }
}

