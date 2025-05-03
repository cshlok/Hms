// app/api/prescriptions/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Prescription } from "@/types/opd";
import { z } from "zod";

// Define roles allowed to view/create prescriptions (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Doctor", "Nurse", "Pharmacist", "Patient"]; // Patient can view own
const ALLOWED_ROLES_CREATE = ["Doctor"];

// Define the expected shape of the list query result
interface ListPrescriptionsQueryResult {
    prescription_id: number;
    consultation_id: number | null;
    patient_id: number;
    doctor_id: number;
    prescription_date: string; // Assuming date is returned as string
    notes: string | null;
    created_at: string;
    patient_first_name: string;
    patient_last_name: string;
    doctor_full_name: string;
}

// GET handler for listing prescriptions with filters
const ListPrescriptionsQuerySchema = z.object({
    patientId: z.coerce.number().int().positive().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    consultationId: z.coerce.number().int().positive().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.coerce.number().int().positive().optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export async function GET(request: Request) {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = ListPrescriptionsQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid query parameters", details: validation.error.errors }), { status: 400 });
        }

        const filters = validation.data;
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Build Query
        let query = `
            SELECT
                pr.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u.full_name as doctor_full_name
            FROM Prescriptions pr
            JOIN Patients p ON pr.patient_id = p.patient_id
            JOIN Doctors d ON pr.doctor_id = d.doctor_id
            JOIN Users u ON d.user_id = u.user_id
            WHERE 1=1
        `;
        const queryParamsList: (string | number)[] = [];

        // Apply filters
        if (filters.patientId) {
            // Authorization check for Patients
            if (session.user.roleName === "Patient") {
                const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
                if (!patientProfile || filters.patientId !== patientProfile.patient_id) {
                    return new Response(JSON.stringify({ error: "Forbidden: You can only view your own prescriptions" }), { status: 403 });
                }
            }
            query += " AND pr.patient_id = ?";
            queryParamsList.push(filters.patientId);
        } else if (session.user.roleName === "Patient") {
             // If no patientId filter, patient sees only their own
             const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
             if (patientProfile) {
                 query += " AND pr.patient_id = ?";
                 queryParamsList.push(patientProfile.patient_id);
             } else {
                 return new Response(JSON.stringify([]), { status: 200 }); // Patient has no profile, return empty
             }
        }

        if (filters.doctorId) {
            // Authorization check for Doctors
            if (session.user.roleName === "Doctor") {
                const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
                if (!userDoctorProfile || filters.doctorId !== userDoctorProfile.doctor_id) {
                    return new Response(JSON.stringify({ error: "Forbidden: Doctors can only view their own prescriptions" }), { status: 403 });
                }
            }
            query += " AND pr.doctor_id = ?";
            queryParamsList.push(filters.doctorId);
        } else if (session.user.roleName === "Doctor") {
             // If no doctorId filter, doctor sees only their own
             const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
             if (userDoctorProfile) {
                 query += " AND pr.doctor_id = ?";
                 queryParamsList.push(userDoctorProfile.doctor_id);
             }
        }

        if (filters.consultationId) {
            query += " AND pr.consultation_id = ?";
            queryParamsList.push(filters.consultationId);
        }
        if (filters.dateFrom) {
            query += " AND DATE(pr.prescription_date) >= ?";
            queryParamsList.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += " AND DATE(pr.prescription_date) <= ?";
            queryParamsList.push(filters.dateTo);
        }

        query += " ORDER BY pr.prescription_date DESC LIMIT ? OFFSET ?";
        queryParamsList.push(filters.limit, filters.offset);

        // 3. Execute Query
        const results = await DB.prepare(query).bind(...queryParamsList).all<ListPrescriptionsQueryResult>(); // Use defined interface

        // 4. Format Response (basic details for list view)
        const prescriptions: Partial<Prescription>[] = results.results?.map(row => ({
            prescription_id: row.prescription_id,
            consultation_id: row.consultation_id,
            patient_id: row.patient_id,
            doctor_id: row.doctor_id,
            prescription_date: row.prescription_date,
            notes: row.notes,
            created_at: row.created_at,
            patient: {
                patient_id: row.patient_id,
                first_name: row.patient_first_name,
                last_name: row.patient_last_name,
            },
            doctor: {
                doctor_id: row.doctor_id,
                user: { fullName: row.doctor_full_name }
            }
        })) || [];

        return new Response(JSON.stringify(prescriptions), { status: 200 });

    } catch (error: unknown) { // Use unknown
        console.error("List prescriptions error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

// POST handler for creating a new prescription (shell only, items added separately)
const CreatePrescriptionSchema = z.object({
    consultation_id: z.number().int().positive(),
    prescription_date: z.string().datetime().optional(), // Defaults to now
    notes: z.string().optional().nullable(),
    // Items are added via POST /api/prescriptions/{id}/items
});

export async function POST(request: Request) {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_CREATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = CreatePrescriptionSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), { status: 400 });
        }

        const presData = validation.data;
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Get Doctor ID from session user
        const doctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
        if (!doctorProfile) {
            return new Response(JSON.stringify({ error: "Doctor profile not found for the current user" }), { status: 404 });
        }
        const doctorId = doctorProfile.doctor_id;

        // 3. Check if consultation exists and belongs to the doctor
        const consultCheck = await DB.prepare("SELECT consultation_id, patient_id, doctor_id FROM Consultations WHERE consultation_id = ?")
                                   .bind(presData.consultation_id)
                                   .first<{ consultation_id: number, patient_id: number, doctor_id: number }>();

        if (!consultCheck) {
            return new Response(JSON.stringify({ error: "Consultation not found" }), { status: 404 });
        }
        if (consultCheck.doctor_id !== doctorId) {
            return new Response(JSON.stringify({ error: "Forbidden: Cannot create prescription for another doctor's consultation" }), { status: 403 });
        }
        const patientId = consultCheck.patient_id;

        // 4. Insert the new prescription shell
        const insertResult = await DB.prepare(
            "INSERT INTO Prescriptions (consultation_id, patient_id, doctor_id, prescription_date, notes) VALUES (?, ?, ?, ?, ?)"
        ).bind(
            presData.consultation_id,
            patientId,
            doctorId,
            presData.prescription_date || null, // Let DB handle default
            presData.notes
        ).run();

        if (!insertResult.success) {
            throw new Error("Failed to create prescription");
        }

        const newPrescriptionId = insertResult.meta.last_row_id;

        // 5. Return the newly created prescription ID
        return new Response(JSON.stringify({ message: "Prescription created successfully", prescription_id: newPrescriptionId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: unknown) { // Use unknown
        console.error("Create prescription error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}


