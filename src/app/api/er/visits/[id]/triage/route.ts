import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Mock data store for triage assessments (replace with actual DB interaction)
let mockTriageAssessments: any[] = [];

// Define interface for triage input data
interface TriageInput {
  triage_nurse_id: string | number;
  esi_level: number; // Emergency Severity Index (1-5)
  vital_signs: Record<string, any>; // e.g., { temp: 37.0, hr: 80, rr: 16, bp: "120/80", spo2: 98 }
  assessment_notes?: string;
  triage_timestamp?: string; // Optional, defaults to now
}

// GET /api/er/visits/[id]/triage - Get triage assessment(s) for a specific ER visit
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_triage_assessments WHERE visit_id = ? ORDER BY triage_timestamp DESC")
      .bind(visitId)
      .all();
    */

    // Mock implementation
    const assessments = mockTriageAssessments.filter((t) => t.visit_id === visitId)
                                          .sort((a, b) => new Date(b.triage_timestamp).getTime() - new Date(a.triage_timestamp).getTime());

    return NextResponse.json(assessments);
  } catch (e: any) {
    console.error({ message: "Error fetching triage assessments", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch triage assessments", details: e.message },
      { status: 500 }
    );
  }
}

// POST /api/er/visits/[id]/triage - Create a new triage assessment for an ER visit
export async function POST(
  request: NextRequest, // Use NextRequest for json()
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;
    const body = await request.json();
    // Fixed: Apply type assertion
    const triageData = body as TriageInput;
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
        triageData.triage_timestamp || new Date().toISOString() // Use provided or default to now
      )
      .run();
    */

    // Optionally update the visit status if it was just triaged
    console.log(`Mock Update Visit Status for ${visitId} to Assessment`);

    const newTriage = {
      id: triageId,
      visit_id: visitId,
      triage_nurse_id: triageData.triage_nurse_id,
      esi_level: triageData.esi_level,
      vital_signs: JSON.stringify(triageData.vital_signs), // Store as JSON string
      assessment_notes: triageData.assessment_notes || null,
      triage_timestamp: triageData.triage_timestamp || new Date().toISOString(),
    };

    // Mock implementation
    mockTriageAssessments.push(newTriage);

    return NextResponse.json(newTriage, { status: 201 });
  } catch (e: any) {
    console.error({ message: "Error creating triage assessment", error: e.message });
    return NextResponse.json(
      { error: "Failed to create triage assessment", details: e.message },
      { status: 500 }
    );
  }
}

