// src/app/api/er/visits/[id]/triage/route.ts
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { v4 as uuidv4 } from "uuid";

export const runtime = "edge";

// GET /api/er/visits/[id]/triage - Get triage assessment for a visit
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitId = params.id;

    // Placeholder for database query (usually expect one primary triage)
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_triage_assessments WHERE visit_id = ? ORDER BY triage_timestamp DESC LIMIT 1")
      .bind(visitId)
      .all();

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Triage assessment not found for this visit" },
        { status: 404 }
      );
    }
    const triage = results[0];
    */

    // Mock data
    const triage = {
        id: uuidv4(),
        visit_id: visitId,
        triage_timestamp: new Date().toISOString(),
        triage_nurse_id: "nurse_456",
        esi_level: 3,
        vital_signs: JSON.stringify({ HR: 90, BP: "120/80", RR: 18, Temp: 37.2, SpO2: 98 }),
        assessment_notes: "Patient presents with abdominal pain.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    return NextResponse.json(triage);
  } catch (e: any) {
    console.error({ message: "Error fetching triage assessment", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch triage assessment", details: e.message },
      { status: 500 }
    );
  }
}

// POST /api/er/visits/[id]/triage - Create a triage assessment for a visit
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitId = params.id;
    const triageData = await request.json();
    const triageId = uuidv4();

    // Basic validation
    if (!triageData.triage_nurse_id || !triageData.esi_level || !triageData.vital_signs) {
      return NextResponse.json(
        { error: "Missing required fields (triage_nurse_id, esi_level, vital_signs)" },
        { status: 400 }
      );
    }

    // Validate ESI level
    if (triageData.esi_level < 1 || triageData.esi_level > 5) {
        return NextResponse.json({ error: "Invalid ESI level (must be 1-5)" }, { status: 400 });
    }

    // Placeholder for database insert
    /*
    await db
      .prepare(
        "INSERT INTO er_triage_assessments (id, visit_id, triage_nurse_id, esi_level, vital_signs, assessment_notes, triage_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        triageId,
        visitId,
        triageData.triage_nurse_id,
        triageData.esi_level,
        JSON.stringify(triageData.vital_signs), // Ensure vital_signs is stored as JSON string
        triageData.assessment_notes || null,
        new Date().toISOString() // Use provided triage_timestamp if available
      )
      .run();
    */

    // Optionally update the visit status if it was just triaged
    /*
    await db
      .prepare("UPDATE er_visits SET current_status = ?, updated_at = ? WHERE id = ? AND current_status = ?")
      .bind("Assessment", new Date().toISOString(), visitId, "Triage")
      .run();
    */

    const newTriage = {
      id: triageId,
      visit_id: visitId,
      ...triageData,
      triage_timestamp: new Date().toISOString(),
      vital_signs: JSON.stringify(triageData.vital_signs), // Ensure consistency
    };

    return NextResponse.json(newTriage, { status: 201 });
  } catch (e: any) {
    console.error({ message: "Error creating triage assessment", error: e.message });
    return NextResponse.json(
      { error: "Failed to create triage assessment", details: e.message },
      { status: 500 }
    );
  }
}

