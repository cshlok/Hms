// app/api/patients/[id]/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions } from "@/lib/session";
import { IronSessionData } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
// import { User } from "@/types/user";
import { Patient } from "@/types/patient";

// Define roles allowed to view patient details
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Nurse", "Doctor"];
// Define roles allowed to update patient details
const ALLOWED_ROLES_UPDATE = ["Admin", "Receptionist", "Nurse"];
// Define roles allowed to deactivate patient
const ALLOWED_ROLES_DEACTIVATE = ["Admin", "Receptionist"];

// Helper function to get patient ID from URL
function getPatientId(pathname: string): number | null {
    const parts = pathname.split("/");
    const idStr = parts[parts.length - 1];
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
}

// GET handler for fetching a specific patient
export async function GET(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);
    const url = new URL(request.url);
    const patientId = getPatientId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (patientId === null) {
        return new Response(JSON.stringify({ error: "Invalid Patient ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { env } = await getCloudflareContext();
        const { DB } = env;

        // 2. Retrieve the specific patient
        const patientResult = await DB.prepare(
            "SELECT * FROM Patients WHERE patient_id = ? AND is_active = TRUE"
        ).bind(patientId).first<Patient>();

        if (!patientResult) {
            return new Response(JSON.stringify({ error: "Patient not found or inactive" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Return patient details
        return new Response(JSON.stringify(patientResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Get patient ${patientId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// PUT handler for updating a specific patient
const PatientUpdateSchema = z.object({
    // Include fields that can be updated
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),
    phone_number: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal("").optional()),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_relation: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    blood_group: z.string().optional(),
    allergies: z.string().optional(),
    past_medical_history: z.string().optional(),
    current_medications: z.string().optional(),
    insurance_provider: z.string().optional(),
    insurance_policy_number: z.string().optional(),
}).partial().refine(obj => Object.keys(obj).length > 0, { message: "At least one field must be provided for update" });

export async function PUT(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);
    const url = new URL(request.url);
    const patientId = getPatientId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_UPDATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (patientId === null) {
        return new Response(JSON.stringify({ error: "Invalid Patient ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const validation = PatientUpdateSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const updates = validation.data;

        // Construct SET clause dynamically
        const setClauses: string[] = [];
        const values: (string | number | null)[] = [];
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                setClauses.push(`${key} = ?`);
                values.push(value === "" ? null : value); // Handle empty string for optional email
            }
        });

        if (setClauses.length === 0) {
             return new Response(JSON.stringify({ error: "No fields provided for update" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Add updated_at timestamp
        setClauses.push("updated_at = CURRENT_TIMESTAMP");

        const { env } = await getCloudflareContext();
        const { DB } = env;

        // 2. Update the patient record
        const updateResult = await DB.prepare(
            `UPDATE Patients SET ${setClauses.join(", ")} WHERE patient_id = ?`
        ).bind(...values, patientId).run();

        if ((updateResult.meta as any).changes === 0) {
             return new Response(JSON.stringify({ error: "Patient not found or no changes made" }), {
                status: 404, // Or 304 Not Modified if no actual changes
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Return success response
        return new Response(JSON.stringify({ message: "Patient updated successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Update patient ${patientId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// DELETE handler for deactivating a patient (soft delete)
export async function DELETE(request: Request) {
    const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions);
    const url = new URL(request.url);
    const patientId = getPatientId(url.pathname);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_DEACTIVATE.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (patientId === null) {
        return new Response(JSON.stringify({ error: "Invalid Patient ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { env } = await getCloudflareContext();
        const { DB } = env;

        // 2. Deactivate the patient (set is_active to FALSE)
        const deleteResult = await DB.prepare(
            "UPDATE Patients SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE patient_id = ? AND is_active = TRUE"
        ).bind(patientId).run();

        if ((deleteResult.meta as any).changes === 0) {
             return new Response(JSON.stringify({ error: "Patient not found or already inactive" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Return success response
        return new Response(JSON.stringify({ message: "Patient deactivated successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Deactivate patient ${patientId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

