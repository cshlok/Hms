// app/api/radiology/requests/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation
const hasPermission = async (userId: string | undefined, permission: string) => {
  if (permission === "RADIOLOGY_CREATE_REQUEST" || permission === "RADIOLOGY_VIEW_REQUESTS") return true; // Example
  return !!userId;
};

// Placeholder for getCurrentUser, replace with actual implementation
const getCurrentUser = async () => {
  return { id: "mockUserId", name: "Mock User" };
};

const createRadiologyRequestSchema = z.object({
  patientId: z.string().cuid("Invalid patient ID"),
  orderedById: z.string().cuid("Invalid orderedBy ID"),
  procedureIds: z.array(z.string().cuid("Invalid procedure ID")).min(1, "At least one procedure is required"),
  status: z.string().optional().default("PENDING"), // e.g., PENDING, SCHEDULED, COMPLETED, CANCELLED
  reason: z.string().optional(),
  notes: z.string().optional(),
  scheduledDate: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canCreateRequest = await hasPermission(currentUser?.id, "RADIOLOGY_CREATE_REQUEST");
    // if (!canCreateRequest) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = createRadiologyRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const { patientId, orderedById, procedureIds, status, reason, notes, scheduledDate } = validation.data;

    // Verify patient and orderedBy user exist
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const orderedBy = await prisma.user.findUnique({ where: { id: orderedById } });
    if (!orderedBy) {
      return NextResponse.json({ error: "Ordering user not found" }, { status: 404 });
    }

    // Verify all procedures exist
    const procedures = await prisma.radiologyProcedure.findMany({
      where: { id: { in: procedureIds } },
    });
    if (procedures.length !== procedureIds.length) {
      return NextResponse.json({ error: "One or more procedures not found" }, { status: 404 });
    }

    const newRadiologyRequest = await prisma.radiologyRequest.create({
      data: {
        patientId,
        orderedById,
        status,
        reason,
        notes,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        procedures: {
          connect: procedureIds.map((id) => ({ id })),
        },
      },
      include: {
        patient: true,
        orderedBy: true,
        procedures: true,
      },
    });

    return NextResponse.json(newRadiologyRequest, { status: 201 });
  } catch (error) {
    console.error("[RADIOLOGY_REQUESTS_POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Database error: " + error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canViewRequests = await hasPermission(currentUser?.id, "RADIOLOGY_VIEW_REQUESTS");
    // if (!canViewRequests) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const whereClause: Prisma.RadiologyRequestWhereInput = {};
    if (patientId) {
      whereClause.patientId = patientId;
    }
    if (status) {
      whereClause.status = status;
    }

    const radiologyRequests = await prisma.radiologyRequest.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        orderedBy: { select: { id: true, name: true } },
        procedures: { select: { id: true, name: true, code: true } },
        RadiologyReport: { select: { id: true, reportDate: true, status: true } }
      },
      orderBy: {
        requestDate: "desc",
      },
    });

    return NextResponse.json(radiologyRequests);
  } catch (error) {
    console.error("[RADIOLOGY_REQUESTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

