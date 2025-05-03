// app/api/patients/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare/context";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { User } from "@/types/user";
import { Patient } from "@/types/patient";
import { z } from "zod"; // Import zod for POST validation

// Define roles allowed to view patient lists
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Nurse", "Doctor"];
// Define roles allowed to create patients
const ALLOWED_ROLES_CREATE = ["Admin", "Receptionist"];

// Zod schema for patient creation (based on HEAD version and DB schema)
const PatientCreateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  phone_number: z.string().min(1, "Phone number is required"), // Made required based on DB schema
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  past_medical_history: z.string().optional(),
  current_medications: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
});

/**
 * GET /api/patients
 * Retrieves a list of active patients.
 * Requires authentication and specific roles.
 */
export async function GET(request: Request) {
  const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

  // 1. Check Authentication & Authorization
  if (!session.user || !ALLOWED_ROLES_VIEW.includes(session.user.roleName)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { env } = getCloudflareContext();
    const { DB } = env;

    // 2. Retrieve all active patients (consider pagination for large datasets)
    // For simplicity, fetching all active patients here.
    const patientsResult = await DB.prepare(
        "SELECT patient_id, first_name, last_name, date_of_birth, gender, phone_number, email, registration_date " +
        "FROM Patients WHERE is_active = TRUE ORDER BY registration_date DESC"
    ).all<Omit<Patient, "is_active" | "updated_at">>(); // Select specific fields for listing

    if (!patientsResult.results) {
        // Even if results array is empty, it's not an error, just no patients found.
        // Return empty array.
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Return patient list
    return new Response(JSON.stringify(patientsResult.results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Get patients error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/patients
 * Creates a new patient.
 * Requires authentication and specific roles.
 */
export async function POST(request: Request) {
  const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

  // 1. Check Authentication & Authorization
  if (!session.user || !ALLOWED_ROLES_CREATE.includes(session.user.roleName)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const validation = PatientCreateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const patientData = validation.data;
    const { env } = getCloudflareContext();
    const { DB } = env;

    // 2. Insert new patient into the database
    const insertResult = await DB.prepare(
      "INSERT INTO Patients (first_name, last_name, date_of_birth, gender, phone_number, email, address_line1, address_line2, city, state, postal_code, country, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, blood_group, allergies, past_medical_history, current_medications, insurance_provider, insurance_policy_number, registered_by_user_id) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      patientData.first_name,
      patientData.last_name,
      patientData.date_of_birth,
      patientData.gender,
      patientData.phone_number,
      patientData.email || null,
      patientData.address_line1 || null,
      patientData.address_line2 || null,
      patientData.city || null,
      patientData.state || null,
      patientData.postal_code || null,
      patientData.country || null,
      patientData.emergency_contact_name || null,
      patientData.emergency_contact_relation || null,
      patientData.emergency_contact_phone || null,
      patientData.blood_group || null,
      patientData.allergies || null,
      patientData.past_medical_history || null,
      patientData.current_medications || null,
      patientData.insurance_provider || null,
      patientData.insurance_policy_number || null,
      session.user.userId // Log who registered the patient
    ).run();

    if (!insertResult.success || !insertResult.meta || insertResult.meta.last_row_id === undefined) {
      throw new Error("Failed to insert patient into database");
    }

    const newPatientId = insertResult.meta.last_row_id;

    // 3. Retrieve the newly created patient data (optional, but good practice)
    const newPatient = await DB.prepare(
        "SELECT * FROM Patients WHERE patient_id = ?"
    ).bind(newPatientId).first<Patient>();

    if (!newPatient) {
        // This shouldn't happen if insert succeeded, but handle defensively
        throw new Error("Failed to retrieve newly created patient");
    }

    // 4. Return success response
    return new Response(JSON.stringify({ message: "Patient created successfully", patient: newPatient }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Create patient error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    // Check for unique constraint violation (e.g., email)
    if (errorMessage.includes("UNIQUE constraint failed")) {
        return new Response(JSON.stringify({ error: "Patient creation failed", details: "Email or another unique field already exists." }), {
            status: 409, // Conflict
            headers: { "Content-Type": "application/json" },
        });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
