import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using the mock DB from lib/db.ts
import { getSession } from "@/lib/session";

// Define interface for the POST request body
// interface DischargeInput {

// GET /api/ipd/admissions/[id]/discharge - Get discharge summary for an admission
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
      dischargeSummaryResult.results && dischargeSummaryResult.results.length > 0 // Changed .rows to .results
        ? dischargeSummaryResult.results[0] // Changed .rows to .results
        : undefined;

    return NextResponse.json({
      admission,
      discharge_summary: dischargeSummary || undefined,
    });
  } catch (error: unknown) {
    console.error("Error fetching discharge summary:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch discharge summary", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/ipd/admissions/[id]/discharge - Create discharge summary

