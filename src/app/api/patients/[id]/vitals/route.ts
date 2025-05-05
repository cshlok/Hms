// app/api/patients/[id]/vitals/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { PatientVital } from "@/types/opd";
import { z } from "zod";
import { NextRequest } from "next/server"; // FIX: Import NextRequest

// Define roles allowed to view/record vitals (adjust as needed)
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Doctor", "Nurse", "Patient"]; // Patient can view own
const ALLOWED_ROLES_RECORD = ["Admin", "Doctor", "Nurse"];

// GET handler for listing vitals for a specific patient
const ListVitalsQuerySchema = z.object({
    opdVisitId: z.coerce.number().int().positive().optional(),
    admissionId: z.coerce.number().int().positive().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.coerce.number().int().positive().optional().default(20),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { // FIX: Use NextRequest and Promise type for params
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);
    const url = new URL(request.url);
    const { id: patientIdStr } = await params; // FIX: Await params and destructure id
    const patientId = parseInt(patientIdStr, 10);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (isNaN(patientId)) {
        return new Response(JSON.stringify({ error: "Invalid Patient ID" }), { status: 400 });
    }

    try {
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Authorization check for Patients (can only view their own vitals)
        if (session.user.roleName === "Patient") {
            const patientProfile = await DB.prepare("SELECT patient_id FROM Patients WHERE user_id = ? AND is_active = TRUE").bind(session.user.userId).first<{ patient_id: number }>();
            if (!patientProfile || patientProfile.patient_id !== patientId) {
                 return new Response(JSON.stringify({ error: "Forbidden: You can only view your own vitals" }), { status: 403 });
            }
        }

        // 3. Validate query parameters
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = ListVitalsQuerySchema.safeParse(queryParams);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid query parameters", details: validation.error.errors }), { status: 400 });
        }
        const filters = validation.data;

        // 4. Build Query
        let query = `
            SELECT pv.*, u.full_name as recorded_by_user_full_name
            FROM PatientVitals pv
            LEFT JOIN Users u ON pv.recorded_by_user_id = u.user_id
            WHERE pv.patient_id = ?
        `;
        const queryParamsList: (string | number)[] = [patientId];

        if (filters.opdVisitId) {
            query += " AND pv.opd_visit_id = ?";
            queryParamsList.push(filters.opdVisitId);
        }
        if (filters.admissionId) {
            query += " AND pv.admission_id = ?";
            queryParamsList.push(filters.admissionId);
        }
        if (filters.dateFrom) {
            query += " AND DATE(pv.recorded_at) >= ?";
            queryParamsList.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            query += " AND DATE(pv.recorded_at) <= ?";
            queryParamsList.push(filters.dateTo);
        }

        query += " ORDER BY pv.recorded_at DESC LIMIT ? OFFSET ?";
        queryParamsList.push(filters.limit, filters.offset);

        // 5. Execute Query
        const results = await DB.prepare(query).bind(...queryParamsList).all<unknown[]>();

        // 6. Format Response
        const vitals: PatientVital[] = results.results?.map((row: any) => ({
            vital_id: row.vital_id,
            patient_id: row.patient_id,
            opd_visit_id: row.opd_visit_id,
            admission_id: row.admission_id,
            recorded_at: row.recorded_at,
            height_cm: row.height_cm,
            weight_kg: row.weight_kg,
            bmi: row.bmi,
            temperature_celsius: row.temperature_celsius,
            systolic_bp: row.systolic_bp,
            diastolic_bp: row.diastolic_bp,
            heart_rate: row.heart_rate,
            respiratory_rate: row.respiratory_rate,
            oxygen_saturation: row.oxygen_saturation,
            pain_scale: row.pain_scale,
            notes: row.notes,
            recorded_by_user_id: row.recorded_by_user_id,
            recorded_by_user: {
                user_id: row.recorded_by_user_id,
                full_name: row.recorded_by_user_full_name
            }
        })) || [];

        return new Response(JSON.stringify(vitals), { status: 200 });

    } catch (error) {
        console.error(`List patient ${patientId} vitals error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

// POST handler for recording new vitals for a patient
const RecordVitalsSchema = z.object({
    opd_visit_id: z.number().int().positive().optional().nullable(),
    admission_id: z.number().int().positive().optional().nullable(),
    recorded_at: z.string().datetime().optional(), // Defaults to now
    height_cm: z.number().positive().optional().nullable(),
    weight_kg: z.number().positive().optional().nullable(),
    temperature_celsius: z.number().optional().nullable(),
    systolic_bp: z.number().int().positive().optional().nullable(),
    diastolic_bp: z.number().int().positive().optional().nullable(),
    heart_rate: z.number().int().positive().optional().nullable(),
    respiratory_rate: z.number().int().positive().optional().nullable(),
    oxygen_saturation: z.number().min(0).max(100).optional().nullable(),
    pain_scale: z.number().int().min(0).max(10).optional().nullable(),
    notes: z.string().optional().nullable(),
}).refine(data => data.height_cm || data.weight_kg || data.temperature_celsius || data.systolic_bp || data.diastolic_bp || data.heart_rate || data.respiratory_rate || data.oxygen_saturation || data.pain_scale,
    { message: "At least one vital measurement must be provided." });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { // FIX: Use NextRequest and Promise type for params
    const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);
    const { id: patientIdStr } = await params; // FIX: Await params and destructure id
    const patientId = parseInt(patientIdStr, 10);

    // 1. Check Authentication & Authorization
    if (!session.user || !ALLOWED_ROLES_RECORD.includes(session.user.roleName)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    if (isNaN(patientId)) {
        return new Response(JSON.stringify({ error: "Invalid Patient ID" }), { status: 400 });
    }

    try {
        const body = await request.json();
        const validation = RecordVitalsSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), { status: 400 });
        }

        const vitalsData = validation.data;
        const { env } = getCloudflareContext();
        const { DB } = env;

        // 2. Check if patient exists
        const patientCheck = await DB.prepare("SELECT patient_id FROM Patients WHERE patient_id = ? AND is_active = TRUE").bind(patientId).first();
        if (!patientCheck) {
            return new Response(JSON.stringify({ error: "Patient not found or inactive" }), { status: 404 });
        }
        // Optional: Check if opd_visit_id or admission_id exist and belong to the patient
        if (vitalsData.opd_visit_id) {
            const visitCheck = await DB.prepare("SELECT opd_visit_id FROM OPDVisits WHERE opd_visit_id = ? AND patient_id = ?").bind(vitalsData.opd_visit_id, patientId).first();
            if (!visitCheck) return new Response(JSON.stringify({ error: "OPD Visit not found or does not belong to this patient" }), { status: 404 });
        }
        // Add similar check for admission_id if needed

        // 3. Calculate BMI if height and weight are provided
        let bmi: number | null = null;
        if (vitalsData.height_cm && vitalsData.weight_kg) {
            const heightM = vitalsData.height_cm / 100;
            bmi = parseFloat((vitalsData.weight_kg / (heightM * heightM)).toFixed(2));
        }

        // 4. Insert the new vitals record
        const insertResult = await DB.prepare(
            `INSERT INTO PatientVitals (
                patient_id, opd_visit_id, admission_id, recorded_at, 
                height_cm, weight_kg, bmi, temperature_celsius, systolic_bp, diastolic_bp, 
                heart_rate, respiratory_rate, oxygen_saturation, pain_scale, notes, recorded_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            patientId,
            vitalsData.opd_visit_id,
            vitalsData.admission_id,
            vitalsData.recorded_at || null, // Let DB handle default
            vitalsData.height_cm,
            vitalsData.weight_kg,
            bmi,
            vitalsData.temperature_celsius,
            vitalsData.systolic_bp,
            vitalsData.diastolic_bp,
            vitalsData.heart_rate,
            vitalsData.respiratory_rate,
            vitalsData.oxygen_saturation,
            vitalsData.pain_scale,
            vitalsData.notes,
            session.user.userId
        ).run();

        if (!insertResult.success) {
            throw new Error("Failed to record patient vitals");
        }

        const newVitalId = insertResult.meta.last_row_id;

        // 5. Return the newly created vital ID
        return new Response(JSON.stringify({ message: "Vitals recorded successfully", vital_id: newVitalId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(`Record vitals for patient ${patientId} error:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

