// app/api/lab-orders/[labOrderId]/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { LabOrder, LabOrderStatus, LabOrderItem, LabOrderItemStatus } from "@/types/opd"; // Added LabOrderItemStatus
import { z } from "zod";
// Removed unused D1Result import

// Define roles allowed to view/update lab orders (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Doctor", "Nurse", "LabTechnician", "Patient"]; // Patient can view own
const ALLOWED_ROLES_UPDATE = ["Admin", "Doctor", "Nurse", "LabTechnician"]; // Roles involved in the lab process

// Define interface for lab order query result
interface LabOrderQueryResult {
    lab_order_id: number;
    consultation_id: number | null;
    patient_id: number;
    doctor_id: number;
    order_datetime: string;
    status: LabOrderStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
    patient_first_name: string;
    patient_last_name: string;
    doctor_full_name: string | null;
}

// Define interface for lab order item query result
interface LabOrderItemQueryResult {
    lab_order_item_id: number;
    lab_order_id: number;
    billable_item_id: number;
    test_name: string;
    sample_type: string | null;
    sample_id: string | null;
    sample_collection_datetime: string | null;
    sample_collected_by_user_id: number | null;
    result_value: string | null;
    result_unit: string | null;
    reference_range: string | null;
    result_notes: string | null;
    result_datetime: string | null;
    result_verified_by_user_id: number | null;
    status: string;
    created_at: string;
    updated_at: string;
    billable_item_code: string;
    sample_collected_by_user_full_name: string | null;
    result_verified_by_user_full_name: string | null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ labOrderId: string }> }) {
    // Pass cookies() directly
    const cookieStore = await cookies();
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    const { labOrderId: labOrderIdString } = await params;
    const labOrderId = parseInt(labOrderIdString, 10);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (isNaN(labOrderId)) {
        return new Response(JSON.stringify({ error: "Invalid Lab Order ID" }), { status: 400 });
    }

    try {
        const context = await getCloudflareContext<CloudflareEnv>();
        const { env } = context;
        const { DB } = env;

        // 2. Retrieve the main lab order record with patient and doctor details
        const orderResult = await DB.prepare(
            `SELECT 
                lo.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u.full_name as doctor_full_name
             FROM LabOrders lo
             JOIN Patients p ON lo.patient_id = p.patient_id
             JOIN Doctors d ON lo.doctor_id = d.doctor_id
             JOIN Users u ON d.user_id = u.user_id
             WHERE lo.lab_order_id = ?`
        ).bind(labOrderId).first<LabOrderQueryResult>();

        if (!orderResult) {
            return new Response(JSON.stringify({ error: "Lab Order not found" }), { status: 404 });
        }

        // 3. Authorization check for Patients and Doctors
        if (session.user.roleName === "Patient") {
            const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
            if (!patientProfile || orderResult.patient_id !== patientProfile.patient_id) {
                return new Response(JSON.stringify({ error: "Forbidden: You can only view your own lab orders" }), { status: 403 });
            }
        }
        if (session.user.roleName === "Doctor") {
            const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
            if (!userDoctorProfile || orderResult.doctor_id !== userDoctorProfile.doctor_id) {
                 // Allow viewing if not the ordering doctor? Or restrict? For now, restrict.
                return new Response(JSON.stringify({ error: "Forbidden: Doctors can generally only view their own lab orders" }), { status: 403 });
            }
        }

        // 4. Retrieve associated lab order items
        const itemsResult = await DB.prepare(
            `SELECT loi.*, bi.item_code as billable_item_code,
                    sc_user.full_name as sample_collected_by_user_full_name,
                    rv_user.full_name as result_verified_by_user_full_name
             FROM LabOrderItems loi
             JOIN BillableItems bi ON loi.billable_item_id = bi.item_id
             LEFT JOIN Users sc_user ON loi.sample_collected_by_user_id = sc_user.user_id
             LEFT JOIN Users rv_user ON loi.result_verified_by_user_id = rv_user.user_id
             WHERE loi.lab_order_id = ? ORDER BY loi.lab_order_item_id`
        ).bind(labOrderId).all<LabOrderItemQueryResult>();

        // 5. Format the final response
        const labOrder: LabOrder = {
            lab_order_id: orderResult.lab_order_id,
            consultation_id: orderResult.consultation_id!,
            patient_id: orderResult.patient_id,
            doctor_id: orderResult.doctor_id!, // Add non-null assertion
            order_datetime: orderResult.order_datetime,
            status: orderResult.status!,
            notes: orderResult.notes,
            created_at: orderResult.created_at,
            updated_at: orderResult.updated_at,
            // Include patient and doctor info if needed in detail view
            patient: {
                patient_id: orderResult.patient_id,
                first_name: orderResult.patient_first_name,
                last_name: orderResult.patient_last_name,
            },
            doctor: {
                doctor_id: orderResult.doctor_id,
                user: { fullName: orderResult.doctor_full_name }
            },
            items: itemsResult.results?.map((item: LabOrderItemQueryResult) => ({
                lab_order_item_id: item.lab_order_item_id,
                lab_order_id: item.lab_order_id,
                billable_item_id: item.billable_item_id,
                test_name: item.test_name,
                sample_type: item.sample_type,
                sample_id: item.sample_id,
                sample_collection_datetime: item.sample_collection_datetime,
                sample_collected_by_user_id: item.sample_collected_by_user_id,
                result_value: item.result_value,
                result_unit: item.result_unit,
                reference_range: item.reference_range,
                result_notes: item.result_notes,
                result_datetime: item.result_datetime,
                result_verified_by_user_id: item.result_verified_by_user_id,
                status: item.status as LabOrderItemStatus, // Cast string to enum
                created_at: item.created_at,
                updated_at: item.updated_at,
                billable_item: {
                    item_id: item.billable_item_id,
                    item_code: item.billable_item_code
                },
                sample_collected_by_user: item.sample_collected_by_user_id ? {
                    user_id: item.sample_collected_by_user_id,
                    full_name: item.sample_collected_by_user_full_name
                } : null,
                result_verified_by_user: item.result_verified_by_user_id ? {
                    user_id: item.result_verified_by_user_id,
                    full_name: item.result_verified_by_user_full_name
                } : null
            })) as LabOrderItem[] || [],
        };

        // 6. Return the detailed lab order
        return new Response(JSON.stringify(labOrder), { status: 200 });

    } catch (error) {
        console.error(`Get lab order ${labOrderId} details error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

// PUT handler for updating a lab order (e.g., overall status)
const UpdateLabOrderSchema = z.object({
    status: z.nativeEnum(LabOrderStatus).optional(),
    notes: z.string().optional().nullable(),
    // Other fields? Usually status is updated based on item statuses
});

export async function PUT(request: Request, { params }: { params: Promise<{ labOrderId: string }> }) {
    // Pass cookies() directly
    const cookieStore = await cookies();
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions);
    const { labOrderId: labOrderIdString } = await params;
    const labOrderId = parseInt(labOrderIdString, 10);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_UPDATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (isNaN(labOrderId)) {
        return new Response(JSON.stringify({ error: "Invalid Lab Order ID" }), { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = UpdateLabOrderSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), { status: 400 });
        }

        const updateData = validation.data;

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
             return new Response(JSON.stringify({ message: "No update data provided" }), { status: 200 });
        }

        // If we reach here, there is data to update
        const context = await getCloudflareContext<CloudflareEnv>();
        const { env } = context;
        const { DB } = env;

        // 2. Check if lab order exists
        const orderCheck = await DB.prepare("SELECT lab_order_id FROM LabOrders WHERE lab_order_id = ?")
                                   .bind(labOrderId)
                                   .first<{ lab_order_id: number }>();
        if (!orderCheck) {
            return new Response(JSON.stringify({ error: "Lab Order not found" }), { status: 404 });
        }

        // TODO: Add more granular authorization if needed (e.g., only LabTech can change status to Completed)

        // 3. Build update query
        let query = "UPDATE LabOrders SET updated_at = CURRENT_TIMESTAMP";
        const queryParams: (string | null | number)[] = [];

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) { // Allow null values to be set
                query += `, ${key} = ?`;
                queryParams.push(value);
            }
        });

        query += " WHERE lab_order_id = ?";
        queryParams.push(labOrderId);

        // 4. Execute update
        const updateResult = await DB.prepare(query).bind(...queryParams).run();

        if (!updateResult.success) {
            throw new Error("Failed to update lab order");
        }

        // 5. Return success response
        return new Response(JSON.stringify({ message: "Lab Order updated successfully" }), { status: 200 });

    } catch (error) {
        console.error(`Update lab order ${labOrderId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// DELETE handler - Lab orders are generally not deleted, maybe cancelled (status update).
// Implement if hard deletion is truly required, but use with caution.
// export async function DELETE(request: Request) { ... }
