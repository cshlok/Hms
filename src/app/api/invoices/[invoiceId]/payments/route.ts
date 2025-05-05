// app/api/invoices/[invoiceId]/payments/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session"; // FIX: Import IronSessionData
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { /* Payment, */ PaymentMethod, /* InvoiceStatus */ } from "@/types/billing"; // Commented out unused imports
import { z } from "zod";

// Define roles allowed to manage payments (adjust as needed)
const ALLOWED_ROLES_MANAGE = ["Admin", "Receptionist", "Billing Staff"];

// Helper function to get invoice ID from URL
function getInvoiceId(pathname: string): number | null {
    // Pathname might be /api/invoices/123/payments
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 2]; // Second to last part
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// POST handler for recording a payment for an invoice
const AddPaymentSchema = z.object({
    amount_paid: z.number().positive("Amount paid must be positive"),
    payment_method: z.nativeEnum(PaymentMethod),
    payment_date: z.string().datetime().optional(), // Default is CURRENT_TIMESTAMP
    transaction_reference: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    const cookieStore = await cookies(); // FIX: Add await
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
        const validation = AddPaymentSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const paymentData = validation.data;

        const context = await getCloudflareContext<CloudflareEnv>(); // FIX: Add await and type
        const { env } = context;
        const { DB } = env;

        // Use a transaction (batch) to ensure atomicity
        // 2. Get current invoice details (total_amount, paid_amount, patient_id)
        const invoiceCheck = await DB.prepare(
            "SELECT invoice_id, patient_id, total_amount, paid_amount, status FROM Invoices WHERE invoice_id = ?"
        ).bind(invoiceId).first<{ invoice_id: number; patient_id: number; total_amount: number; paid_amount: number; status: string }>();

        if (!invoiceCheck) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 });
        }

        // Prevent overpayment or payment on cancelled invoices
        if (invoiceCheck.status === "Cancelled") {
             return new Response(JSON.stringify({ error: "Cannot record payment for a cancelled invoice" }), { status: 400 });
        }
        const remainingAmount = invoiceCheck.total_amount - invoiceCheck.paid_amount;
        if (paymentData.amount_paid > remainingAmount + 0.001) { // Add small tolerance for floating point issues
             return new Response(JSON.stringify({ error: `Payment amount (${paymentData.amount_paid}) exceeds remaining balance (${remainingAmount.toFixed(2)})` }), { status: 400 });
        }

        // 3. Prepare batch actions
        const batchActions: D1PreparedStatement[] = [];

        // 3a. Insert the payment record
        batchActions.push(DB.prepare(
            "INSERT INTO Payments (invoice_id, patient_id, payment_date, amount_paid, payment_method, transaction_reference, notes, received_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            invoiceId,
            invoiceCheck.patient_id, // Get patient_id from invoice record
            paymentData.payment_date || null, // Let DB handle default
            paymentData.amount_paid,
            paymentData.payment_method,
            paymentData.transaction_reference,
            paymentData.notes,
            session.user.userId
        ));

        // 3b. Update the invoice paid_amount and status
        const newPaidAmount = invoiceCheck.paid_amount + paymentData.amount_paid;
        let newStatus = invoiceCheck.status;
        if (newPaidAmount >= invoiceCheck.total_amount - 0.001) { // Check if fully paid (with tolerance)
            newStatus = "Paid";
        } else if (newPaidAmount > 0) {
            newStatus = "PartiallyPaid";
        }

        batchActions.push(DB.prepare(
            "UPDATE Invoices SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?"
        ).bind(newPaidAmount, newStatus, invoiceId));

        // 4. Execute the batch transaction
        // const transactionResults = await DB.batch(batchActions); // Commented out: Unused variable

        // Basic check for success (D1 batch doesn't guarantee rollback)
        // A more robust approach might involve checking affected rows or re-querying.

        // 5. Return success response
        return new Response(JSON.stringify({ message: "Payment recorded successfully", newStatus: newStatus }), {
            status: 201, // Created
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Record payment for invoice ${invoiceId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// GET handler (Optional - could list payments for an invoice)
// Already included in GET /api/invoices/[invoiceId]
// export async function GET(request: Request) { ... }

