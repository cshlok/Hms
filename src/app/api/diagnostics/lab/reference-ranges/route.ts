import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { getSession } from "@/lib/session";

// Interface for the request body when creating a reference range
interface ReferenceRangeCreateBody {
  test_id: number;
  gender?: "male" | "female" | "other" | "unknown";
  age_low?: number;
  age_high?: number;
  value_low?: number;
  value_high?: number;
  text_value?: string;
  unit?: string;
  interpretation?: string;
  is_critical?: boolean;
  critical_low?: number;
  critical_high?: number;
}

// GET /api/diagnostics/lab/reference-ranges - Get reference ranges
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId");
    const gender = searchParams.get("gender");
    
    // Validate required parameters
    if (!testId) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 }
      );
    }
    
    // Build query
    let query = `
      SELECT 
        r.*,
        t.name as test_name,
        t.loinc_code
      FROM 
        lab_test_reference_ranges r
      JOIN 
        lab_tests t ON r.test_id = t.id
      WHERE 
        r.test_id = ?
    `;
    
    const parameters: any[] = [testId];
    
    if (gender) {
      query += " AND (r.gender = ? OR r.gender IS NULL)";
      parameters.push(gender);
    }
    
    // Execute query
    const rangesResult = await DB.query(query, parameters);
    const ranges = rangesResult.results || [];
    
    return NextResponse.json(ranges);
  } catch (error: unknown) {
    console.error("Error fetching reference ranges:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reference ranges", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/diagnostics/lab/reference-ranges - Create a new reference range
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only lab managers and admins can create reference ranges
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json() as ReferenceRangeCreateBody;
    
    // Validate required fields
    if (!body.test_id) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 }
      );
    }
    
    // Validate that either numeric values or text value is provided
    if (
      (body.value_low === undefined && body.value_high === undefined && !body.text_value) ||
      (body.text_value && (body.value_low !== undefined || body.value_high !== undefined))
    ) {
      return NextResponse.json(
        { error: "Either numeric range values or text value must be provided, but not both" },
        { status: 400 }
      );
    }
    
    // Check if test exists
    const testCheckResult = await DB.query(
      "SELECT id FROM lab_tests WHERE id = ?",
      [body.test_id]
    );
    
    if (!testCheckResult.results || testCheckResult.results.length === 0) {
      return NextResponse.json(
        { error: "Test not found" },
        { status: 404 }
      );
    }
    
    // Check for overlapping ranges
    if (body.age_low !== undefined || body.age_high !== undefined || body.gender) {
      const overlapCheckQuery = `
        SELECT id FROM lab_test_reference_ranges
        WHERE test_id = ?
          AND (
            (? IS NULL OR gender = ? OR gender IS NULL)
            AND (
              (? IS NULL AND ? IS NULL) OR
              (? IS NULL AND ? <= age_high) OR
              (? IS NULL AND ? >= age_low) OR
              (? BETWEEN age_low AND age_high) OR
              (? BETWEEN age_low AND age_high) OR
              (age_low BETWEEN ? AND ?) OR
              (age_high BETWEEN ? AND ?)
            )
          )
      `;
      
      const overlapCheckParams = [
        body.test_id,
        body.gender, body.gender,
        body.age_low, body.age_high,
        body.age_high, body.age_low,
        body.age_low, body.age_high,
        body.age_low, body.age_high,
        body.age_low, body.age_high,
        body.age_low, body.age_high
      ];
      
      const overlapResult = await DB.query(overlapCheckQuery, overlapCheckParams);
      
      if (overlapResult.results && overlapResult.results.length > 0) {
        return NextResponse.json(
          { error: "Reference range overlaps with existing ranges" },
          { status: 400 }
        );
      }
    }
    
    // Insert reference range
    const insertQuery = `
      INSERT INTO lab_test_reference_ranges (
        test_id, gender, age_low, age_high, value_low, value_high,
        text_value, unit, interpretation, is_critical, critical_low, critical_high
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParameters = [
      body.test_id,
      body.gender || null,
      body.age_low || null,
      body.age_high || null,
      body.value_low || null,
      body.value_high || null,
      body.text_value || null,
      body.unit || null,
      body.interpretation || null,
      body.is_critical ? 1 : 0,
      body.critical_low || null,
      body.critical_high || null
    ];
    
    const result = await DB.query(insertQuery, insertParameters);
    const rangeId = result.insertId;
    
    // Fetch the created reference range
    const fetchQuery = `
      SELECT 
        r.*,
        t.name as test_name,
        t.loinc_code
      FROM 
        lab_test_reference_ranges r
      JOIN 
        lab_tests t ON r.test_id = t.id
      WHERE 
        r.id = ?
    `;
    
    const rangeResult = await DB.query(fetchQuery, [rangeId]);
    const range = rangeResult.results?.[0];
    
    if (!range) {
      throw new Error("Failed to retrieve created reference range");
    }
    
    // Return the created reference range
    return NextResponse.json(range, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating reference range:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create reference range", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/diagnostics/lab/reference-ranges/:id - Update a reference range
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only lab managers and admins can update reference ranges
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const rangeId = params.id;
    
    // Check if reference range exists
    const checkResult = await DB.query(
      "SELECT id, test_id FROM lab_test_reference_ranges WHERE id = ?",
      [rangeId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Reference range not found" },
        { status: 404 }
      );
    }
    
    const existingRange = checkResult.results[0];
    
    // Parse request body
    const body = await request.json() as Partial<ReferenceRangeCreateBody>;
    
    // Validate that either numeric values or text value is provided if both are included in the update
    if (
      body.value_low !== undefined || 
      body.value_high !== undefined || 
      body.text_value !== undefined
    ) {
      // Get current values for fields not included in the update
      const currentResult = await DB.query(
        "SELECT value_low, value_high, text_value FROM lab_test_reference_ranges WHERE id = ?",
        [rangeId]
      );
      
      const current = currentResult.results?.[0];
      
      const updatedValueLow = body.value_low !== undefined ? body.value_low : current.value_low;
      const updatedValueHigh = body.value_high !== undefined ? body.value_high : current.value_high;
      const updatedTextValue = body.text_value !== undefined ? body.text_value : current.text_value;
      
      if (
        (updatedValueLow === null && updatedValueHigh === null && !updatedTextValue) ||
        (updatedTextValue && (updatedValueLow !== null || updatedValueHigh !== null))
      ) {
        return NextResponse.json(
          { error: "Either numeric range values or text value must be provided, but not both" },
          { status: 400 }
        );
      }
    }
    
    // Check for overlapping ranges if age or gender criteria are being updated
    if (body.age_low !== undefined || body.age_high !== undefined || body.gender !== undefined) {
      // Get current values for fields not included in the update
      const currentResult = await DB.query(
        "SELECT test_id, gender, age_low, age_high FROM lab_test_reference_ranges WHERE id = ?",
        [rangeId]
      );
      
      const current = currentResult.results?.[0];
      
      const testId = body.test_id !== undefined ? body.test_id : current.test_id;
      const gender = body.gender !== undefined ? body.gender : current.gender;
      const ageLow = body.age_low !== undefined ? body.age_low : current.age_low;
      const ageHigh = body.age_high !== undefined ? body.age_high : current.age_high;
      
      const overlapCheckQuery = `
        SELECT id FROM lab_test_reference_ranges
        WHERE test_id = ?
          AND id != ?
          AND (
            (? IS NULL OR gender = ? OR gender IS NULL)
            AND (
              (? IS NULL AND ? IS NULL) OR
              (? IS NULL AND ? <= age_high) OR
              (? IS NULL AND ? >= age_low) OR
              (? BETWEEN age_low AND age_high) OR
              (? BETWEEN age_low AND age_high) OR
              (age_low BETWEEN ? AND ?) OR
              (age_high BETWEEN ? AND ?)
            )
          )
      `;
      
      const overlapCheckParams = [
        testId, rangeId,
        gender, gender,
        ageLow, ageHigh,
        ageHigh, ageLow,
        ageLow, ageHigh,
        ageLow, ageHigh,
        ageLow, ageHigh,
        ageLow, ageHigh
      ];
      
      const overlapResult = await DB.query(overlapCheckQuery, overlapCheckParams);
      
      if (overlapResult.results && overlapResult.results.length > 0) {
        return NextResponse.json(
          { error: "Reference range overlaps with existing ranges" },
          { status: 400 }
        );
      }
    }
    
    // Build update query
    let updateQuery = "UPDATE lab_test_reference_ranges SET ";
    const updateFields: string[] = [];
    const updateParameters: any[] = [];
    
    if (body.test_id !== undefined) {
      // Check if test exists
      const testCheckResult = await DB.query(
        "SELECT id FROM lab_tests WHERE id = ?",
        [body.test_id]
      );
      
      if (!testCheckResult.results || testCheckResult.results.length === 0) {
        return NextResponse.json(
          { error: "Test not found" },
          { status: 404 }
        );
      }
      
      updateFields.push("test_id = ?");
      updateParameters.push(body.test_id);
    }
    
    if (body.gender !== undefined) {
      updateFields.push("gender = ?");
      updateParameters.push(body.gender || null);
    }
    
    if (body.age_low !== undefined) {
      updateFields.push("age_low = ?");
      updateParameters.push(body.age_low || null);
    }
    
    if (body.age_high !== undefined) {
      updateFields.push("age_high = ?");
      updateParameters.push(body.age_high || null);
    }
    
    if (body.value_low !== undefined) {
      updateFields.push("value_low = ?");
      updateParameters.push(body.value_low || null);
    }
    
    if (body.value_high !== undefined) {
      updateFields.push("value_high = ?");
      updateParameters.push(body.value_high || null);
    }
    
    if (body.text_value !== undefined) {
      updateFields.push("text_value = ?");
      updateParameters.push(body.text_value || null);
    }
    
    if (body.unit !== undefined) {
      updateFields.push("unit = ?");
      updateParameters.push(body.unit || null);
    }
    
    if (body.interpretation !== undefined) {
      updateFields.push("interpretation = ?");
      updateParameters.push(body.interpretation || null);
    }
    
    if (body.is_critical !== undefined) {
      updateFields.push("is_critical = ?");
      updateParameters.push(body.is_critical ? 1 : 0);
    }
    
    if (body.critical_low !== undefined) {
      updateFields.push("critical_low = ?");
      updateParameters.push(body.critical_low || null);
    }
    
    if (body.critical_high !== undefined) {
      updateFields.push("critical_high = ?");
      updateParameters.push(body.critical_high || null);
    }
    
    // Only proceed if there are fields to update
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }
    
    updateQuery += updateFields.join(", ") + " WHERE id = ?";
    updateParameters.push(rangeId);
    
    // Execute update
    await DB.query(updateQuery, updateParameters);
    
    // Fetch the updated reference range
    const fetchQuery = `
      SELECT 
        r.*,
        t.name as test_name,
        t.loinc_code
      FROM 
        lab_test_reference_ranges r
      JOIN 
        lab_tests t ON r.test_id = t.id
      WHERE 
        r.id = ?
    `;
    
    const rangeResult = await DB.query(fetchQuery, [rangeId]);
    const range = rangeResult.results?.[0];
    
    if (!range) {
      throw new Error("Failed to retrieve updated reference range");
    }
    
    // Return the updated reference range
    return NextResponse.json(range);
  } catch (error: unknown) {
    console.error("Error updating reference range:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update reference range", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/diagnostics/lab/reference-ranges/:id - Delete a reference range
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only lab managers and admins can delete reference ranges
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const rangeId = params.id;
    
    // Check if reference range exists
    const checkResult = await DB.query(
      "SELECT id FROM lab_test_reference_ranges WHERE id = ?",
      [rangeId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Reference range not found" },
        { status: 404 }
      );
    }
    
    // Delete the reference range
    await DB.query(
      "DELETE FROM lab_test_reference_ranges WHERE id = ?",
      [rangeId]
    );
    
    return NextResponse.json({
      message: "Reference range deleted successfully"
    });
  } catch (error: unknown) {
    console.error("Error deleting reference range:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete reference range", details: errorMessage },
      { status: 500 }
    );
  }
}
