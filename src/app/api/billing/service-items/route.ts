// src/app/api/billing/service-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getCurrentUser, hasPermission, PERMISSIONS } from "@/lib/auth";

/**
 * GET /api/billing/service-items
 * Retrieves a list of service items, potentially filtered.
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

    // Check if user has permission to view service items
    if (!hasPermission(user, PERMISSIONS.VIEW_INVOICES)) {
      return NextResponse.json(
        { error: "You don't have permission to access this resource" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    
    const { env } = getRequestContext();
    
    // Build the SQL query based on filters
    let sql = `
      SELECT 
        id, 
        item_code, 
        item_name, 
        description, 
        category, 
        unit_price, 
        is_taxable, 
        is_discountable, 
        is_active
      FROM service_items 
      WHERE is_active = 1
    `;
    
    const params = [];
    
    // Add search filter if provided
    if (search) {
      sql += ` AND (item_name LIKE ? OR item_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Add category filter if provided
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    
    // Add order by clause
    sql += ` ORDER BY category, item_name`;
    
    // Prepare and execute the query
    let stmt = env.DB.prepare(sql);
    
    // Bind parameters if any
    if (params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        stmt = stmt.bind(params[i]);
      }
    }
    
    const { results } = await stmt.all();
    
    return NextResponse.json({ serviceItems: results });
  } catch (error) {
    console.error("Error fetching service items:", error);
    return NextResponse.json(
      { error: "Failed to fetch service items", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/service-items
 * Creates a new service item.
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

    // Check if user has permission to create service items
    if (!hasPermission(user, PERMISSIONS.CREATE_INVOICE)) {
      return NextResponse.json(
        { error: "You don't have permission to create service items" },
        { status: 403 }
      );
    }

    const itemData = await request.json();

    // Enhanced validation
    if (!itemData.item_code || !itemData.item_name || !itemData.category || itemData.unit_price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (item_code, item_name, category, unit_price)" },
        { status: 400 }
      );
    }

    // Validate data types and formats
    if (typeof itemData.item_code !== 'string' || itemData.item_code.length > 50) {
      return NextResponse.json(
        { error: "Invalid item_code format" },
        { status: 400 }
      );
    }

    if (typeof itemData.item_name !== 'string' || itemData.item_name.length > 255) {
      return NextResponse.json(
        { error: "Invalid item_name format" },
        { status: 400 }
      );
    }

    if (typeof itemData.unit_price !== 'number' || itemData.unit_price < 0) {
      return NextResponse.json(
        { error: "Unit price must be a positive number" },
        { status: 400 }
      );
    }

    const { env } = getRequestContext();
    
    // Check if item_code already exists
    const existingItem = await env.DB.prepare(
      "SELECT id FROM service_items WHERE item_code = ?"
    ).bind(itemData.item_code).first();
    
    if (existingItem) {
      return NextResponse.json(
        { error: "Item code already exists" },
        { status: 400 }
      );
    }
    
    // Insert the new service item
    const info = await env.DB.prepare(`
      INSERT INTO service_items (
        item_code, 
        item_name, 
        description, 
        category, 
        unit_price, 
        is_taxable, 
        is_discountable, 
        is_active,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      itemData.item_code,
      itemData.item_name,
      itemData.description || "",
      itemData.category,
      itemData.unit_price,
      itemData.is_taxable ? 1 : 0,
      itemData.is_discountable ? 1 : 0,
      1,
      user.id
    ).run();
    
    // Get the newly created item
    const newItem = await env.DB.prepare(
      "SELECT * FROM service_items WHERE id = ?"
    ).bind(info.meta.last_row_id).first();

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
      'service_item',
      info.meta.last_row_id,
      JSON.stringify({ item_code: itemData.item_code, item_name: itemData.item_name }),
      request.headers.get('x-forwarded-for') || request.ip || 'unknown'
    ).run();

    return NextResponse.json({ serviceItem: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating service item:", error);
    return NextResponse.json(
      { error: "Failed to create service item", details: error.message },
      { status: 500 }
    );
  }
}
