// app/api/appointments/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare/context";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { z } from "zod";

// Define roles allowed to view/book appointments (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Doctor", "Patient"];
const ALLOWED_ROLES_BOOK = ["Admin", "Receptionist", "Patient"]; // Doctors usually don't book for patients

// GET handler for listing appointments
export async function GET(request: Request) {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);
    const { searchParams } = new URL(request.url);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { env } = getCloudflareContext();
        const { DB } = env;

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
            // Find patient_id associated with the logged-in user
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
        const appointmentsResult = await DB.prepare(query).bind(...queryParams).all<any>(); // Use any for now due to joined fields

        if (!appointmentsResult.results) {
            throw new Error("Failed to retrieve appointments");
        }

        // 4. Format results
        const formattedResults: Appointment[] = appointmentsResult.results.map(appt => ({
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
                    // Add other necessary user fields if needed
                    userId: 0, // Placeholder, ideally fetch user_id if needed
                    username: '', // Placeholder
                    email: '' // Placeholder
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
    appointment_datetime: z.string().datetime({ message: "Invalid ISO 8601 datetime string" }), // Expect ISO 8601 format
    duration_minutes: z.number().int().positive().optional().default(15),
    reason: z.string().optional(),
    status: z.nativeEnum(AppointmentStatus).optional().default("Scheduled"),
});

export async function POST(request: Request) {
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

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

        // If user is a Patient, ensure they are booking for themselves
        if (session.user.roleName === "Patient") {
             const { env } = getCloudflareContext();
             const { DB } = env;
             const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
             if (!patientProfile || patientProfile.patient_id !== apptData.patient_id) {
                 return new Response(JSON.stringify({ error: "Forbidden: Patients can only book appointments for themselves" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
             }
        }

        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. TODO: Check Doctor Availability (complex logic)
        // - Check against DoctorSchedules
        // - Check against existing Appointments for overlaps
        // This requires careful time comparison logic.
        // For now, we'll skip the complex availability check and assume the slot is valid.

        // 3. Insert new appointment
        const insertResult = await DB.prepare(
            "INSERT INTO Appointments (patient_id, doctor_id, appointment_datetime, duration_minutes, reason, status, booked_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
            apptData.patient_id,
            apptData.doctor_id,
            apptData.appointment_datetime,
            apptData.duration_minutes,
            apptData.reason || null,
            apptData.status,
            session.user.userId // Record who booked it
        )
        .run();

        if (!insertResult.success) {
            throw new Error("Failed to book appointment");
        }

        const newAppointmentId = insertResult.meta.last_row_id;

        // 4. Return success response
        return new Response(JSON.stringify({ message: "Appointment booked successfully", appointmentId: newAppointmentId }), {
            status: 201, // Created
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Book appointment error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        // Handle potential constraint errors if any
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

