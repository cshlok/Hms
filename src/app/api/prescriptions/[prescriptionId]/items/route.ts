// app/api/prescriptions/[prescriptionId]/items/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session"; // Import IronSessionData
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
// import { PrescriptionItem } from "@/types/opd"; // Removed unused import
import { z } from "zod";

// Define roles allowed to add items to prescriptions (adjust as needed)
const ALLOWED_ROLES_ADD = ["Doctor"];

// Helper function to get prescription ID from URL
function getPrescriptionId(pathname: string): number | null {
    // Pathname might be /api/prescriptions/123/items
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 2]; // Second to last part
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// POST handler for adding an item to a prescription
const AddPrescriptionItemSchema = z.object({
    inventory_item_id: z.number().int().positive(), // Link to the specific drug/item
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().min(1, "Duration is required"),
    route: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    quantity_prescribed: z.number().int().positive().optional().nullable(),
});
type AddPrescriptionItemType = z.infer<typeof AddPrescriptionItemSchema>;

export async function POST(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions); // Added await for cookies()
    const url = new URL(request.url);
    const prescriptionId = getPrescriptionId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_ADD.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (prescriptionId === null) {
        return new Response(JSON.stringify({ error: "Invalid Prescription ID" }), { status: 400 });
    }

    try {
        const body = await request.json();
        // Allow adding multiple items at once
        const itemsArraySchema = z.array(AddPrescriptionItemSchema).min(1);
        const validation = itemsArraySchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), { status: 400 });
        }

        const itemsData = validation.data;
        const { env } = await getCloudflareContext(); // Added await
        const { DB } = env;

        // 2. Get Doctor ID from session user
        const doctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
        if (!doctorProfile) {
            return new Response(JSON.stringify({ error: "Doctor profile not found for the current user" }), { status: 404 });
        }
        const doctorId = doctorProfile.doctor_id;

        // 3. Check if prescription exists and belongs to the doctor
        const presCheck = await DB.prepare("SELECT prescription_id, doctor_id FROM Prescriptions WHERE prescription_id = ?")
                                  .bind(prescriptionId)
                                  .first<{ prescription_id: number, doctor_id: number }>();

        if (!presCheck) {
            return new Response(JSON.stringify({ error: "Prescription not found" }), { status: 404 });
        }
        if (presCheck.doctor_id !== doctorId) {
            // Corrected escaped quote
            return new Response(JSON.stringify({ error: "Forbidden: Cannot add items to another doctor's prescription" }), { status: 403 });
        }

        // 4. Validate all inventory items exist and get their names
        const inventoryItemIds = itemsData.map((item: AddPrescriptionItemType) => item.inventory_item_id);
        // Corrected template literal for IN clause placeholders
        const inventoryCheckQuery = `SELECT inventory_item_id, item_name FROM InventoryItems WHERE inventory_item_id IN (${inventoryItemIds.map(() => '?').join(',')}) AND is_active = TRUE`;
        const inventoryResults = await DB.prepare(inventoryCheckQuery).bind(...inventoryItemIds).all<{ inventory_item_id: number, item_name: string }>();

        const foundInventoryItems = new Map(inventoryResults.results?.map((item: { inventory_item_id: number, item_name: string }) => [item.inventory_item_id, item.item_name]));

        const missingItems = inventoryItemIds.filter(id => !foundInventoryItems.has(id));
        if (missingItems.length > 0) {
            // Corrected template literal for error message
            return new Response(JSON.stringify({ error: `Inventory item(s) not found or inactive: ${missingItems.join(', ')}` }), { status: 404 });
        }

        // 5. Prepare batch insert for all items
        const batchActions: D1PreparedStatement[] = itemsData.map(item => {
            const drugName = foundInventoryItems.get(item.inventory_item_id) || "Unknown Item"; // Fallback, should not happen due to check above
            return DB.prepare(
                `INSERT INTO PrescriptionItems (
                    prescription_id, inventory_item_id, drug_name, dosage, frequency, 
                    duration, route, instructions, quantity_prescribed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                prescriptionId,
                item.inventory_item_id,
                drugName, // Store the name at the time of prescription
                item.dosage,
                item.frequency,
                item.duration,
                item.route,
                item.instructions,
                item.quantity_prescribed
            );
        });

        // 6. Execute the batch insert
        const insertResults = await DB.batch(batchActions);

        // Basic check for success (D1 batch doesn't guarantee rollback)
        // A more robust approach might check each result in insertResults
        console.log("Batch insert results:", insertResults); // Log results for debugging

        // 7. Return success response
        // Corrected template literal for success message
        return new Response(JSON.stringify({ message: `${itemsData.length} item(s) added to prescription successfully` }), {
            status: 201, // Created
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Add items to prescription ${prescriptionId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// DELETE handler for removing an item from a prescription (if allowed before dispensing)
// Requires prescriptionItemId in the URL: /api/prescriptions/[prescriptionId]/items/[itemId]
// export async function DELETE(request: Request) { ... }

