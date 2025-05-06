import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/database"; // Using mock DB
import { getSession } from "@/lib/session"; // Using mock session

// --- Interfaces ---

interface SampleInput {
  id?: number; // For updates
  order_id: number;
  sample_type: string;
  barcode?: string; // Optional for creation, required for update?
  status?: "collected" | "received" | "processing" | "rejected";
  rejection_reason?: string;
  notes?: string;
}

interface LabSample {
  id: number;
  order_id: number;
  barcode: string;
  sample_type: string;
  collected_by: number | null;
  collected_at: string | null;
  received_by: number | null;
  received_at: string | null;
  status: "collected" | "received" | "processing" | "rejected";
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient_id?: number;
  patient_name?: string;
  collector_name?: string;
  receiver_name?: string;
}

// --- API Route Handlers ---

// GET /api/laboratory/samples - Get laboratory samples
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const barcode = searchParams.get("barcode");
    const status = searchParams.get("status");

    const database = await getDB();
    let query = `
      SELECT s.*, 
        o.patient_id,
        p.first_name || ' ' || p.last_name as patient_name,
        c.first_name || ' ' || c.last_name as collector_name,
        r.first_name || ' ' || r.last_name as receiver_name
      FROM lab_samples s
      JOIN lab_orders o ON s.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN users c ON s.collected_by = c.id
      LEFT JOIN users r ON s.received_by = r.id
    `;

    // FIX: Use specific type for params
    const parameters: (string | number)[] = [];
    const conditions: string[] = [];

    if (orderId) {
      conditions.push("s.order_id = ?");
      parameters.push(orderId);
    }
    if (barcode) {
      conditions.push("s.barcode = ?");
      parameters.push(barcode);
    }
    if (status) {
      conditions.push("s.status = ?");
      parameters.push(status);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY s.created_at DESC";

    // Fixed: Use db.query
    const samplesResult = await database.query(query, parameters);
    return NextResponse.json(samplesResult.results || []); // Changed .rows to .results
  } catch (error: unknown) {
    console.error("Error fetching laboratory samples:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch laboratory samples", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/laboratory/samples - Create or update a laboratory sample
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fixed: Use roleName
    const allowedRoles = [
      "Lab Technician",
      "Lab Manager",
      "Phlebotomist",
      "Admin",
    ]; // Adjust role names
    if (!allowedRoles.includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as SampleInput;
    const database = await getDB();

    if (body.id) {
      // --- Update existing sample ---
      const sampleResult = await database.query(
        "SELECT * FROM lab_samples WHERE id = ?",
        [body.id]
      );
      const existingSample = (
        sampleResult.results && sampleResult.results.length > 0 // Changed .rows to .results (twice)
          ? sampleResult.results[0] // Changed .rows to .results
          : undefined
      ) as LabSample | null;

      if (!existingSample) {
        return NextResponse.json(
          { error: "Sample not found" },
          { status: 404 }
        );
      }

      const updates: string[] = [];
      // FIX: Use specific type for params
      const parameters: (string | number | boolean)[] = [];

      if (body.status) {
        updates.push("status = ?");
        parameters.push(body.status);

        if (
          body.status === "collected" &&
          existingSample.status !== "collected"
        ) {
          updates.push("collected_by = ?", "collected_at = CURRENT_TIMESTAMP");
          parameters.push(session.user.userId);
        }
        if (
          body.status === "received" &&
          existingSample.status !== "received"
        ) {
          updates.push("received_by = ?", "received_at = CURRENT_TIMESTAMP");
          parameters.push(session.user.userId);
        }
        if (body.status === "rejected" && !body.rejection_reason) {
          return NextResponse.json(
            { error: "Rejection reason is required when rejecting a sample" },
            { status: 400 }
          );
        }
      }
      if (body.rejection_reason) {
        updates.push("rejection_reason = ?");
        parameters.push(body.rejection_reason);
      }
      if (body.notes) {
        updates.push("notes = ?");
        parameters.push(body.notes);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: "No updates provided" },
          { status: 400 }
        );
      }

      parameters.push(body.id); // Add ID for WHERE clause

      // Fixed: Use db.query for update
      await database.query(
        `UPDATE lab_samples SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        parameters
      );

      // Fixed: Use db.query to get updated sample
      const updatedSampleResult = await database.query(
        "SELECT * FROM lab_samples WHERE id = ?",
        [body.id]
      );
      const updatedSample =
        updatedSampleResult.results && updatedSampleResult.results.length > 0 // Changed .rows to .results (twice)
          ? updatedSampleResult.results[0] // Changed .rows to .results
          : undefined;

      return NextResponse.json(updatedSample);
    } else {
      // --- Create new sample ---
      const requiredFields: (keyof SampleInput)[] = ["order_id", "sample_type"];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 }
          );
        }
      }

      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const barcode = body.barcode || `LAB${timestamp}${random}`;

      // Fixed: Use db.query for insert (mock DB doesn't return last_row_id)
      await database.query(
        `
        INSERT INTO lab_samples (order_id, barcode, sample_type, collected_by, collected_at, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [
          body.order_id,
          barcode,
          body.sample_type,
          session.user.userId,
          "collected", // New samples start as collected
          body.notes || "",
        ]
      );

      // Fetch the created sample (mock fetch by barcode)
      const newSampleResult = await database.query(
        "SELECT * FROM lab_samples WHERE barcode = ? ORDER BY created_at DESC LIMIT 1",
        [barcode]
      );
      const newSample =
        newSampleResult.results && newSampleResult.results.length > 0 // Changed .rows to .results (twice)
          ? newSampleResult.results[0] // Changed .rows to .results
          : undefined;

      if (!newSample) {
        // Fallback if mock fetch fails
        return NextResponse.json(
          {
            message: "Sample created (mock), but could not fetch immediately.",
            barcode: barcode,
          },
          { status: 201 }
        );
      }

      return NextResponse.json(newSample, { status: 201 });
    }
  } catch (error: unknown) {
    console.error("Error managing laboratory sample:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to manage laboratory sample", details: errorMessage },
      { status: 500 }
    );
  }
}

