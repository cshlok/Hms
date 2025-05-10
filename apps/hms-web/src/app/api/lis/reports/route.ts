// app/api/lis/reports/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// Placeholder for hasPermission, replace with actual implementation
const hasPermission = async (userId: string | undefined, permission: string) => {
  if (permission === "LIS_UPLOAD_REPORT" || permission === "LIS_VIEW_REPORTS") return true; // Example
  return !!userId;
};

// Placeholder for getCurrentUser, replace with actual implementation
const getCurrentUser = async () => {
  return { id: "mockUserId", name: "Mock User", isTechnician: true }; // Example, add role info
};

const createLabReportSchema = z.object({
  labOrderId: z.string().cuid("Invalid lab order ID"),
  reportedById: z.string().cuid("Invalid reportedBy ID"),
  // Metadata for the report file (actual file stored separately, e.g., R2)
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"), // e.g., "application/pdf"
  fileSize: z.number().int().positive("File size must be a positive integer"), // in bytes
  storagePath: z.string().min(1, "Storage path is required"), // Path or key in R2 or other storage
  status: z.string().optional().default("DRAFT"), // e.g., DRAFT, FINALIZED, REVISED
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canUploadReport = await hasPermission(currentUser?.id, "LIS_UPLOAD_REPORT");
    // if (!canUploadReport || !currentUser?.isTechnician) { // Example: only technicians can upload
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const validation = createLabReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.formErrors }, { status: 400 });
    }

    const { labOrderId, reportedById, fileName, fileType, fileSize, storagePath, status } = validation.data;

    // Verify lab order exists and doesn't already have a report (if 1-to-1)
    const labOrder = await prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { LabReport: true },
    });

    if (!labOrder) {
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }
    if (labOrder.LabReport) {
      return NextResponse.json({ error: "A report for this lab order already exists" }, { status: 409 });
    }
    
    // Verify reportedBy user exists
    const reportedBy = await prisma.user.findUnique({ where: { id: reportedById } });
    if (!reportedBy) {
      return NextResponse.json({ error: "Reporting user not found" }, { status: 404 });
    }

    const newLabReport = await prisma.labReport.create({
      data: {
        labOrderId,
        reportedById,
        fileName,
        fileType,
        fileSize,
        storagePath,
        status,
        reportDate: new Date(), // Set report date to now
      },
      include: {
        labOrder: { include: { patient: true, testItems: true } },
        reportedBy: true,
      },
    });

    // Potentially update LabOrder status to COMPLETED if a report is uploaded
    // await prisma.labOrder.update({ where: { id: labOrderId }, data: { status: "COMPLETED" } });

    // Log this action
    // await prisma.auditLog.create({ data: { userId: currentUser?.id, eventType: "LIS_REPORT_UPLOADED", details: { reportId: newLabReport.id, labOrderId } } });

    return NextResponse.json(newLabReport, { status: 201 });
  } catch (error) {
    console.error("[LIS_REPORTS_POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unique constraint violation (e.g. labOrderId if it's unique)
        return NextResponse.json({ error: "A report for this lab order might already exist or another unique constraint failed." }, { status: 409 });
      }
      return NextResponse.json({ error: "Database error: " + error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    // const canViewReports = await hasPermission(currentUser?.id, "LIS_VIEW_REPORTS");
    // if (!canViewReports) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const labOrderId = searchParams.get("labOrderId");
    const patientId = searchParams.get("patientId"); // To list reports for a specific patient

    const whereClause: Prisma.LabReportWhereInput = {};
    if (labOrderId) {
      whereClause.labOrderId = labOrderId;
    }
    if (patientId) {
      whereClause.labOrder = { patientId: patientId };
    }

    const labReports = await prisma.labReport.findMany({
      where: whereClause,
      include: {
        labOrder: {
          select: { 
            id: true, 
            orderDate: true, 
            patient: { select: { id: true, firstName: true, lastName: true } },
            testItems: { select: { name: true } }
          }
        },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: {
        reportDate: "desc",
      },
    });

    return NextResponse.json(labReports);
  } catch (error) {
    console.error("[LIS_REPORTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

