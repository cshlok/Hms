import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { Patient } from "@/types/patient";
import type { D1ResultWithMeta, D1Database } from "@/types/cloudflare"; // Import D1Database

// Zod schema for patient update
const patientUpdateSchema = z.object({
    mrn: z.string().optional(),
    first_name: z.string().min(1, "First name is required").optional(),
    last_name: z.string().min(1, "Last name is required").optional(),
    date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date of birth format",
    }).optional(),
    gender: z.enum(["Male", "Female", "Other", "Unknown"]).optional(),
    contact_number: z.string().optional().nullable(),
    email: z.string().email("Invalid email address").optional().nullable(),
    address_line1: z.string().optional().nullable(),
    address_line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    emergency_contact_name: z.string().optional().nullable(),
    emergency_contact_relation: z.string().optional().nullable(),
    emergency_contact_number: z.string().optional().nullable(),
    blood_group: z.string().optional().nullable(),
    allergies: z.string().optional().nullable(),
    medical_history_summary: z.string().optional().nullable(),
    insurance_provider: z.string().optional().nullable(),
    insurance_policy_number: z.string().optional().nullable(),
}).partial();

// GET /api/patients/[id] - Fetch a specific patient by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session.isLoggedIn) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: patientId } = await params;
    if (!patientId) {
        return NextResponse.json(
            { message: "Patient ID is required" },
            { status: 400 }
        );
    }

    try {
        const query = `
            SELECT
                p.*,
                u_created.name as created_by_user_name,
                u_updated.name as updated_by_user_name
            FROM Patients p
            LEFT JOIN Users u_created ON p.created_by_user_id = u_created.id
            LEFT JOIN Users u_updated ON p.updated_by_user_id = u_updated.id
            WHERE p.patient_id = ?
        `;
        const patientResult = await (DB as D1Database).prepare(query).bind(patientId).first<Patient & { created_by_user_name?: string, updated_by_user_name?: string }>();

        if (!patientResult) {
            return NextResponse.json(
                { message: "Patient not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(patientResult);

    } catch (error: unknown) {
        console.error(`Error fetching patient ${patientId}:`, error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: "Error fetching patient details", details: errorMessage },
            { status: 500 }
        );
    }
}

// PUT /api/patients/[id] - Update an existing patient
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session.isLoggedIn) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!session.user) { // Ensure user exists if logged in
        return NextResponse.json({ message: "User not found in session" }, { status: 500 });
    }

    const { id: patientId } = await params;
    if (!patientId) {
        return NextResponse.json(
            { message: "Patient ID is required" },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();
        const validationResult = patientUpdateSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const updateData = validationResult.data;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { message: "No update fields provided" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const userId = session.user.userId; // session.user is now guaranteed to be defined

        const fieldsToUpdate: Record<string, string | number | boolean | Date | null | undefined> = { ...updateData };
        fieldsToUpdate.updated_at = now;
        fieldsToUpdate.updated_by_user_id = userId;

        const setClauses = Object.keys(fieldsToUpdate)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(fieldsToUpdate);

        const updateQuery = `UPDATE Patients SET ${setClauses} WHERE patient_id = ?`;
        values.push(patientId);

        const updateResult = await (DB as D1Database).prepare(updateQuery).bind(...values).run() as D1ResultWithMeta;

        if (!updateResult.success || (updateResult.meta && updateResult.meta.changes === 0)) {
             console.warn(`Update attempt for patient ${patientId} resulted in 0 changes or failed:`, updateResult);
             if (!updateResult.success) {
                throw new Error("Failed to update patient record");
             }
        }

        const fetchUpdatedQuery = `
            SELECT p.*, u_updated.name as updated_by_user_name
            FROM Patients p
            LEFT JOIN Users u_updated ON p.updated_by_user_id = u_updated.id
            WHERE p.patient_id = ?
        `;
        const updatedPatient = await (DB as D1Database).prepare(fetchUpdatedQuery).bind(patientId).first<Patient & { updated_by_user_name?: string }>();

        if (!updatedPatient) {
             console.error(`Failed to fetch updated patient data for ID ${patientId} after update.`);
             throw new Error("Failed to retrieve updated patient data");
        }

        return NextResponse.json(updatedPatient);

    } catch (error: unknown) {
        console.error(`Error updating patient ${patientId}:`, error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: "Error updating patient", details: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE /api/patients/[id] - Delete a patient (use with caution!)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user || session.user.roleName !== "Admin") { // Added !session.user check
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id: patientId } = await params;
    if (!patientId) {
        return NextResponse.json(
            { message: "Patient ID is required" },
            { status: 400 }
        );
    }

    try {
        const deleteQuery = "DELETE FROM Patients WHERE patient_id = ?";
        const deleteResult = await (DB as D1Database).prepare(deleteQuery).bind(patientId).run() as D1ResultWithMeta;

        if (!deleteResult.success || (deleteResult.meta && deleteResult.meta.changes === 0)) {
            console.warn(`Delete attempt for patient ${patientId} resulted in 0 changes or failed:`, deleteResult);
            if (deleteResult.meta?.changes === 0) {
                 return NextResponse.json({ message: "Patient not found or already deleted" }, { status: 404 });
            }
            if (!deleteResult.success) {
                throw new Error("Failed to delete patient record");
            }
        }

        return NextResponse.json(
            { message: "Patient deleted successfully" },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error(`Error deleting patient ${patientId}:`, error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: "Error deleting patient", details: errorMessage },
            { status: 500 }
        );
    }
}

