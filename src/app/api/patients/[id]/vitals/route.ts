import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { getSession } from "@/lib/session";
import { z } from "zod";
import type { D1ResultWithMeta, D1Database } from "@/types/cloudflare"; // Import D1Database

// Zod schema for creating patient vitals
const vitalCreateSchema = z.object({
    visit_id: z.number().optional().nullable(),
    record_datetime: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid record datetime format",
    }),
    temperature_celsius: z.number().optional().nullable(),
    heart_rate_bpm: z.number().int().positive().optional().nullable(),
    respiratory_rate_bpm: z.number().int().positive().optional().nullable(),
    systolic_bp_mmhg: z.number().int().positive().optional().nullable(),
    diastolic_bp_mmhg: z.number().int().positive().optional().nullable(),
    oxygen_saturation_percent: z.number().min(0).max(100).optional().nullable(),
    height_cm: z.number().positive().optional().nullable(),
    weight_kg: z.number().positive().optional().nullable(),
    bmi: z.number().positive().optional().nullable(),
    pain_scale_0_10: z.number().int().min(0).max(10).optional().nullable(),
    notes: z.string().optional().nullable(),
});

// GET /api/patients/[id]/vitals - Fetch vitals for a specific patient
export async function GET(
    request: NextRequest,
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
        const { searchParams } = new URL(request.url);
        const page = Number.parseInt(searchParams.get("page") || "1");
        const limit = Number.parseInt(searchParams.get("limit") || "10");
        const offset = (page - 1) * limit;
        const visitIdFilter = searchParams.get("visit_id");
        const dateFromFilter = searchParams.get("date_from");
        const dateToFilter = searchParams.get("date_to");
        const sortBy = searchParams.get("sort_by") || "record_datetime";
        const sortOrder = searchParams.get("sort_order") || "desc";

        const validSortColumns = ["record_datetime", "created_at"];
        const validSortOrders = ["asc", "desc"];
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : "record_datetime";
        const finalSortOrder = validSortOrders.includes(sortOrder) ? sortOrder.toUpperCase() : "DESC";

        const patientCheck = await (DB as D1Database).prepare(
            "SELECT patient_id FROM Patients WHERE patient_id = ?"
        ).bind(patientId).first<{ patient_id: number }>();

        if (!patientCheck) {
            return NextResponse.json(
                { message: "Patient not found" },
                { status: 404 }
            );
        }

        let query = `
            SELECT
                pv.*,
                u.name as recorded_by_user_name
            FROM PatientVitals pv
            JOIN Users u ON pv.recorded_by_user_id = u.id
            WHERE pv.patient_id = ?
        `;
        const queryParameters: (string | number)[] = [Number.parseInt(patientId)];
        let countQuery = `SELECT COUNT(*) as total FROM PatientVitals WHERE patient_id = ?`;
        const countParameters: (string | number)[] = [Number.parseInt(patientId)];

        if (visitIdFilter) {
            query += " AND pv.visit_id = ?";
            queryParameters.push(Number.parseInt(visitIdFilter));
            countQuery += " AND visit_id = ?";
            countParameters.push(Number.parseInt(visitIdFilter));
        }
        if (dateFromFilter) {
            query += " AND DATE(pv.record_datetime) >= ?";
            queryParameters.push(dateFromFilter);
            countQuery += " AND DATE(record_datetime) >= ?";
            countParameters.push(dateFromFilter);
        }
        if (dateToFilter) {
            query += " AND DATE(pv.record_datetime) <= ?";
            queryParameters.push(dateToFilter);
            countQuery += " AND DATE(record_datetime) <= ?";
            countParameters.push(dateToFilter);
        }

        query += ` ORDER BY pv.${finalSortBy} ${finalSortOrder} LIMIT ? OFFSET ?`;
        queryParameters.push(limit, offset);

        const [vitalsResult, countResult] = await Promise.all([
            (DB as D1Database).prepare(query).bind(...queryParameters).all<{ recorded_by_user_name?: string }>(),
            (DB as D1Database).prepare(countQuery).bind(...countParameters).first<{ total: number }>()
        ]);

        const results = vitalsResult.results || [];
        const total = countResult?.total || 0;

        return NextResponse.json({
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error: unknown) {
        console.error(`Error fetching vitals for patient ${patientId}:`, error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: "Error fetching patient vitals", details: errorMessage },
            { status: 500 }
        );
    }
}

// POST /api/patients/[id]/vitals - Record new vitals for a patient
export async function POST(
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
        const patientCheck = await (DB as D1Database).prepare(
            "SELECT patient_id FROM Patients WHERE patient_id = ?"
        ).bind(patientId).first<{ patient_id: number }>();

        if (!patientCheck) {
            return NextResponse.json(
                { message: "Patient not found" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validationResult = vitalCreateSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: validationResult.error.errors },
                { status: 400 }
            );
        }

        const vitalData = validationResult.data;
        const now = new Date().toISOString();
        const userId = session.user.userId; // session.user is now guaranteed to be defined

        let bmi: number | undefined | null = vitalData.bmi;
        if (vitalData.height_cm && vitalData.weight_kg && bmi === undefined) {
            const heightM = vitalData.height_cm / 100;
            bmi = parseFloat((vitalData.weight_kg / (heightM * heightM)).toFixed(2));
        }

        const insertStmt = (DB as D1Database).prepare(
            `INSERT INTO PatientVitals (
                patient_id, visit_id, record_datetime, temperature_celsius, heart_rate_bpm,
                respiratory_rate_bpm, systolic_bp_mmhg, diastolic_bp_mmhg, oxygen_saturation_percent,
                height_cm, weight_kg, bmi, pain_scale_0_10, notes, recorded_by_user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            patientId,
            vitalData.visit_id,
            vitalData.record_datetime,
            vitalData.temperature_celsius,
            vitalData.heart_rate_bpm,
            vitalData.respiratory_rate_bpm,
            vitalData.systolic_bp_mmhg,
            vitalData.diastolic_bp_mmhg,
            vitalData.oxygen_saturation_percent,
            vitalData.height_cm,
            vitalData.weight_kg,
            bmi,
            vitalData.pain_scale_0_10,
            vitalData.notes,
            userId,
            now
        );

        const insertResult = await insertStmt.run() as D1ResultWithMeta;

        if (!insertResult.success || !insertResult.meta || typeof insertResult.meta.last_row_id !== 'number') {
            console.error("Failed to record patient vitals or get last_row_id:", insertResult);
            throw new Error("Failed to record patient vitals");
        }

        const newVitalId = insertResult.meta.last_row_id;

        return new Response(JSON.stringify({ message: "Vitals recorded successfully", vital_id: newVitalId }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: unknown) {
        console.error(`Error recording vitals for patient ${patientId}:`, error);
        let errorMessage = "An unknown error occurred";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

