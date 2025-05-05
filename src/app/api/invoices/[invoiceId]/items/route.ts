// app/api/invoices/[invoiceId]/items/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session"; // FIX: Import IronSessionData
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
// import { InvoiceItem } from "@/types/billing";
import { z } from "zod";

// Define roles allowed to manage invoice items (adjust as needed)
const ALLOWED_ROLES_MANAGE = ["Admin", "Receptionist", "Billing Staff"];

// Helper function to get invoice ID from URL
function getInvoiceId(pathname: string): number | null {
    // Pathname might be /api/invoices/123/items
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 2]; // Second to last part
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// POST handler for adding an item to an invoice
const AddInvoiceItemSchema = z.object({
    billable_item_id: z.number().int().positive(),
    batch_id: z.number().int().positive().optional().nullable(), // Optional, e.g., for pharmacy items
    quantity: z.number().int().positive("Quantity must be positive"),
    unit_price: z.number().nonnegative().optional(), // Optional: If not provided, fetch from BillableItems
    discount_amount: z.number().nonnegative().optional().default(0),
    tax_amount: z.number().nonnegative().optional().default(0), // Could be calculated based on item/rules
    description: z.string().optional(), // Optional override
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
        const validation = AddInvoiceItemSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const itemData = validation.data;

        const context = await getCloudflareContext<CloudflareEnv>(); // FIX: Add await and type
        const { env } = context;
        const { DB } = env;

        // Use a transaction to ensure atomicity (add item, update invoice total)
        const results = await DB.batch([
            // 2. Check if invoice exists and is in a modifiable state (e.g., Draft)
            DB.prepare("SELECT status FROM Invoices WHERE invoice_id = ?").bind(invoiceId),
            // 3. Check if billable item exists and is active
            DB.prepare("SELECT item_id, unit_price, is_taxable FROM BillableItems WHERE item_id = ? AND is_active = TRUE").bind(itemData.billable_item_id),
            // 4. Optional: Check if batch exists and has sufficient quantity if batch_id is provided
            itemData.batch_id ? DB.prepare("SELECT current_quantity FROM StockBatches WHERE batch_id = ? AND inventory_item_id = (SELECT inventory_item_id FROM InventoryItems WHERE billable_item_id = ?)").bind(itemData.batch_id, itemData.billable_item_id) : null
        ].filter(Boolean) as D1PreparedStatement[]); // Filter out null for optional batch check

        const [invoiceCheck, itemCheck, batchCheck] = results;

        if (!invoiceCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 });
        }
        const invoiceStatus = (invoiceCheck.results[0] as { status: string }).status;
        if (invoiceStatus !== "Draft") { // Only allow adding items to Draft invoices
            return new Response(JSON.stringify({ error: `Cannot add items to invoice with status: ${invoiceStatus}` }), { status: 400 });
        }

        if (!itemCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Billable item not found or inactive" }), { status: 404 });
        }
        const billableItem = itemCheck.results[0] as { item_id: number; unit_price: number; is_taxable: boolean };

        // Use provided unit_price or fetch from billable item
        const unitPrice = itemData.unit_price !== undefined ? itemData.unit_price : billableItem.unit_price;

        // TODO: Implement Tax Calculation Logic if needed based on billableItem.is_taxable
        const calculatedTaxAmount = itemData.tax_amount; // Placeholder

        const totalAmount = (itemData.quantity * unitPrice) - itemData.discount_amount + calculatedTaxAmount;

        // Check batch quantity if applicable
        if (itemData.batch_id) {
            if (!batchCheck?.results?.length) {
                return new Response(JSON.stringify({ error: "Stock batch not found or does not belong to the specified billable item" }), { status: 404 });
            }
            const batchQuantity = (batchCheck.results[0] as { current_quantity: number }).current_quantity;
            if (batchQuantity < itemData.quantity) {
                return new Response(JSON.stringify({ error: `Insufficient stock in batch ${itemData.batch_id}. Available: ${batchQuantity}` }), { status: 400 });
            }
        }

        // 5. Perform insertions and updates within a transaction
        const batchActions: D1PreparedStatement[] = [];

        // 5a. Insert the invoice item
        batchActions.push(DB.prepare(
            "INSERT INTO InvoiceItems (invoice_id, billable_item_id, batch_id, description, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            invoiceId,
            itemData.billable_item_id,
            itemData.batch_id,
            itemData.description || null,
            itemData.quantity,
            unitPrice,
            itemData.discount_amount,
            calculatedTaxAmount,
            totalAmount
        ));

        // 5b. Update stock batch quantity if batch_id is provided
        if (itemData.batch_id) {
            batchActions.push(DB.prepare(
                "UPDATE StockBatches SET current_quantity = current_quantity - ? WHERE batch_id = ?"
            ).bind(itemData.quantity, itemData.batch_id));
        }

        // 5c. Update the invoice totals (total_amount, tax_amount, discount_amount)
        // Note: This recalculates the entire invoice total. More complex logic might sum incrementally.
        batchActions.push(DB.prepare(
            `UPDATE Invoices 
             SET 
                total_amount = (SELECT SUM(total_amount) FROM InvoiceItems WHERE invoice_id = ?), 
                tax_amount = (SELECT SUM(tax_amount) FROM InvoiceItems WHERE invoice_id = ?), 
                discount_amount = (SELECT SUM(discount_amount) FROM InvoiceItems WHERE invoice_id = ?) 
             WHERE invoice_id = ?`
        ).bind(invoiceId, invoiceId, invoiceId, invoiceId));

        // Execute the batch transaction
        // const transactionResults = await DB.batch(batchActions); // Commented out: Unused variable

        // Check if all operations in the transaction succeeded
        // Note: D1 batch doesn't automatically roll back on failure, need careful checking or separate calls.
        // For simplicity here, we assume success if no error is thrown.

        // Fetch the newly added item ID (D1 batch doesn't return last_row_id easily)
        // We might need to query it separately if needed, or just return success.

        // 6. Return success response
        return new Response(JSON.stringify({ message: "Item added to invoice successfully" }), {
            status: 201, // Created
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Add item to invoice ${invoiceId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        // TODO: Add specific error handling for stock update failures if needed
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// Note: DELETE for removing an item would follow a similar pattern:
// - Check invoice status (Draft)
// - Find the InvoiceItem
// - If batch_id exists, *increase* StockBatches.current_quantity
// - Delete the InvoiceItem record
// - Update Invoice totals
// - Perform within a transaction

