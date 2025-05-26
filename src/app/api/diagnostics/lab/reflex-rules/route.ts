import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { getSession } from "@/lib/session";

// Interface for the request body when creating a reflex rule
interface ReflexRuleCreateBody {
  condition_test_id: number;
  condition_operator: "eq" | "ne" | "lt" | "gt" | "le" | "ge";
  condition_value: string;
  action_test_id: number;
  priority?: "routine" | "urgent" | "stat";
  description?: string;
  is_active?: boolean;
}

// GET /api/diagnostics/lab/reflex-rules - Get reflex testing rules
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
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Build query
    let query = `
      SELECT 
        r.*,
        ct.name as condition_test_name,
        ct.loinc_code as condition_test_loinc,
        at.name as action_test_name,
        at.loinc_code as action_test_loinc
      FROM 
        lab_test_reflex_rules r
      JOIN 
        lab_tests ct ON r.condition_test_id = ct.id
      JOIN 
        lab_tests at ON r.action_test_id = at.id
    `;
    
    // Add filters
    const parameters: any[] = [];
    const conditions: string[] = [];
    
    if (testId) {
      conditions.push("r.condition_test_id = ?");
      parameters.push(testId);
    }
    
    if (isActive !== null && isActive !== undefined) {
      conditions.push("r.is_active = ?");
      parameters.push(isActive === "true" ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    // Add ordering
    query += " ORDER BY r.condition_test_id ASC, r.condition_value ASC";
    
    // Add pagination
    query += " LIMIT ? OFFSET ?";
    parameters.push(pageSize, offset);
    
    // Execute query
    const rulesResult = await DB.query(query, parameters);
    const rules = rulesResult.results || [];
    
    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM lab_test_reflex_rules r";
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    
    const countResult = await DB.query(countQuery, parameters.slice(0, -2));
    const totalCount = countResult.results?.[0]?.total || 0;
    
    // Return rules with pagination metadata
    return NextResponse.json({
      data: rules,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error: unknown) {
    console.error("Error fetching reflex rules:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reflex rules", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/diagnostics/lab/reflex-rules - Create a new reflex rule
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only lab managers and admins can create reflex rules
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json() as ReflexRuleCreateBody;
    
    // Validate required fields
    const requiredFields: (keyof ReflexRuleCreateBody)[] = [
      "condition_test_id",
      "condition_operator",
      "condition_value",
      "action_test_id"
    ];
    
    for (const field of requiredFields) {
      if (!(field in body) || body[field] === undefined || body[field] === "") {
        return NextResponse.json(
          { error: `Missing or invalid required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate condition operator
    const validOperators = ["eq", "ne", "lt", "gt", "le", "ge"];
    if (!validOperators.includes(body.condition_operator)) {
      return NextResponse.json(
        { error: "Invalid condition operator" },
        { status: 400 }
      );
    }
    
    // Validate priority if provided
    if (body.priority && !["routine", "urgent", "stat"].includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }
    
    // Check if condition test exists
    const conditionTestCheckResult = await DB.query(
      "SELECT id FROM lab_tests WHERE id = ?",
      [body.condition_test_id]
    );
    
    if (!conditionTestCheckResult.results || conditionTestCheckResult.results.length === 0) {
      return NextResponse.json(
        { error: "Condition test not found" },
        { status: 404 }
      );
    }
    
    // Check if action test exists
    const actionTestCheckResult = await DB.query(
      "SELECT id FROM lab_tests WHERE id = ?",
      [body.action_test_id]
    );
    
    if (!actionTestCheckResult.results || actionTestCheckResult.results.length === 0) {
      return NextResponse.json(
        { error: "Action test not found" },
        { status: 404 }
      );
    }
    
    // Check for duplicate rule
    const duplicateCheckResult = await DB.query(
      `SELECT id FROM lab_test_reflex_rules 
       WHERE condition_test_id = ? 
         AND condition_operator = ? 
         AND condition_value = ? 
         AND action_test_id = ?`,
      [
        body.condition_test_id,
        body.condition_operator,
        body.condition_value,
        body.action_test_id
      ]
    );
    
    if (duplicateCheckResult.results && duplicateCheckResult.results.length > 0) {
      return NextResponse.json(
        { error: "A duplicate reflex rule already exists" },
        { status: 400 }
      );
    }
    
    // Insert reflex rule
    const insertQuery = `
      INSERT INTO lab_test_reflex_rules (
        condition_test_id, condition_operator, condition_value,
        action_test_id, priority, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParameters = [
      body.condition_test_id,
      body.condition_operator,
      body.condition_value,
      body.action_test_id,
      body.priority || "routine",
      body.description || "",
      body.is_active === undefined ? 1 : (body.is_active ? 1 : 0)
    ];
    
    const result = await DB.query(insertQuery, insertParameters);
    const ruleId = result.insertId;
    
    // Fetch the created reflex rule
    const fetchQuery = `
      SELECT 
        r.*,
        ct.name as condition_test_name,
        ct.loinc_code as condition_test_loinc,
        at.name as action_test_name,
        at.loinc_code as action_test_loinc
      FROM 
        lab_test_reflex_rules r
      JOIN 
        lab_tests ct ON r.condition_test_id = ct.id
      JOIN 
        lab_tests at ON r.action_test_id = at.id
      WHERE 
        r.id = ?
    `;
    
    const ruleResult = await DB.query(fetchQuery, [ruleId]);
    const rule = ruleResult.results?.[0];
    
    if (!rule) {
      throw new Error("Failed to retrieve created reflex rule");
    }
    
    // Return the created reflex rule
    return NextResponse.json(rule, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating reflex rule:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create reflex rule", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/diagnostics/lab/reflex-rules/:id - Update a reflex rule
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
    
    // Only lab managers and admins can update reflex rules
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const ruleId = params.id;
    
    // Check if reflex rule exists
    const checkResult = await DB.query(
      "SELECT id FROM lab_test_reflex_rules WHERE id = ?",
      [ruleId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Reflex rule not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json() as Partial<ReflexRuleCreateBody>;
    
    // Validate condition operator if provided
    if (body.condition_operator) {
      const validOperators = ["eq", "ne", "lt", "gt", "le", "ge"];
      if (!validOperators.includes(body.condition_operator)) {
        return NextResponse.json(
          { error: "Invalid condition operator" },
          { status: 400 }
        );
      }
    }
    
    // Validate priority if provided
    if (body.priority && !["routine", "urgent", "stat"].includes(body.priority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }
    
    // Check if condition test exists if provided
    if (body.condition_test_id) {
      const conditionTestCheckResult = await DB.query(
        "SELECT id FROM lab_tests WHERE id = ?",
        [body.condition_test_id]
      );
      
      if (!conditionTestCheckResult.results || conditionTestCheckResult.results.length === 0) {
        return NextResponse.json(
          { error: "Condition test not found" },
          { status: 404 }
        );
      }
    }
    
    // Check if action test exists if provided
    if (body.action_test_id) {
      const actionTestCheckResult = await DB.query(
        "SELECT id FROM lab_tests WHERE id = ?",
        [body.action_test_id]
      );
      
      if (!actionTestCheckResult.results || actionTestCheckResult.results.length === 0) {
        return NextResponse.json(
          { error: "Action test not found" },
          { status: 404 }
        );
      }
    }
    
    // Check for duplicate rule if key fields are being updated
    if (
      body.condition_test_id !== undefined ||
      body.condition_operator !== undefined ||
      body.condition_value !== undefined ||
      body.action_test_id !== undefined
    ) {
      // Get current values for fields not included in the update
      const currentResult = await DB.query(
        `SELECT 
          condition_test_id, condition_operator, condition_value, action_test_id 
         FROM lab_test_reflex_rules 
         WHERE id = ?`,
        [ruleId]
      );
      
      const current = currentResult.results?.[0];
      
      const updatedConditionTestId = body.condition_test_id !== undefined ? body.condition_test_id : current.condition_test_id;
      const updatedConditionOperator = body.condition_operator !== undefined ? body.condition_operator : current.condition_operator;
      const updatedConditionValue = body.condition_value !== undefined ? body.condition_value : current.condition_value;
      const updatedActionTestId = body.action_test_id !== undefined ? body.action_test_id : current.action_test_id;
      
      const duplicateCheckResult = await DB.query(
        `SELECT id FROM lab_test_reflex_rules 
         WHERE condition_test_id = ? 
           AND condition_operator = ? 
           AND condition_value = ? 
           AND action_test_id = ?
           AND id != ?`,
        [
          updatedConditionTestId,
          updatedConditionOperator,
          updatedConditionValue,
          updatedActionTestId,
          ruleId
        ]
      );
      
      if (duplicateCheckResult.results && duplicateCheckResult.results.length > 0) {
        return NextResponse.json(
          { error: "A duplicate reflex rule already exists" },
          { status: 400 }
        );
      }
    }
    
    // Build update query
    let updateQuery = "UPDATE lab_test_reflex_rules SET ";
    const updateFields: string[] = [];
    const updateParameters: any[] = [];
    
    if (body.condition_test_id !== undefined) {
      updateFields.push("condition_test_id = ?");
      updateParameters.push(body.condition_test_id);
    }
    
    if (body.condition_operator !== undefined) {
      updateFields.push("condition_operator = ?");
      updateParameters.push(body.condition_operator);
    }
    
    if (body.condition_value !== undefined) {
      updateFields.push("condition_value = ?");
      updateParameters.push(body.condition_value);
    }
    
    if (body.action_test_id !== undefined) {
      updateFields.push("action_test_id = ?");
      updateParameters.push(body.action_test_id);
    }
    
    if (body.priority !== undefined) {
      updateFields.push("priority = ?");
      updateParameters.push(body.priority);
    }
    
    if (body.description !== undefined) {
      updateFields.push("description = ?");
      updateParameters.push(body.description);
    }
    
    if (body.is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateParameters.push(body.is_active ? 1 : 0);
    }
    
    // Only proceed if there are fields to update
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }
    
    updateQuery += updateFields.join(", ") + " WHERE id = ?";
    updateParameters.push(ruleId);
    
    // Execute update
    await DB.query(updateQuery, updateParameters);
    
    // Fetch the updated reflex rule
    const fetchQuery = `
      SELECT 
        r.*,
        ct.name as condition_test_name,
        ct.loinc_code as condition_test_loinc,
        at.name as action_test_name,
        at.loinc_code as action_test_loinc
      FROM 
        lab_test_reflex_rules r
      JOIN 
        lab_tests ct ON r.condition_test_id = ct.id
      JOIN 
        lab_tests at ON r.action_test_id = at.id
      WHERE 
        r.id = ?
    `;
    
    const ruleResult = await DB.query(fetchQuery, [ruleId]);
    const rule = ruleResult.results?.[0];
    
    if (!rule) {
      throw new Error("Failed to retrieve updated reflex rule");
    }
    
    // Return the updated reflex rule
    return NextResponse.json(rule);
  } catch (error: unknown) {
    console.error("Error updating reflex rule:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update reflex rule", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/diagnostics/lab/reflex-rules/:id - Delete a reflex rule
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
    
    // Only lab managers and admins can delete reflex rules
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const ruleId = params.id;
    
    // Check if reflex rule exists
    const checkResult = await DB.query(
      "SELECT id FROM lab_test_reflex_rules WHERE id = ?",
      [ruleId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Reflex rule not found" },
        { status: 404 }
      );
    }
    
    // Delete the reflex rule
    await DB.query(
      "DELETE FROM lab_test_reflex_rules WHERE id = ?",
      [ruleId]
    );
    
    return NextResponse.json({
      message: "Reflex rule deleted successfully"
    });
  } catch (error: unknown) {
    console.error("Error deleting reflex rule:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete reflex rule", details: errorMessage },
      { status: 500 }
    );
  }
}
