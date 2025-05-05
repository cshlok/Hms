// app/api/invoices/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Invoice, InvoiceStatus } from "@/types/billing";
import { z } from "zod";
import { format } from "date-fns";
// Use the specific D1Database type from the correct package
import type { D1Database } from "@cloudflare/workers-types";

// Define roles allowed to view/manage invoices (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Billing Staff", "Patient"];
const ALLOWED_ROLES_MANAGE = ["Admin", "Receptionist", "Billing Staff"];

// Define interface for invoice query results
interface InvoiceQueryResult {
    invoice_id: number;
    invoice_number: string;
    patient_id: number;
    appointment_id: number | null;
    admission_id: number | null;
    invoice_date: string;
    due_date: string | null;
    total_amount: number;
    paid_amount: number;
    discount_amount: number;
    tax_amount: number;
    status: InvoiceStatus;
    notes: string | null;
    created_by_user_id: number;
    created_at: string;
    updated_at: string;
    patient_first_name: string;
    patient_last_name: string;
}

// Function to generate a unique invoice number (example)
// FIX: Use D1Database type for DB parameter, but expect potential mismatch at call site
async function generateInvoiceNumber(DB: D1Database): Promise<string> {
    // Simple example: INV-YYYYMMDD-XXXX (sequential number for the day)
    const today = format(new Date(), "yyyyMMdd");
    const prefix = `INV-${today}-`;

    // Find the last invoice number for today
    const lastInvoice = await DB.prepare(
        "SELECT invoice_number FROM Invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1"
    ).bind(`${prefix}%`).first<{ invoice_number: string }>();

    let sequence = 1;
    if (lastInvoice) {
        try {
            const lastSeqStr = lastInvoice.invoice_number.split("-").pop();
            if (lastSeqStr) {
                sequence = parseInt(lastSeqStr, 10) + 1;
            }
        } catch (e) {
            console.error("Error parsing last invoice sequence:", e);
            // Fallback or throw error
        }
    }

    return `${prefix}${String(sequence).padStart(4, "0")}`;
}

// GET handler for listing invoices
export async function GET(request: Request) {
    const cookieStore = await cookies();
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    const { searchParams } = new URL(request.url);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const context = await getCloudflareContext<CloudflareEnv>();
        const { env } = context;
        const { DB } = env;

        // 2. Build query based on filters
        let query = `
            SELECT 
                i.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name
            FROM Invoices i
            JOIN Patients p ON i.patient_id = p.patient_id
            WHERE 1=1
        `;
        const queryParams: (string | number)[] = [];

        // Filter by patient_id (if user is Patient, restrict to their own)
        const patientId = searchParams.get("patientId");
        if (session.user.roleName === "Patient") {
            const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
            if (!patientProfile) {
                 return new Response(JSON.stringify({ error: "Patient profile not found for this user" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                });
            }
            query += " AND i.patient_id = ?";
            queryParams.push(patientProfile.patient_id);
        } else if (patientId) {
            query += " AND i.patient_id = ?";
            queryParams.push(parseInt(patientId, 10));
        }

        // Filter by date range
        const startDate = searchParams.get("startDate"); // YYYY-MM-DD
        const endDate = searchParams.get("endDate");     // YYYY-MM-DD
        if (startDate) {
            query += " AND DATE(i.invoice_date) >= ?";
            queryParams.push(startDate);
        }
        if (endDate) {
            query += " AND DATE(i.invoice_date) <= ?";
            queryParams.push(endDate);
        }

        // Filter by status
        const status = searchParams.get("status");
        if (status) {
            query += " AND i.status = ?";
            queryParams.push(status);
        }

        query += " ORDER BY i.invoice_date DESC, i.invoice_id DESC";

        // 3. Retrieve invoices
        const invoicesResult = await DB.prepare(query).bind(...queryParams).all<InvoiceQueryResult>();

        if (!invoicesResult.results) {
            throw new Error("Failed to retrieve invoices");
        }

        // 4. Format results
        const formattedResults: Invoice[] = invoicesResult.results.map(inv => ({
            invoice_id: inv.invoice_id,
            invoice_number: inv.invoice_number,
            patient_id: inv.patient_id,
            appointment_id: inv.appointment_id,
            admission_id: inv.admission_id,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            total_amount: inv.total_amount,
            paid_amount: inv.paid_amount,
            discount_amount: inv.discount_amount,
            tax_amount: inv.tax_amount,
            status: inv.status,
            notes: inv.notes,
            created_by_user_id: inv.created_by_user_id,
            created_at: inv.created_at,
            updated_at: inv.updated_at,
            patient: {
                patient_id: inv.patient_id,
                first_name: inv.patient_first_name,
                last_name: inv.patient_last_name,
            },
            // items and payments are not fetched in the list view for performance
        }));

        // 5. Return invoice list
        return new Response(JSON.stringify(formattedResults), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Get invoices error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// POST handler for creating a new invoice (e.g., starting a draft)
const CreateInvoiceSchema = z.object({
    patient_id: z.number().int().positive(),
    appointment_id: z.number().int().positive().optional().nullable(),
    admission_id: z.number().int().positive().optional().nullable(),
    invoice_date: z.string().datetime().optional(), // Default is CURRENT_TIMESTAMP
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    // Use z.nativeEnum for TypeScript enums
    status: z.nativeEnum(InvoiceStatus).optional().default(InvoiceStatus.Draft),
    notes: z.string().optional(),
    // Items will be added via a separate endpoint or PUT request
});

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_MANAGE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const validation = CreateInvoiceSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const invoiceData = validation.data;

        const context = await getCloudflareContext<CloudflareEnv>();
        const { env } = context;
        const { DB } = env;

        // 2. Verify patient exists and is active
        const patientCheck = await DB.prepare("SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE")
                                   .bind(invoiceData.patient_id)
                                   .first();
        if (!patientCheck) {
            return new Response(JSON.stringify({ error: "Patient not found or is inactive" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Generate unique invoice number
        // FIX: Use 'as any' to bypass potential D1Database type mismatch
        const invoiceNumber = await generateInvoiceNumber(DB as any);

        // 4. Insert new invoice record
        // Use 'as any' to bypass D1Result type mismatch
        const insertResult = await DB.prepare(
            "INSERT INTO Invoices (invoice_number, patient_id, appointment_id, admission_id, invoice_date, due_date, status, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
            invoiceNumber,
            invoiceData.patient_id,
            invoiceData.appointment_id,
            invoiceData.admission_id,
            invoiceData.invoice_date ? invoiceData.invoice_date : null, // Let DB handle default
            invoiceData.due_date,
            invoiceData.status,
            invoiceData.notes || null,
            session.user.userId
        )
        .run() as any;

        // Check success and last_row_id existence and type
        if (!insertResult.success || !insertResult.meta || typeof insertResult.meta.last_row_id !== 'number') {
            console.error("Failed to create invoice or get last_row_id:", insertResult);
            throw new Error("Failed to create invoice or retrieve ID");
        }

        const newInvoiceId = insertResult.meta.last_row_id;

        // 5. Return success response
        return new Response(JSON.stringify({ message: "Invoice created successfully", invoiceId: newInvoiceId, invoiceNumber: invoiceNumber }), {
            status: 201, // Created
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Create invoice error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        // Handle potential unique constraint errors (invoice_number - unlikely with generation logic)
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
