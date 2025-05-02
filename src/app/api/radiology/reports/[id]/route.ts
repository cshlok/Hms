import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db"; // Import getDB function
import { getSession, Session, SessionUser } from "@/lib/session"; // FIX: Import SessionUser
// import { checkUserRole } from "@/lib/auth"; // Assuming checkUserRole might not be fully implemented or needed based on roleName

// FIX: Define generic QueryResult type - Removed as unused
// interface QueryResult<T> {
//   results?: T[];
//   // Add other potential properties like rowCount, etc., based on your DB library
// }

// FIX: Define generic SingleQueryResult type for .first()
interface SingleQueryResult<T> {
  result?: T | null;
  // Add other potential properties based on your DB library
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

// FIX: Define type for the raw DB result for the GET request
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RadiologyReportQueryResultRow extends RadiologyReport {}

interface RadiologyReportPutData {
  findings?: string | null;
  impression?: string | null;
  recommendations?: string | null;
  status?: "preliminary" | "final" | "addendum"; // Allowed update statuses
  verified_by_id?: string | null; // Only if verifying
}

// GET a specific Radiology Report by ID
export async function GET(
  request: NextRequest, // Keep request for potential future use
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // FIX: Get session without unsafe assertion
    const session: Session | null = await getSession(); 
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // FIX: Assert user type after null check
    // const currentUser = session.user as SessionUser; // FIX: Commented out as unused for now
    // Role check example (adjust roles as needed)
    // if (!["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"].includes(currentUser.roleName)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db = await getDB(); 

    // FIX: Use type assertion for .first()
    // FIX: Removed unnecessary escapes in SQL string
    const reportResult = await db.prepare(
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
    ).bind(reportId).first() as SingleQueryResult<RadiologyReportQueryResultRow>;

    // FIX: Check result property
    const report = reportResult?.result;

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
    // FIX: Get session without unsafe assertion
    const session: Session | null = await getSession(); 
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // FIX: Assert user type after null check
    const currentUser = session.user as SessionUser;

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db = await getDB(); 
    const data = await request.json() as RadiologyReportPutData;
    const updatedAt = new Date().toISOString();

    // Fetch the report to check ownership and current status
    // FIX: Use type assertion for .first()
    const existingReportResult = await db.prepare(
        "SELECT radiologist_id, status FROM RadiologyReports WHERE id = ?"
    ).bind(reportId).first() as SingleQueryResult<{ radiologist_id: string, status: string }>;

    // FIX: Check result property
    const existingReport = existingReportResult?.result;

    if (!existingReport) {
      return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }

    // Authorization Check - Use currentUser.roleName and currentUser.userId
    const isAdmin = currentUser.roleName === "Admin"; 
    const isRadiologist = currentUser.roleName === "Radiologist";
    // Assuming user ID is a number in the session, but string in the DB? Adjust types if needed.
    const isOwner = isRadiologist && String(currentUser.userId) === existingReport.radiologist_id;

    // Only Admin or the owning Radiologist can update (unless already final)
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // Prevent updates if report is already final, unless user is Admin or creating addendum
    if (existingReport.status === "final" && !isAdmin && data.status !== "addendum") {
      return NextResponse.json({ error: "Cannot update a final report. Create an addendum instead." }, { status: 403 });
    }
    // Radiologist cannot verify their own report (assuming this rule)
    // Adjust type comparison if needed (e.g., String(currentUser.userId))
    if (isOwner && data.verified_by_id === String(currentUser.userId)) {
        return NextResponse.json({ error: "Radiologists cannot verify their own reports" }, { status: 403 });
    }

    // Build the update query dynamically
    // FIX: Replaced any with Record<string, string | null>
    const fieldsToUpdate: Record<string, string | null> = {};
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
    // FIX: Prefixed unused variable with underscore - Result of run() might not be needed
    // const _info = await db.prepare(updateStmt).bind(...values).run();
    await db.prepare(updateStmt).bind(...values).run(); // Execute without assigning

    // Check if update actually happened (info.meta.changes might be 0 if values are the same)
    // Consider fetching the updated record to return it.

    // If report status is set to 'final', update related study/order statuses
    if (fieldsToUpdate.status === "final") {
      // FIX: Use type assertion for .first()
      const studyIdResult = await db.prepare("SELECT study_id FROM RadiologyReports WHERE id = ?").bind(reportId).first() as SingleQueryResult<{ study_id: string }>;
      // FIX: Check result property
      if (studyIdResult?.result?.study_id) {
        await db.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
          .bind("verified", updatedAt, studyIdResult.result.study_id, "verified")
          .run();
        // FIX: Use type assertion for .first()
        const orderIdResult = await db.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(studyIdResult.result.study_id).first() as SingleQueryResult<{ order_id: string }>;
        // FIX: Check result property
        if (orderIdResult?.result?.order_id) {
          await db.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?")
            .bind("completed", updatedAt, orderIdResult.result.order_id, "completed")
            .run();
        }
      }
    }

    // Fetch the updated report to return
    // FIX: Use type assertion for .first()
    const updatedReportResult = await db.prepare("SELECT * FROM RadiologyReports WHERE id = ?")
                                .bind(reportId)
                                .first() as SingleQueryResult<RadiologyReport>;
    // FIX: Check result property
    const updatedReport = updatedReportResult?.result;

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
    // FIX: Get session without unsafe assertion
    const session: Session | null = await getSession(); 
    // FIX: Check session and user safely
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // FIX: Assert user type after null check
    const currentUser = session.user as SessionUser;
    // Use roleName for check
    if (currentUser.roleName !== "Admin") {
      return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
    }

    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const db = await getDB(); 

    // Option 1: Soft delete (recommended - set status to 'retracted')
    const retractedAt = new Date().toISOString();
    // FIX: Assume .run() returns a structure with success/meta
    const info = await db.prepare("UPDATE RadiologyReports SET status = ?, updated_at = ? WHERE id = ?")
                      .bind("retracted", retractedAt, reportId)
                      .run();

    // Option 2: Hard delete (use with caution)
    // const info = await db.prepare("DELETE FROM RadiologyReports WHERE id = ?").bind(reportId).run();

    // Check info.meta.changes for D1 compatibility
    // FIX: Check info structure based on actual DB library (assuming success/meta)
    if (!info.success) { // Check success
      return NextResponse.json({ error: "Radiology report not found or already retracted" }, { status: 404 });
    }

    return NextResponse.json({ id: reportId, status: "Radiology report retracted" });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error deleting/retracting radiology report", error: message });
    return NextResponse.json({ error: "Failed to delete/retract radiology report", details: message }, { status: 500 });
  }
}

