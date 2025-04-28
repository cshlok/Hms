import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

// GET all Radiology Reports (filtered by study_id, patient_id, radiologist_id, status)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get("studyId");
  const patientId = searchParams.get("patientId"); // Requires joins
  const radiologistId = searchParams.get("radiologistId");
  const status = searchParams.get("status");

  const DB = process.env.DB as unknown as D1Database;
  // Select rr.*, rs.accession_number, rad.name as radiologist_name, ro.patient_id, p.name as patient_name, pt.name as procedure_name
  let query = "SELECT rr.*, rs.accession_number, rad.name as radiologist_name, ro.patient_id, p.name as patient_name, pt.name as procedure_name FROM RadiologyReports rr JOIN RadiologyStudies rs ON rr.study_id = rs.id JOIN Users rad ON rr.radiologist_id = rad.id JOIN RadiologyOrders ro ON rs.order_id = ro.id JOIN Patients p ON ro.patient_id = p.id JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id";
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

  try {
    const { results } = await DB.prepare(query).bind(...params).all();
    return NextResponse.json(results);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology reports", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology reports", details: e.message }, { status: 500 });
  }
}

// POST a new Radiology Report (Radiologist or Admin)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const DB = process.env.DB as unknown as D1Database;
  try {
    const { study_id, radiologist_id, findings, impression, recommendations, status } = await request.json();

    if (!study_id || !radiologist_id || !impression) {
      return NextResponse.json({ error: "Missing required fields (study_id, radiologist_id, impression)" }, { status: 400 });
    }

    // Check if study exists
    const study = await DB.prepare("SELECT id FROM RadiologyStudies WHERE id = ?").bind(study_id).first();
    if (!study) {
        return NextResponse.json({ error: "Associated radiology study not found" }, { status: 404 });
    }

    // Check if a report already exists for this study (optional, depends on workflow - allow addendums?)
    // const existingReport = await DB.prepare("SELECT id FROM RadiologyReports WHERE study_id = ? AND status != 'addendum'").bind(study_id).first();
    // if (existingReport) {
    //     return NextResponse.json({ error: "A report already exists for this study. Create an addendum instead?" }, { status: 409 });
    // }

    const id = nanoid();
    const now = new Date().toISOString();
    const reportStatus = status || "preliminary"; // Default to preliminary

    await DB.prepare(
      "INSERT INTO RadiologyReports (id, study_id, radiologist_id, report_datetime, findings, impression, recommendations, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      study_id,
      radiologist_id,
      now, // report_datetime
      findings || null,
      impression,
      recommendations || null,
      reportStatus,
      now, // created_at
      now  // updated_at
    ).run();

    // Update the associated study status to 'reported'
    await DB.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ?")
      .bind("reported", now, study_id)
      .run();

    // Potentially update the order status to 'completed' as well
    const orderIdResult = await DB.prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?").bind(study_id).first<{ order_id: string }>();
    if (orderIdResult) {
        await DB.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ?")
          .bind("completed", now, orderIdResult.order_id)
          .run();
    }

    return NextResponse.json({ id, status: "Radiology report created" }, { status: 201 });

  } catch (e: any) {
    console.error({ message: "Error creating radiology report", error: e.message });
    return NextResponse.json({ error: "Failed to create radiology report", details: e.message }, { status: 500 });
  }
}

