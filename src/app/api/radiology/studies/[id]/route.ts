import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

// GET a specific Radiology Study by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const studyId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    const study = await DB.prepare(
      "SELECT rs.*, ro.patient_id, p.name as patient_name, pt.name as procedure_name, tech.name as technician_name, mod.name as modality_name FROM RadiologyStudies rs JOIN RadiologyOrders ro ON rs.order_id = ro.id JOIN Patients p ON ro.patient_id = p.id JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id LEFT JOIN Users tech ON rs.technician_id = tech.id LEFT JOIN RadiologyModalities mod ON rs.modality_id = mod.id WHERE rs.id = ?"
    ).bind(studyId).first();

    if (!study) {
      return NextResponse.json({ error: "Radiology study not found" }, { status: 404 });
    }
    return NextResponse.json(study);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology study", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology study", details: e.message }, { status: 500 });
  }
}

// PUT (update) a specific Radiology Study (Technician or Admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Technician"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const studyId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    const { accession_number, study_datetime, modality_id, technician_id, protocol, series_description, number_of_images, status } = await request.json();
    const updatedAt = new Date().toISOString();

    // Build the update query dynamically
    const fieldsToUpdate: { [key: string]: any } = {};
    if (accession_number !== undefined) fieldsToUpdate.accession_number = accession_number;
    if (study_datetime !== undefined) fieldsToUpdate.study_datetime = study_datetime;
    if (modality_id !== undefined) fieldsToUpdate.modality_id = modality_id;
    if (technician_id !== undefined) fieldsToUpdate.technician_id = technician_id;
    if (protocol !== undefined) fieldsToUpdate.protocol = protocol;
    if (series_description !== undefined) fieldsToUpdate.series_description = series_description;
    if (number_of_images !== undefined) fieldsToUpdate.number_of_images = number_of_images;
    if (status !== undefined) fieldsToUpdate.status = status;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fieldsToUpdate), studyId];

    const updateStmt = `UPDATE RadiologyStudies SET ${setClauses} WHERE id = ?`;
    const info = await DB.prepare(updateStmt).bind(...values).run();

    if (info.changes === 0) {
        const existingStudy = await DB.prepare("SELECT id FROM RadiologyStudies WHERE id = ?").bind(studyId).first();
        if (!existingStudy) {
            return NextResponse.json({ error: "Radiology study not found" }, { status: 404 });
        }
        return NextResponse.json({ id: studyId, status: "Radiology study update processed (no changes detected)" });
    }

    // If status is updated to 'reported' or 'verified', update the parent order status if needed
    if (status === 'reported' || status === 'verified') {
        const orderIdResult = await DB.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(studyId).first<{ order_id: string }>();
        if (orderIdResult) {
            await DB.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ?")
              .bind("completed", updatedAt, orderIdResult.order_id)
              .run();
        }
    }

    return NextResponse.json({ id: studyId, status: "Radiology study updated" });

  } catch (e: any) {
    console.error({ message: "Error updating radiology study", error: e.message });
    if (e.message?.includes("UNIQUE constraint failed") && e.message?.includes("accession_number")) {
        return NextResponse.json({ error: "Accession number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update radiology study", details: e.message }, { status: 500 });
  }
}

// DELETE a specific Radiology Study (Admin only - generally not recommended, consider status update)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const studyId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    // Check if reports are associated with this study before deleting
    const associatedReports = await DB.prepare("SELECT id FROM RadiologyReports WHERE study_id = ?").bind(studyId).first();
    if (associatedReports) {
        return NextResponse.json({ error: "Cannot delete study with associated reports. Consider cancelling or archiving instead." }, { status: 400 });
    }

    const info = await DB.prepare("DELETE FROM RadiologyStudies WHERE id = ?").bind(studyId).run();

    if (info.changes === 0) {
      return NextResponse.json({ error: "Radiology study not found" }, { status: 404 });
    }

    return NextResponse.json({ id: studyId, status: "Radiology study deleted (use with caution)" });

  } catch (e: any) {
    console.error({ message: "Error deleting radiology study", error: e.message });
    return NextResponse.json({ error: "Failed to delete radiology study", details: e.message }, { status: 500 });
  }
}

