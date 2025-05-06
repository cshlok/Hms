import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using mock DB
import { getSession } from "@/lib/session";

// Define interface for POST request body
interface MedicationAdminInput {
  medication_id: number | string;
  dosage: string;
  route: string;
  administered_time?: string; // Optional, defaults to now
  notes?: string | null;
}

// GET /api/ipd/admissions/[id]/medication-administration - Get all medication administration records for an admission
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
    const canViewMedAdmin =
      session.user.permissions?.includes("medication_administration:view") ??
      false;

    if (!isNurse && !isDoctor && !isAdmin && !canViewMedAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get medication administration records using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const medicationRecordsResult = await database.query(
      `
      SELECT ma.*, 
             m.generic_name as medication_name, -- Changed from pharmacy_inventory to medications
             m.brand_name as medication_brand_name, -- Added brand name
             u.first_name as administered_by_first_name, 
             u.last_name as administered_by_last_name
      FROM medication_administration ma
      JOIN medications m ON ma.medication_id = m.id -- Changed from pharmacy_inventory
      JOIN users u ON ma.administered_by = u.id
      WHERE ma.admission_id = ?
      ORDER BY ma.administered_time DESC
    `,
      [admissionId]
    );

    return NextResponse.json({
      admission,
      medication_administration: medicationRecordsResult.results || [], // Changed .rows to .results
    });
  } catch (error: unknown) {
    console.error("Error fetching medication administration records:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to fetch medication administration records",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/// POST /api/ipd/admissions/[id]/medication-administration - Create a new medication administration record
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
    const isDoctor = session.user.roleName === "Doctor";
    // Assuming permissions are correctly populated in the mock session
    const canCreateMedAdmin =
      session.user.permissions?.includes("medication_administration:create") ??
      false;

    if (!isNurse && !isDoctor && !canCreateMedAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: admissionId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    // Fixed: Apply type assertion
    const data = (await request.json()) as MedicationAdminInput;

    // Basic validation (using typed data)
    const requiredFields: (keyof MedicationAdminInput)[] = [
      "medication_id",
      "dosage",
      "route",
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
        {
          error:
            "Cannot record medication administration for a non-active admission",
        },
        { status: 409 }
      );
    }

    // Check if medication exists using db.query
    // Assuming db.query exists and returns { results: [...] } based on db.ts mock
    const medicationResult = await database.query(
      "SELECT id FROM medications WHERE id = ?",
      [data.medication_id]
    ); // Changed from pharmacy_inventory
    const medication =
      medicationResult.results && medicationResult.results.length > 0 // Changed .rows to .results
        ? medicationResult.results[0] // Changed .rows to .results
        : undefined;

    if (!medication) {
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      ); // Updated error message
    }

    // Insert new medication administration record using db.query
    // Mock query doesn't return last_row_id
    await database.query(
      `
      INSERT INTO medication_administration (
        admission_id, medication_id, administered_by, administered_time, dosage, route, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        admissionId,
        data.medication_id,
        session.user.userId, // Ensure userId exists on session.user
        data.administered_time || new Date().toISOString(),
        data.dosage,
        data.route,
        data.notes || undefined,
      ]
    );

    // Cannot reliably get the new record from mock DB
    return NextResponse.json(
      { message: "Medication administration recorded (mock operation)" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating medication administration record:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to create medication administration record",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

