import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");

  const DB = process.env.DB as unknown as D1Database;
  let query = "SELECT ro.*, pt.name as procedure_name, p.name as patient_name FROM RadiologyOrders ro JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id JOIN Patients p ON ro.patient_id = p.id";
  const params: string[] = [];
  const conditions: string[] = [];

  if (patientId) {
    conditions.push("ro.patient_id = ?");
    params.push(patientId);
  }
  if (status) {
    conditions.push("ro.status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY ro.order_datetime DESC";

  try {
    const { results } = await DB.prepare(query).bind(...params).all();
    return NextResponse.json(results);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology orders", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology orders", details: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const DB = process.env.DB as unknown as D1Database;
  try {
    const { patient_id, referring_doctor_id, procedure_type_id, clinical_indication, priority } = await request.json();

    if (!patient_id || !procedure_type_id || !clinical_indication) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = nanoid();
    const order_datetime = new Date().toISOString();
    const status = "pending";

    await DB.prepare(
      "INSERT INTO RadiologyOrders (id, patient_id, referring_doctor_id, procedure_type_id, order_datetime, clinical_indication, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      patient_id,
      referring_doctor_id || null,
      procedure_type_id,
      order_datetime,
      clinical_indication,
      priority || "routine",
      status,
      order_datetime,
      order_datetime
    ).run();

    // Potentially trigger notification here

    return NextResponse.json({ id, status: "Radiology order created" }, { status: 201 });

  } catch (e: any) {
    console.error({ message: "Error creating radiology order", error: e.message });
    return NextResponse.json({ error: "Failed to create radiology order", details: e.message }, { status: 500 });
  }
}

