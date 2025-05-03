import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using the mock DB from lib/db.ts
import { getSession } from "@/lib/session";

// Define interface for the POST request body
interface DischargeInput {
  discharge_date?: string; // Optional, defaults to now
  discharge_diagnosis: string;
  treatment_summary: string;
  medications: string; // Assuming string, could be more complex
  follow_up?: string | null;
  home_care_instructions?: string | null;
}

// GET /api/ipd/admissions/[id]/discharge - Get discharge summary for an admission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(); // Removed request argument

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admissionId = params.id;

    const database = await getDB(); // Fixed: Await the promise returned by getDB()

    // Check if admission exists using db.query
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const admissionResult = await database.query(
      `
      SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `,
      [admissionId]
    );
    const admission =
      admissionResult.rows && admissionResult.rows.length > 0
        ? admissionResult.rows[0]
        : undefined;

    if (!admission) {
      return NextResponse.json(
        { error: "Admission not found" },
        { status: 404 }
      );
    }

    // Check permissions (using mock session data)
    const isDoctor = session.user.roleName === "Doctor";
    const isNurse = session.user.roleName === "Nurse";
    const isAdmin = session.user.roleName === "Admin";
    // Assuming permissions are correctly populated in the mock session
    const canViewDischarge =
      session.user.permissions?.includes("discharge_summary:view") ?? false;

    if (!isDoctor && !isNurse && !isAdmin && !canViewDischarge) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get discharge summary using db.query
    const dischargeSummaryResult = await database.query(
      `
      SELECT ds.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM discharge_summaries ds
      JOIN users u ON ds.doctor_id = u.id
      WHERE ds.admission_id = ?
    `,
      [admissionId]
    );
    const dischargeSummary =
      dischargeSummaryResult.rows && dischargeSummaryResult.rows.length > 0
        ? dischargeSummaryResult.rows[0]
        : undefined;

    return NextResponse.json({
      admission,
      discharge_summary: dischargeSummary || undefined,
    });
  } catch (error: any) {
    console.error("Error fetching discharge summary:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch discharge summary", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ipd/admissions/[id]/discharge - Create a discharge summary and discharge the patient
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(); // Removed request argument

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions (using mock session data)
    const isDoctor = session.user.roleName === "Doctor";
    // Assuming permissions are correctly populated in the mock session
    const canCreateDischarge =
      session.user.permissions?.includes("discharge_summary:create") ?? false;

    if (!isDoctor && !canCreateDischarge) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admissionId = params.id;
    // Fixed: Apply type assertion to request.json()
    const data = (await request.json()) as DischargeInput;

    // Basic validation (now using typed data)
    const requiredFields: (keyof DischargeInput)[] = [
      "discharge_diagnosis",
      "treatment_summary",
      "medications",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const database = await getDB(); // Fixed: Await the promise returned by getDB()

    // Check if admission exists and is active using db.query
    // Assuming db.query exists and returns { rows: [...] } based on db.ts mock
    const admissionResult = await database.query(
      `
      SELECT a.*, b.id as bed_id
      FROM admissions a
      LEFT JOIN beds b ON a.bed_id = b.id -- Use LEFT JOIN in case bed is unassigned
      WHERE a.id = ?
    `,
      [admissionId]
    );
    // Added type assertion for clarity
    const admission =
      admissionResult.rows && admissionResult.rows.length > 0
        ? (admissionResult.rows[0] as {
            id: string;
            status: string;
            bed_id: string | null;
            primary_doctor_id: number;
          })
        : undefined;

    if (!admission) {
      return NextResponse.json(
        { error: "Admission not found" },
        { status: 404 }
      );
    }

    if (admission.status !== "active") {
      return NextResponse.json(
        { error: "Patient is not currently admitted or already discharged" },
        { status: 409 }
      );
    }

    // Check authorization (using mock session data)
    // Assuming permissions are correctly populated in the mock session
    const canCreateAllDischarge =
      session.user.permissions?.includes("discharge_summary:create_all") ??
      false;
    // Ensure userId exists on session.user before comparison
    if (
      isDoctor &&
      admission.primary_doctor_id !== session.user.userId &&
      !canCreateAllDischarge
    ) {
      return NextResponse.json(
        { error: "You are not authorized to discharge this patient" },
        { status: 403 }
      );
    }

    // Mock DB doesn't support transactions or batch, execute queries sequentially
    // Use db.exec for transaction control if the real DB supports it
    // await db.exec('BEGIN TRANSACTION'); // Uncomment if using real DB with transactions
    try {
      const dischargeTimestamp =
        data.discharge_date || new Date().toISOString();

      // Update admission status using db.query
      await database.query(
        `
        UPDATE admissions 
        SET status = 'discharged', discharge_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [dischargeTimestamp, admissionId]
      );

      // Update bed status only if a bed was assigned
      if (admission.bed_id) {
        await database.query(
          `
            UPDATE beds
            SET status = 'available', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [admission.bed_id]
        );
      }

      // Insert discharge summary using db.query
      // Mock query doesn't return last_row_id, so we can't easily fetch the created summary
      await database.query(
        `
        INSERT INTO discharge_summaries (
          admission_id, discharge_date, discharge_diagnosis, treatment_summary, 
          medications, follow_up, home_care_instructions, doctor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          admissionId,
          dischargeTimestamp,
          data.discharge_diagnosis,
          data.treatment_summary,
          data.medications,
          data.follow_up || undefined,
          data.home_care_instructions || undefined,
          session.user.userId, // Ensure userId exists on session.user
        ]
      );

      // await db.exec('COMMIT'); // Uncomment if using real DB with transactions

      // Since we can't get the ID from the mock DB, return a success message without the summary object
      return NextResponse.json(
        {
          message: "Patient successfully discharged (mock operation)",
          discharge_summary: undefined, // Cannot retrieve from mock DB
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("Error during discharge database operations:", error);
      // await db.exec('ROLLBACK'); // Uncomment if using real DB with transactions
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: "Failed to discharge patient due to database error",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating discharge summary:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create discharge summary", details: errorMessage },
      { status: 500 }
    );
  }
}
