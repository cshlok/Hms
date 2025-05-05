import { NextRequest, NextResponse } from "next/server";
// Remove D1Database import if using getDB
// import { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session"; // Import Session type
// import { checkUserRole } from "@/lib/auth";
import { getDB } from "@/lib/database"; // Import getDB

// Define Database interface (can be moved to a shared types file)
interface PreparedStatement {
  bind(...parameters: (string | number | null)[]): {
    run(): Promise<{
      success: boolean;
      meta: { duration: number; changes?: number };
    }>;
    all<T = unknown>(): Promise<{
      results: T[];
      success: boolean;
      meta: { duration: number };
    }>;
    first<T = unknown>(colName?: string): Promise<T | null>;
  };
  run(): Promise<{
    success: boolean;
    meta: { duration: number; changes?: number };
  }>;
  all<T = unknown>(): Promise<{
    results: T[];
    success: boolean;
    meta: { duration: number };
  }>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

interface Database {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

// Interface for POST request body
interface RadiologyStudyPostData {
  order_id: string;
  accession_number?: string | null;
  study_datetime: string; // ISO date string
  modality_id?: string | null;
  technician_id: string;
  protocol?: string | null;
  series_description?: string | null;
  number_of_images?: number | null;
  status?:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "reported"
    | "verified"
    | "cancelled";
}

// Interface for GET response items (adjust based on actual query results)
interface RadiologyStudyListItem {
  id: string;
  order_id: string;
  study_datetime: string;
  status: string;
  accession_number?: string | null;
  patient_id?: string;
  patient_name?: string;
  procedure_name?: string;
  // Add other fields from the SELECT query
}

// GET all Radiology Studies (filtered by orderId, patientId, status)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(); // Call without request
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pass session.user to checkUserRole if needed, or check roleName directly
    // Assuming broad read access for authorized users
    // if (!checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const patientId = searchParams.get("patientId"); // Requires join
    const status = searchParams.get("status");

    const database: Database = await getDB(); // Use getDB

    // Adjust SELECT to match RadiologyStudyListItem
    let query = `SELECT
                   rs.id, rs.order_id, rs.study_datetime, rs.status, rs.accession_number,
                   ro.patient_id,
                   p.first_name || ' ' || p.last_name as patient_name,
                   pt.name as procedure_name
                 FROM RadiologyStudies rs
                 JOIN RadiologyOrders ro ON rs.order_id = ro.id
                 JOIN Patients p ON ro.patient_id = p.id
                 JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id`;
    const parameters: string[] = [];
    const conditions: string[] = [];

    if (orderId) {
      conditions.push("rs.order_id = ?");
      parameters.push(orderId);
    }
    if (patientId) {
      conditions.push("ro.patient_id = ?");
      parameters.push(patientId);
    }
    if (status) {
      conditions.push("rs.status = ?");
      parameters.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY rs.study_datetime DESC";

    // Use the defined Database interface and expect results matching RadiologyStudyListItem
    const { results } = await database
      .prepare(query)
      .bind(...parameters)
      .all<RadiologyStudyListItem>();
    return NextResponse.json(results);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error fetching radiology studies",
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to fetch radiology studies", details: message },
      { status: 500 }
    );
  }
}

// POST a new Radiology Study (Technician or Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(); // Call without request
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Use roleName for check
    if (
      session.user.roleName !== "Admin" &&
      session.user.roleName !== "Technician"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Technician role required" },
        { status: 403 }
      );
    }

    const database: Database = await getDB(); // Use getDB
    // Use type assertion for request body
    const {
      order_id,
      accession_number,
      study_datetime,
      modality_id,
      technician_id,
      protocol,
      series_description,
      number_of_images,
      status,
    } = (await request.json()) as RadiologyStudyPostData;

    if (!order_id || !study_datetime || !technician_id) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (order_id, study_datetime, technician_id)",
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (Number.isNaN(Date.parse(study_datetime))) {
      return NextResponse.json(
        { error: "Invalid study date/time format" },
        { status: 400 }
      );
    }

    // Check if order exists and is in a valid state (e.g., scheduled or pending)
    const order = await database
      .prepare("SELECT status FROM RadiologyOrders WHERE id = ?")
      .bind(order_id)
      .first<{ status: string }>();
    if (!order) {
      return NextResponse.json(
        { error: "Associated radiology order not found" },
        { status: 404 }
      );
    }
    // Add logic here if specific order statuses are required before creating a study
    // Example: if (!["scheduled", "pending"].includes(order.status)) {
    //     return NextResponse.json({ error: `Cannot create study for order with status: ${order.status}` }, { status: 400 });
    // }

    const id = nanoid();
    const now = new Date().toISOString();
    // Default status could be 'scheduled' or 'in_progress' depending on workflow
    const studyStatus = status || "in_progress";

    await database
      .prepare(
        "INSERT INTO RadiologyStudies (id, order_id, accession_number, study_datetime, modality_id, technician_id, protocol, series_description, number_of_images, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        order_id,
        accession_number ?? null, // Use nullish coalescing
        study_datetime,
        modality_id ?? null,
        technician_id ?? null,
        protocol ?? null,
        series_description ?? null,
        number_of_images ?? null,
        studyStatus,
        now, // created_at
        now // updated_at
      )
      .run();

    // Update the associated order status to 'in_progress' if it's not already completed/cancelled
    await database
      .prepare(
        "UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status NOT IN (?, ?, ?)"
      )
      .bind(
        "in_progress",
        now,
        order_id,
        "completed",
        "cancelled",
        "in_progress"
      ) // Avoid unnecessary updates
      .run();

    // Fetch the created study to return it
    const createdStudy = await database
      .prepare("SELECT * FROM RadiologyStudies WHERE id = ?")
      .bind(id)
      .first<RadiologyStudyListItem>();

    return NextResponse.json(
      createdStudy || { id, message: "Radiology study created" },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error creating radiology study",
      error: message,
    });
    // Handle specific DB errors
    if (
      error instanceof Error &&
      error.message?.includes("UNIQUE constraint failed") &&
      error.message?.includes("accession_number")
    ) {
      return NextResponse.json(
        { error: "Accession number already exists" },
        { status: 409 }
      );
    }
    if (
      error instanceof Error &&
      error.message?.includes("FOREIGN KEY constraint failed")
    ) {
      // Could be invalid order_id, modality_id, or technician_id
      return NextResponse.json(
        { error: "Invalid reference ID (Order, Modality, or Technician)" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create radiology study", details: message },
      { status: 500 }
    );
  }
}
