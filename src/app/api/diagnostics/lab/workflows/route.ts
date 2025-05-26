import { NextRequest, NextResponse } from "next/server";
import { DB } from "@/lib/database";
import { getSession } from "@/lib/session";
import { encryptSensitiveData } from "@/lib/encryption"; // Assuming encryption service from Manus 9

// Interface for the request body when creating a lab test workflow
interface TestWorkflowCreateBody {
  name: string;
  description?: string;
  steps: Array<{
    sequence: number;
    name: string;
    description?: string;
    estimated_time?: number; // in minutes
    requires_verification?: boolean;
    role_required?: string;
  }>;
  is_active?: boolean;
  applicable_test_ids?: number[];
}

// GET /api/diagnostics/lab/workflows - Get all test workflows
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const isActive = searchParams.get("isActive");
    const testId = searchParams.get("testId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Build query
    let query = `
      SELECT 
        w.*,
        (SELECT COUNT(*) FROM lab_test_workflow_steps WHERE workflow_id = w.id) as step_count
      FROM 
        lab_test_workflows w
    `;
    
    // Add filters
    const parameters: any[] = [];
    const conditions: string[] = [];
    
    if (name) {
      conditions.push("w.name LIKE ?");
      parameters.push(`%${name}%`);
    }
    
    if (isActive !== null && isActive !== undefined) {
      conditions.push("w.is_active = ?");
      parameters.push(isActive === "true" ? 1 : 0);
    }
    
    if (testId) {
      query = `
        SELECT 
          w.*,
          (SELECT COUNT(*) FROM lab_test_workflow_steps WHERE workflow_id = w.id) as step_count
        FROM 
          lab_test_workflows w
        JOIN
          lab_test_workflow_mappings m ON w.id = m.workflow_id
        WHERE
          m.test_id = ?
      `;
      parameters.push(testId);
      
      if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
      }
    } else if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    // Add ordering
    query += " ORDER BY w.name ASC";
    
    // Add pagination
    query += " LIMIT ? OFFSET ?";
    parameters.push(pageSize, offset);
    
    // Execute query
    const workflowsResult = await DB.query(query, parameters);
    const workflows = workflowsResult.results || [];
    
    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM lab_test_workflows w";
    
    if (testId) {
      countQuery = `
        SELECT COUNT(*) as total 
        FROM lab_test_workflows w
        JOIN lab_test_workflow_mappings m ON w.id = m.workflow_id
        WHERE m.test_id = ?
      `;
      
      if (conditions.length > 0) {
        countQuery += " AND " + conditions.join(" AND ");
      }
    } else if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    
    const countResult = await DB.query(countQuery, testId ? [testId, ...parameters.slice(0, -2)] : parameters.slice(0, -2));
    const totalCount = countResult.results?.[0]?.total || 0;
    
    // Fetch workflow steps and applicable tests for each workflow
    const workflowsWithDetails = await Promise.all(
      workflows.map(async (workflow) => {
        // Fetch steps
        const stepsQuery = `
          SELECT * FROM lab_test_workflow_steps
          WHERE workflow_id = ?
          ORDER BY sequence
        `;
        
        const stepsResult = await DB.query(stepsQuery, [workflow.id]);
        const steps = stepsResult.results || [];
        
        // Fetch applicable tests
        const testsQuery = `
          SELECT 
            m.test_id,
            t.name as test_name,
            t.loinc_code
          FROM 
            lab_test_workflow_mappings m
          JOIN 
            lab_tests t ON m.test_id = t.id
          WHERE 
            m.workflow_id = ?
        `;
        
        const testsResult = await DB.query(testsQuery, [workflow.id]);
        const tests = testsResult.results || [];
        
        return {
          ...workflow,
          steps,
          applicable_tests: tests
        };
      })
    );
    
    // Return workflows with pagination metadata
    return NextResponse.json({
      data: workflowsWithDetails,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error: unknown) {
    console.error("Error fetching test workflows:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch test workflows", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/diagnostics/lab/workflows - Create a new test workflow
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Check authentication and authorization
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Only lab managers and admins can create test workflows
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json() as TestWorkflowCreateBody;
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Workflow name is required" },
        { status: 400 }
      );
    }
    
    if (!body.steps || body.steps.length === 0) {
      return NextResponse.json(
        { error: "Workflow must include at least one step" },
        { status: 400 }
      );
    }
    
    // Validate step sequences
    const sequences = body.steps.map(step => step.sequence);
    const uniqueSequences = new Set(sequences);
    
    if (sequences.length !== uniqueSequences.size) {
      return NextResponse.json(
        { error: "Step sequences must be unique" },
        { status: 400 }
      );
    }
    
    // Validate applicable tests if provided
    if (body.applicable_test_ids && body.applicable_test_ids.length > 0) {
      for (const testId of body.applicable_test_ids) {
        const testCheckResult = await DB.query(
          "SELECT id FROM lab_tests WHERE id = ?",
          [testId]
        );
        
        if (!testCheckResult.results || testCheckResult.results.length === 0) {
          return NextResponse.json(
            { error: `Test with ID ${testId} not found` },
            { status: 404 }
          );
        }
      }
    }
    
    // Start transaction
    await DB.query("BEGIN TRANSACTION", []);
    
    try {
      // Insert workflow
      const insertWorkflowQuery = `
        INSERT INTO lab_test_workflows (
          name, description, is_active, created_by, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      
      const insertWorkflowParameters = [
        body.name,
        body.description || "",
        body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
        session.user.id
      ];
      
      const workflowResult = await DB.query(insertWorkflowQuery, insertWorkflowParameters);
      const workflowId = workflowResult.insertId;
      
      // Insert workflow steps
      for (const step of body.steps) {
        const insertStepQuery = `
          INSERT INTO lab_test_workflow_steps (
            workflow_id, sequence, name, description, 
            estimated_time, requires_verification, role_required
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const insertStepParameters = [
          workflowId,
          step.sequence,
          step.name,
          step.description || "",
          step.estimated_time || null,
          step.requires_verification ? 1 : 0,
          step.role_required || null
        ];
        
        await DB.query(insertStepQuery, insertStepParameters);
      }
      
      // Insert workflow-test mappings if applicable
      if (body.applicable_test_ids && body.applicable_test_ids.length > 0) {
        for (const testId of body.applicable_test_ids) {
          await DB.query(
            "INSERT INTO lab_test_workflow_mappings (workflow_id, test_id) VALUES (?, ?)",
            [workflowId, testId]
          );
        }
      }
      
      // Commit transaction
      await DB.query("COMMIT", []);
      
      // Fetch the complete workflow with all related data
      const fetchWorkflowQuery = `
        SELECT * FROM lab_test_workflows WHERE id = ?
      `;
      
      const workflowFetchResult = await DB.query(fetchWorkflowQuery, [workflowId]);
      const workflow = workflowFetchResult.results?.[0];
      
      if (!workflow) {
        throw new Error("Failed to retrieve created workflow");
      }
      
      // Fetch workflow steps
      const stepsQuery = `
        SELECT * FROM lab_test_workflow_steps
        WHERE workflow_id = ?
        ORDER BY sequence
      `;
      
      const stepsResult = await DB.query(stepsQuery, [workflowId]);
      const steps = stepsResult.results || [];
      
      // Fetch applicable tests
      const testsQuery = `
        SELECT 
          m.test_id,
          t.name as test_name,
          t.loinc_code
        FROM 
          lab_test_workflow_mappings m
        JOIN 
          lab_tests t ON m.test_id = t.id
        WHERE 
          m.workflow_id = ?
      `;
      
      const testsResult = await DB.query(testsQuery, [workflowId]);
      const tests = testsResult.results || [];
      
      // Construct complete response
      const completeWorkflow = {
        ...workflow,
        steps,
        applicable_tests: tests
      };
      
      // Return the created workflow
      return NextResponse.json(completeWorkflow, { status: 201 });
    } catch (error) {
      // Rollback transaction on error
      await DB.query("ROLLBACK", []);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error creating test workflow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create test workflow", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/diagnostics/lab/workflows/:id - Get a specific test workflow
export async function GET_BY_ID(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const workflowId = params.id;
    
    // Fetch workflow
    const fetchWorkflowQuery = `
      SELECT * FROM lab_test_workflows WHERE id = ?
    `;
    
    const workflowResult = await DB.query(fetchWorkflowQuery, [workflowId]);
    const workflow = workflowResult.results?.[0];
    
    if (!workflow) {
      return NextResponse.json(
        { error: "Test workflow not found" },
        { status: 404 }
      );
    }
    
    // Fetch workflow steps
    const stepsQuery = `
      SELECT * FROM lab_test_workflow_steps
      WHERE workflow_id = ?
      ORDER BY sequence
    `;
    
    const stepsResult = await DB.query(stepsQuery, [workflowId]);
    const steps = stepsResult.results || [];
    
    // Fetch applicable tests
    const testsQuery = `
      SELECT 
        m.test_id,
        t.name as test_name,
        t.loinc_code
      FROM 
        lab_test_workflow_mappings m
      JOIN 
        lab_tests t ON m.test_id = t.id
      WHERE 
        m.workflow_id = ?
    `;
    
    const testsResult = await DB.query(testsQuery, [workflowId]);
    const tests = testsResult.results || [];
    
    // Construct complete response
    const completeWorkflow = {
      ...workflow,
      steps,
      applicable_tests: tests
    };
    
    // Return the workflow
    return NextResponse.json(completeWorkflow);
  } catch (error: unknown) {
    console.error("Error fetching test workflow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch test workflow", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/diagnostics/lab/workflows/:id - Update a test workflow
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
    
    // Only lab managers and admins can update test workflows
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const workflowId = params.id;
    
    // Check if workflow exists
    const checkResult = await DB.query(
      "SELECT id FROM lab_test_workflows WHERE id = ?",
      [workflowId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Test workflow not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json() as Partial<TestWorkflowCreateBody>;
    
    // Validate step sequences if steps are provided
    if (body.steps && body.steps.length > 0) {
      const sequences = body.steps.map(step => step.sequence);
      const uniqueSequences = new Set(sequences);
      
      if (sequences.length !== uniqueSequences.size) {
        return NextResponse.json(
          { error: "Step sequences must be unique" },
          { status: 400 }
        );
      }
    }
    
    // Validate applicable tests if provided
    if (body.applicable_test_ids && body.applicable_test_ids.length > 0) {
      for (const testId of body.applicable_test_ids) {
        const testCheckResult = await DB.query(
          "SELECT id FROM lab_tests WHERE id = ?",
          [testId]
        );
        
        if (!testCheckResult.results || testCheckResult.results.length === 0) {
          return NextResponse.json(
            { error: `Test with ID ${testId} not found` },
            { status: 404 }
          );
        }
      }
    }
    
    // Start transaction
    await DB.query("BEGIN TRANSACTION", []);
    
    try {
      // Update workflow
      if (body.name !== undefined || body.description !== undefined || body.is_active !== undefined) {
        let updateQuery = "UPDATE lab_test_workflows SET ";
        const updateFields: string[] = [];
        const updateParameters: any[] = [];
        
        if (body.name !== undefined) {
          updateFields.push("name = ?");
          updateParameters.push(body.name);
        }
        
        if (body.description !== undefined) {
          updateFields.push("description = ?");
          updateParameters.push(body.description);
        }
        
        if (body.is_active !== undefined) {
          updateFields.push("is_active = ?");
          updateParameters.push(body.is_active ? 1 : 0);
        }
        
        updateFields.push("updated_by = ?");
        updateParameters.push(session.user.id);
        
        updateFields.push("updated_at = NOW()");
        
        updateQuery += updateFields.join(", ") + " WHERE id = ?";
        updateParameters.push(workflowId);
        
        await DB.query(updateQuery, updateParameters);
      }
      
      // Update workflow steps if provided
      if (body.steps !== undefined) {
        // Delete existing steps
        await DB.query(
          "DELETE FROM lab_test_workflow_steps WHERE workflow_id = ?",
          [workflowId]
        );
        
        // Insert new steps
        if (body.steps.length > 0) {
          for (const step of body.steps) {
            const insertStepQuery = `
              INSERT INTO lab_test_workflow_steps (
                workflow_id, sequence, name, description, 
                estimated_time, requires_verification, role_required
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const insertStepParameters = [
              workflowId,
              step.sequence,
              step.name,
              step.description || "",
              step.estimated_time || null,
              step.requires_verification ? 1 : 0,
              step.role_required || null
            ];
            
            await DB.query(insertStepQuery, insertStepParameters);
          }
        } else {
          return NextResponse.json(
            { error: "Workflow must include at least one step" },
            { status: 400 }
          );
        }
      }
      
      // Update workflow-test mappings if provided
      if (body.applicable_test_ids !== undefined) {
        // Delete existing mappings
        await DB.query(
          "DELETE FROM lab_test_workflow_mappings WHERE workflow_id = ?",
          [workflowId]
        );
        
        // Insert new mappings
        if (body.applicable_test_ids.length > 0) {
          for (const testId of body.applicable_test_ids) {
            await DB.query(
              "INSERT INTO lab_test_workflow_mappings (workflow_id, test_id) VALUES (?, ?)",
              [workflowId, testId]
            );
          }
        }
      }
      
      // Commit transaction
      await DB.query("COMMIT", []);
      
      // Fetch the updated workflow with all related data
      const fetchWorkflowQuery = `
        SELECT * FROM lab_test_workflows WHERE id = ?
      `;
      
      const workflowResult = await DB.query(fetchWorkflowQuery, [workflowId]);
      const workflow = workflowResult.results?.[0];
      
      if (!workflow) {
        throw new Error("Failed to retrieve updated workflow");
      }
      
      // Fetch workflow steps
      const stepsQuery = `
        SELECT * FROM lab_test_workflow_steps
        WHERE workflow_id = ?
        ORDER BY sequence
      `;
      
      const stepsResult = await DB.query(stepsQuery, [workflowId]);
      const steps = stepsResult.results || [];
      
      // Fetch applicable tests
      const testsQuery = `
        SELECT 
          m.test_id,
          t.name as test_name,
          t.loinc_code
        FROM 
          lab_test_workflow_mappings m
        JOIN 
          lab_tests t ON m.test_id = t.id
        WHERE 
          m.workflow_id = ?
      `;
      
      const testsResult = await DB.query(testsQuery, [workflowId]);
      const tests = testsResult.results || [];
      
      // Construct complete response
      const completeWorkflow = {
        ...workflow,
        steps,
        applicable_tests: tests
      };
      
      // Return the updated workflow
      return NextResponse.json(completeWorkflow);
    } catch (error) {
      // Rollback transaction on error
      await DB.query("ROLLBACK", []);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error updating test workflow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update test workflow", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/diagnostics/lab/workflows/:id - Delete a test workflow
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
    
    // Only lab managers and admins can delete test workflows
    if (!["admin", "lab_manager"].includes(session.user.roleName)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const workflowId = params.id;
    
    // Check if workflow exists
    const checkResult = await DB.query(
      "SELECT id FROM lab_test_workflows WHERE id = ?",
      [workflowId]
    );
    
    if (!checkResult.results || checkResult.results.length === 0) {
      return NextResponse.json(
        { error: "Test workflow not found" },
        { status: 404 }
      );
    }
    
    // Check if workflow is in use
    const usageCheckResult = await DB.query(
      "SELECT id FROM lab_orders WHERE workflow_id = ? LIMIT 1",
      [workflowId]
    );
    
    if (usageCheckResult.results && usageCheckResult.results.length > 0) {
      // Instead of deleting, mark as inactive
      await DB.query(
        "UPDATE lab_test_workflows SET is_active = 0 WHERE id = ?",
        [workflowId]
      );
      
      return NextResponse.json({
        message: "Workflow is in use and cannot be deleted. It has been marked as inactive instead."
      });
    }
    
    // Start transaction
    await DB.query("BEGIN TRANSACTION", []);
    
    try {
      // Delete workflow-test mappings
      await DB.query(
        "DELETE FROM lab_test_workflow_mappings WHERE workflow_id = ?",
        [workflowId]
      );
      
      // Delete workflow steps
      await DB.query(
        "DELETE FROM lab_test_workflow_steps WHERE workflow_id = ?",
        [workflowId]
      );
      
      // Delete workflow
      await DB.query(
        "DELETE FROM lab_test_workflows WHERE id = ?",
        [workflowId]
      );
      
      // Commit transaction
      await DB.query("COMMIT", []);
      
      return NextResponse.json({
        message: "Test workflow deleted successfully"
      });
    } catch (error) {
      // Rollback transaction on error
      await DB.query("ROLLBACK", []);
      throw error;
    }
  } catch (error: unknown) {
    console.error("Error deleting test workflow:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete test workflow", details: errorMessage },
      { status: 500 }
    );
  }
}
