import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

// GET a specific Radiology Report by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const reportId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    // Join with relevant tables to provide context
    const report = await DB.prepare(
      "SELECT rr.*, rs.accession_number, rad.name as radiologist_name, ver.name as verified_by_name, ro.patient_id, p.name as patient_name, pt.name as procedure_name FROM RadiologyReports rr JOIN RadiologyStudies rs ON rr.study_id = rs.id JOIN Users rad ON rr.radiologist_id = rad.id LEFT JOIN Users ver ON rr.verified_by_id = ver.id JOIN RadiologyOrders ro ON rs.order_id = ro.id JOIN Patients p ON ro.patient_id = p.id JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id WHERE rr.id = ?"
    ).bind(reportId).first();

    if (!report) {
      return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology report", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology report", details: e.message }, { status: 500 });
  }
}

// PUT (update/verify) a specific Radiology Report (Radiologist or Admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  // Radiologist can update their own reports, Admin can update/verify any
  // Add specific logic if only certain roles can verify (e.g., Senior Radiologist)
  if (!session.user || !checkUserRole(session.user, ["Admin", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const reportId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    const { findings, impression, recommendations, status, verified_by_id } = await request.json();
    const updatedAt = new Date().toISOString();

    // Fetch the report to check ownership if the user is a Radiologist
    const existingReport = await DB.prepare("SELECT radiologist_id, status FROM RadiologyReports WHERE id = ?").bind(reportId).first<{ radiologist_id: string, status: string }>();

    if (!existingReport) {
        return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }

    // Authorization check: Radiologist can only edit their own reports unless it's final/verified
    if (session.user.role === "Radiologist" && session.user.id !== existingReport.radiologist_id) {
        return NextResponse.json({ error: "Radiologist can only update their own reports" }, { status: 403 });
    }
    // Prevent updates if report is already final/verified, unless user is Admin or creating addendum (addendum logic not implemented here)
    if (existingReport.status === "final" && session.user.role !== "Admin" && status !== "addendum") {
        return NextResponse.json({ error: "Cannot update a final report. Create an addendum instead." }, { status: 403 });
    }

    // Build the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (findings !== undefined) fieldsToUpdate.findings = findings;
    if (impression !== undefined) fieldsToUpdate.impression = impression;
    if (recommendations !== undefined) fieldsToUpdate.recommendations = recommendations;
    if (status !== undefined) fieldsToUpdate.status = status;
    if (verified_by_id !== undefined) {
        fieldsToUpdate.verified_by_id = verified_by_id;
        fieldsToUpdate.verified_datetime = updatedAt; // Set verification time when verifier is set
        // Automatically set status to 'final' when verified?
        if (status === undefined || status === "preliminary") {
            fieldsToUpdate.status = "final";
        }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fieldsToUpdate), reportId];

    const updateStmt = `UPDATE RadiologyReports SET ${setClauses} WHERE id = ?`;
    const info = await DB.prepare(updateStmt).bind(...values).run();

    if (info.changes === 0 && Object.keys(fieldsToUpdate).length > 1) { // Check if more than just updated_at was intended
        // Re-check existence as it might have been deleted between checks
        const checkAgain = await DB.prepare("SELECT id FROM RadiologyReports WHERE id = ?").bind(reportId).first();
        if (!checkAgain) {
             return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
        }
        return NextResponse.json({ id: reportId, status: "Radiology report update processed (no changes detected)" });
    }

    // If report status is set to 'final', update study and order status
    if (fieldsToUpdate.status === "final") {
        const studyIdResult = await DB.prepare("SELECT study_id FROM RadiologyReports WHERE id = ?").bind(reportId).first<{ study_id: string }>();
        if (studyIdResult) {
            await DB.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ?")
              .bind("verified", updatedAt, studyIdResult.study_id)
              .run();
            const orderIdResult = await DB.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(studyIdResult.study_id).first<{ order_id: string }>();
            if (orderIdResult) {
                await DB.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ?")
                  .bind("completed", updatedAt, orderIdResult.order_id)
                  .run();
            }
        }
    }

    return NextResponse.json({ id: reportId, status: "Radiology report updated" });

  } catch (e: any) {
    console.error({ message: "Error updating radiology report", error: e.message });
    return NextResponse.json({ error: "Failed to update radiology report", details: e.message }, { status: 500 });
  }
}

// DELETE a specific Radiology Report (Admin only - generally not recommended, consider status update)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const reportId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    // Consider changing status to 'retracted' or 'cancelled' instead of deleting
    const info = await DB.prepare("DELETE FROM RadiologyReports WHERE id = ?").bind(reportId).run();

    if (info.changes === 0) {
      return NextResponse.json({ error: "Radiology report not found" }, { status: 404 });
    }

    return NextResponse.json({ id: reportId, status: "Radiology report deleted (use with caution)" });

  } catch (e: any) {
    console.error({ message: "Error deleting radiology report", error: e.message });
    return NextResponse.json({ error: "Failed to delete radiology report", details: e.message }, { status: 500 });
  }
}

