import { NextRequest, NextResponse } from "next/server";
// Remove D1Database import if using getDB
// import { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { getSession, Session } from "@/lib/session"; // Import Session type
import { checkUserRole } from "@/lib/auth";
import { getDB } from "@/lib/db"; // Import getDB

// Define Database interface (can be moved to a shared types file)
interface PreparedStatement {
  bind(...params: any[]): {
    run(): Promise<{ success: boolean; meta: { duration: number; changes?: number; } }>;
    all<T = any>(): Promise<{ results: T[]; success: boolean; meta: { duration: number; } }>;
    first<T = any>(colName?: string): Promise<T | null>;
  };
  run(): Promise<{ success: boolean; meta: { duration: number; changes?: number; } }>;
  all<T = any>(): Promise<{ results: T[]; success: boolean; meta: { duration: number; } }>;
  first<T = any>(colName?: string): Promise<T | null>;
}

interface Database {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

// Interface for POST request body
interface RadiologyReportPostData {
  study_id: string;
  radiologist_id: string;
  findings?: string | null;
  impression: string;
  recommendations?: string | null;
  status?: "preliminary" | "final" | "addendum";
}

// Interface for GET response items (adjust based on actual query results)
interface RadiologyReportListItem {
  id: string;
  study_id: string;
  report_datetime: string;
  status: string;
  accession_number?: string;
  radiologist_name?: string;
  patient_id?: string;
  patient_name?: string;
  procedure_name?: string;
  // Add other fields from the SELECT query
}

// GET all Radiology Reports (filtered by study_id, patient_id, radiologist_id, status)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(); // Call without request
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pass session.user to checkUserRole
    // Assuming checkUserRole uses roleName or permissions from session.user
    // if (!checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get("studyId");
    const patientId = searchParams.get("patientId"); // Requires joins
    const radiologistId = searchParams.get("radiologistId");
    const status = searchParams.get("status");

    const db: Database = await getDB(); // Use getDB

    // Select rr.*, rs.accession_number, rad.name as radiologist_name, ro.patient_id, p.name as patient_name, pt.name as procedure_name
    // Ensure aliases match the RadiologyReportListItem interface if possible
    let query = `SELECT
                   rr.id, rr.study_id, rr.report_datetime, rr.status,
                   rs.accession_number,
                   rad.first_name || ' ' || rad.last_name as radiologist_name,
                   ro.patient_id,
                   p.first_name || ' ' || p.last_name as patient_name,
                   pt.name as procedure_name
                 FROM RadiologyReports rr
                 JOIN RadiologyStudies rs ON rr.study_id = rs.id
                 JOIN Users rad ON rr.radiologist_id = rad.id
                 JOIN RadiologyOrders ro ON rs.order_id = ro.id
                 JOIN Patients p ON ro.patient_id = p.id
                 JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id`;
    const params: string[] = [];
    const conditions: string[] = [];

    if (studyId) {
      conditions.push("rr.study_id = ?");
      params.push(studyId);
    }
    if (patientId) {
      conditions.push("ro.patient_id = ?");
      params.push(patientId);
    }
    if (radiologistId) {
      conditions.push("rr.radiologist_id = ?");
      params.push(radiologistId);
    }
    if (status) {
      conditions.push("rr.status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY rr.report_datetime DESC";

    // Use the defined Database interface and expect results matching RadiologyReportListItem
    const { results } = await db.prepare(query).bind(...params).all<RadiologyReportListItem>();
    return NextResponse.json(results);

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error fetching radiology reports", error: message });
    return NextResponse.json({ error: "Failed to fetch radiology reports", details: message }, { status: 500 });
  }
}

// POST a new Radiology Report (Radiologist or Admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(); // Call without request
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pass session.user to checkUserRole and use roleName
    // Assuming checkUserRole handles roleName correctly
    // if (!checkUserRole(session.user, ["Admin", "Radiologist"])) { // Check against roleName if needed
    if (session.user.roleName !== "Admin" && session.user.roleName !== "Radiologist") {
      return NextResponse.json({ error: "Forbidden: Admin or Radiologist role required" }, { status: 403 });
    }

    const db: Database = await getDB(); // Use getDB
    // Use type assertion for request body
    const { study_id, radiologist_id, findings, impression, recommendations, status } = await request.json() as RadiologyReportPostData;

    if (!study_id || !radiologist_id || !impression) {
      return NextResponse.json({ error: "Missing required fields (study_id, radiologist_id, impression)" }, { status: 400 });
    }

    // Check if study exists
    const study = await db.prepare("SELECT id FROM RadiologyStudies WHERE id = ?").bind(study_id).first();
    if (!study) {
        return NextResponse.json({ error: "Associated radiology study not found" }, { status: 404 });
    }

    // Check if a report already exists for this study (optional, depends on workflow - allow addendums?)
    // const existingReport = await db.prepare("SELECT id FROM RadiologyReports WHERE study_id = ? AND status != 'addendum'").bind(study_id).first();
    // if (existingReport) {
    //     return NextResponse.json({ error: "A report already exists for this study. Create an addendum instead?" }, { status: 409 });
    // }

    const id = nanoid();
    const now = new Date().toISOString();
    const reportStatus = status || "preliminary"; // Default to preliminary

    await db.prepare(
      "INSERT INTO RadiologyReports (id, study_id, radiologist_id, report_datetime, findings, impression, recommendations, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      study_id,
      radiologist_id,
      now, // report_datetime
      findings ?? null, // Use nullish coalescing
      impression,
      recommendations ?? null, // Use nullish coalescing
      reportStatus,
      now, // created_at
      now  // updated_at
    ).run();

    // Update the associated study status to 'reported'
    await db.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
      .bind("reported", now, study_id, "reported") // Avoid unnecessary updates
      .run();

    // Potentially update the order status to 'completed' as well
    const orderIdResult = await db.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(study_id).first<{ order_id: string }>();
    if (orderIdResult?.order_id) {
        await db.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
          .bind("completed", now, orderIdResult.order_id, "completed") // Avoid unnecessary updates
          .run();
    }

    // Fetch the created report to return it
    const createdReport = await db.prepare("SELECT * FROM RadiologyReports WHERE id = ?").bind(id).first<RadiologyReportListItem>();

    return NextResponse.json(createdReport || { id, message: "Radiology report created" }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error creating radiology report", error: message });
    // Provide more specific error details if possible
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "Failed to create radiology report: A report for this study might already exist.", details: message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create radiology report", details: message }, { status: 500 });
  }
}

