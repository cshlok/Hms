// src/app/api/er/visits/route.ts
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { v4 as uuidv4 } from "uuid";

export const runtime = "edge";

// GET /api/er/visits - List all ER visits (with filtering/pagination options)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // TODO: Implement filtering based on searchParams (e.g., status, date range)
    const { env } = getRequestContext();
    const db = env.DB;

    // Placeholder for database query
    // const { results } = await db.prepare("SELECT * FROM er_visits ORDER BY arrival_timestamp DESC LIMIT ?").bind(searchParams.get("limit") || 10).all();
    const results = []; // Replace with actual DB call

    return NextResponse.json(results);
  } catch (e: any) {
    console.error({ message: "Error fetching ER visits", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch ER visits", details: e.message },
      { status: 500 }
    );
  }
}

// POST /api/er/visits - Create a new ER visit (initial registration)
export async function POST(request: Request) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitData = await request.json();
    const visitId = uuidv4();

    // Basic validation
    if (!visitData.patient_id || !visitData.chief_complaint) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, chief_complaint)" },
        { status: 400 }
      );
    }

    // Placeholder for database insert
    /*
    await db
      .prepare(
        "INSERT INTO er_visits (id, patient_id, arrival_timestamp, arrival_mode, chief_complaint, current_location, current_status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        visitId,
        visitData.patient_id,
        new Date().toISOString(), // Use provided arrival_timestamp if available
        visitData.arrival_mode || "Walk-in",
        visitData.chief_complaint,
        visitData.initial_location || "Waiting Room",
        visitData.initial_status || "Triage"
      )
      .run();
    */

    const newVisit = {
      id: visitId,
      ...visitData,
      arrival_timestamp: new Date().toISOString(),
      current_location: visitData.initial_location || "Waiting Room",
      current_status: visitData.initial_status || "Triage",
    };

    return NextResponse.json(newVisit, { status: 201 });
  } catch (e: any) {
    console.error({ message: "Error creating ER visit", error: e.message });
    return NextResponse.json(
      { error: "Failed to create ER visit", details: e.message },
      { status: 500 }
    );
  }
}

