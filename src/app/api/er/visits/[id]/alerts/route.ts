import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Mock data store for alerts (replace with actual DB interaction)
let mockAlerts: any[] = [];

// Define interface for alert input data
interface AlertInput {
  alert_type: string; // e.g., "Code Blue", "Stroke Alert", "Sepsis Alert"
  activated_by_id: string | number; // User ID who activated the alert
  details?: string; // Optional additional details
  activation_timestamp?: string; // Optional, defaults to now if not provided
  status?: string; // Optional, defaults to "Active"
}

// GET /api/er/visits/[id]/alerts - Get alerts for a specific ER visit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_critical_alerts WHERE visit_id = ? ORDER BY activation_timestamp DESC")
      .bind(visitId)
      .all();
    */

    // Mock implementation
    const visitAlerts = mockAlerts.filter((alert) => alert.visit_id === visitId)
                                .sort((a, b) => new Date(b.activation_timestamp).getTime() - new Date(a.activation_timestamp).getTime());

    return NextResponse.json(visitAlerts);
  } catch (e: any) {
    console.error({ message: "Error fetching critical alerts", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch critical alerts", details: e.message },
      { status: 500 }
    );
  }
}

// POST /api/er/visits/[id]/alerts - Create a new critical alert for an ER visit
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;
    const body = await request.json();
    // Fixed: Apply type assertion
    const alertData = body as AlertInput;
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
        alertData.activation_timestamp || new Date().toISOString(), // Use provided or default to now
        alertData.status || "Active" // Use provided or default to Active
      )
      .run();
    */

    const newAlert = {
      id: alertId,
      visit_id: visitId,
      alert_type: alertData.alert_type,
      activated_by_id: alertData.activated_by_id,
      details: alertData.details || null,
      activation_timestamp: alertData.activation_timestamp || new Date().toISOString(),
      status: alertData.status || "Active",
    };

    // Mock implementation
    mockAlerts.push(newAlert);

    // TODO: Trigger notification system based on alert_type
    console.log("Mock Trigger Notification:", newAlert);

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

