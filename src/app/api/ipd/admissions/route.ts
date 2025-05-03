import { NextRequest, NextResponse } from "next/server";
import {
  getAdmissionsFromDB,
  getAdmissionByIdFromDB,
  createAdmissionInDB,
  updateAdmissionInDB,
  AdmissionFilters, // Import AdmissionFilters from lib
  CreateAdmissionData, // FIX: Import CreateAdmissionData
  UpdateAdmissionData, // FIX: Import UpdateAdmissionData
} from "@/lib/ipd"; // Assuming these functions exist and handle DB interaction

// FIX: Remove local definitions of AdmissionInput and AdmissionUpdateInput
// interface AdmissionInput { ... }
// interface AdmissionUpdateInput { ... }

/**
 * GET /api/ipd/admissions
 * Retrieves a list of admissions, optionally filtered by query parameters.
 * Can also retrieve a single admission by ID if provided as a query parameter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get("id");

    const filters: AdmissionFilters = {};
    // Populate filters from searchParams
    for (const [key, value] of searchParams.entries()) {
      // Ensure only valid filter keys are added
      if (
        [
          "patient_id",
          "status",
          "ward",
          "bed_number",
          "admission_date_from",
          "admission_date_to",
          "discharge_date_from",
          "discharge_date_to",
          "attending_doctor_id",
        ].includes(key)
      ) {
        const filterKey = key as keyof AdmissionFilters;
        if (filterKey === "status") {
          if (
            value === "active" ||
            value === "discharged" ||
            value === "cancelled"
          ) {
            filters[filterKey] = value;
          } else {
            // Optionally handle invalid status value, e.g., ignore or return error
            console.warn(`Invalid status filter value received: ${value}`);
          }
        } else {
          filters[filterKey] = value;
        }
      }
    }

    // If an ID is provided, attempt to fetch a single admission
    if (admissionId) {
      const id = Number.parseInt(admissionId);
      if (Number.isNaN(id) || id <= 0) {
        return NextResponse.json(
          { error: "Invalid admission ID provided" },
          { status: 400 }
        );
      } else {
        // Simulate fetching a single admission by ID
        const admission = await getAdmissionByIdFromDB(id);
        if (!admission) {
          return NextResponse.json(
            { error: "Admission not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ admission });
      }
    }

    // Otherwise, return filtered list
    const admissions = await getAdmissionsFromDB(filters);

    return NextResponse.json({ admissions });
  } catch (error: unknown) {
    console.error("Error fetching admissions:", error);
    // Fixed: Safely access error message
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch admissions", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ipd/admissions
 * Creates a new admission.
 */
export async function POST(request: NextRequest) {
  try {
    // FIX: Use imported CreateAdmissionData type
    const admissionData = (await request.json()) as CreateAdmissionData;

    // FIX: Update validation based on CreateAdmissionData fields (patient_id is required)
    // Assuming other fields like diagnosis, attending_doctor_id might also be required by CreateAdmissionData
    if (
      !admissionData.patient_id /* Add other required fields from CreateAdmissionData */
    ) {
      return NextResponse.json(
        { error: "Missing required fields (e.g., patient_id)" }, // Adjust error message based on actual required fields
        { status: 400 }
      );
    }

    // Simulate creating the admission in the database
    const newAdmission = await createAdmissionInDB(admissionData);

    return NextResponse.json({ admission: newAdmission }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating admission:", error);
    // Fixed: Safely access error message
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create admission", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ipd/admissions/[id]
 * Updates an existing admission.
 * Note: This route structure assumes the ID is part of the path,
 * but the current implementation reads it from the path manually.
 * A better approach is to use dynamic route segments like /api/ipd/admissions/[id]/route.ts
 */
export async function PUT(request: NextRequest) {
  try {
    // This manual path parsing is fragile. Consider using dynamic routes.
    const path = request.nextUrl.pathname;
    const idString = path.split("/").pop();
    const id = idString ? Number.parseInt(idString) : 0;

    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid or missing admission ID in URL path" },
        { status: 400 }
      );
    }

    // FIX: Use imported UpdateAdmissionData type
    const updateData = (await request.json()) as UpdateAdmissionData;

    // Simulate updating the admission in the database
    const updatedAdmission = await updateAdmissionInDB(id, updateData);

    if (!updatedAdmission) {
      return NextResponse.json(
        { error: "Admission not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ admission: updatedAdmission });
  } catch (error: unknown) {
    console.error("Error updating admission:", error);
    // Fixed: Safely access error message
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update admission", details: errorMessage },
      { status: 500 }
    );
  }
}
