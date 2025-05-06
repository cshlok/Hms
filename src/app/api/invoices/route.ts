import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { Invoice } from "@/types/billing";
import { getSession } from "@/lib/session";
import { z } from "zod";
import type { D1ResultWithMeta, D1Database, D1PreparedStatement, D1Result } from "@/types/cloudflare";

// Zod schema for invoice creation
const invoiceCreateSchema = z.object({
  patient_id: z.number(),
  consultation_id: z.number().optional().nullable(),
  issue_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid issue date format",
  }),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid due date format",
  }),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      billable_item_id: z.number(),
      description: z.string(),
      quantity: z.number().positive(),
      unit_price: z.number().nonnegative(),
    })
  ).min(1, "At least one invoice item is required"),
});

// Helper function to generate the next invoice number (example implementation)
async function generateInvoiceNumber(db: D1Database): Promise<string> {
  const result = await db.prepare("SELECT MAX(id) as maxId FROM Invoices").first<{ maxId: number | null }>();
  const nextId = (result?.maxId || 0) + 1;
  return `INV-${String(nextId).padStart(6, "0")}`;
}

// GET /api/invoices - Fetch list of invoices (with filtering/pagination)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status");
    const patientIdFilter = searchParams.get("patient_id");
    const dateFromFilter = searchParams.get("date_from");
    const dateToFilter = searchParams.get("date_to");
    const sortBy = searchParams.get("sort_by") || "issue_date";
    const sortOrder = searchParams.get("sort_order") || "desc";

    const validSortColumns = ["invoice_number", "issue_date", "due_date", "total_amount", "status"];
    const validSortOrders = ["asc", "desc"];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : "issue_date";
    const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder.toUpperCase() : "DESC";

    let query = `
      SELECT
        i.id, i.invoice_number, i.patient_id, i.consultation_id,
        i.issue_date, i.due_date, i.total_amount, i.status, i.notes,
        p.first_name as patient_first_name, p.last_name as patient_last_name
      FROM Invoices i
      JOIN Patients p ON i.patient_id = p.patient_id
      WHERE 1=1
    `;
    const queryParameters: (string | number)[] = [];
    let countQuery = `SELECT COUNT(*) as total FROM Invoices WHERE 1=1`;
    const countParameters: (string | number)[] = [];

    if (statusFilter) {
      query += " AND i.status = ?";
      queryParameters.push(statusFilter);
      countQuery += " AND status = ?";
      countParameters.push(statusFilter);
    }
    if (patientIdFilter) {
      query += " AND i.patient_id = ?";
      queryParameters.push(Number.parseInt(patientIdFilter));
      countQuery += " AND patient_id = ?";
      countParameters.push(Number.parseInt(patientIdFilter));
    }
    if (dateFromFilter) {
      query += " AND i.issue_date >= ?";
      queryParameters.push(dateFromFilter);
      countQuery += " AND issue_date >= ?";
      countParameters.push(dateFromFilter);
    }
    if (dateToFilter) {
      query += " AND i.issue_date <= ?";
      queryParameters.push(dateToFilter);
      countQuery += " AND issue_date <= ?";
      countParameters.push(dateToFilter);
    }

    query += ` ORDER BY i.${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`;
    queryParameters.push(limit, offset);

    const [invoicesResult, countResult] = await Promise.all([
      (DB as D1Database).prepare(query).bind(...queryParameters).all<Invoice>(),
      (DB as D1Database).prepare(countQuery).bind(...countParameters).first<{ total: number }>()
    ]);

    const results = invoicesResult.results || [];
    const total = countResult?.total || 0;

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
    console.error("Error fetching invoices:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Error fetching invoices", details: errorMessage },
      { status: 500 }
    );
  }
}


// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session.isLoggedIn) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!session.user) { // Ensure user exists if logged in
        return NextResponse.json({ message: "User not found in session" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const validationResult = invoiceCreateSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const invoiceData = validationResult.data;
        const now = new Date().toISOString();

        const totalAmount = invoiceData.items.reduce(
            (sum, item) => sum + item.quantity * item.unit_price,
            0
        );

        const invoiceNumber = await generateInvoiceNumber(DB as D1Database);

        const insertInvoiceStmt = (DB as D1Database).prepare(
            `INSERT INTO Invoices (invoice_number, patient_id, consultation_id, issue_date, due_date, total_amount, status, notes, created_by_user_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            invoiceNumber,
            invoiceData.patient_id,
            invoiceData.consultation_id,
            invoiceData.issue_date,
            invoiceData.due_date,
            totalAmount,
            invoiceData.status,
            invoiceData.notes || null,
            session.user.userId, // session.user is now guaranteed to be defined
            now,
            now
        );
        const insertResult = await insertInvoiceStmt.run() as D1ResultWithMeta;

        if (!insertResult.success || !insertResult.meta || typeof insertResult.meta.last_row_id !== 'number') {
            console.error("Failed to create invoice or get last_row_id:", insertResult);
            throw new Error("Failed to create invoice record");
        }

        const newInvoiceId = insertResult.meta.last_row_id;

        const itemInsertStmts: D1PreparedStatement[] = invoiceData.items.map((item) =>
            (DB as D1Database).prepare(
                `INSERT INTO InvoiceItems (invoice_id, billable_item_id, description, quantity, unit_price, total_price, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                newInvoiceId,
                item.billable_item_id,
                item.description,
                item.quantity,
                item.unit_price,
                item.quantity * item.unit_price,
                now
            )
        );

        const itemInsertResults = await (DB as D1Database).batch(itemInsertStmts);

        const allItemsInserted = itemInsertResults.every((res: D1Result) => res.success);
        if (!allItemsInserted) {
            console.error("Failed to insert one or more invoice items:", itemInsertResults);
            await (DB as D1Database).prepare("DELETE FROM Invoices WHERE id = ?").bind(newInvoiceId).run();
            throw new Error("Failed to create invoice items");
        }

        return NextResponse.json(
            { message: "Invoice created successfully", invoiceId: newInvoiceId },
            { status: 201 }
        );

    } catch (error: unknown) {
        console.error("Error creating invoice:", error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: "Error creating invoice", details: errorMessage },
            { status: 500 }
        );
    }
}

