import { NextRequest, NextResponse } from "next/server";
import { D1Database, D1Result } from "@cloudflare/workers-types"; // Import D1Result
import { getSession } from "@/lib/session";
import { checkUserRole } from "@/lib/auth";

// Define interface for PUT request body
interface OrderUpdateInput {
  status?: string;
  priority?: string;
  clinical_indication?: string;
  procedure_type_id?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  const session = await getSession();
  if (
    !session?.user ||
    !(await checkUserRole(request, [
      "Admin",
      "Doctor",
      "Receptionist",
      "Technician",
      "Radiologist",
    ]))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: orderId } = await params; // FIX: Await params and destructure id (Next.js 15+)
  const DB = process.env.DB as unknown as D1Database;

  try {
    const order = await DB.prepare(
      "SELECT ro.*, pt.name as procedure_name, p.name as patient_name, rd.name as referring_doctor_name FROM RadiologyOrders ro JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id JOIN Patients p ON ro.patient_id = p.id LEFT JOIN Users rd ON ro.referring_doctor_id = rd.id WHERE ro.id = ?"
    )
      .bind(orderId)
      .first();

    if (!order) {
      return NextResponse.json(
        { error: "Radiology order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(order);
  } catch (error: unknown) {
    // FIX: Use unknown instead of any
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching radiology order",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch radiology order", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  const session = await getSession();
  // Allow Admin, Receptionist, Technician to update status/details
  if (
    !session?.user ||
    !(await checkUserRole(request, ["Admin", "Receptionist", "Technician"]))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: orderId } = await params; // FIX: Await params and destructure id (Next.js 15+)
  const DB = process.env.DB as unknown as D1Database;

  try {
    const { status, priority, clinical_indication, procedure_type_id } =
      (await request.json()) as OrderUpdateInput; // Cast to OrderUpdateInput
    const updatedAt = new Date().toISOString();

    // Build the update query dynamically based on provided fields
    // FIX: Use a more specific type for fieldsToUpdate
    const fieldsToUpdate: Record<string, string | undefined | null> = {};
    if (status !== undefined) fieldsToUpdate.status = status;
    if (priority !== undefined) fieldsToUpdate.priority = priority;
    if (clinical_indication !== undefined)
      fieldsToUpdate.clinical_indication = clinical_indication;
    if (procedure_type_id !== undefined)
      fieldsToUpdate.procedure_type_id = procedure_type_id;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 }
      );
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(fieldsToUpdate), orderId];

    const updateStmt = `UPDATE RadiologyOrders SET ${setClauses} WHERE id = ?`;
    const info: D1Result = await DB.prepare(updateStmt)
      .bind(...values)
      .run(); // Add type D1Result

    // Check info.meta.changes if available, otherwise check info.success
    const changesMade = info.meta?.changes ?? (info.success ? 1 : 0); // D1Response meta might have changes

    if (changesMade === 0) {
      // Check if the order exists
      const existingOrder = await DB.prepare(
        "SELECT id FROM RadiologyOrders WHERE id = ?"
      )
        .bind(orderId)
        .first();
      if (!existingOrder) {
        return NextResponse.json(
          { error: "Radiology order not found" },
          { status: 404 }
        );
      }
      // If it exists but no changes were made (e.g., same data sent), return success
      return NextResponse.json({
        id: orderId,
        status: "Radiology order update processed (no changes detected)",
      });
    }

    return NextResponse.json({
      id: orderId,
      status: "Radiology order updated",
    });
  } catch (error: unknown) {
    // FIX: Use unknown instead of any
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error updating radiology order",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to update radiology order", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  const session = await getSession();
  // Typically only Admins or perhaps Receptionists should cancel orders
  if (
    !session?.user ||
    !(await checkUserRole(request, ["Admin", "Receptionist"]))
  ) {
    // Use await and pass request
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: orderId } = await params; // FIX: Await params and destructure id (Next.js 15+)
  const DB = process.env.DB as unknown as D1Database;

  try {
    // Instead of deleting, consider marking as \"cancelled\"
    const updatedAt = new Date().toISOString();
    const info: D1Result = await DB.prepare(
      // Add type D1Result
      "UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?"
    )
      .bind("cancelled", updatedAt, orderId, "cancelled")
      .run();

    // Check info.meta.changes if available, otherwise check info.success
    const changesMade = info.meta?.changes ?? (info.success ? 1 : 0);

    if (changesMade === 0) {
      const existingOrder = await DB.prepare(
        "SELECT id, status FROM RadiologyOrders WHERE id = ?"
      )
        .bind(orderId)
        .first(); // Remove type parameter
      if (!existingOrder) {
        return NextResponse.json(
          { error: "Radiology order not found" },
          { status: 404 }
        );
      }
      // Check if existingOrder has status property before accessing it
      // FIX: Removed unnecessary escapes around \"object\" and \"status\"
      if (
        typeof existingOrder === "object" &&
        existingOrder !== undefined &&
        "status" in existingOrder &&
        existingOrder.status === "cancelled"
      ) {
        return NextResponse.json({
          id: orderId,
          status: "Radiology order already cancelled",
        });
      }
      return NextResponse.json(
        { error: "Failed to cancel radiology order (unknown reason)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: orderId,
      status: "Radiology order cancelled",
    });
  } catch (error: unknown) {
    // FIX: Use unknown instead of any
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error cancelling radiology order",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to cancel radiology order", details: errorMessage },
      { status: 500 }
    );
  }
}

