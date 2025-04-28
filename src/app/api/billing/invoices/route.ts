// src/app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getCurrentUser, hasPermission, PERMISSIONS } from "@/lib/auth";

/**
 * GET /api/billing/invoices
 * Retrieves a list of invoices, potentially filtered.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has permission to view invoices
    if (!hasPermission(user, PERMISSIONS.VIEW_INVOICES)) {
      return NextResponse.json(
        { error: "You don't have permission to access this resource" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate input parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: "Maximum limit is 100 records" },
        { status: 400 }
      );
    }

    if (offset < 0 || limit < 1) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();

    // Build the SQL query using correct table names
    let sql = `
      SELECT 
        i.id, 
        i.invoice_number, 
        i.patient_id, 
        p.first_name || ' ' || p.last_name as patient_name, 
        i.invoice_date, 
        i.total_amount, 
        i.amount_paid,
        i.amount_due, 
        i.status
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (patientId) {
      sql += ` AND i.patient_id = ?`;
      params.push(parseInt(patientId));
    }
    if (status) {
      sql += ` AND i.status = ?`;
      params.push(status);
    }

    // If user is not admin or billing staff, restrict to their own data
    if (user.role === 'patient') {
      sql += ` AND p.user_id = ?`;
      params.push(user.id);
    } else if (user.role === 'doctor') {
      sql += ` AND EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = i.patient_id AND a.doctor_id = ?)`;
      params.push(user.id);
    }

    sql += ` ORDER BY i.invoice_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Prepare and execute the query
    let stmt = env.DB.prepare(sql);
    if (params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        stmt = stmt.bind(params[i]);
      }
    }

    const { results } = await stmt.all();

    // Also get total count for pagination using correct table name
    let countSql = `SELECT COUNT(*) as total FROM invoices i WHERE 1=1`;
    const countParams = [];
    if (patientId) {
      countSql += ` AND i.patient_id = ?`;
      countParams.push(parseInt(patientId));
    }
    if (status) {
      countSql += ` AND i.status = ?`;
      countParams.push(status);
    }
    
    // Apply same user role restrictions to count query
    if (user.role === 'patient') {
      countSql += ` AND EXISTS (SELECT 1 FROM patients p WHERE p.id = i.patient_id AND p.user_id = ?)`;
      countParams.push(user.id);
    } else if (user.role === 'doctor') {
      countSql += ` AND EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = i.patient_id AND a.doctor_id = ?)`;
      countParams.push(user.id);
    }
    
    let countStmt = env.DB.prepare(countSql);
    if (countParams.length > 0) {
      for (let i = 0; i < countParams.length; i++) {
        countStmt = countStmt.bind(countParams[i]);
      }
    }
    const countResult = await countStmt.first<{ total: number }>();
    const totalCount = countResult?.total || 0;

    // Log the access
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        details,
        ip_address,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      user.id,
      'VIEW',
      'invoices',
      JSON.stringify({ filters: { patientId, status, limit, offset } }),
      request.headers.get('x-forwarded-for') || request.ip || 'unknown'
    ).run();

    return NextResponse.json({ invoices: results, totalCount });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/invoices
 * Creates a new invoice.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has permission to create invoices
    if (!hasPermission(user, PERMISSIONS.CREATE_INVOICE)) {
      return NextResponse.json(
        { error: "You don't have permission to create invoices" },
        { status: 403 }
      );
    }

    const invoiceData = await request.json();

    // Enhanced validation
    if (!invoiceData.patient_id || !invoiceData.items || invoiceData.items.length === 0 || invoiceData.total_amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (patient_id, items, total_amount)" },
        { status: 400 }
      );
    }

    // Validate data types and formats
    if (typeof invoiceData.patient_id !== 'number' || invoiceData.patient_id <= 0) {
      return NextResponse.json(
        { error: "Invalid patient_id format" },
        { status: 400 }
      );
    }

    if (typeof invoiceData.total_amount !== 'number' || invoiceData.total_amount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return NextResponse.json(
        { error: "Items must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of invoiceData.items) {
      if (!item.service_item_id || !item.quantity || !item.unit_price || !item.subtotal) {
        return NextResponse.json(
          { error: "Each item must have service_item_id, quantity, unit_price, and subtotal" },
          { status: 400 }
        );
      }
      
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Item quantity must be a positive number" },
          { status: 400 }
        );
      }
      
      if (typeof item.unit_price !== 'number' || item.unit_price <= 0) {
        return NextResponse.json(
          { error: "Item unit price must be a positive number" },
          { status: 400 }
        );
      }
      
      if (typeof item.subtotal !== 'number' || item.subtotal <= 0) {
        return NextResponse.json(
          { error: "Item subtotal must be a positive number" },
          { status: 400 }
        );
      }
      
      // Verify subtotal calculation
      const calculatedSubtotal = item.quantity * item.unit_price;
      if (Math.abs(calculatedSubtotal - item.subtotal) > 0.01) { // Allow small floating point differences
        return NextResponse.json(
          { error: "Item subtotal doesn't match quantity * unit_price" },
          { status: 400 }
        );
      }
    }

    // Verify total amount matches sum of subtotals
    const calculatedTotal = invoiceData.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    if (Math.abs(calculatedTotal - invoiceData.total_amount) > 0.01) { // Allow small floating point differences
      return NextResponse.json(
        { error: "Total amount doesn't match sum of item subtotals" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();

    // Verify patient exists
    const patientExists = await env.DB.prepare(
      "SELECT id FROM patients WHERE id = ?"
    ).bind(invoiceData.patient_id).first();
    
    if (!patientExists) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Generate a unique invoice number (e.g., INV-YYYYMMDD-XXXX)
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "");
    const sequenceResult = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM invoices WHERE invoice_date = ?"
    ).bind(today.toISOString().slice(0, 10)).first<{ count: number }>();
    const sequence = (sequenceResult?.count || 0) + 1;
    const invoiceNumber = `INV-${datePrefix}-${sequence.toString().padStart(4, '0')}`;

    // Use a transaction to ensure atomicity
    const results = await env.DB.batch([
      // 1. Insert into invoices
      env.DB.prepare(`
        INSERT INTO invoices (
          patient_id, 
          invoice_number, 
          invoice_date, 
          total_amount, 
          amount_paid,
          amount_due, 
          status,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        invoiceData.patient_id,
        invoiceNumber,
        today.toISOString().slice(0, 10), // Use current date as invoice date
        invoiceData.total_amount,
        0, // Initial paid amount is 0
        invoiceData.total_amount, // Initial amount due is total amount
        'draft', // Initial status
        user.id // Created by current user
      ),
      // 2. Insert into invoice_items
      ...invoiceData.items.map((item: any) => 
        env.DB.prepare(`
          INSERT INTO invoice_items (
            invoice_id, 
            item_description,
            quantity, 
            unit_price, 
            sub_total,
            total_amount,
            service_item_id 
          ) VALUES (last_insert_rowid(), ?, ?, ?, ?, ?, ?)
        `).bind(
          item.item_name,
          item.quantity,
          item.unit_price,
          item.subtotal,
          item.subtotal,
          item.service_item_id
        )
      )
    ]);
    
    // Check if batch execution was successful
    if (!results || results.length === 0 || !results[0].meta.last_row_id) {
        throw new Error("Failed to insert invoice or items");
    }
    
    const newInvoiceId = results[0].meta.last_row_id;

    // Fetch the newly created invoice to return it
    const newInvoice = await env.DB.prepare(
      "SELECT * FROM invoices WHERE id = ?"
    ).bind(newInvoiceId).first();

    // Log the action
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      user.id,
      'CREATE',
      'invoice',
      newInvoiceId,
      JSON.stringify({ 
        invoice_number: invoiceNumber, 
        patient_id: invoiceData.patient_id,
        total_amount: invoiceData.total_amount,
        items_count: invoiceData.items.length
      }),
      request.headers.get('x-forwarded-for') || request.ip || 'unknown'
    ).run();

    return NextResponse.json({ invoice: newInvoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice", details: error.message },
      { status: 500 }
    );
  }
}
