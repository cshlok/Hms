import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db"; // Import getDB function
import { getSession, Session } from "@/lib/session"; // Import Session type
import { checkUserRole } from "@/lib/auth";

// Define a type for the database object based on usage
// This should align with the actual implementation or a more robust interface
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
  // Add other methods like query if needed based on db.ts
}

// Define interfaces
interface RadiologyReport {
  id: string;
  study_id: string;
  report_text?: string | null;
  findings?: string | null;
  impression?: string | null;
  recommendations?: string | null;
  status: "preliminary" | "final" | "addendum" | "retracted";
  radiologist_id: string;
  verified_by_id?: string | null;
  report_datetime: string; // ISO date string
  verified_datetime?: string | null; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  // Joined fields for GET
  accession_number?: string;
  radiologist_name?: string;
  verified_by_name?: string | null;
  patient_id?: string;
  patient_name?: string;
  procedure_name?: string;
}

interface RadiologyReportPutData {
  findings?: string | null;
  impression?: string | null;
  recommendations?: string | null;
  status?: "preliminary" | "final" | "addendum"; // Allowed update statuses
  verified_by_id?: string | null; // Only if verifying
}

// Use the imported Session type
// interface AuthenticatedSession extends Session {
//   // Session already defines the user structure
// }

// GET a specific Radiology Report by ID
export async function GET(
  request: NextRequest, // Keep request for potential future use, but don't pass to getSession
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getSession(); // Removed request argument
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Role check example (adjust roles as needed)
    // Assuming checkUserRole works with the Session['user'] structure
    // if (!checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db: Database = await getDB(); // Use the defined Database interface

    const report = await db.prepare(
      `SELECT
         rr.*,
         rs.accession_number,
         rad.first_name || ' ' || rad.last_name as radiologist_name,
         ver.first_name || ' ' || ver.last_name as verified_by_name,
         ro.patient_id,
         p.first_name || ' ' || p.last_name as patient_name,
         pt.name as procedure_name
       FROM RadiologyReports rr
       JOIN RadiologyStudies rs ON rr.study_id = rs.id
       JOIN Users rad ON rr.radiologist_id = rad.id
       LEFT JOIN Users ver ON rr.verified_by_id = ver.id
       JOIN RadiologyOrders ro ON rs.order_id = ro.id
       JOIN Patients p ON ro.patient_id = p.id
       JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id
       WHERE rr.id = ?`
    ).bind(reportId).first<RadiologyReport>();

    if (!report) {
      return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error fetching radiology report", error: message });
    return NextResponse.json({ error: "Failed to fetch radiology report", details: message }, { status: 500 });
  }
}

// PUT (update/verify) a specific Radiology Report
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getSession(); // Removed request argument
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db: Database = await getDB(); // Use the defined Database interface
    const data = await request.json() as RadiologyReportPutData;
    const updatedAt = new Date().toISOString();

    // Fetch the report to check ownership and current status
    const existingReport = await db.prepare(
        "SELECT radiologist_id, status FROM RadiologyReports WHERE id = ?"
    ).bind(reportId).first<{ radiologist_id: string, status: string }>();

    if (!existingReport) {
      return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }

    // Authorization Check - Use session.user.roleName and session.user.userId
    const isAdmin = session.user.roleName === "Admin"; // Assuming roleName holds the role
    const isRadiologist = session.user.roleName === "Radiologist";
    // Assuming user ID is a number in the session, but string in the DB? Adjust types if needed.
    const isOwner = isRadiologist && String(session.user.userId) === existingReport.radiologist_id;

    // Only Admin or the owning Radiologist can update (unless already final)
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // Prevent updates if report is already final, unless user is Admin or creating addendum
    if (existingReport.status === "final" && !isAdmin && data.status !== "addendum") {
      return NextResponse.json({ error: "Cannot update a final report. Create an addendum instead." }, { status: 403 });
    }
    // Radiologist cannot verify their own report (assuming this rule)
    // Adjust type comparison if needed (e.g., String(session.user.userId))
    if (isOwner && data.verified_by_id === String(session.user.userId)) {
        return NextResponse.json({ error: "Radiologists cannot verify their own reports" }, { status: 403 });
    }

    // Build the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (data.findings !== undefined) fieldsToUpdate.findings = data.findings;
    if (data.impression !== undefined) fieldsToUpdate.impression = data.impression;
    if (data.recommendations !== undefined) fieldsToUpdate.recommendations = data.recommendations;
    if (data.status !== undefined && ["preliminary", "final", "addendum"].includes(data.status)) {
        fieldsToUpdate.status = data.status;
    }
    if (data.verified_by_id !== undefined) {
        // Optional: Check if the verifier is a valid user
        // const verifierExists = await db.prepare("SELECT id FROM Users WHERE id = ? AND 'Radiologist' = ANY(roles)").bind(data.verified_by_id).first();
        // if (!verifierExists) return NextResponse.json({ error: "Invalid verifier ID or verifier is not a Radiologist" }, { status: 400 });

        fieldsToUpdate.verified_by_id = data.verified_by_id;
        fieldsToUpdate.verified_datetime = updatedAt;
        // Automatically set status to 'final' when verified, if not already set
        if (fieldsToUpdate.status === undefined || fieldsToUpdate.status === "preliminary") {
          fieldsToUpdate.status = "final";
        }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fieldsToUpdate), reportId];

    const updateStmt = `UPDATE RadiologyReports SET ${setClauses} WHERE id = ?`;
    const info = await db.prepare(updateStmt).bind(...values).run();

    // Check if update actually happened (info.meta.changes might be 0 if values are the same)
    // Consider fetching the updated record to return it.

    // If report status is set to 'final', update related study/order statuses
    if (fieldsToUpdate.status === "final") {
      const studyIdResult = await db.prepare("SELECT study_id FROM RadiologyReports WHERE id = ?").bind(reportId).first<{ study_id: string }>();
      if (studyIdResult?.study_id) {
        await db.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
          .bind("verified", updatedAt, studyIdResult.study_id, "verified")
          .run();
        const orderIdResult = await db.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(studyIdResult.study_id).first<{ order_id: string }>();
        if (orderIdResult?.order_id) {
          await db.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
            .bind("completed", updatedAt, orderIdResult.order_id, "completed")
            .run();
        }
      }
    }

    // Fetch the updated report to return
    const updatedReport = await db.prepare("SELECT * FROM RadiologyReports WHERE id = ?")
                                .bind(reportId)
                                .first<RadiologyReport>();

    return NextResponse.json(updatedReport || { id: reportId, message: "Radiology report update processed" }); // Return updated report or confirmation

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error updating radiology report", error: message });
    return NextResponse.json({ error: "Failed to update radiology report", details: message }, { status: 500 });
  }
}

// DELETE a specific Radiology Report (Admin only - consider status update instead)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getSession(); // Removed request argument
    // Use roleName for check
    if (!session?.user || session.user.roleName !== "Admin") {
      return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
    }

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db: Database = await getDB(); // Use the defined Database interface

    // Option 1: Soft delete (recommended - set status to 'retracted')
    const retractedAt = new Date().toISOString();
    const info = await db.prepare("UPDATE RadiologyReports SET status = ?, updated_at = ? WHERE id = ?")
                      .bind("retracted", retractedAt, reportId)
                      .run();

    // Option 2: Hard delete (use with caution)
    // const info = await db.prepare("DELETE FROM RadiologyReports WHERE id = ?").bind(reportId).run();

    // Check info.meta.changes for D1 compatibility
    if (!info.success || info.meta.changes === 0) { // Check success and changes
      return NextResponse.json({ error: "Radiology report not found or already retracted" }, { status: 404 });
    }

    return NextResponse.json({ id: reportId, status: "Radiology report retracted" });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error deleting/retracting radiology report", error: message });
    return NextResponse.json({ error: "Failed to delete/retract radiology report", details: message }, { status: 500 });
  }
}

