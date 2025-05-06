import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSession, IronSessionData } from "@/lib/session"; // Import IronSessionData
import { IronSession } from "iron-session"; // Import IronSession
// import { checkUserRole } from "@/lib/auth"; // Assuming checkUserRole might not be fully implemented or needed based on roleName
import { getDB } from "@/lib/database"; // Import getDB

// Interface for POST request body
interface RadiologyReportPostData {
  study_id: string;
  radiologist_id: string;
  findings?: string | null;
  impression: string;
  recommendations?: string | null;
  status?: "preliminary" | "final" | "addendum";
}

// Interface for GET response items (adjust based on actual query results)
interface RadiologyReportListItem {
  id: string;
  study_id: string;
  report_datetime: string;
  status: string;
  accession_number?: string;
  radiologist_name?: string;
  patient_id?: string;
  patient_name?: string;
  procedure_name?: string;
  // Add other fields from the SELECT query
}

// GET all Radiology Reports (filtered by study_id, patient_id, radiologist_id, status)
export async function GET(request: NextRequest) {
  try {
    // Use IronSession<IronSessionData>
    const session: IronSession<IronSessionData> = await getSession();
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Role check example (adjust roles as needed)
    // if (!["Admin", "Doctor", "Receptionist", "Technician", "Radiologist"].includes(session.user.roleName)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get("studyId");
    const patientId = searchParams.get("patientId"); // Requires joins
    const radiologistId = searchParams.get("radiologistId");
    const status = searchParams.get("status");

    const database = await getDB();

    // Select rr.*, rs.accession_number, rad.name as radiologist_name, ro.patient_id, p.name as patient_name, pt.name as procedure_name
    // Ensure aliases match the RadiologyReportListItem interface if possible
    let query = `SELECT
                   rr.id, rr.study_id, rr.report_datetime, rr.status,
                   rs.accession_number,
                   rad.first_name || ' ' || rad.last_name as radiologist_name,
                   ro.patient_id,
                   p.first_name || ' ' || p.last_name as patient_name,
                   pt.name as procedure_name
                 FROM RadiologyReports rr
                 JOIN RadiologyStudies rs ON rr.study_id = rs.id
                 JOIN Users rad ON rr.radiologist_id = rad.id
                 JOIN RadiologyOrders ro ON rs.order_id = ro.id
                 JOIN Patients p ON ro.patient_id = p.id
                 JOIN RadiologyProcedureTypes pt ON ro.procedure_type_id = pt.id`;
    const parameters: string[] = [];
    const conditions: string[] = [];

    if (studyId) {
      conditions.push("rr.study_id = ?");
      parameters.push(studyId);
    }
    if (patientId) {
      conditions.push("ro.patient_id = ?");
      parameters.push(patientId);
    }
    if (radiologistId) {
      conditions.push("rr.radiologist_id = ?");
      parameters.push(radiologistId);
    }
    if (status) {
      conditions.push("rr.status = ?");
      parameters.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY rr.report_datetime DESC";

    // Use direct type argument for .all() if supported, or assert structure
    // Assuming .all<T>() returns { results: T[] }
    const result = await database
      .prepare(query)
      .bind(...parameters)
      .all<RadiologyReportListItem>();
    return NextResponse.json(result.results || []);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error fetching radiology reports",
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to fetch radiology reports", details: message },
      { status: 500 }
    );
  }
}

// POST a new Radiology Report (Radiologist or Admin)
export async function POST(request: NextRequest) {
  try {
    // Use IronSession<IronSessionData>
    const session: IronSession<IronSessionData> = await getSession();
    // Check session and user existence first
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Use the user directly from session
    const currentUser = session.user;
    // Use roleName for check
    if (
      currentUser.roleName !== "Admin" &&
      currentUser.roleName !== "Radiologist"
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Radiologist role required" },
        { status: 403 }
      );
    }

    const database = await getDB();
    // Use type assertion for request body
    const {
      study_id,
      radiologist_id,
      findings,
      impression,
      recommendations,
      status,
    } = (await request.json()) as RadiologyReportPostData;

    if (!study_id || !radiologist_id || !impression) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (study_id, radiologist_id, impression)",
        },
        { status: 400 }
      );
    }

    // Check if study exists
    // Use direct type argument for .first() and check result directly
    const studyResult = await database
      .prepare("SELECT id FROM RadiologyStudies WHERE id = ?")
      .bind(study_id)
      .first<{ id: string }>();
    if (!studyResult) {
      return NextResponse.json(
        { error: "Associated radiology study not found" },
        { status: 404 }
      );
    }

    // Check if a report already exists for this study (optional, depends on workflow - allow addendums?)
    // const existingReport = await db.prepare("SELECT id FROM RadiologyReports WHERE study_id = ? AND status != \'addendum\'").bind(study_id).first();
    // if (existingReport) {
    //     return NextResponse.json({ error: "A report already exists for this study. Create an addendum instead?" }, { status: 409 });
    // }

    const id = nanoid();
    const now = new Date().toISOString();
    const reportStatus = status || "preliminary"; // Default to preliminary

    await database
      .prepare(
        "INSERT INTO RadiologyReports (id, study_id, radiologist_id, report_datetime, findings, impression, recommendations, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        study_id,
        radiologist_id,
        now, // report_datetime
        findings ?? undefined, // Use nullish coalescing
        impression,
        recommendations ?? undefined, // Use nullish coalescing
        reportStatus,
        now, // created_at
        now // updated_at
      )
      .run();

    // Update the associated study status to \'reported\'
    await database
      .prepare(
        "UPDATE RadiologyStudies SET status = ?, updated_at = ? WHERE id = ? AND status != ?"
      )
      .bind("reported", now, study_id, "reported") // Avoid unnecessary updates
      .run();

    // Potentially update the order status to \'completed\'
    // Use direct type argument for .first() and check result directly
    const orderIdResult = await database
      .prepare("SELECT order_id FROM RadiologyStudies WHERE id = ?")
      .bind(study_id)
      .first<{ order_id: string }>();
    if (orderIdResult?.order_id) {
      await database
        .prepare(
          "UPDATE RadiologyOrders SET status = ?, updated_at = ? WHERE id = ? AND status != ?"
        )
        .bind("completed", now, orderIdResult.order_id, "completed") // Avoid unnecessary updates
        .run();
    }

    // Fetch the created report to return it
    // Use direct type argument for .first()
    const createdReport = await database
      .prepare("SELECT * FROM RadiologyReports WHERE id = ?")
      .bind(id)
      .first<RadiologyReportListItem>(); // Use existing interface

    return NextResponse.json(
      createdReport || { id, message: "Radiology report created" },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({
      message: "Error creating radiology report",
      error: message,
    });
    // Provide more specific error details if possible
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        {
          error:
            "Failed to create radiology report: A report for this study might already exist.",
          details: message,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create radiology report", details: message },
      { status: 500 }
    );
  }
}

