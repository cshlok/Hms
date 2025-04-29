import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
// import { getRequestContext } from "@cloudflare/next-on-pages"; // Cloudflare specific

// Mock data store for ER visits (replace with actual DB interaction)
let mockVisits: any[] = [];

// Define interface for ER visit update data
interface ERVisitUpdateInput {
  assigned_physician_id?: string | number;
  assigned_nurse_id?: string | number;
  current_location?: string; // e.g., "Waiting Room", "Triage", "Resuscitation Bay", "Observation"
  current_status?: string; // e.g., "Pending Triage", "Under Assessment", "Awaiting Admission", "Discharged", "Admitted"
  disposition?: string; // e.g., "Admitted", "Discharged Home", "Transferred", "Left Against Medical Advice"
  discharge_timestamp?: string; // ISO string
  updated_by_id?: string | number; // User ID performing the update
}

// Removed the duplicate GET handler for listing visits, as it belongs in /api/er/visits/route.ts

// POST /api/er/visits - Create a new ER visit (patient arrival)
// ... (Assuming POST handler exists in the correct file: /api/er/visits/route.ts)

// GET /api/er/visits/[id] - Get details of a specific ER visit
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;

    // Placeholder for database query
    /*
    const { results } = await db
      .prepare("SELECT * FROM er_visits WHERE id = ?")
      .bind(visitId)
      .all();

    if (results.length === 0) {
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
    return NextResponse.json(visit);
  } catch (e: any) {
    console.error({ message: "Error fetching ER visit details", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch ER visit details", details: e.message },
      { status: 500 }
    );
  }
}

// PUT /api/er/visits/[id] - Update a specific ER visit
export async function PUT(
  request: NextRequest, // Use NextRequest for json()
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;
    const body = await request.json();
    // Fixed: Apply type assertion
    const updateData = body as ERVisitUpdateInput;

    // Prepare update fields and values
    const allowedFields = [
      "assigned_physician_id",
      "assigned_nurse_id",
      "current_location",
      "current_status",
      "disposition",
      "discharge_timestamp",
    ];
    
    // Fixed: Object.keys works correctly now with typed updateData
    const updateFields = Object.keys(updateData).filter(field => 
      allowedFields.includes(field)
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
    // Need to cast updateData[field] to the correct type if using strict checks
    const values = updateFields.map(field => (updateData as any)[field]); 
    
    await db
      .prepare(`UPDATE er_visits SET ${setClause}, updated_at = ? WHERE id = ?`)
      .bind(...values, new Date().toISOString(), visitId)
      .run();
    */

    // Mock implementation
    const visitIndex = mockVisits.findIndex((v) => v.id === visitId);
    if (visitIndex === -1) {
      return NextResponse.json({ error: "ER visit not found" }, { status: 404 });
    }
    const updatedVisit = { ...mockVisits[visitIndex] };
    updateFields.forEach(field => {
      (updatedVisit as any)[field] = (updateData as any)[field];
    });
    updatedVisit.updated_at = new Date().toISOString();
    mockVisits[visitIndex] = updatedVisit;

    // If status or location changed, log the change (mock)
    if (updateData.current_status || updateData.current_location) {
      console.log("Mock Status Log:", {
        id: uuidv4(),
        visit_id: visitId,
        status: updateData.current_status || null,
        location: updateData.current_location || null,
        updated_by_id: updateData.updated_by_id, // Assuming updated_by_id is passed in request
        timestamp: new Date().toISOString()
      });
    }

    // Return the updated visit
    return NextResponse.json(updatedVisit);
  } catch (e: any) {
    console.error({ message: "Error updating ER visit", error: e.message });
    return NextResponse.json(
      { error: "Failed to update ER visit", details: e.message },
      { status: 500 }
    );
  }
}

// DELETE /api/er/visits/[id] - Delete a specific ER visit (rarely used in production)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const { env } = getRequestContext(); // Cloudflare specific
    // const db = env.DB; // Cloudflare specific
    const visitId = params.id;

    // Placeholder for database delete
    /*
    const { results } = await db
      .prepare("SELECT id FROM er_visits WHERE id = ?")
      .bind(visitId)
      .all();

    if (results.length === 0) {
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
    mockVisits = mockVisits.filter(v => v.id !== visitId);
    if (mockVisits.length === initialLength) {
       return NextResponse.json({ error: "ER visit not found" }, { status: 404 });
    }

    console.log("Mock Delete ER Visit:", visitId);

    return NextResponse.json(
      { message: "ER visit deleted successfully" },
      { status: 200 }
    );
  } catch (e: any) {
    console.error({ message: "Error deleting ER visit", error: e.message });
    return NextResponse.json(
      { error: "Failed to delete ER visit", details: e.message },
      { status: 500 }
    );
  }
}

