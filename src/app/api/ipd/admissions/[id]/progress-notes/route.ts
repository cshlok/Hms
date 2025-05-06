import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using mock DB
import { getSession } from "@/lib/session";

// Define interface for POST request body
interface ProgressNoteInput {
  note_date?: string; // Optional, defaults to now
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// GET /api/ipd/admissions/[id]/progress-notes - Get all progress notes for an admission
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    const session = await getSession(); // Removed request argument

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: admissionId } = await params; // FIX: Await params and destructure id (Next.js 15+)

    const database = await getDB(); // Fixed: Await the promise returned by getDB()

    // Check if admission exists using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
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
      admissionResult.results && admissionResult.results.length > 0 // Changed .rows to .results
        ? (admissionResult.results[0] as { id: string; primary_doctor_id: number }) // Changed .rows to .results
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
    const canViewAll =
      session.user.permissions?.includes("progress_notes:view_all") ?? false;
    const canViewOwn =
      session.user.permissions?.includes("progress_notes:view") ?? false;

    let forbidden = false;
    // Check if user is not the primary doctor and doesn-	 have view_all permission
    if (
      isDoctor &&
      admission.primary_doctor_id !== session.user.userId &&
      !canViewAll
    ) {
      forbidden = true;
    }
    // More restrictive check: Only allow if user is Doctor, Nurse, Admin, or has specific view permission
    if (!isDoctor && !isNurse && !isAdmin && !canViewOwn) {
      forbidden = true;
    }
    // Ensure primary doctor can always view their own patient-	s notes
    if (isDoctor && admission.primary_doctor_id === session.user.userId) {
      forbidden = false;
    }

    if (forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get progress notes using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const progressNotesResult = await database.query(
      `
      SELECT pn.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
      FROM progress_notes pn
      JOIN users u ON pn.doctor_id = u.id
      WHERE pn.admission_id = ?
      ORDER BY pn.note_date DESC
    `,
      [admissionId]
    );

    return NextResponse.json({
      admission,
      progress_notes: progressNotesResult.results || [], // Changed .rows to .results
    });
  } catch (error: unknown) {
    console.error("Error fetching progress notes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch progress notes", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ipd/admissions/[id]/progress-notes - Create a new progress note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
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
    const canCreate =
      session.user.permissions?.includes("progress_notes:create") ?? false;
    const canCreateAll =
      session.user.permissions?.includes("progress_notes:create_all") ?? false;

    if (!isDoctor && !canCreate) {
      // Must be doctor or have general create permission
      return NextResponse.json(
        {
          error:
            "Forbidden: Only doctors or users with create permission can add progress notes",
        },
        { status: 403 }
      );
    }

    const { id: admissionId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    // Fixed: Apply type assertion
    const data = (await request.json()) as ProgressNoteInput;

    // Basic validation (using typed data)
    const requiredFields: (keyof ProgressNoteInput)[] = [
      "subjective",
      "objective",
      "assessment",
      "plan",
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
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const admissionResult = await database.query(
      "SELECT id, status, primary_doctor_id FROM admissions WHERE id = ?",
      [admissionId]
    );
    const admission =
      admissionResult.results && admissionResult.results.length > 0 // Changed .rows to .results
        ? (admissionResult.results[0] as { // Changed .rows to .results
            id: string;
            status: string;
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
        { error: "Cannot add progress notes to a non-active admission" },
        { status: 409 }
      ); // Updated error message
    }

    // If user is a doctor, check if they are the primary doctor for this admission or have override permission
    // Ensure userId exists on session.user before comparison
    if (
      isDoctor &&
      admission.primary_doctor_id !== session.user.userId &&
      !canCreateAll
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to add progress notes for this patient",
        },
        { status: 403 }
      );
    }

    // Insert new progress note using db.query
    // Mock query doesn-	 return last_row_id
    await database.query(
      `
      INSERT INTO progress_notes (
        admission_id, doctor_id, note_date, subjective, objective, assessment, plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        admissionId,
        session.user.userId, // Ensure userId exists on session.user
        data.note_date || new Date().toISOString(),
        data.subjective,
        data.objective,
        data.assessment,
        data.plan,
      ]
    );

    // Cannot reliably get the new record from mock DB
    return NextResponse.json(
      { message: "Progress note created (mock operation)" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating progress note:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create progress note", details: errorMessage },
      { status: 500 }
    );
  }
}

