// app/api/invoices/[invoiceId]/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session"; // FIX: Import IronSessionData
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Invoice, InvoiceStatus, Payment, InvoiceItem, ItemType } from "@/types/billing";
import { z } from "zod";
// Removed unused D1Result import

// Define roles allowed to view/manage invoices (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Billing Staff", "Patient"];
const ALLOWED_ROLES_MANAGE = ["Admin", "Receptionist", "Billing Staff"];

// Helper function to get invoice ID from URL
function getInvoiceId(pathname: string): number | null {
    // Pathname might be /api/invoices/123
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 1]; // Last part
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// Define interfaces for the complex query results
interface InvoiceQueryResult {
    invoice_id: number;
    invoice_number: string;
    patient_id: number;
    appointment_id: number | null;
    admission_id: number | null;
    invoice_date: string; // ISO String
    due_date: string | null; // ISO String
    total_amount: number;
    paid_amount: number;
    discount_amount: number;
    tax_amount: number;
    status: InvoiceStatus;
    notes: string | null;
    created_by_user_id: number;
    created_at: string; // ISO String
    updated_at: string; // ISO String
    patient_first_name: string;
    patient_last_name: string;
}

interface InvoiceItemQueryResult {
    invoice_item_id: number;
    invoice_id: number;
    billable_item_id: number;
    batch_id: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    created_at: string; // ISO String
    billable_item_name: string;
    billable_item_type: string; // Assuming ItemType is string-based enum
}

// GET handler for retrieving a specific invoice with details
export async function GET(request: Request) {
    const cookieStore = await cookies(); // FIX: Add await
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    const url = new URL(request.url);
    const invoiceId = getInvoiceId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (invoiceId === null) {
        return new Response(JSON.stringify({ error: "Invalid Invoice ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const context = await getCloudflareContext<CloudflareEnv>(); // FIX: Add await and type
        const { env } = context;
        const { DB } = env;

        // 2. Retrieve the main invoice record
        const invoiceResult = await DB.prepare(
            `SELECT 
                i.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name
             FROM Invoices i
             JOIN Patients p ON i.patient_id = p.patient_id
             WHERE i.invoice_id = ?`
        ).bind(invoiceId).first<InvoiceQueryResult>();

        if (!invoiceResult) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Authorization check for Patients (can only view their own invoices)
        if (session.user.roleName === "Patient") {
            const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
            if (!patientProfile || patientProfile.patient_id !== invoiceResult.patient_id) {
                 return new Response(JSON.stringify({ error: "Forbidden: You can only view your own invoices" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // 4. Retrieve associated invoice items
        const itemsResult = await DB.prepare(
            `SELECT ii.*, bi.item_name as billable_item_name, bi.item_type as billable_item_type
             FROM InvoiceItems ii 
             JOIN BillableItems bi ON ii.billable_item_id = bi.item_id
             WHERE ii.invoice_id = ? ORDER BY ii.invoice_item_id`
        ).bind(invoiceId).all<InvoiceItemQueryResult>();

        // 5. Retrieve associated payments
        const paymentsResult = await DB.prepare(
            "SELECT * FROM Payments WHERE invoice_id = ? ORDER BY payment_date DESC"
        ).bind(invoiceId).all<Payment>();

        // 6. Format the final response
        const invoice: Invoice = {
            invoice_id: invoiceResult.invoice_id,
            invoice_number: invoiceResult.invoice_number,
            patient_id: invoiceResult.patient_id,
            appointment_id: invoiceResult.appointment_id,
            admission_id: invoiceResult.admission_id,
            invoice_date: invoiceResult.invoice_date,
            due_date: invoiceResult.due_date,
            total_amount: invoiceResult.total_amount,
            paid_amount: invoiceResult.paid_amount,
            discount_amount: invoiceResult.discount_amount,
            tax_amount: invoiceResult.tax_amount,
            status: invoiceResult.status,
            notes: invoiceResult.notes,
            created_by_user_id: invoiceResult.created_by_user_id,
            created_at: invoiceResult.created_at,
            updated_at: invoiceResult.updated_at,
            patient: {
                patient_id: invoiceResult.patient_id,
                first_name: invoiceResult.patient_first_name,
                last_name: invoiceResult.patient_last_name,
            },
            items: itemsResult.results?.map(item => ({
                invoice_item_id: item.invoice_item_id,
                invoice_id: item.invoice_id,
                billable_item_id: item.billable_item_id,
                batch_id: item.batch_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount,
                tax_amount: item.tax_amount,
                total_amount: item.total_amount,
                created_at: item.created_at,
                billable_item: {
                    item_id: item.billable_item_id,
                    item_name: item.billable_item_name,
                    item_type: item.billable_item_type as ItemType, // Cast to ItemType enum
                }
            })) as InvoiceItem[] || [],
            payments: paymentsResult.results || [],
        };

        // 7. Return the detailed invoice
        return new Response(JSON.stringify(invoice), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Get invoice ${invoiceId} details error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// PUT handler for updating an invoice (e.g., status, notes, due date)
const UpdateInvoiceSchema = z.object({
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: z.nativeEnum(InvoiceStatus).optional(),
    notes: z.string().optional().nullable(),
    // Other fields like total_amount, paid_amount are usually updated via items/payments
});

export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    const url = new URL(request.url);
    const invoiceId = getInvoiceId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_MANAGE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (invoiceId === null) {
        return new Response(JSON.stringify({ error: "Invalid Invoice ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const validation = UpdateInvoiceSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const updateData = validation.data;

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
             return new Response(JSON.stringify({ message: "No update data provided" }), {
                status: 200, // Or 304 Not Modified
                headers: { "Content-Type": "application/json" },
            });
        }

        const context = await getCloudflareContext<CloudflareEnv>();
        const { env } = context;
        const { DB } = env;

        // 2. Check if invoice exists
        const invoiceCheck = await DB.prepare("SELECT invoice_id, status FROM Invoices WHERE invoice_id = ?")
                                   .bind(invoiceId)
                                   .first<{ invoice_id: number, status: string }>();
        if (!invoiceCheck) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Optional: Add logic to prevent certain status transitions (e.g., cannot change from Paid)
        // if (invoiceCheck.status === "Paid" && updateData.status && updateData.status !== "Paid") { ... }

        // 3. Build update query
        let query = "UPDATE Invoices SET updated_at = CURRENT_TIMESTAMP";
        const queryParams: (string | null | number)[] = [];

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) { // Allow null values to be set
                query += `, ${key} = ?`;
                queryParams.push(value);
            }
        });

        query += " WHERE invoice_id = ?";
        queryParams.push(invoiceId);

        // 4. Execute update
        // Use as any to bypass the type mismatch between D1Result implementations
        const updateResult = await DB.prepare(query).bind(...queryParams).run() as { success: boolean; meta?: unknown };

        // Check success property directly
        if (!updateResult.success) {
             console.error("Failed to update invoice:", updateResult);
            throw new Error("Failed to update invoice");
        }

        // 5. Return success response
        return new Response(JSON.stringify({ message: "Invoice updated successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Update invoice ${invoiceId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// DELETE handler - Typically invoices are cancelled (status update) rather than deleted
// Implement if hard deletion is truly required, but use with caution.
// export async function DELETE(request: Request) { ... }
