// app/api/opd-visits/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions } from "@/lib/session";
import { IronSessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { OPDVisit, OPDVisitStatus, OPDVisitType } from "@/types/opd";
import { z } from "zod";

// Define the expected shape of the database query result for the list
interface OPDVisitListQueryResult {
  opd_visit_id: number;
  patient_id: number;
  appointment_id: number | null;
  visit_datetime: string; // Assuming ISO string format
  visit_type: OPDVisitType; // Use the enum
  doctor_id: number;
  department: string | null;
  status: OPDVisitStatus; // Use the enum
  notes: string | null;
  created_by_user_id: number;
  created_at: string; // Assuming ISO string format
  updated_at: string; // Assuming ISO string format
  patient_first_name: string;
  patient_last_name: string;
  doctor_full_name: string;
}

// Define roles allowed to view/manage OPD visits (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Doctor", "Nurse"];
const ALLOWED_ROLES_CREATE = ["Admin", "Receptionist"];

// GET handler for listing OPD visits with filters
const ListVisitsQuerySchema = z.object({
    patientId: z.coerce.number().int().positive().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(OPDVisitStatus).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(), // Search patient name
    limit: z.coerce.number().int().positive().optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export async function GET(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = ListVisitsQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid query parameters", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const filters = validation.data;
        const { env } = await getCloudflareContext();
        const { DB } = env;

        // 2. Build Query
        let query = `
            SELECT 
                ov.*, 
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u.full_name as doctor_full_name
            FROM OPDVisits ov
            JOIN Patients p ON ov.patient_id = p.patient_id
            JOIN Doctors d ON ov.doctor_id = d.doctor_id
            JOIN Users u ON d.user_id = u.user_id
            WHERE 1=1
        `;
        const queryParamsList: (string | number)[] = [];

        if (filters.patientId) {
            query += " AND ov.patient_id = ?";
            queryParamsList.push(filters.patientId);
        }
        if (filters.doctorId) {
            query += " AND ov.doctor_id = ?";
            queryParamsList.push(filters.doctorId);
        }
        if (filters.status) {
            query += " AND ov.status = ?";
            queryParamsList.push(filters.status);
        }
        if (filters.dateFrom) {
            query += " AND DATE(ov.visit_datetime) >= ?";
            queryParamsList.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += " AND DATE(ov.visit_datetime) <= ?";
            queryParamsList.push(filters.dateTo);
        }
        if (filters.search) {
            query += " AND (p.first_name LIKE ? OR p.last_name LIKE ?)";
            const searchTerm = `%${filters.search}%`;
            queryParamsList.push(searchTerm, searchTerm);
        }

        query += " ORDER BY ov.visit_datetime DESC LIMIT ? OFFSET ?";
        queryParamsList.push(filters.limit, filters.offset);

        // 3. Execute Query
        const results = await DB.prepare(query).bind(...queryParamsList).all<OPDVisitListQueryResult>(); // Use the defined interface

        // 4. Format Response
        const visits: OPDVisit[] = results.results?.map(row => ({
            opd_visit_id: row.opd_visit_id,
            patient_id: row.patient_id,
            appointment_id: row.appointment_id,
            visit_datetime: row.visit_datetime,
            visit_type: row.visit_type, // Already typed correctly from interface
            doctor_id: row.doctor_id,
            department: row.department,
            status: row.status, // Already typed correctly from interface
            notes: row.notes,
            created_by_user_id: row.created_by_user_id,
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

        // Optionally, get total count for pagination
        // const countQuery = query.replace(/SELECT.*?FROM/, "SELECT COUNT(*) as count FROM").replace(/ORDER BY.*?LIMIT.*?OFFSET.*$/, "");
        // const countResult = await DB.prepare(countQuery).bind(...queryParamsList.slice(0, -2)).first<{ count: number }>();
        // const totalCount = countResult?.count ?? 0;

        return new Response(JSON.stringify(visits), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("List OPD visits error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// POST handler for creating a new OPD visit
const CreateVisitSchema = z.object({
    patient_id: z.number().int().positive(),
    appointment_id: z.number().int().positive().optional().nullable(),
    visit_datetime: z.string().datetime().optional(), // Defaults to now
    visit_type: z.nativeEnum(OPDVisitType).default(OPDVisitType.WalkIn), // Use enum value
    doctor_id: z.number().int().positive(),
    department: z.string().optional().nullable(),
    status: z.nativeEnum(OPDVisitStatus).optional().default(OPDVisitStatus.Waiting), // Use enum value
    notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_CREATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const validation = CreateVisitSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const visitData = validation.data;
        const { env } = await getCloudflareContext();
        const { DB } = env;

        // 2. Check if patient and doctor exist
        const checks = await DB.batch([
            DB.prepare("SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE").bind(visitData.patient_id),
            DB.prepare("SELECT d.doctor_id FROM Doctors d JOIN Users u ON d.user_id = u.user_id WHERE d.doctor_id = ? AND u.is_active = TRUE").bind(visitData.doctor_id),
            // Optional: Check if appointment exists and matches patient/doctor if provided            visitData.appointment_id ? DB.prepare(`SELECT appointment_id FROM Appointments WHERE appointment_id = ? AND patient_id = ? AND doctor_id = ? AND status NOT IN ('Completed', 'Cancelled', 'NoShow')`).bind(visitData.appointment_id, visitData.patient_id, visitData.doctor_id) : null
        ].filter(Boolean) as D1PreparedStatement[]);

        const [patientCheck, doctorCheck, appointmentCheck] = checks;

        if (!patientCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Patient not found or inactive" }), { status: 404 });
        }
        if (!doctorCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Doctor not found or inactive" }), { status: 404 });
        }
        if (visitData.appointment_id && !appointmentCheck?.results?.length) {
            return new Response(JSON.stringify({ error: "Appointment not found, invalid, or already completed/cancelled" }), { status: 404 });
        }

        // 3. Insert the new OPD visit
        const insertResult = await DB.prepare(
            "INSERT INTO OPDVisits (patient_id, appointment_id, visit_datetime, visit_type, doctor_id, department, status, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            visitData.patient_id,
            visitData.appointment_id,
            visitData.visit_datetime || null, // Let DB handle default
            visitData.visit_type,
            visitData.doctor_id,
            visitData.department,
            visitData.status,
            visitData.notes,
            session.user.userId
        ).run();

        if (!insertResult.success) {
            throw new Error("Failed to create OPD visit");
        }

        const newVisitId = (insertResult.meta as any).last_row_id; // Use type assertion

        // Optional: Update appointment status to CheckedIn if linked
        if (visitData.appointment_id) {
            await DB.prepare("UPDATE Appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?")
                  .bind("CheckedIn", visitData.appointment_id)
                  .run();
        }

        // 4. Return the newly created visit ID
        return new Response(JSON.stringify({ message: "OPD Visit created successfully", opd_visit_id: newVisitId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Create OPD visit error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

