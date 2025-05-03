// app/api/patients/register/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare/context";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
import { User } from "@/types/user";
import { Patient } from "@/types/patient";

// Input validation schema for patient registration
const PatientRegistrationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  phone_number: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")), // Optional but must be valid email if provided
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
  // user_id is optional - link if patient is creating their own portal account later
});

// Define roles allowed to register patients
const ALLOWED_ROLES = ["Admin", "Receptionist", "Nurse"];

export async function POST(request: Request) {
  const session = await getIronSession<IronSessionData>(cookies(), sessionOptions);

  // 1. Check Authentication & Authorization
  if (!session.user || !ALLOWED_ROLES.includes(session.user.roleName)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const registered_by_user_id = session.user.userId;

  try {
    const body = await request.json();
    const validation = PatientRegistrationSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: validation.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const patientData = validation.data;

    const { env } = getCloudflareContext();
    const { DB } = env;

    // 2. Check for existing patient (e.g., by phone number or email if provided)
    let existingPatientCheck = null;
    if (patientData.email) {
        existingPatientCheck = await DB.prepare("SELECT patient_id FROM Patients WHERE phone_number = ? OR email = ?")
                                       .bind(patientData.phone_number, patientData.email)
                                       .first();
    } else {
        existingPatientCheck = await DB.prepare("SELECT patient_id FROM Patients WHERE phone_number = ?")
                                       .bind(patientData.phone_number)
                                       .first();
    }

    if (existingPatientCheck) {
      return new Response(JSON.stringify({ error: "Patient with this phone number or email already exists" }), {
        status: 409, // Conflict
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Insert new patient
    const insertResult = await DB.prepare(
      "INSERT INTO Patients (first_name, last_name, date_of_birth, gender, phone_number, email, address_line1, address_line2, city, state, postal_code, country, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, blood_group, allergies, past_medical_history, current_medications, insurance_provider, insurance_policy_number, registered_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
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
        registered_by_user_id
      )
      .run();

    if (!insertResult.success) {
        throw new Error("Failed to register patient");
    }

    const newPatientId = insertResult.meta.last_row_id;

    // 4. Return success response
    return new Response(JSON.stringify({ message: "Patient registered successfully", patientId: newPatientId }), {
      status: 201, // Created
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Patient registration error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

