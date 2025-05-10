// app/api/lis/orders/[orderId]/status/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation
const hasPermission = async (userId: string | undefined, permission: string) => {
  if (permission === "LIS_UPDATE_ORDER_STATUS") return true; // Example
  return !!userId;
};

// Placeholder for getCurrentUser, replace with actual implementation
const getCurrentUser = async () => {
  return { id: "mockUserId", name: "Mock User" };
};

const updateLabOrderStatusSchema = z.object({
  status: z.string().min(1, "Status is required"), // e.g., PENDING, COLLECTED, PROCESSING, COMPLETED, CANCELLED
  // Optionally, add other fields that might be updated along with status, like notes or technicianId
  // technicianId: z.string().cuid("Invalid technician ID").optional(),
  // notes: z.string().optional(),
});

interface RouteContext {
  params: {
    orderId: string;
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { orderId } = params;
    const currentUser = await getCurrentUser();

    // const canUpdateStatus = await hasPermission(currentUser?.id, "LIS_UPDATE_ORDER_STATUS");
    // if (!canUpdateStatus) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = updateLabOrderStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const { status } = validation.data;

    const existingOrder = await prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    const updatedLabOrder = await prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status,
        // Add other fields here if they are part of the update schema
        // e.g., technicianId: validation.data.technicianId,
        // notes: validation.data.notes,
      },
      include: {
        patient: true,
        orderedBy: true,
        testItems: true,
      },
    });

    // Potentially log this action to AuditLog
    // await prisma.auditLog.create({ data: { userId: currentUser?.id, eventType: "LIS_ORDER_STATUS_UPDATED", details: { orderId, oldStatus: existingOrder.status, newStatus: status } } });

    return NextResponse.json(updatedLabOrder);
  } catch (error) {
    console.error("[LIS_ORDER_STATUS_PUT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

