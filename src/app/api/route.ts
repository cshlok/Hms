import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database";
import { getSession, IronSessionData } from "@/lib/session"; // Import IronSessionData
import { IronSession } from "iron-session"; // Import IronSession
// import { checkUserRole } from "@/lib/auth";

// Define Database interface (can be moved to a shared types file)
interface PreparedStatement {
  // FIX: Replaced any[] with unknown[]
  bind(...parameters: unknown[]): {
    run(): Promise<{
      success: boolean;
      meta: { duration: number; changes?: number };
    }>;
    // FIX: Replaced any with unknown
    all<T = unknown>(): Promise<{
      results: T[];
      success: boolean;
      meta: { duration: number };
    }>;
    // FIX: Replaced any with unknown
    first<T = unknown>(colName?: string): Promise<T | null>;
  };
  run(): Promise<{
    success: boolean;
    meta: { duration: number; changes?: number };
  }>;
  // FIX: Replaced any with unknown
  all<T = unknown>(): Promise<{
    results: T[];
    success: boolean;
    meta: { duration: number };
  }>;
  // FIX: Replaced any with unknown
  first<T = unknown>(colName?: string): Promise<T | null>;
}

interface Database {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

// Define interfaces
interface RadiologyStudy {
  id: string;
  order_id: string;
  accession_number: string;
  study_datetime: string; // ISO date string
  modality_id?: string | null;
  technician_id?: string | null;
  protocol?: string | null;
  series_description?: string | null;
  number_of_images?: number | null;
  status:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "reported"
    | "verified"
    | "cancelled";
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  // Joined fields for GET
  patient_id?: string;
  patient_name?: string;
  procedure_name?: string;
  technician_name?: string | null;
  modality_name?: string | null;
}

interface RadiologyStudyPutData {
  accession_number?: string;
  study_datetime?: string; // ISO date string
  modality_id?: string | null;
  technician_id?: string | null;
  protocol?: string | null;
  series_description?: string | null;
  number_of_images?: number | null;
  status?:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "reported"
    | "verified"
    | "cancelled";
}

// GET a specific Radiology Study by ID
export async function GET(
  _request: NextRequest, // Renamed to _request as it's unused
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
): Promise<NextResponse> {
  try {
    const session: IronSession<IronSessionData> = await getSession(); // Call without request
    // Allow broader read access
    if (!session?.user) {
      // Basic check if any logged-in user can view
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Role check example (adjust roles as needed)
    // if (!checkUserRole(session.user, ["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"])) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { id: studyId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!studyId) {
      return NextResponse.json(
        { error: "Study ID is required" },
        { status: 400 }
      );
    }

    const database: Database = await getDB(); // Use defined Database interface

    const study = await database
      .prepare(
        `SELECT
         rs.*,
         ro.patient_id,
         p.first_name || ' ' || p.last_name as patient_name,
         pt.name as procedure_name,
         tech.first_name || ' ' || tech.last_name as technician_name,
         mod.name as modality_name
       FROM RadiologyStudies rs
       JOIN RadiologyOrders ro ON rs.order_id = ro.id
       JOIN Patients p ON ro.patient_id = p.id
       JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id
       LEFT JOIN Users tech ON rs.technician_id = tech.id
       LEFT JOIN RadiologyModalities mod ON rs.modality_id = mod.id
       WHERE rs.id = ?`
      )
      .bind(studyId)
      .first<RadiologyStudy>(); // Use generic type argument

    if (!study) {
      return NextResponse.json(
        { error: "Radiology study not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(study);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error fetching radiology study",
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to fetch radiology study", details: message },
      { status: 500 }
    );
  }
}

// PUT (update) a specific Radiology Study (Technician or Admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
): Promise<NextResponse> {
  try {
    const session: IronSession<IronSessionData> = await getSession(); // Call without request
    // Use roleName for check
    if (
      !session?.user ||
      (session.user.roleName !== "Admin" &&
        session.user.roleName !== "Technician")
    ) {
      return NextResponse.json(
        { error: "Unauthorized: Admin or Technician role required" },
        { status: 403 }
      );
    }

    const { id: studyId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!studyId) {
      return NextResponse.json(
        { error: "Study ID is required" },
        { status: 400 }
      );
    }

    const database: Database = await getDB(); // Use defined Database interface
    const data = (await request.json()) as RadiologyStudyPutData;
    const updatedAt = new Date().toISOString();

    // Validate input data (basic example)
    if (
      data.number_of_images !== undefined &&
      (typeof data.number_of_images !== "number" || data.number_of_images < 0)
    ) {
      return NextResponse.json(
        { error: "Invalid number of images" },
        { status: 400 }
      );
    }
    if (
      data.study_datetime !== undefined &&
      Number.isNaN(Date.parse(data.study_datetime))
    ) {
      return NextResponse.json(
        { error: "Invalid study date/time format" },
        { status: 400 }
      );
    }

    // Build the update query dynamically
    // FIX: Replaced any with a more specific type
    const fieldsToUpdate: Record<string, string | number | null | undefined> =
      {};
    if (data.accession_number !== undefined)
      fieldsToUpdate.accession_number = data.accession_number;
    if (data.study_datetime !== undefined)
      fieldsToUpdate.study_datetime = data.study_datetime;
    if (data.modality_id !== undefined)
      fieldsToUpdate.modality_id = data.modality_id;
    if (data.technician_id !== undefined)
      fieldsToUpdate.technician_id = data.technician_id;
    if (data.protocol !== undefined) fieldsToUpdate.protocol = data.protocol;
    if (data.series_description !== undefined)
      fieldsToUpdate.series_description = data.series_description;
    if (data.number_of_images !== undefined)
      fieldsToUpdate.number_of_images = data.number_of_images;
    if (data.status !== undefined) fieldsToUpdate.status = data.status;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    fieldsToUpdate.updated_at = updatedAt;

    const setClauses = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(fieldsToUpdate), studyId];

    const updateStmt = `UPDATE RadiologyStudies SET ${setClauses} WHERE id = ?`;

    try {
      const info = await database
        .prepare(updateStmt)
        .bind(...values)
        .run();

      // Use info.meta.changes
      if (!info.success || info.meta.changes === 0) {
        // Check if the study actually exists
        const existingStudy = await database
          .prepare("SELECT id FROM RadiologyStudies WHERE id = ?")
          .bind(studyId)
          .first();
        if (!existingStudy) {
          return NextResponse.json(
            { error: "Radiology study not found" },
            { status: 404 }
          );
        }
        // No changes were made, maybe the data was the same
        // Return the existing/updated study data
        const currentStudy = await database
          .prepare("SELECT * FROM RadiologyStudies WHERE id = ?")
          .bind(studyId)
          .first<RadiologyStudy>(); // Use generic type argument
        return NextResponse.json(
          currentStudy || {
            id: studyId,
            message: "Radiology study update processed (no changes detected)",
          }
        );
      }

      // If status is updated to \'completed\', \'reported\' or \'verified\', update the parent order status
      if (
        fieldsToUpdate.status &&
        ["completed", "reported", "verified"].includes(
          fieldsToUpdate.status as string
        )
      ) {
        // FIX: Added type assertion
        const orderIdResult = await database
          .prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?")
          .bind(studyId)
          .first<{ order_id: string }>(); // Use generic type argument
        // Add null check for orderIdResult
        if (orderIdResult?.order_id) {
          // Determine the appropriate order status (e.g., \'completed\' when study is done)
          const newOrderStatus = "completed"; // Or more complex logic based on study status
          await database
            .prepare(
              "UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?"
            )
            .bind(
              newOrderStatus,
              updatedAt,
              orderIdResult.order_id,
              newOrderStatus
            )
            .run();
        }
      }

      // Fetch the updated study to return
      const updatedStudy = await database
        .prepare("SELECT * FROM RadiologyStudies WHERE id = ?")
        .bind(studyId)
        .first<RadiologyStudy>(); // Use generic type argument
      return NextResponse.json(
        updatedStudy || {
          id: studyId,
          message: "Radiology study updated successfully",
        }
      );
    } catch (databaseError) {
      // Handle specific DB errors like UNIQUE constraint
      if (
        databaseError instanceof Error &&
        databaseError.message?.includes("UNIQUE constraint failed") &&
        databaseError.message?.includes("accession_number")
      ) {
        return NextResponse.json(
          { error: "Accession number already exists" },
          { status: 409 }
        ); // 409 Conflict
      }
      // Re-throw other DB errors to be caught by the outer catch block
      throw databaseError;
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error updating radiology study",
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to update radiology study", details: message },
      { status: 500 }
    );
  }
}

// DELETE a specific Radiology Study (Admin only - consider status update instead)
export async function DELETE(
  _request: NextRequest, // Renamed to _request as it's unused
  { params }: { params: Promise<{ id: string }> } // FIX: Use Promise type for params (Next.js 15+)
): Promise<NextResponse> {
  try {
    const session: IronSession<IronSessionData> = await getSession(); // Call without request
    // Use roleName for check
    if (!session?.user || session.user.roleName !== "Admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin role required" },
        { status: 403 }
      );
    }

    const { id: studyId } = await params; // FIX: Await params and destructure id (Next.js 15+)
    if (!studyId) {
      return NextResponse.json(
        { error: "Study ID is required" },
        { status: 400 }
      );
    }

    const database: Database = await getDB(); // Use defined Database interface

    // Check if reports are associated with this study before deleting
    const associatedReports = await database
      .prepare("SELECT id FROM RadiologyReports WHERE study_id = ? LIMIT 1")
      .bind(studyId)
      .first();
    if (associatedReports) {
      return NextResponse.json(
        {
          error:
            "Cannot delete study with associated reports. Consider cancelling the study or deleting reports first.",
        },
        { status: 400 }
      );
    }

    // Option 1: Soft delete (recommended)
    // const cancelledAt = new Date().toISOString();
    // const info = await db.prepare("UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ?")
    //                   .bind("cancelled", cancelledAt, studyId)
    //                   .run();

    // Option 2: Hard delete (use with caution)
    const info = await database
      .prepare("DELETE FROM RadiologyStudies WHERE id = ?")
      .bind(studyId)
      .run();

    // Use info.meta.changes
    if (!info.success || info.meta.changes === 0) {
      return NextResponse.json(
        { error: "Radiology study not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: studyId,
      status: "Radiology study deleted",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error deleting radiology study",
      error: message,
    });
    // Handle potential foreign key constraint errors if hard deleting
    return NextResponse.json(
      { error: "Failed to delete radiology study", details: message },
      { status: 500 }
    );
  }
}

