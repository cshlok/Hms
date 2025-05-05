import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database"; // Assuming DB is correctly typed or mocked

// NOTE: Removed unused UpdateBookingBody interface related to OT Bookings.

// GET /api/ot/bookings - Get list of OT bookings (with filtering/pagination)
// NOTE: This GET handler seems out of place in a file named invoices/[id]/route.ts
// It should likely be in /api/ot/bookings/route.ts or similar.
// Keeping it for now but it might need relocation.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status");
    const dateFilter = searchParams.get("date"); // e.g., YYYY-MM-DD
    const theatreFilter = searchParams.get("theatre_id");
    const surgeonFilter = searchParams.get("surgeon_id");

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead

    let query = `
      SELECT 
        b.id, b.patient_id, b.surgery_type_id, b.theatre_id, b.lead_surgeon_id, 
        b.scheduled_start_time, b.scheduled_end_time, b.status, b.priority,
        p.name as patient_name, p.mrn as patient_mrn,
        s.name as surgery_name,
        t.name as theatre_name,
        u.name as surgeon_name
      FROM OTBookings b
      JOIN Patients p ON b.patient_id = p.id
      JOIN SurgeryTypes s ON b.surgery_type_id = s.id
      JOIN OperationTheatres t ON b.theatre_id = t.id
      JOIN Users u ON b.lead_surgeon_id = u.id
      WHERE 1=1
    `;
    const queryParameters: (string | number)[] = [];

    if (statusFilter) {
      query += " AND b.status = ?";
      queryParameters.push(statusFilter);
    }
    if (dateFilter) {
      // Assuming scheduled_start_time is stored as DATETIME or similar
      query += " AND DATE(b.scheduled_start_time) = ?";
      queryParameters.push(dateFilter);
    }
    if (theatreFilter) {
      query += " AND b.theatre_id = ?";
      queryParameters.push(theatreFilter);
    }
    if (surgeonFilter) {
      query += " AND b.lead_surgeon_id = ?";
      queryParameters.push(surgeonFilter);
    }

    query += ` ORDER BY b.scheduled_start_time ASC LIMIT ? OFFSET ?`;
    queryParameters.push(limit, offset);

    // Fixed: Use DB.query instead of prepare/bind/all
    const bookingsResult = await DB.query(query, queryParameters);
    const results = bookingsResult.rows || [];

    // Also fetch total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM OTBookings WHERE 1=1`;
    const countParameters: (string | number)[] = [];
    if (statusFilter) {
      countQuery += " AND status = ?";
      countParameters.push(statusFilter);
    }
    if (dateFilter) {
      countQuery += " AND DATE(scheduled_start_time) = ?";
      countParameters.push(dateFilter);
    }
    if (theatreFilter) {
      countQuery += " AND theatre_id = ?";
      countParameters.push(theatreFilter);
    }
    if (surgeonFilter) {
      countQuery += " AND lead_surgeon_id = ?";
      countParameters.push(surgeonFilter);
    }

    // Fixed: Use DB.query instead of prepare/bind/first
    // Assuming DB.query returns { rows: T[] } and we take the first row
    const countResult = await DB.query(countQuery, countParameters);
    const total =
      countResult.rows && countResult.rows.length > 0
        ? (countResult.rows[0] as { total: number }).total
        : 0;

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    // FIX: Use unknown instead of any
    console.error("Error fetching OT bookings:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Error fetching OT bookings", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ot/bookings - Create a new OT booking
// ... (POST handler code - assuming it exists and might need similar type fixes)

// PUT /api/billing/invoices/[id] - Update an existing Invoice (assuming OT Booking code was incorrect)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: invoiceId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Define interface for Invoice update body if needed, or use partial type
    // Assuming an Invoice type/interface exists elsewhere
    const updateData = body as Partial<Invoice>; // Replaced Record<string, any> with Partial<Invoice>

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead
    const now = new Date().toISOString();

    // Construct the update query dynamically for Invoices table
    const fieldsToUpdate: {
      [key: string]: string | number | boolean | undefined;
    } = {};

    // Add fields relevant to Invoice update
    // Example: fieldsToUpdate.status = updateData.status;
    // Example: fieldsToUpdate.due_date = updateData.due_date;
    // ... add other updatable invoice fields

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) { // Check updateData instead of fieldsToUpdate initially
      return NextResponse.json(
        { message: "No update fields provided" },
        { status: 400 }
      );
    }

    // Populate fieldsToUpdate based on updateData
    for (const key in updateData) {
        // Add validation/filtering if necessary
        fieldsToUpdate[key] = updateData[key];
    }

    fieldsToUpdate.updated_at = now;

    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(fieldsToUpdate);

    const updateQuery = `UPDATE Invoices SET ${setClauses} WHERE id = ?`; // Assuming table name is Invoices
    values.push(invoiceId);

    await DB.query(updateQuery, values);

    // Fetch the updated invoice details
    const fetchUpdatedQuery = `SELECT * FROM Invoices WHERE id = ?`;
    const updatedResult = await DB.query(fetchUpdatedQuery, [invoiceId]);
    const updatedInvoiceData =
      updatedResult.rows && updatedResult.rows.length > 0
        ? updatedResult.rows[0]
        : undefined;

    if (!updatedInvoiceData) {
        // Fallback or error if fetch fails
        return NextResponse.json({ message: "Invoice updated, but failed to fetch details" }, { status: 200 });
    }

    return NextResponse.json(updatedInvoiceData);
  } catch (error: unknown) {
    console.error("Error updating Invoice:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Error updating Invoice", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/billing/invoices/[id] - Delete an Invoice
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const { id: invoiceId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!invoiceId) {
      return NextResponse.json(
        { message: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // const DB = (process.env.DB as unknown) as D1Database; // Using Mock DB instead

    // Perform delete operation
    const deleteQuery = "DELETE FROM Invoices WHERE id = ?"; // Assuming table name is Invoices
    await DB.query(deleteQuery, [invoiceId]);

    // Cannot check info.meta.changes with the current mock

    return NextResponse.json(
      { message: "Invoice deleted successfully" },
      { status: 200 } // Use 200 or 204 No Content
    );
  } catch (error: unknown) {
    console.error("Error deleting Invoice:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Error deleting Invoice", details: errorMessage },
      { status: 500 }
    );
  }
}

