import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using mock DB
import { getSession } from "@/lib/session";

// Define interface for POST request body
interface NursingNoteInput {
  note_date?: string; // Optional, defaults to now
  vital_signs?: string | null; // Assuming string, could be JSON
  intake_output?: string | null; // Assuming string, could be JSON
  medication_given?: string | null; // Assuming string, could be JSON
  procedures?: string | null;
  notes: string; // Required
}

// GET /api/ipd/admissions/[id]/nursing-notes - Get all nursing notes for an admission
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
        ? admissionResult.results[0] // Changed .rows to .results
        : undefined;

    if (!admission) {
      return NextResponse.json(
        { error: "Admission not found" },
        { status: 404 }
      );
    }

    // Check permissions (using mock session data)
    const isNurse = session.user.roleName === "Nurse";
    const isDoctor = session.user.roleName === "Doctor";
    const isAdmin = session.user.roleName === "Admin";
    // Assuming permissions are correctly populated in the mock session
    const canViewNotes =
      session.user.permissions?.includes("nursing_notes:view") ?? false;

    if (!isNurse && !isDoctor && !isAdmin && !canViewNotes) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get nursing notes using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const nursingNotesResult = await database.query(
      `
      SELECT nn.*, u.first_name as nurse_first_name, u.last_name as nurse_last_name
      FROM nursing_notes nn
      JOIN users u ON nn.nurse_id = u.id
      WHERE nn.admission_id = ?
      ORDER BY nn.note_date DESC
    `,
      [admissionId]
    );

    return NextResponse.json({
      admission,
      nursing_notes: nursingNotesResult.results || [], // Changed .rows to .results
    });
  } catch (error: unknown) {
    console.error("Error fetching nursing notes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch nursing notes", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ipd/admissions/[id]/nursing-notes - Create a new nursing note
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
    const isNurse = session.user.roleName === "Nurse";
    // Assuming permissions are correctly populated in the mock session
    const canCreateNotes =
      session.user.permissions?.includes("nursing_notes:create") ?? false;

    if (!isNurse && !canCreateNotes) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: admissionId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    // Fixed: Apply type assertion
    const data = (await request.json()) as NursingNoteInput;

    // Basic validation (using typed data)
    if (!data.notes) {
      return NextResponse.json(
        { error: "Missing required field: notes" },
        { status: 400 }
      );
    }

    const database = await getDB(); // Fixed: Await the promise returned by getDB()

    // Check if admission exists and is active using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const admissionResult = await database.query(
      "SELECT id, status FROM admissions WHERE id = ?",
      [admissionId]
    );
    const admission =
      admissionResult.results && admissionResult.results.length > 0 // Changed .rows to .results
        ? (admissionResult.results[0] as { id: string; status: string }) // Changed .rows to .results
        : undefined;

    if (!admission) {
      return NextResponse.json(
        { error: "Admission not found" },
        { status: 404 }
      );
    }

    if (admission.status !== "active") {
      return NextResponse.json(
        { error: "Cannot add nursing notes to a non-active admission" },
        { status: 409 }
      ); // Updated error message
    }

    // Insert new nursing note using db.query
    // Mock query doesn-	 return last_row_id
    await database.query(
      `
      INSERT INTO nursing_notes (
        admission_id, nurse_id, note_date, vital_signs, intake_output, medication_given, procedures, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        admissionId,
        session.user.userId, // Ensure userId exists on session.user
        data.note_date || new Date().toISOString(),
        data.vital_signs || undefined,
        data.intake_output || undefined,
        data.medication_given || undefined,
        data.procedures || undefined,
        data.notes,
      ]
    );

    // Cannot reliably get the new record from mock DB
    return NextResponse.json(
      { message: "Nursing note created (mock operation)" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating nursing note:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create nursing note", details: errorMessage },
      { status: 500 }
    );
  }
}

