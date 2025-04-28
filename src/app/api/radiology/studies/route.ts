import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

// GET all Radiology Studies (filtered by orderId, patientId, status)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const patientId = searchParams.get("patientId"); // Requires join
  const status = searchParams.get("status");

  const DB = process.env.DB as unknown as D1Database;
  let query = "SELECT rs.*, ro.patient_id, p.name as patient_name, pt.name as procedure_name FROM RadiologyStudies rs JOIN RadiologyOrders ro ON rs.order_id = ro.id JOIN Patients p ON ro.patient_id = p.id JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id";
  const params: string[] = [];
  const conditions: string[] = [];

  if (orderId) {
    conditions.push("rs.order_id = ?");
    params.push(orderId);
  }
  if (patientId) {
    conditions.push("ro.patient_id = ?");
    params.push(patientId);
  }
  if (status) {
    conditions.push("rs.status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY rs.study_datetime DESC";

  try {
    const { results } = await DB.prepare(query).bind(...params).all();
    return NextResponse.json(results);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology studies", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology studies", details: e.message }, { status: 500 });
  }
}

// POST a new Radiology Study (Technician or Admin)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Technician"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const DB = process.env.DB as unknown as D1Database;
  try {
    const { order_id, accession_number, study_datetime, modality_id, technician_id, protocol, series_description, number_of_images, status } = await request.json();

    if (!order_id || !study_datetime || !technician_id) {
      return NextResponse.json({ error: "Missing required fields (order_id, study_datetime, technician_id)" }, { status: 400 });
    }

    // Check if order exists and is in a valid state (e.g., scheduled or pending)
    const order = await DB.prepare("SELECT status FROM RadiologyOrders WHERE id = ?").bind(order_id).first<{ status: string }>();
    if (!order) {
        return NextResponse.json({ error: "Associated radiology order not found" }, { status: 404 });
    }
    // Add logic here if specific order statuses are required before creating a study

    const id = nanoid();
    const now = new Date().toISOString();
    const studyStatus = status || "acquired"; // Default to acquired when study is created

    await DB.prepare(
      "INSERT INTO RadiologyStudies (id, order_id, accession_number, study_datetime, modality_id, technician_id, protocol, series_description, number_of_images, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      order_id,
      accession_number || null, // Consider generating accession number if not provided
      study_datetime,
      modality_id || null,
      technician_id,
      protocol || null,
      series_description || null,
      number_of_images || null,
      studyStatus,
      now,
      now
    ).run();

    // Update the associated order status to 'in_progress' or 'completed' if appropriate
    await DB.prepare("UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ?")
      .bind("in_progress", now, order_id)
      .run();

    return NextResponse.json({ id, status: "Radiology study created" }, { status: 201 });

  } catch (e: any) {
    console.error({ message: "Error creating radiology study", error: e.message });
    if (e.message?.includes("UNIQUE constraint failed") && e.message?.includes("accession_number")) {
        return NextResponse.json({ error: "Accession number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create radiology study", details: e.message }, { status: 500 });
  }
}

