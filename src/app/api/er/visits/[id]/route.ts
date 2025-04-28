// src/app/api/er/visits/[id]/route.ts
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// GET /api/er/visits/[id] - Get a specific ER visit by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
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

    const visit = results[0];
    */

    // Mock data for development
    const visit = {
      id: visitId,
      patient_id: "patient_123",
      arrival_timestamp: new Date().toISOString(),
      arrival_mode: "Ambulance",
      chief_complaint: "Chest pain",
      current_location: "Room 3",
      current_status: "Treatment",
    };

    return NextResponse.json(visit);
  } catch (e: any) {
    console.error({ message: "Error fetching ER visit", error: e.message });
    return NextResponse.json(
      { error: "Failed to fetch ER visit", details: e.message },
      { status: 500 }
    );
  }
}

// PUT /api/er/visits/[id] - Update a specific ER visit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const visitId = params.id;
    const updateData = await request.json();

    // Validate the visit exists
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
    */

    // Prepare update fields and values
    const allowedFields = [
      "assigned_physician_id",
      "assigned_nurse_id",
      "current_location",
      "current_status",
      "disposition",
      "discharge_timestamp",
    ];
    
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
    const values = updateFields.map(field => updateData[field]);
    
    await db
      .prepare(`UPDATE er_visits SET ${setClause}, updated_at = ? WHERE id = ?`)
      .bind(...values, new Date().toISOString(), visitId)
      .run();
    */

    // If status or location changed, log the change
    if (updateData.current_status || updateData.current_location) {
      /*
      await db
        .prepare(
          "INSERT INTO er_patient_status_logs (id, visit_id, status, location, updated_by_id) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(
          uuidv4(),
          visitId,
          updateData.current_status || null,
          updateData.current_location || null,
          updateData.updated_by_id
        )
        .run();
      */
    }

    // Return the updated visit
    return NextResponse.json({
      id: visitId,
      ...updateData,
      updated_at: new Date().toISOString(),
    });
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
    const { env } = getRequestContext();
    const db = env.DB;
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
