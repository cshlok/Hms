import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db"; // Import Database type
import { getSession, Session } from "@/lib/session"; // Import Session
import { checkUserRole } from "@/lib/auth"; // Assuming this exists

// Define interfaces for request data
interface DispensingItem {
  prescription_item_id: string;
  batch_id: string;
  quantity: number;
  notes?: string;
}

interface DispensingRequest {
  prescription_id: string;
  items: DispensingItem[];
  create_billing?: boolean;
  notes?: string;
}

// Define interfaces for DB results
interface DispensingRecordResult {
  id: string;
  dispensed_at: string;
  quantity: number;
  billed: boolean;
  billing_id?: string | null;
  notes?: string | null;
  prescription_id: string;
  prescription_number: string;
  prescription_item_id: string;
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  medication_id: string;
  generic_name: string;
  brand_name?: string | null;
  dosage_form: string;
  strength?: string | null;
  unit_of_measure?: string | null;
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  dispensed_by_id: string;
  dispensed_by_first_name: string;
  dispensed_by_last_name: string;
}

interface PrescriptionQueryResult {
  id: string;
  status: "pending" | "partially_dispensed" | "dispensed" | "cancelled";
  patient_id: string;
}

interface PrescriptionItemQueryResult {
  id: string;
  medication_id: string;
  quantity: number;
  dispensed_quantity?: number | null;
  status: "pending" | "partially_dispensed" | "dispensed" | "cancelled";
}

interface BatchQueryResult {
  id: string;
  medication_id: string;
  current_quantity: number;
  expiry_date: string;
}

interface UpdatedPrescriptionResult {
    id: string;
    prescription_number: string;
    prescription_date: string;
    source: string;
    source_id?: string | null;
    status: string;
    notes?: string | null;
    patient_id: string;
    patient_first_name: string;
    patient_last_name: string;
    doctor_id: string;
    doctor_first_name: string;
    doctor_last_name: string;
}

interface UpdatedPrescriptionItemResult {
    id: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    dispensed_quantity?: number | null;
    instructions?: string | null;
    status: string;
    medication_id: string;
    generic_name: string;
    brand_name?: string | null;
    dosage_form: string;
    strength?: string | null;
    unit_of_measure?: string | null;
}

interface FinalDispensingRecordResult {
    id: string;
    dispensed_at: string;
    quantity: number;
    billed: boolean;
    notes?: string | null;
    prescription_item_id: string;
    medication_id: string;
    generic_name: string;
    brand_name?: string | null;
    batch_id: string;
    batch_number: string;
    dispensed_by_id: string;
    dispensed_by_first_name: string;
    dispensed_by_last_name: string;
}


// GET /api/pharmacy/dispensing
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession() as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check (adjust roles as needed)
    if (!await checkUserRole(request, ["Admin", "Pharmacist", "PharmacyAdmin", "Doctor", "Nurse"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const prescription_id = searchParams.get("prescription_id");
    const patient_id = searchParams.get("patient_id");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    const db = await getDB(); // Removed : Database type annotation

    let query = `
      SELECT
        dr.id,
        dr.dispensed_at,
        dr.quantity,
        dr.billed,
        dr.billing_id,
        dr.notes,
        p.id as prescription_id,
        p.prescription_number,
        pi.id as prescription_item_id,
        pt.id as patient_id,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        m.id as medication_id,
        m.generic_name,
        m.brand_name,
        m.dosage_form,
        m.strength,
        m.unit_of_measure,
        ib.id as batch_id,
        ib.batch_number,
        ib.expiry_date,
        u.id as dispensed_by_id,
        u.first_name as dispensed_by_first_name,
        u.last_name as dispensed_by_last_name
      FROM dispensing_records dr
      JOIN prescriptions p ON dr.prescription_id = p.id
      JOIN prescription_items pi ON dr.prescription_item_id = pi.id
      JOIN patients pt ON p.patient_id = pt.id
      JOIN medications m ON pi.medication_id = m.id
      JOIN inventory_batches ib ON dr.batch_id = ib.id
      JOIN users u ON dr.dispensed_by = u.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (prescription_id) {
      query += ` AND p.id = ?`;
      params.push(prescription_id);
    }
    if (patient_id) {
      query += ` AND pt.id = ?`;
      params.push(patient_id);
    }
    if (date_from) {
      query += ` AND dr.dispensed_at >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND dr.dispensed_at <= ?`;
      params.push(date_to);
    }

    query += ` ORDER BY dr.dispensed_at DESC`;

    const result = await db.prepare(query).bind(...params).all();

    return NextResponse.json({
      dispensing_records: result.results || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error fetching dispensing records:", message);
    return NextResponse.json({ error: "Failed to fetch dispensing records", details: message }, { status: 500 });
  }
}

// POST /api/pharmacy/dispensing
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession() as Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has pharmacist role
    if (!await checkUserRole(request, ["Admin", "Pharmacist", "PharmacyAdmin"])) {
      return NextResponse.json({ error: "Forbidden: Only authorized pharmacy staff can dispense medications" }, { status: 403 });
    }

    const data = await request.json() as DispensingRequest;

    // Validate required fields
    if (!data.prescription_id || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "Missing or invalid required fields: prescription_id, items (must be a non-empty array)" }, { status: 400 });
    }

    for (const item of data.items) {
      if (!item.prescription_item_id || !item.batch_id || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: `Invalid item data: Missing required fields (prescription_item_id, batch_id, quantity > 0) for item ${item.prescription_item_id || 
'unknown'}` }, { status: 400 });
      }
    }

    const db = await getDB(); // Removed : Database type annotation

    // Check prescription status
    const prescription = await db.prepare(`
      SELECT id, status, patient_id FROM prescriptions WHERE id = ?
    `).bind(data.prescription_id).first() as PrescriptionQueryResult | null;

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }
    if (prescription.status === "dispensed" || prescription.status === "cancelled") {
      return NextResponse.json({ error: `Cannot dispense prescription with status: ${prescription.status}` }, { status: 400 });
    }

    // Start transaction
    await db.exec("BEGIN TRANSACTION");

    try {
      const dispensingRecordIds: string[] = [];

      for (const item of data.items) {
        // Check prescription item
        const prescriptionItem = await db.prepare(`
          SELECT id, medication_id, quantity, dispensed_quantity, status
          FROM prescription_items
          WHERE id = ? AND prescription_id = ?
        `).bind(item.prescription_item_id, data.prescription_id).first() as PrescriptionItemQueryResult | null;

        if (!prescriptionItem) {
          throw new Error(`Prescription item ${item.prescription_item_id} not found or does not belong to prescription ${data.prescription_id}`);
        }
        if (prescriptionItem!.status === "dispensed" || prescriptionItem!.status === "cancelled") {
          throw new Error(`Cannot dispense prescription item ${item.prescription_item_id} with status: ${prescriptionItem!.status}`);
        }

        // Check batch
        const batch = await db.prepare(`
          SELECT id, medication_id, current_quantity, expiry_date
          FROM inventory_batches
          WHERE id = ?
        `).bind(item.batch_id).first() as BatchQueryResult | null;

        if (!batch) {
          throw new Error(`Batch ${item.batch_id} not found`);
        }
        if (batch.medication_id !== prescriptionItem.medication_id) {
          throw new Error(`Batch ${item.batch_id} medication does not match prescription item ${item.prescription_item_id}`);
        }
        if (batch.current_quantity < item.quantity) {
          throw new Error(`Insufficient stock in batch ${item.batch_id}: requested ${item.quantity}, available ${batch.current_quantity}`);
        }
        if (new Date(batch.expiry_date) <= new Date()) {
          throw new Error(`Batch ${item.batch_id} is expired`);
        }

        // Check quantity
        const remainingQuantity = prescriptionItem.quantity - (prescriptionItem.dispensed_quantity || 0);
        if (item.quantity > remainingQuantity) {
          throw new Error(`Dispensing quantity (${item.quantity}) exceeds remaining quantity (${remainingQuantity}) for item ${item.prescription_item_id}`);
        }

        // Create dispensing record
        const dispensingId = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await db.prepare(`
          INSERT INTO dispensing_records (
            id, prescription_id, prescription_item_id, batch_id,
            quantity, dispensed_by, notes, billed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          dispensingId,
          data.prescription_id,
          item.prescription_item_id,
          item.batch_id,
          item.quantity,
          session!.user.userId, // Use userId from Session interface
          item.notes || null,
          false
        ).run();

        // Update batch quantity
        await db.prepare(`
          UPDATE inventory_batches
          SET current_quantity = current_quantity - ?
          WHERE id = ?
        `).bind(item.quantity, item.batch_id).run();

        // Record inventory transaction
        const transactionId = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await db.prepare(`
          INSERT INTO inventory_transactions (
            id, batch_id, transaction_type, quantity, reference_type,
            reference_id, user_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          transactionId,
          item.batch_id,
          "dispense",
          item.quantity,
          "dispensing",
          dispensingId,
          session!.user.userId, // Use userId from Session interface
          `Dispensed for prescription ${data.prescription_id}`
        ).run();

        // Update prescription item
        const newDispensedQuantity = (prescriptionItem.dispensed_quantity || 0) + item.quantity;
        const newStatus: PrescriptionItemQueryResult["status"] = newDispensedQuantity >= prescriptionItem.quantity ? "dispensed" : "partially_dispensed";
        await db.prepare(`
          UPDATE prescription_items
          SET dispensed_quantity = ?, status = ?
          WHERE id = ?
        `).bind(newDispensedQuantity, newStatus, item.prescription_item_id).run();

        dispensingRecordIds.push(dispensingId);
      }

      // Update overall prescription status
      const allItems = await db.prepare(`
        SELECT status FROM prescription_items WHERE prescription_id = ?
      `).bind(data.prescription_id).all() as { results?: { status: string }[] };

      const allDispensed = allItems.results?.every((i: { status: string }) => i.status === "dispensed") ?? false;
      const anyPartiallyDispensed = allItems.results?.some((i: { status: string }) => i.status === "partially_dispensed") ?? false;
      const newPrescriptionStatus: PrescriptionQueryResult["status"] = allDispensed ? "dispensed" : (anyPartiallyDispensed ? "partially_dispensed" : "pending");

      await db.prepare(`
        UPDATE prescriptions SET status = ? WHERE id = ?
      `).bind(newPrescriptionStatus, data.prescription_id).run();

      // Handle billing (simplified)
      if (data.create_billing === true) {
        // Placeholder for actual billing integration
        const billingId = `bill_${Date.now()}`;
        for (const dispensingId of dispensingRecordIds) {
          await db.prepare(`
            UPDATE dispensing_records SET billed = true, billing_id = ? WHERE id = ?
          `).bind(billingId, dispensingId).run();
        }
      }

      // Commit transaction
      await db.exec("COMMIT");

      // Fetch updated data to return
      const updatedPrescription = await db.prepare(`
        SELECT
          p.id, p.prescription_number, p.prescription_date, p.source, p.source_id, p.status, p.notes,
          pt.id as patient_id, pt.first_name as patient_first_name, pt.last_name as patient_last_name,
          u.id as doctor_id, u.first_name as doctor_first_name, u.last_name as doctor_last_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.id
        JOIN users u ON p.doctor_id = u.id
        WHERE p.id = ?
      `).bind(data.prescription_id).first() as UpdatedPrescriptionResult | null;

      const updatedItems = await db.prepare(`
        SELECT
          pi.id, pi.dosage, pi.frequency, pi.duration, pi.quantity, pi.dispensed_quantity, pi.instructions, pi.status,
          m.id as medication_id, m.generic_name, m.brand_name, m.dosage_form, m.strength, m.unit_of_measure
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = ?
      `).bind(data.prescription_id).all() as { results?: UpdatedPrescriptionItemResult[] };

      const finalDispensingRecords = await db.prepare(`
        SELECT
          dr.id, dr.dispensed_at, dr.quantity, dr.billed, dr.notes,
          pi.id as prescription_item_id,
          m.id as medication_id, m.generic_name, m.brand_name,
          ib.id as batch_id, ib.batch_number,
          u.id as dispensed_by_id, u.first_name as dispensed_by_first_name, u.last_name as dispensed_by_last_name
        FROM dispensing_records dr
        JOIN prescription_items pi ON dr.prescription_item_id = pi.id
        JOIN medications m ON pi.medication_id = m.id
        JOIN inventory_batches ib ON dr.batch_id = ib.id
        JOIN users u ON dr.dispensed_by = u.id
        WHERE dr.id IN (${dispensingRecordIds.map((_id: string) => '?').join(',')})
        ORDER BY dr.dispensed_at DESC
      `).bind(...dispensingRecordIds).all() as { results?: FinalDispensingRecordResult[] };

      return NextResponse.json({
        prescription: {
          ...updatedPrescription,
          items: updatedItems.results || [],
        },
        dispensing_records: finalDispensingRecords.results || [],
      }, { status: 200 });

    } catch (error) {
      // Rollback transaction on error
      await db.exec("ROLLBACK");
      throw error; // Re-throw error to be caught by outer catch block
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error dispensing medications:", message);
    return NextResponse.json({ error: `Failed to dispense medications: ${message}` }, { status: 500 });
  }
}

