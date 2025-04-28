// app/api/patients/route.ts
import { getCloudflareContext } from "@opennextjs/cloudflare/context";
import { sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { User } from "@/types/user";
import { Patient } from "@/types/patient";

// Define roles allowed to view patient lists
const ALLOWED_ROLES_VIEW = ["Admin", "Receptionist", "Nurse", "Doctor"];

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
        throw new Error("Failed to retrieve patients");
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

