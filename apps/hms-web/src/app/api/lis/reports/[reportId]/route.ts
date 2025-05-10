// app/api/lis/reports/[reportId]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation
const hasPermission = async (userId: string | undefined, permission: string) => {
  if (permission === "LIS_VIEW_SPECIFIC_REPORT" || permission === "LIS_UPDATE_REPORT_STATUS") return true; // Example
  return !!userId;
};

// Placeholder for getCurrentUser, replace with actual implementation
const getCurrentUser = async () => {
  return { id: "mockUserId", name: "Mock User" };
};

interface RouteContext {
  params: {
    reportId: string;
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { reportId } = params;
    const currentUser = await getCurrentUser();

    // const canViewReport = await hasPermission(currentUser?.id, "LIS_VIEW_SPECIFIC_REPORT");
    // if (!canViewReport) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const labReport = await prisma.labReport.findUnique({
      where: { id: reportId },
      include: {
        labOrder: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
            testItems: { select: { id: true, name: true, code: true, category: true } },
            orderedBy: { select: { id: true, name: true } },
          },
        },
        reportedBy: { select: { id: true, name: true } },
      },
    });

    if (!labReport) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    return NextResponse.json(labReport);
  } catch (error) {
    console.error("[LIS_REPORT_ID_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const updateLabReportSchema = z.object({
  status: z.string().optional(), // e.g., DRAFT, FINALIZED, REVISED
  // Potentially other updatable fields like notes, or if a report can be re-assigned
  // fileName: z.string().optional(),
  // fileType: z.string().optional(),
  // fileSize: z.number().int().positive().optional(),
  // storagePath: z.string().optional(),
});

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { reportId } = params;
    const currentUser = await getCurrentUser();

    // const canUpdateReport = await hasPermission(currentUser?.id, "LIS_UPDATE_REPORT_STATUS");
    // if (!canUpdateReport) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = updateLabReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const existingReport = await prisma.labReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    const updatedLabReport = await prisma.labReport.update({
      where: { id: reportId },
      data: validation.data, // Only updates fields present in validation.data
      include: {
        labOrder: true,
        reportedBy: true,
      },
    });
    
    // Log this action
    // await prisma.auditLog.create({ data: { userId: currentUser?.id, eventType: "LIS_REPORT_UPDATED", details: { reportId, changes: validation.data } } });

    return NextResponse.json(updatedLabReport);
  } catch (error) {
    console.error("[LIS_REPORT_ID_PUT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Optional: DELETE endpoint if reports can be deleted (consider soft delete)
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { reportId } = params;
    const currentUser = await getCurrentUser();

    // const canDeleteReport = await hasPermission(currentUser?.id, "LIS_DELETE_REPORT");
    // if (!canDeleteReport) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const existingReport = await prisma.labReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Lab report not found" }, { status: 404 });
    }

    // Instead of actual deletion, consider updating a status to "ARCHIVED" or similar (soft delete)
    // For hard delete:
    await prisma.labReport.delete({
      where: { id: reportId },
    });

    // Log this action
    // await prisma.auditLog.create({ data: { userId: currentUser?.id, eventType: "LIS_REPORT_DELETED", details: { reportId } } });

    return NextResponse.json({ message: "Lab report deleted successfully" }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error("[LIS_REPORT_ID_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

