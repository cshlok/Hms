import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Assuming db returns a promise
import { getSession, IronSessionData } from "@/lib/session"; // Import IronSessionData
import { IronSession } from "iron-session"; // Import IronSession

// Define interfaces for data structures
// interface _Medication { // FIX: Prefixed unused interface - Removed as it's unused
//   id: string;
//   item_code: string;
//   generic_name: string;
//   brand_name?: string | null;
//   dosage_form: string;
//   strength: string;
//   route?: string | null;
//   unit_of_measure: string;
//   prescription_required: boolean;
//   narcotic: boolean;
//   description?: string | null;
//   category_id?: string | null;
//   category_name?: string | null;
//   manufacturer_id?: string | null;
//   manufacturer_name?: string | null;
//   created_at: string;
//   updated_at: string;
// } // FIX: Commented out body to fix parsing error

interface MedicationInput {
  item_code: string;
  generic_name: string;
  brand_name?: string | null;
  dosage_form: string;
  strength: string;
  route?: string | null;
  unit_of_measure: string;
  prescription_required?: boolean;
  narcotic?: boolean;
  description?: string | null;
  category_id?: string | null;
  manufacturer_id?: string | null;
}

interface MedicationFilters {
  search?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  prescription_required?: boolean | null;
  narcotic?: boolean | null;
}

/**
 * GET /api/pharmacy/medications
 * Retrieves a list of medications, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    // FIX: Use IronSession<IronSessionData> type
    const session: IronSession<IronSessionData> = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Role check (e.g., allow Pharmacy staff, Doctors, Admins)
    // if (!["Admin", "Doctor", "Pharmacist", "Pharmacy Technician"].includes(session.user.roleName)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const filters: MedicationFilters = {
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      manufacturer: searchParams.get("manufacturer"),
      prescription_required: searchParams.has("prescription_required")
        ? searchParams.get("prescription_required") === "true"
        : undefined,
      narcotic: searchParams.has("narcotic")
        ? searchParams.get("narcotic") === "true"
        : undefined,
    };

    const database = await getDB();
    let query = `
      SELECT
        m.*,
        mc.name as category_name,
        mf.name as manufacturer_name
      FROM Medications m
      LEFT JOIN MedicationCategories mc ON m.category_id = mc.id
      LEFT JOIN Manufacturers mf ON m.manufacturer_id = mf.id
      WHERE 1=1
    `;
    const queryParameters: (string | number)[] = [];

    if (filters.search) {
      query += ` AND (
        m.generic_name LIKE ? OR
        m.brand_name LIKE ? OR
        m.item_code LIKE ? OR
        m.description LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      queryParameters.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (filters.category) {
      query += ` AND mc.name = ?`;
      queryParameters.push(filters.category);
    }
    if (filters.manufacturer) {
      query += ` AND mf.name = ?`;
      queryParameters.push(filters.manufacturer);
    }
    if (filters.prescription_required !== undefined) {
      query += ` AND m.prescription_required = ?`;
      queryParameters.push(filters.prescription_required ? 1 : 0);
    }
    if (filters.narcotic !== undefined) {
      query += ` AND m.narcotic = ?`;
      queryParameters.push(filters.narcotic ? 1 : 0);
    }

    query += " ORDER BY m.generic_name ASC";

    const { results } = await database
      .prepare(query)
      .bind(...queryParameters)
      .all();

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error fetching medications", error: message });
    return NextResponse.json(
      { error: "Failed to fetch medications", details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pharmacy/medications
 * Creates a new medication (Admin or Pharmacist role required).
 */
export async function POST(request: NextRequest) {
  try {
    // FIX: Use IronSession<IronSessionData> type
    const session: IronSession<IronSessionData> = await getSession();
    if (
      !session?.user ||
      !["Admin", "Pharmacist"].includes(session.user.roleName)
    ) {
      return NextResponse.json(
        { error: "Unauthorized: Admin or Pharmacist role required" },
        { status: 403 }
      );
    }

    const data = (await request.json()) as MedicationInput;

    // Basic validation
    if (
      !data.item_code ||
      !data.generic_name ||
      !data.dosage_form ||
      !data.strength ||
      !data.unit_of_measure
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (item_code, generic_name, dosage_form, strength, unit_of_measure)",
        },
        { status: 400 }
      );
    }

    const database = await getDB();
    const now = new Date().toISOString();

    // Check if item_code already exists
    const existingMed = await database
      .prepare("SELECT id FROM Medications WHERE item_code = ?")
      .bind(data.item_code)
      .first();
    if (existingMed) {
      return NextResponse.json(
        { error: "Medication with this item code already exists" },
        { status: 409 }
      );
    }

    const { results } = await database
      .prepare(
        `INSERT INTO Medications (
        item_code, generic_name, brand_name, dosage_form, strength, route,
        unit_of_measure, prescription_required, narcotic, description,
        category_id, manufacturer_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id` // Use RETURNING to get the new ID
      )
      .bind(
        data.item_code,
        data.generic_name,
        data.brand_name || undefined,
        data.dosage_form,
        data.strength,
        data.route || undefined,
        data.unit_of_measure,
        data.prescription_required === true ? 1 : 0,
        data.narcotic === true ? 1 : 0,
        data.description || undefined,
        data.category_id || undefined,
        data.manufacturer_id || undefined,
        now,
        now
      )
      .all(); // Use .all() for RETURNING clause

    // FIX: Cast results to expected type to access 'id'
    const newId = (results as Array<{ id: number | string }>)?.[0]?.id;

    if (!newId) {
      throw new Error("Failed to retrieve ID after medication creation.");
    }

    // Fetch the newly created medication to return it
    const newMedication = await database
      .prepare("SELECT * FROM Medications WHERE id = ?")
      .bind(newId)
      .first();

    return NextResponse.json(newMedication, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error({ message: "Error creating medication", error: message });
    // Handle potential unique constraint violation if check fails due to race condition
    if (
      message.includes("UNIQUE constraint failed") &&
      message.includes("item_code")
    ) {
      return NextResponse.json(
        { error: "Medication with this item code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create medication", details: message },
      { status: 500 }
    );
  }
}

