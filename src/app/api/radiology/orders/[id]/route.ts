import { NextRequest, NextResponse } from "next/server";
import { D1Database } from "@cloudflare/workers-types";
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.user || !checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orderId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    const order = await DB.prepare(
      "SELECT ro.*, pt.name as procedure_name, p.name as patient_name, rd.name as referring_doctor_name FROM RadiologyOrders ro JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id JOIN Patients p ON ro.patient_id = p.id LEFT JOIN Users rd ON ro.referring_doctor_id = rd.id WHERE ro.id = ?"
    ).bind(orderId).first();

    if (!order) {
      return NextResponse.json({ error: "Radiology order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (e: any) {
    console.error({ message: "Error fetching radiology order", error: e.message });
    return NextResponse.json({ error: "Failed to fetch radiology order", details: e.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  // Allow Admin, Receptionist, Technician to update status/details
  if (!session.user || !checkUserRole(session.user, ["Admin", "Receptionist", "Technician"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orderId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    const { status, priority, clinical_indication, procedure_type_id } = await request.json();
    const updatedAt = new Date().toISOString();

    // Build the update query dynamically based on provided fields
    const fieldsToUpdate: { [key: string]: any } = {};
    if (status !== undefined) fieldsToUpdate.status = status;
    if (priority !== undefined) fieldsToUpdate.priority = priority;
    if (clinical_indication !== undefined) fieldsToUpdate.clinical_indication = clinical_indication;
    if (procedure_type_id !== undefined) fieldsToUpdate.procedure_type_id = procedure_type_id;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(fieldsToUpdate), orderId];

    const updateStmt = `UPDATE RadiologyOrders SET ${setClauses} WHERE id = ?`;
    const info = await DB.prepare(updateStmt).bind(...values).run();

    if (info.changes === 0) {
        // Check if the order exists
        const existingOrder = await DB.prepare("SELECT id FROM RadiologyOrders WHERE id = ?").bind(orderId).first();
        if (!existingOrder) {
            return NextResponse.json({ error: "Radiology order not found" }, { status: 404 });
        }
        // If it exists but no changes were made (e.g., same data sent), return success
        return NextResponse.json({ id: orderId, status: "Radiology order update processed (no changes detected)" });
    }

    return NextResponse.json({ id: orderId, status: "Radiology order updated" });

  } catch (e: any) {
    console.error({ message: "Error updating radiology order", error: e.message });
    return NextResponse.json({ error: "Failed to update radiology order", details: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  // Typically only Admins or perhaps Receptionists should cancel orders
  if (!session.user || !checkUserRole(session.user, ["Admin", "Receptionist"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orderId = params.id;
  const DB = process.env.DB as unknown as D1Database;

  try {
    // Instead of deleting, consider marking as 'cancelled'
    const updatedAt = new Date().toISOString();
    const info = await DB.prepare(
      "UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?"
    ).bind("cancelled", updatedAt, orderId, "cancelled").run();

    if (info.changes === 0) {
        const existingOrder = await DB.prepare("SELECT id, status FROM RadiologyOrders WHERE id = ?").bind(orderId).first<{id: string, status: string}>();
        if (!existingOrder) {
            return NextResponse.json({ error: "Radiology order not found" }, { status: 404 });
        }
        if (existingOrder.status === "cancelled") {
            return NextResponse.json({ id: orderId, status: "Radiology order already cancelled" });
        }
        return NextResponse.json({ error: "Failed to cancel radiology order (unknown reason)" }, { status: 500 });
    }

    return NextResponse.json({ id: orderId, status: "Radiology order cancelled" });

  } catch (e: any) {
    console.error({ message: "Error cancelling radiology order", error: e.message });
    return NextResponse.json({ error: "Failed to cancel radiology order", details: e.message }, { status: 500 });
  }
}

