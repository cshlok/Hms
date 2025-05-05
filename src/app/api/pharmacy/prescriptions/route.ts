import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Assuming db returns a promise
import { getSession, IronSessionData } from "@/lib/session";
import { IronSession } from "iron-session";
import { User } from "@/types/user";

// FIX: Define generic QueryResult type
interface QueryResult<T> {
  results?: T[];
  // Add other potential properties like rowCount, etc., based on your DB library
}

// FIX: Define generic SingleQueryResult type for .first()
interface SingleQueryResult<T> {
  result?: T | null;
  // Add other potential properties based on your DB library
}

// Define interfaces
interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensed_quantity?: number; // Optional, might not be present initially
  instructions?: string | null;
  status: "pending" | "dispensed" | "partially_dispensed" | "cancelled";
  // Fields from joined medication table
  generic_name?: string;
  brand_name?: string | null;
  dosage_form?: string;
  strength?: string;
  unit_of_measure?: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  prescription_date: string; // ISO date string
  source: "OPD" | "IPD";
  source_id?: string | null;
  status: "pending" | "dispensed" | "partially_dispensed" | "cancelled";
  notes?: string | null;
  patient_id: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_id: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  item_count?: number; // Calculated field
  items?: PrescriptionItem[]; // Added for POST response
}

// FIX: Define type for the raw DB result for prescriptions list
interface PrescriptionQueryResultRow
  extends Omit<Prescription, "items" | "item_count"> {
  item_count: number; // Ensure item_count is number
}

// FIX: Remove redundant interface PrescriptionItemQueryResultRow
// interface PrescriptionItemQueryResultRow extends PrescriptionItem {}

interface PrescriptionItemPostData {
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string | null;
}

interface PrescriptionPostData {
  patient_id: string;
  source: "OPD" | "IPD";
  source_id?: string | null;
  prescription_date?: string; // Optional, defaults to now
  notes?: string | null;
  items: PrescriptionItemPostData[];
}

// GET /api/pharmacy/prescriptions
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // FIX: Get session without unsafe assertion
    const session: Session | null = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get("patient_id");
    const doctor_id = searchParams.get("doctor_id");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    const database = await getDB();

    let query = `
      SELECT
        p.id,
        p.prescription_number,
        p.prescription_date,
        p.source,
        p.source_id,
        p.status,
        p.notes,
        pt.id as patient_id,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        u.id as doctor_id,
        u.first_name as doctor_first_name,
        u.last_name as doctor_last_name,
        (
          SELECT COUNT(*)
          FROM prescription_items
          WHERE prescription_id = p.id
        ) as item_count
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users u ON p.doctor_id = u.id
      WHERE 1=1
    `;

    const parameters: (string | number)[] = [];

    if (patient_id) {
      query += ` AND p.patient_id = ?`;
      parameters.push(patient_id);
    }

    if (doctor_id) {
      query += ` AND p.doctor_id = ?`;
      parameters.push(doctor_id);
    }

    if (
      status && // Basic validation for status
      ["pending", "dispensed", "partially_dispensed", "cancelled"].includes(
        status
      )
    ) {
      query += ` AND p.status = ?`;
      parameters.push(status);
    }

    if (source && ["OPD", "IPD"].includes(source)) {
      query += ` AND p.source = ?`;
      parameters.push(source);
    }

    if (
      date_from && // Basic validation for date format (YYYY-MM-DD)
      /^\d{4}-\d{2}-\d{2}$/.test(date_from)
    ) {
      query += ` AND p.prescription_date >= ?`;
      parameters.push(date_from);
    }

    if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
      query += ` AND p.prescription_date <= ?`;
      parameters.push(date_to);
    }

    query += ` ORDER BY p.prescription_date DESC`;

    // FIX: Use type assertion for query result
    const result = (await database
      .prepare(query)
      .bind(...parameters)
      .all()) as QueryResult<PrescriptionQueryResultRow>;

    return NextResponse.json({
      prescriptions: result.results || [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: `Failed to fetch prescriptions: ${message}` },
      { status: 500 }
    );
  }
}

// POST /api/pharmacy/prescriptions
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // FIX: Get session without unsafe assertion
    const session: Session | null = await getSession();

    // FIX: Check session and user safely
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // FIX: Assert user type after null check
    const currentUser = session.user as SessionUser;

    const hasPermission = ["admin", "doctor"].includes(currentUser.roleName); // Use roleName from Session

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden: Only doctors or admins can create prescriptions" },
        { status: 403 }
      );
    }

    const data = (await request.json()) as PrescriptionPostData;

    const requiredFields: (keyof PrescriptionPostData)[] = [
      "patient_id",
      "source",
      "items",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: "Prescription must contain at least one item" },
        { status: 400 }
      );
    }

    for (const item of data.items) {
      const itemRequiredFields: (keyof PrescriptionItemPostData)[] = [
        "medication_id",
        "dosage",
        "frequency",
        "duration",
        "quantity",
      ];
      for (const field of itemRequiredFields) {
        if (!item[field]) {
          return NextResponse.json(
            { error: `Missing required field in prescription item: ${field}` },
            { status: 400 }
          );
        }
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Quantity must be a positive number" },
          { status: 400 }
        );
      }
    }

    const database = await getDB();

    // FIX: Use type assertion for .first()
    const patientExists = (await database
      .prepare(`SELECT id FROM patients WHERE id = ?`)
      .bind(data.patient_id)
      .first()) as SingleQueryResult<{ id: string }>;

    if (!patientExists?.result) {
      // FIX: Check result property
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!["OPD", "IPD"].includes(data.source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be OPD or IPD" },
        { status: 400 }
      );
    }

    if (data.source_id) {
      const sourceTable = data.source === "OPD" ? "appointments" : "admissions";
      // FIX: Use type assertion for .first()
      const sourceExists = (await database
        .prepare(`SELECT id FROM ${sourceTable} WHERE id = ?`)
        .bind(data.source_id)
        .first()) as SingleQueryResult<{ id: string }>;

      if (!sourceExists?.result) {
        // FIX: Check result property
        return NextResponse.json(
          { error: `${data.source} record not found` },
          { status: 404 }
        );
      }
    }

    const prescriptionId = `presc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replaceAll("-", "");
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const prescriptionNumber = `PRSC-${dateString}-${randomNumber}`;

    // Use transaction
    await database.exec("BEGIN TRANSACTION");

    try {
      await database
        .prepare(
          `
        INSERT INTO prescriptions (
          id, prescription_number, patient_id, doctor_id, prescription_date,
          source, source_id, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          prescriptionId,
          prescriptionNumber,
          data.patient_id,
          currentUser.userId, // Use userId from currentUser
          data.prescription_date || new Date().toISOString().split("T")[0], // Use YYYY-MM-DD format
          data.source,
          data.source_id || undefined,
          "pending",
          data.notes || undefined
        )
        .run();

      for (const item of data.items) {
        const itemId = `prescitem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // FIX: Use type assertion for .first()
        const medicationExists = (await database
          .prepare(`SELECT id FROM medications WHERE id = ?`)
          .bind(item.medication_id)
          .first()) as SingleQueryResult<{ id: string }>;

        if (!medicationExists?.result) {
          // FIX: Check result property
          throw new Error(`Medication not found: ${item.medication_id}`);
        }

        await database
          .prepare(
            `
          INSERT INTO prescription_items (
            id, prescription_id, medication_id, dosage, frequency,
            duration, quantity, instructions, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .bind(
            itemId,
            prescriptionId,
            item.medication_id,
            item.dosage,
            item.frequency,
            item.duration,
            item.quantity,
            item.instructions || undefined,
            "pending"
          )
          .run();
      }

      await database.exec("COMMIT");

      // Fetch the created prescription with details
      // FIX: Use type assertion for .first()
      const createdPrescriptionResult = (await database
        .prepare(
          `
        SELECT
          p.id, p.prescription_number, p.prescription_date, p.source, p.source_id,
          p.status, p.notes, pt.id as patient_id, pt.first_name as patient_first_name,
          pt.last_name as patient_last_name, u.id as doctor_id,
          u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ?
      `
        )
        .bind(prescriptionId)
        .first()) as SingleQueryResult<
        Omit<Prescription, "items" | "item_count">
      >;

      // FIX: Check result property before using
      const createdPrescription = createdPrescriptionResult?.result;

      if (!createdPrescription) {
        throw new Error("Failed to retrieve created prescription details");
      }

      // Fetch prescription items with medication details
      // FIX: Use type assertion for .all() and use PrescriptionItem directly
      const prescriptionItemsResult = (await database
        .prepare(
          `
        SELECT
          pi.id, pi.dosage, pi.frequency, pi.duration, pi.quantity,
          pi.dispensed_quantity, pi.instructions, pi.status, m.id as medication_id,
          m.generic_name, m.brand_name, m.dosage_form, m.strength, m.unit_of_measure
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = ?
      `
        )
        .bind(prescriptionId)
        .all()) as QueryResult<PrescriptionItem>;

      // FIX: Assert items type safely
      const items: PrescriptionItem[] = (prescriptionItemsResult.results ||
        []) as PrescriptionItem[];

      const responseData: Prescription = {
        ...createdPrescription, // Use the checked variable
        items: items,
      };

      return NextResponse.json(responseData, { status: 201 });
    } catch (error: unknown) {
      await database.exec("ROLLBACK");
      throw error; // Rethrow to be caught by the outer catch block
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { error: `Failed to create prescription: ${message}` },
      { status: 500 }
    );
  }
}
