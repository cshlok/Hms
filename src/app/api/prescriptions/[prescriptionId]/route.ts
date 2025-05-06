// app/api/prescriptions/[prescriptionId]/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session"; // Import IronSessionData
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Prescription } from "@/types/opd";

// Define roles allowed to view prescriptions (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Doctor", "Nurse", "Pharmacist", "Patient"]; // Patient can view own

// Define the expected shape of the main prescription query result
interface PrescriptionQueryResult {
    prescription_id: number;
    consultation_id: number | null;
    patient_id: number;
    doctor_id: number;
    prescription_date: string; // Assuming date is returned as string
    notes: string | null;
    created_at: string;
    updated_at: string;
    patient_first_name: string;
    patient_last_name: string;
    doctor_full_name: string;
}

// Define the expected shape of the prescription items query result
interface PrescriptionItemQueryResult {
    prescription_item_id: number;
    prescription_id: number;
    inventory_item_id: number;
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions: string | null;
    quantity_prescribed: number;
    created_at: string;
    inventory_unit_of_measure: string;
}

// Helper function to get prescription ID from URL
function getPrescriptionId(pathname: string): number | null {
    // Pathname might be /api/prescriptions/123
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 1]; // Last part
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// GET handler for retrieving a specific prescription with items
export async function GET(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions); // Added await for cookies()
    const url = new URL(request.url);
    const prescriptionId = getPrescriptionId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (prescriptionId === null) {
        return new Response(JSON.stringify({ error: "Invalid Prescription ID" }), { status: 400 });
    }

    try {
        const { env } = await getCloudflareContext(); // Added await
        const { DB } = env;

        // 2. Retrieve the main prescription record with patient and doctor details
        const presResult = await DB.prepare(
            `SELECT
                pr.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u.full_name as doctor_full_name
             FROM Prescriptions pr
             JOIN Patients p ON pr.patient_id = p.patient_id
             JOIN Doctors d ON pr.doctor_id = d.doctor_id
             JOIN Users u ON d.user_id = u.user_id
             WHERE pr.prescription_id = ?`
        ).bind(prescriptionId).first<PrescriptionQueryResult>(); // Use defined interface

        if (!presResult) {
            return new Response(JSON.stringify({ error: "Prescription not found" }), { status: 404 });
        }

        // 3. Authorization check for Patients and Doctors
        if (session.user.roleName === "Patient") {
            const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
            if (!patientProfile || presResult.patient_id !== patientProfile.patient_id) {
                return new Response(JSON.stringify({ error: "Forbidden: You can only view your own prescriptions" }), { status: 403 });
            }
        }
        if (session.user.roleName === "Doctor") {
            const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
            if (!userDoctorProfile || presResult.doctor_id !== userDoctorProfile.doctor_id) {
                // Allow viewing if not the prescribing doctor? Or restrict? For now, restrict.
                return new Response(JSON.stringify({ error: "Forbidden: Doctors can generally only view their own prescriptions" }), { status: 403 });
            }
        }

        // 4. Retrieve associated prescription items
        const itemsResult = await DB.prepare(
            `SELECT pi.*, ii.unit_of_measure as inventory_unit_of_measure
             FROM PrescriptionItems pi
             JOIN InventoryItems ii ON pi.inventory_item_id = ii.inventory_item_id
             WHERE pi.prescription_id = ? ORDER BY pi.prescription_item_id`
        ).bind(prescriptionId).all<PrescriptionItemQueryResult>(); // Use defined interface

        // 5. Format the final response
        const prescription: Prescription = {
            prescription_id: presResult.prescription_id,
            consultation_id: presResult.consultation_id ?? null, // Handle potential null
            patient_id: presResult.patient_id,
            doctor_id: presResult.doctor_id,
            prescription_date: presResult.prescription_date,
            notes: presResult.notes,
            created_at: presResult.created_at,
            updated_at: presResult.updated_at,
            // Include patient and doctor info if needed in detail view
            // patient: { ... },
            // doctor: { ... },
            items: itemsResult.results?.map((item: PrescriptionItemQueryResult) => ({ // Use defined interface
                prescription_item_id: item.prescription_item_id,
                prescription_id: item.prescription_id,
                inventory_item_id: item.inventory_item_id,
                drug_name: item.drug_name,
                dosage: item.dosage,
                frequency: item.frequency,
                duration: item.duration,
                route: item.route,
                instructions: item.instructions,
                quantity_prescribed: item.quantity_prescribed,
                created_at: item.created_at,
                inventory_item: {
                    inventory_item_id: item.inventory_item_id,
                    unit_of_measure: item.inventory_unit_of_measure
                }
            })) || [],
        };

        // 6. Return the detailed prescription
        return new Response(JSON.stringify(prescription), { status: 200 });

    } catch (error) {
        console.error(`Get prescription ${prescriptionId} details error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

// PUT/DELETE handlers - Generally prescriptions are not updated/deleted once issued.
// Modifications might involve cancelling and creating a new one.
// Implement if specific update/delete logic is required.

