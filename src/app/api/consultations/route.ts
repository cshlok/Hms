// app/api/consultations/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare/context";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Consultation } from "@/types/opd";
import { z } from "zod";

// Define roles allowed to view/create consultations (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Doctor", "Nurse"]; // Nurse might view for context
const ALLOWED_ROLES_CREATE = ["Doctor"];

// GET handler for listing consultations with filters
const ListConsultationsQuerySchema = z.object({
    patientId: z.coerce.number().int().positive().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    opdVisitId: z.coerce.number().int().positive().optional(),
    admissionId: z.coerce.number().int().positive().optional(),
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
        const validation = ListConsultationsQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid query parameters", details: validation.error.errors }), { status: 400 });
        }

        const filters = validation.data;
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Build Query
        let query = `
            SELECT 
                c.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u.full_name as doctor_full_name
            FROM Consultations c
            JOIN Patients p ON c.patient_id = p.patient_id
            JOIN Doctors d ON c.doctor_id = d.doctor_id
            JOIN Users u ON d.user_id = u.user_id
            WHERE 1=1
        `;
        const queryParamsList: (string | number)[] = [];

        // Apply filters
        if (filters.patientId) {
            query += " AND c.patient_id = ?";
            queryParamsList.push(filters.patientId);
        }
        if (filters.doctorId) {
            // If user is a doctor, restrict to their own consultations unless admin/nurse
            if (session.user.roleName === "Doctor") {
                const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
                if (!userDoctorProfile || (filters.doctorId && filters.doctorId !== userDoctorProfile.doctor_id)) {
                    return new Response(JSON.stringify({ error: "Forbidden: Doctors can only view their own consultations" }), { status: 403 });
                }
                query += " AND c.doctor_id = ?";
                queryParamsList.push(userDoctorProfile.doctor_id);
            } else if (filters.doctorId) {
                 query += " AND c.doctor_id = ?";
                 queryParamsList.push(filters.doctorId);
            }
        } else if (session.user.roleName === "Doctor") {
             // If no doctorId filter is applied, doctor sees only their own
             const userDoctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
             if (userDoctorProfile) {
                 query += " AND c.doctor_id = ?";
                 queryParamsList.push(userDoctorProfile.doctor_id);
             }
        }

        if (filters.opdVisitId) {
            query += " AND c.opd_visit_id = ?";
            queryParamsList.push(filters.opdVisitId);
        }
        if (filters.admissionId) {
            query += " AND c.admission_id = ?";
            queryParamsList.push(filters.admissionId);
        }
        if (filters.dateFrom) {
            query += " AND DATE(c.consultation_datetime) >= ?";
            queryParamsList.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += " AND DATE(c.consultation_datetime) <= ?";
            queryParamsList.push(filters.dateTo);
        }

        query += " ORDER BY c.consultation_datetime DESC LIMIT ? OFFSET ?";
        queryParamsList.push(filters.limit, filters.offset);

        // 3. Execute Query
        const results = await DB.prepare(query).bind(...queryParamsList).all<any>();

        // 4. Format Response
        const consultations: Consultation[] = results.results?.map(row => ({
            consultation_id: row.consultation_id,
            patient_id: row.patient_id,
            doctor_id: row.doctor_id,
            opd_visit_id: row.opd_visit_id,
            admission_id: row.admission_id,
            consultation_datetime: row.consultation_datetime,
            chief_complaint: row.chief_complaint,
            diagnosis: row.diagnosis, // Only include key fields in list view
            created_at: row.created_at,
            updated_at: row.updated_at,
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

        return new Response(JSON.stringify(consultations), { status: 200 });

    } catch (error) {
        console.error("List consultations error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

// POST handler for creating a new consultation
const CreateConsultationSchema = z.object({
    patient_id: z.number().int().positive(),
    opd_visit_id: z.number().int().positive().optional().nullable(),
    admission_id: z.number().int().positive().optional().nullable(),
    consultation_datetime: z.string().datetime().optional(), // Defaults to now
    chief_complaint: z.string().optional().nullable(),
    history_of_present_illness: z.string().optional().nullable(),
    physical_examination: z.string().optional().nullable(),
    diagnosis: z.string().optional().nullable(),
    treatment_plan: z.string().optional().nullable(),
    follow_up_instructions: z.string().optional().nullable(),
    notes: z.string().optional().nullable(), // Doctor's private notes
}).refine(data => data.opd_visit_id || data.admission_id, {
    message: "Consultation must be linked to either an OPD Visit or an Admission.",
    path: ["opd_visit_id", "admission_id"], // Indicate related fields
});

export async function POST(request: Request) {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_CREATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = CreateConsultationSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), { status: 400 });
        }

        const consultData = validation.data;
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Get Doctor ID from session user
        const doctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
        if (!doctorProfile) {
            return new Response(JSON.stringify({ error: "Doctor profile not found for the current user" }), { status: 404 });
        }
        const doctorId = doctorProfile.doctor_id;

        // 3. Check if patient exists and if visit/admission exists and belongs to patient
        const checks: D1PreparedStatement[] = [
            DB.prepare("SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE").bind(consultData.patient_id)
        ];
        if (consultData.opd_visit_id) {
            checks.push(DB.prepare("SELECT opd_visit_id FROM OPDVisits WHERE opd_visit_id = ? AND patient_id = ?").bind(consultData.opd_visit_id, consultData.patient_id));
        }
        // Add check for admission_id if IPD module is implemented
        // if (consultData.admission_id) { ... }

        const results = await DB.batch(checks);
        const [patientCheck, visitCheck /*, admissionCheck */] = results;

        if (!patientCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Patient not found or inactive" }), { status: 404 });
        }
        if (consultData.opd_visit_id && !visitCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "OPD Visit not found or does not belong to this patient" }), { status: 404 });
        }
        // Add check for admission_id result

        // 4. Insert the new consultation
        const insertResult = await DB.prepare(
            `INSERT INTO Consultations (
                patient_id, doctor_id, opd_visit_id, admission_id, consultation_datetime, 
                chief_complaint, history_of_present_illness, physical_examination, 
                diagnosis, treatment_plan, follow_up_instructions, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            consultData.patient_id,
            doctorId, // Use doctorId from session
            consultData.opd_visit_id,
            consultData.admission_id,
            consultData.consultation_datetime || null, // Let DB handle default
            consultData.chief_complaint,
            consultData.history_of_present_illness,
            consultData.physical_examination,
            consultData.diagnosis,
            consultData.treatment_plan,
            consultData.follow_up_instructions,
            consultData.notes
        ).run();

        if (!insertResult.success) {
            throw new Error("Failed to create consultation");
        }

        const newConsultationId = insertResult.meta.last_row_id;

        // Optional: Update OPD Visit status to 'WithDoctor' or 'Completed' based on workflow
        if (consultData.opd_visit_id) {
            await DB.prepare("UPDATE OPDVisits SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE opd_visit_id = ? AND status = ?")
                  .bind("WithDoctor", consultData.opd_visit_id, "Waiting") // Example: Update only if status was 'Waiting'
                  .run();
        }

        // 5. Return the newly created consultation ID
        return new Response(JSON.stringify({ message: "Consultation created successfully", consultation_id: newConsultationId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Create consultation error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

