// src/app/api/billing/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * GET /api/billing/categories
 * Retrieves a list of distinct service item categories.
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    
    // Query to get distinct categories from service_items table
    const { results } = await env.DB.prepare(`
      SELECT DISTINCT category 
      FROM service_items 
      WHERE is_active = 1
      ORDER BY category
    `).all();
    
    return NextResponse.json({ categories: results.map(row => row.category) });
  } catch (error) {
    console.error("Error fetching service item categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: error.message },
      { status: 500 }
    );
  }
}
