// src/app/api/billing/categories/route.ts
import { NextResponse } from "next/server";
// import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * GET /api/billing/categories
 * Retrieves a list of distinct service item categories.
 */
export async function GET() {
  try {
    // const { env } = getRequestContext();

    // Mock implementation for development without Cloudflare
    // In a real implementation, this would connect to your database

    // Mock categories for development
    const mockCategories = [
      "Consultation",
      "Laboratory",
      "Radiology",
      "Procedure",
      "Pharmacy",
      "Room Charge",
      "Other",
    ];

    return NextResponse.json({ categories: mockCategories });
  } catch (error) {
    console.error("Error fetching service item categories:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to fetch categories", details: errorMessage }, // Safely access error message
      { status: 500 }
    );
  }
}
