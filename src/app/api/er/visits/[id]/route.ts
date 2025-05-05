import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Define interface for ER Visit data
interface ERVisit {
  id: string;
  patient_id: string | number;
  arrival_timestamp: string; // ISO string
  chief_complaint: string;
  // FIX: Allow null for optional fields based on TS errors in related files
  assigned_physician_id?: string | number | null;
  assigned_nurse_id?: string | number | null;
  current_location?: string | null;
  current_status?: string | null;
  disposition?: string | null;
  discharge_timestamp?: string | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  // Add other relevant fields based on your schema
}

// Mock data store for ER visits (replace with actual DB interaction)
let mockVisits: ERVisit[] = [];

// Define interface for ER visit update data
interface ERVisitUpdateInput {
  assigned_physician_id?: string | number | null; // Allow null
  assigned_nurse_id?: string | number | null; // Allow null
  current_location?: string | null; // Allow null
  current_status?: string | null; // Allow null
  disposition?: string | null; // Allow null
  discharge_timestamp?: string | null; // Allow null
  updated_by_id?: string | number; // User ID performing the update
}

// Removed the duplicate GET handler for listing visits, as it belongs in /api/er/visits/route.ts

// POST /api/er/visits - Create a new ER visit (patient arrival)
// ... (Assuming POST handler exists in the correct file: /api/er/visits/route.ts)

// GET /api/er/visits/[id] - Get details of a specific ER visit
export async function GET(
  _request: NextRequest, // FIX: Prefixed as unused, changed Request to NextRequest
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const { id: visitId } = await params; // FIX: Await params and destructure id (Next.js 15+)

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_visits WHERE id = ?")
      .bind(visitId)
      .all<ERVisit>(); // Specify type if possible

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "ER visit not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(results[0]);
    */

    // Mock implementation
    const visit = mockVisits.find((v) => v.id === visitId);
    if (!visit) {
      return NextResponse.json(
        { error: "ER visit not found" },
        { status: 404 }
      );
    }
    // FIX: Return type matches ERVisit, no 'any' needed
    return NextResponse.json(visit);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({
      message: "Error fetching ER visit details",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Failed to fetch ER visit details", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/er/visits/[id] - Update a specific ER visit
export async function PUT(
  request: NextRequest, // Use NextRequest for json()
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const { id: visitId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    const body = await request.json();
    // Apply type assertion
    const updateData = body as ERVisitUpdateInput;

    // Prepare update fields and values
    const allowedFields = new Set<keyof ERVisitUpdateInput>([
      "assigned_physician_id",
      "assigned_nurse_id",
      "current_location",
      "current_status",
      "disposition",
      "discharge_timestamp",
    ]);

    // FIX: Use keyof ERVisitUpdateInput for better type safety
    const updateFields = (
      Object.keys(updateData) as (keyof ERVisitUpdateInput)[]
    ).filter(
      (field) => allowedFields.has(field) && updateData[field] !== undefined
    );

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Placeholder for database update
    /*
    const setClause = updateFields.map(field => `${field} = ?`).join(", ");
    const values = updateFields.map(field => updateData[field]); 
    
    await db
      .prepare(`UPDATE er_visits SET ${setClause}, updated_at = ? WHERE id = ?`)
      .bind(...values, new Date().toISOString(), visitId)
      .run();
    */

    // Mock implementation
    const visitIndex = mockVisits.findIndex((v) => v.id === visitId);
    if (visitIndex === -1) {
      return NextResponse.json(
        { error: "ER visit not found" },
        { status: 404 }
      );
    }

    // FIX: Update mock data with better type safety
    const updatedVisit: ERVisit = { ...mockVisits[visitIndex] };
    for (const field of updateFields) {
      // FIX: Ensure field exists on updatedVisit before assignment and cast field type
      if (field in updatedVisit) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updatedVisit as any)[field] = updateData[field]; // Use 'as any' to bypass strict index check after 'in' guard
      }
    }
    updatedVisit.updated_at = new Date().toISOString();
    mockVisits[visitIndex] = updatedVisit;

    // If status or location changed, log the change (mock)
    if (updateData.current_status || updateData.current_location) {
      // FIX: Define type for log entry
      interface StatusLogEntry {
        id: string;
        visit_id: string;
        status: string | null | undefined;
        location: string | null | undefined;
        updated_by_id: string | number | undefined;
        timestamp: string;
      }
      const logEntry: StatusLogEntry = {
        id: uuidv4(),
        visit_id: visitId,
        status: updateData.current_status,
        location: updateData.current_location,
        updated_by_id: updateData.updated_by_id, // Assuming updated_by_id is passed
        timestamp: new Date().toISOString(),
      };
      console.log("Mock Status Log:", logEntry);
    }

    // Return the updated visit
    return NextResponse.json(updatedVisit);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({ message: "Error updating ER visit", error: errorMessage });
    return NextResponse.json(
      { error: "Failed to update ER visit", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/er/visits/[id] - Delete a specific ER visit (rarely used in production)
export async function DELETE(
  _request: NextRequest, // FIX: Prefixed as unused, changed Request to NextRequest
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const { id: visitId } = await params; // FIX: Await params and destructure id (Next.js 15+)

    // Placeholder for database delete
    /*
    const { results } = await db
      .prepare("SELECT id FROM er_visits WHERE id = ?")
      .bind(visitId)
      .all();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "ER visit not found" },
        { status: 404 }
      );
    }

    // Delete related records first (foreign key constraints)
    await db
      .prepare("DELETE FROM er_critical_alerts WHERE visit_id = ?")
      .bind(visitId)
      .run();
      
    await db
      .prepare("DELETE FROM er_patient_status_logs WHERE visit_id = ?")
      .bind(visitId)
      .run();
      
    await db
      .prepare("DELETE FROM er_triage_assessments WHERE visit_id = ?")
      .bind(visitId)
      .run();
      
    // Finally delete the visit
    await db
      .prepare("DELETE FROM er_visits WHERE id = ?")
      .bind(visitId)
      .run();
    */

    // Mock implementation
    const initialLength = mockVisits.length;
    mockVisits = mockVisits.filter((v) => v.id !== visitId);
    if (mockVisits.length === initialLength) {
      return NextResponse.json(
        { error: "ER visit not found" },
        { status: 404 }
      );
    }

    console.log("Mock Delete ER Visit:", visitId);

    return NextResponse.json(
      { message: "ER visit deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error({ message: "Error deleting ER visit", error: errorMessage });
    return NextResponse.json(
      { error: "Failed to delete ER visit", details: errorMessage },
      { status: 500 }
    );
  }
}

