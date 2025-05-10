// app/api/lis/tests/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation from Manus 9 or auth module
const hasPermission = async (userId: string | undefined, permission: string) => {
  // In a real scenario, this would check against a user's roles and permissions in the DB
  // For now, let's assume the user has permission if a userId is provided.
  // This needs to be replaced with actual logic from Manus 9.
  if (permission === "LIS_VIEW_TESTS") return true; // Example permission
  return !!userId; 
};

// Placeholder for getCurrentUser, replace with actual implementation from auth module
const getCurrentUser = async () => {
  // In a real scenario, this would get the user from the session or token
  // For now, returning a mock user. This needs to be replaced.
  return { id: "mockUserId", name: "Mock User" }; 
};

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // Example: Check if user has permission to view LIS tests
    // const canViewTests = await hasPermission(currentUser?.id, "LIS_VIEW_TESTS");
    // if (!canViewTests) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const labTestItems = await prisma.labTestItem.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(labTestItems);
  } catch (error) {
    console.error("[LIS_TESTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Optional: POST to create a new LabTestItem (if admins manage this via API)
const createLabTestItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // Example: Check if user has permission to create LIS tests
    // const canCreateTests = await hasPermission(currentUser?.id, "LIS_CREATE_TEST");
    // if (!canCreateTests) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = createLabTestItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const { name, code, description, category, price } = validation.data;

    const newLabTestItem = await prisma.labTestItem.create({
      data: {
        name,
        code,
        description,
        category,
        price,
      },
    });

    return NextResponse.json(newLabTestItem, { status: 201 });
  } catch (error) {
    console.error("[LIS_TESTS_POST]", error);
    // Check for unique constraint violation if code needs to be unique, for example
    // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    //   return NextResponse.json({ error: "Lab test item with this code already exists" }, { status: 409 });
    // }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

