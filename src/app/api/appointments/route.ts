// app/api/appointments/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions, IronSessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { z } from "zod";

// Define roles allowed to view/book appointments (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Doctor", "Patient"];
const ALLOWED_ROLES_BOOK = ["Admin", "Receptionist", "Patient"]; // Doctors usually don't book for patients

// Define interface for the complex query result
interface AppointmentQueryResult {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  schedule_id: number | null;
  appointment_datetime: string; // ISO String
  duration_minutes: number;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  booked_by_user_id: number;
  created_at: string; // ISO String
  updated_at: string; // ISO String
  patient_first_name: string;
  patient_last_name: string;
  doctor_name: string;
  doctor_specialty: string;
}

// GET handler for listing appointments
export async function GET(request: Request) {
    const cookieStore = await cookies(); // REVERT FIX: Add await back based on TS error
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions); // Pass the awaited store
    const { searchParams } = new URL(request.url);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const context = await getCloudflareContext<CloudflareEnv>(); // FIX: Use CloudflareEnv directly as generic
        const DB = context.env.DB; // FIX: Access DB via context.env

        if (!DB) {
            throw new Error("Database binding not found in Cloudflare environment.");
        }

        // 2. Build query based on filters
        let query = `
            SELECT
                a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                u_doc.full_name as doctor_name, d.specialty as doctor_specialty
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            JOIN Users u_doc ON d.user_id = u_doc.user_id
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
            query += " AND a.patient_id = ?";
            queryParams.push(patientProfile.patient_id);
        } else if (patientId) {
            query += " AND a.patient_id = ?";
            queryParams.push(parseInt(patientId, 10));
        }

        // Filter by doctor_id (if user is Doctor, restrict to their own)
        const doctorId = searchParams.get("doctorId");
         if (session.user.roleName === "Doctor") {
            const doctorProfile = await DB.prepare("SELECT doctor_id FROM Doctors WHERE user_id = ?").bind(session.user.userId).first<{ doctor_id: number }>();
            if (!doctorProfile) {
                 return new Response(JSON.stringify({ error: "Doctor profile not found for this user" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                });
            }
            query += " AND a.doctor_id = ?";
            queryParams.push(doctorProfile.doctor_id);
        } else if (doctorId) {
            query += " AND a.doctor_id = ?";
            queryParams.push(parseInt(doctorId, 10));
        }

        // Filter by date range
        const startDate = searchParams.get("startDate"); // YYYY-MM-DD
        const endDate = searchParams.get("endDate");     // YYYY-MM-DD
        if (startDate) {
            query += " AND DATE(a.appointment_datetime) >= ?";
            queryParams.push(startDate);
        }
        if (endDate) {
            query += " AND DATE(a.appointment_datetime) <= ?";
            queryParams.push(endDate);
        }

        // Filter by status
        const status = searchParams.get("status");
        if (status) {
            query += " AND a.status = ?";
            queryParams.push(status);
        }

        query += " ORDER BY a.appointment_datetime ASC";

        // 3. Retrieve appointments
        const statement = DB.prepare(query).bind(...queryParams);
        const appointmentsResult = await statement.all<AppointmentQueryResult>();

        const appointments = appointmentsResult.results || [];

        // 4. Format results
        const formattedResults: Appointment[] = appointments.map((appt: AppointmentQueryResult) => ({
            appointment_id: appt.appointment_id,
            patient_id: appt.patient_id,
            doctor_id: appt.doctor_id,
            schedule_id: appt.schedule_id,
            appointment_datetime: appt.appointment_datetime,
            duration_minutes: appt.duration_minutes,
            reason: appt.reason,
            status: appt.status,
            notes: appt.notes,
            booked_by_user_id: appt.booked_by_user_id,
            created_at: appt.created_at,
            updated_at: appt.updated_at,
            patient: {
                patient_id: appt.patient_id,
                first_name: appt.patient_first_name,
                last_name: appt.patient_last_name,
            },
            doctor: {
                doctor_id: appt.doctor_id,
                specialty: appt.doctor_specialty,
                user: {
                    fullName: appt.doctor_name,
                    userId: 0, // Placeholder
                    username: "", // Placeholder
                    email: "" // Placeholder
                }
            }
        }));

        // 5. Return appointment list
        return new Response(JSON.stringify(formattedResults), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Get appointments error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// POST handler for booking a new appointment
const BookAppointmentSchema = z.object({
    patient_id: z.number().int().positive(),
    doctor_id: z.number().int().positive(),
    appointment_datetime: z.string().datetime({ message: "Invalid ISO 8601 datetime string" }),
    duration_minutes: z.number().int().positive().optional().default(15),
    reason: z.string().optional(),
    status: z.nativeEnum(AppointmentStatus).optional().default(AppointmentStatus.Scheduled),
});

export async function POST(request: Request) {
    const cookieStore = await cookies(); // REVERT FIX: Add await back based on TS error
    const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions); // Pass the awaited store

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_BOOK.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const validation = BookAppointmentSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const apptData = validation.data;
        // Get context and DB instance once
        const context = await getCloudflareContext<CloudflareEnv>(); // FIX: Use CloudflareEnv directly as generic
        const dbInstance = context.env.DB; // FIX: Access DB via context.env

        if (!dbInstance) {
            throw new Error("Database binding not found in Cloudflare environment.");
        }

        // If user is a Patient, ensure they are booking for themselves
        if (session.user.roleName === "Patient") {
             const patientProfile = await dbInstance.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
             if (!patientProfile || patientProfile.patient_id !== apptData.patient_id) {
                 return new Response(JSON.stringify({ error: "Forbidden: Patients can only book appointments for themselves" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
             }
        }

        // 2. TODO: Check Doctor Availability (complex logic)

        // 3. Insert new appointment
        const insertResult = await dbInstance.prepare(
            "INSERT INTO Appointments (patient_id, doctor_id, appointment_datetime, duration_minutes, reason, status, booked_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
            apptData.patient_id,
            apptData.doctor_id,
            apptData.appointment_datetime,
            apptData.duration_minutes,
            apptData.reason || null,
            apptData.status,
            session.user.userId
        )
        .run();

        if (!insertResult.success) {
            throw new Error(`Failed to book appointment: ${insertResult.error}`);
        }

        const meta = insertResult.meta as { last_row_id?: number | string };
        const newAppointmentId = meta.last_row_id;
        if (newAppointmentId === undefined || newAppointmentId === null) {
            console.warn("Could not retrieve last_row_id after insert in appointments.");
            throw new Error("Failed to retrieve appointment ID after creation.");
        }

        // 4. Return success response
        return new Response(JSON.stringify({ message: "Appointment booked successfully", appointmentId: newAppointmentId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Book appointment error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}