// app/api/lis/orders/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation
const hasPermission = async (userId: string | undefined, permission: string) => {
  if (permission === "LIS_CREATE_ORDER" || permission === "LIS_VIEW_ORDERS") return true; // Example
  return !!userId;
};

// Placeholder for getCurrentUser, replace with actual implementation
const getCurrentUser = async () => {
  return { id: "mockUserId", name: "Mock User" };
};

const createLabOrderSchema = z.object({
  patientId: z.string().cuid("Invalid patient ID"),
  orderedById: z.string().cuid("Invalid orderedBy ID"),
  testItemIds: z.array(z.string().cuid("Invalid test item ID")).min(1, "At least one test item is required"),
  status: z.string().optional().default("PENDING"), // e.g., PENDING, COLLECTED, PROCESSING, COMPLETED, CANCELLED
  sampleId: z.string().optional(),
  collectionDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canCreateOrder = await hasPermission(currentUser?.id, "LIS_CREATE_ORDER");
    // if (!canCreateOrder) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = createLabOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const { patientId, orderedById, testItemIds, status, sampleId, collectionDate, notes } = validation.data;

    // Verify patient and orderedBy user exist
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const orderedBy = await prisma.user.findUnique({ where: { id: orderedById } });
    if (!orderedBy) {
      return NextResponse.json({ error: "Ordering user not found" }, { status: 404 });
    }

    // Verify all test items exist
    const testItems = await prisma.labTestItem.findMany({
      where: { id: { in: testItemIds } },
    });
    if (testItems.length !== testItemIds.length) {
      return NextResponse.json({ error: "One or more test items not found" }, { status: 404 });
    }

    const newLabOrder = await prisma.labOrder.create({
      data: {
        patientId,
        orderedById,
        status,
        sampleId,
        collectionDate: collectionDate ? new Date(collectionDate) : undefined,
        notes,
        testItems: {
          connect: testItemIds.map((id) => ({ id })),
        },
      },
      include: {
        patient: true,
        orderedBy: true,
        testItems: true,
      },
    });

    return NextResponse.json(newLabOrder, { status: 201 });
  } catch (error) {
    console.error("[LIS_ORDERS_POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors (e.g., foreign key constraint)
      return NextResponse.json({ error: "Database error: " + error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canViewOrders = await hasPermission(currentUser?.id, "LIS_VIEW_ORDERS");
    // if (!canViewOrders) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const whereClause: Prisma.LabOrderWhereInput = {};
    if (patientId) {
      whereClause.patientId = patientId;
    }
    if (status) {
      whereClause.status = status;
    }

    const labOrders = await prisma.labOrder.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        orderedBy: {
          select: { id: true, name: true }
        },
        testItems: {
          select: { id: true, name: true, code: true }
        },
        LabReport: { // Include basic report info if available
          select: { id: true, reportDate: true, status: true }
        }
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    return NextResponse.json(labOrders);
  } catch (error) {
    console.error("[LIS_ORDERS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

