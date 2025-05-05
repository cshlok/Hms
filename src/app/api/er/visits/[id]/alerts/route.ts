import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Define interface for alert input data
interface AlertInput {
  alert_type: string; // e.g., "Code Blue", "Stroke Alert", "Sepsis Alert"
  activated_by_id: string | number; // User ID who activated the alert
  details?: string | null; // FIX: Changed to allow null to match usage
  activation_timestamp?: string; // Optional, defaults to now if not provided
  status?: string; // Optional, defaults to "Active"
}

// Define interface for alert data (including generated fields)
interface Alert {
  id: string;
  visit_id: string;
  alert_type: string;
  activated_by_id: string | number;
  details?: string | null; // FIX: Changed to allow null to match usage
  activation_timestamp: string; // ISO 8601 date string
  status: string;
}

// Mock data store for alerts (replace with actual DB interaction)
const mockAlerts: Alert[] = [];

// GET /api/er/visits/[id]/alerts - Get alerts for a specific ER visit
export async function GET(
  _request: NextRequest, // Prefixed as unused
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const { id: visitId } = await params; // FIX: Await params and destructure id (Next.js 15+)

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_critical_alerts WHERE visit_id = ? ORDER BY activation_timestamp DESC")
      .bind(visitId)
      .all();
    */

    // Mock implementation
    const visitAlerts = mockAlerts
      .filter((alert) => alert.visit_id === visitId)
      .sort(
        (a, b) =>
          new Date(b.activation_timestamp).getTime() -
          new Date(a.activation_timestamp).getTime()
      );

    return NextResponse.json(visitAlerts);
  } catch (error: unknown) {
    console.error({
      message: "Error fetching critical alerts",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to fetch critical alerts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/er/visits/[id]/alerts - Create a new critical alert for an ER visit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const { id: visitId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    const body = await request.json();
    // Apply type assertion
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

    // FIX: Explicitly type newAlert to match interface Alert
    const newAlert: Alert = {
      id: alertId,
      visit_id: visitId,
      alert_type: alertData.alert_type,
      activated_by_id: alertData.activated_by_id,
      details: alertData.details ?? undefined, // Use nullish coalescing
      activation_timestamp:
        alertData.activation_timestamp || new Date().toISOString(),
      status: alertData.status || "Active",
    };

    // Mock implementation
    mockAlerts.push(newAlert); // This should now be type-compatible

    // TODO: Trigger notification system based on alert_type
    console.log("Mock Trigger Notification:", newAlert);

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error: unknown) {
    console.error({
      message: "Error creating critical alert",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to create critical alert",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Note: Updating alert status (acknowledge/resolve) might be better handled
// in a separate route like /api/er/visits/[visitId]/alerts/[alertId] (PUT)
// or potentially via the main visit update PUT endpoint if simpler.

