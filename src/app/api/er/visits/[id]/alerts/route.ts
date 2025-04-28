// src/app/api/er/visits/[id]/alerts/route.ts
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { v4 as uuidv4 } from "uuid";

export const runtime = "edge";

// GET /api/er/visits/[id]/alerts - Get all critical alerts for a visit
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitId = params.id;

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_critical_alerts WHERE visit_id = ? ORDER BY activation_timestamp DESC")
      .bind(visitId)
      .all();
    */

    // Mock data
    const results = [
        {
            id: "alert_uuid_1",
            visit_id: visitId,
            alert_type: "Sepsis",
            activation_timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
            activated_by_id: "nurse_456",
            status: "Active",
            details: "Patient meets SIRS criteria, suspected infection."
        },
        {
            id: "alert_uuid_2",
            visit_id: visitId,
            alert_type: "Critical Lab",
            activation_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
            activated_by_id: "system", // Or Lab system ID
            status: "Active",
            details: "Potassium level: 6.5 mmol/L"
        }
    ];

    return NextResponse.json(results);
  } catch (e: any) {
    console.error({ message: "Error fetching critical alerts", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch critical alerts", details: e.message },
      { status: 500 }
    );
  }
}

// POST /api/er/visits/[id]/alerts - Create a new critical alert for a visit
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitId = params.id;
    const alertData = await request.json();
    const alertId = uuidv4();

    // Basic validation
    if (!alertData.alert_type || !alertData.activated_by_id) {
      return NextResponse.json(
        { error: "Missing required fields (alert_type, activated_by_id)" },
        { status: 400 }
      );
    }

    // Placeholder for database insert
    /*
    await db
      .prepare(
        "INSERT INTO er_critical_alerts (id, visit_id, alert_type, activated_by_id, details, activation_timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        alertId,
        visitId,
        alertData.alert_type,
        alertData.activated_by_id,
        alertData.details || null,
        new Date().toISOString(), // Use provided activation_timestamp if available
        alertData.status || "Active"
      )
      .run();
    */

    const newAlert = {
      id: alertId,
      visit_id: visitId,
      ...alertData,
      activation_timestamp: new Date().toISOString(),
      status: alertData.status || "Active",
    };

    // TODO: Trigger notification system based on alert_type

    return NextResponse.json(newAlert, { status: 201 });
  } catch (e: any) {
    console.error({ message: "Error creating critical alert", error: e.message });
    return NextResponse.json(
      { error: "Failed to create critical alert", details: e.message },
      { status: 500 }
    );
  }
}

// Note: Updating alert status (acknowledge/resolve) might be better handled
// in a separate route like /api/er/visits/[visitId]/alerts/[alertId] (PUT)
// or potentially via the main visit update PUT endpoint if simpler.

