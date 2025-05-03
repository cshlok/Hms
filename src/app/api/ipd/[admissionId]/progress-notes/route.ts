import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth"; // Changed from getSession
import { ProgressNoteSchema } from "@/lib/schemas/ipdSchemas";

// Define interface for the result of the admission check query
interface AdmissionCheck {
  admission_id: number | string;
  status: string;
}

// Define interface for the POST request body (before validation)
interface ProgressNoteInput {
  note_date?: string;
  note_time?: string;
  note_type?: string;
  note_content?: string;
  vital_signs?: Record<string, unknown>;
  medication_given?: Record<string, unknown>;
  // admission_id will be added later
}

// GET handler for fetching progress notes
export async function GET(
  request: NextRequest,
  { params }: { params: { admissionId: string } }
) {
  try {
    const user = await getCurrentUser(); // Changed from getSession

    // Check if user is authenticated
    if (!user) {
      // Changed from !session || !session.user
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has appropriate role (e.g., Doctor, Nurse, Admin)
    const allowedRoles = new Set(["Doctor", "Nurse", "Consultant", "Admin"]); // Add roles as needed
    // Changed from !allowedRoles.includes(session.user.roleName)
    if (!user.roles.some((role) => allowedRoles.has(role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const admissionId = params.admissionId;
    const DB = process.env.DB as unknown as D1Database;
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        pn.progress_note_id,
        pn.note_date,
        pn.note_time,
        pn.note_type,
        pn.note_content,
        pn.vital_signs,
        pn.medication_given,
        pn.created_at,
        u.name as created_by_name,
        u.roleName as created_by_role -- Assuming Users table has roleName
      FROM IPDProgressNotes pn
      JOIN Users u ON pn.created_by = u.userId -- Assuming Users table and userId
      WHERE pn.admission_id = ?
    `;
    const queryParameters: (string | number)[] = [admissionId];

    // Add filters based on searchParams if needed
    // Example:
    // const noteType = searchParams.get("note_type");
    // if (noteType) {
    //   query += " AND pn.note_type = ?";
    //   queryParams.push(noteType);
    // }

    query += `
      ORDER BY 
        pn.note_date DESC, pn.note_time DESC
      LIMIT ? OFFSET ?
    `;

    queryParameters.push(limit, offset);

    // Fixed: Use DB.prepare().bind().all() for SELECT
    const preparedStatement = DB.prepare(query).bind(...queryParameters);
    const progressNotesResult = await preparedStatement.all();

    // D1 .all() returns { results: T[] }
    const progressNotes = progressNotesResult.results || [];

    // Optionally, fetch total count for pagination
    // const countResult = await DB.prepare("SELECT COUNT(*) as count FROM IPDProgressNotes WHERE admission_id = ?").bind(admissionId).first();
    // const totalCount = countResult ? (countResult.count as number) : 0;

    return new Response(
      JSON.stringify({
        notes: progressNotes,
        // pagination: { page, limit, totalCount } // Include if count is fetched
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching IPD progress notes:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch IPD progress notes",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
      }
    );
  }
}

// POST handler for creating a new progress note
export async function POST(
  request: NextRequest,
  { params }: { params: { admissionId: string } }
) {
  try {
    const user = await getCurrentUser(); // Changed from getSession

    // Check if user is authenticated
    if (!user) {
      // Changed from !session || !session.user
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user has appropriate role
    const allowedRoles = new Set(["Doctor", "Nurse", "Consultant"]);
    // Changed from !allowedRoles.includes(session.user.roleName)
    if (!user.roles.some((role) => allowedRoles.has(role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const admissionId = params.admissionId;
    const DB = process.env.DB as unknown as D1Database;

    // Verify admission exists and is active
    const admissionCheckStmt = DB.prepare(
      `
      SELECT admission_id, status 
      FROM IPDAdmissions
      WHERE admission_id = ?
    `
    ).bind(admissionId);
    const admissionCheckResult = await admissionCheckStmt.all();

    // Fixed: Use double assertion for type conversion
    const admissionCheck: AdmissionCheck | null =
      admissionCheckResult.results && admissionCheckResult.results.length > 0
        ? (admissionCheckResult.results[0] as unknown as AdmissionCheck)
        : undefined;

    if (!admissionCheck) {
      return new Response(
        JSON.stringify({
          error: "Admission not found",
        }),
        {
          status: 404,
        }
      );
    }

    if (admissionCheck.status !== "Active") {
      return new Response(
        JSON.stringify({
          error: "Cannot add progress notes to a non-active admission",
        }),
        {
          status: 400,
        }
      );
    }

    // If user is a doctor, verify they are assigned to this patient
    if (user.roles.includes("Doctor")) {
      const doctorCheckStmt = DB.prepare(
        `
        SELECT admission_id 
        FROM IPDAdmissions
        WHERE admission_id = ? AND doctor_id = ?
      `
      ).bind(admissionId, user.id); // Changed from session.user.userId
      const doctorCheckResult = await doctorCheckStmt.all();
      // Assuming the result row has admission_id, we can cast more safely if needed
      const doctorCheck =
        doctorCheckResult.results && doctorCheckResult.results.length > 0
          ? doctorCheckResult.results[0]
          : undefined;

      if (!doctorCheck) {
        return new Response(
          JSON.stringify({
            error: "You are not authorized to add notes for this patient",
          }),
          {
            status: 403,
          }
        );
      }
    }

    // Fixed: Apply type assertion to the result of request.json()
    const data = (await request.json()) as ProgressNoteInput;

    // Add admission_id from path parameter and create a new object with the correct type
    const dataWithId = {
      ...data,
      admission_id: Number.parseInt(admissionId),
    };

    // Validate input data (now includes admission_id)
    const validationResult = ProgressNoteSchema.safeParse(dataWithId);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input data",
          details: validationResult.error.format(),
        }),
        {
          status: 400,
        }
      );
    }

    const noteData = validationResult.data;

    // Set note_type based on user role if not specified
    if (!noteData.note_type) {
      noteData.note_type = user.roles.includes("Doctor")
        ? "Doctor"
        : user.roles.includes("Nurse")
          ? "Nurse"
          : "Consultant";
    }

    // Insert progress note
    const insertStmt = DB.prepare(
      `
      INSERT INTO IPDProgressNotes (
        admission_id,
        note_date,
        note_time,
        note_type,
        note_content,
        vital_signs,
        medication_given,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    ).bind(
      noteData.admission_id,
      noteData.note_date,
      noteData.note_time,
      noteData.note_type,
      noteData.note_content,
      noteData.vital_signs ? JSON.stringify(noteData.vital_signs) : undefined,
      noteData.medication_given
        ? JSON.stringify(noteData.medication_given)
        : undefined,
      user.id // Changed from session.user.userId
    );

    const result = await insertStmt.run();

    const progressNoteId = result.meta?.last_row_id || undefined;

    return new Response(
      JSON.stringify({
        message: "Progress note created successfully",
        progress_note_id: progressNoteId,
      }),
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error creating IPD progress note:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create IPD progress note",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
      }
    );
  }
}
