// app/api/lis/reports/route.ts
import { NextRequest } from "next/server";
import { PrismaClient, Prisma, LabOrderStatus, LabReportStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/authUtils";
import { auditLogService } from "@/lib/auditLogUtils";
import { sendErrorResponse, sendSuccessResponse } from "@/lib/apiResponseUtils";

const prisma = new PrismaClient();

const labReportStatusValues = Object.values(LabReportStatus);

const createLabReportSchema = z.object({
  labOrderId: z.string().cuid({ message: "Invalid lab order ID format." }),
  fileName: z.string().min(1, "File name is required.").max(255),
  fileType: z.string().min(1, "File type is required (e.g., application/pdf).").max(100),
  fileSize: z.number().int().positive("File size must be a positive integer (bytes)."),
  storagePath: z.string().min(1, "Storage path/key is required.").max(1024),
  status: z.nativeEnum(LabReportStatus).default(LabReportStatus.DRAFT).optional(),
  observations: z.string().max(5000).optional().nullable(),
  reportDate: z.string().datetime({ offset: true, message: "Invalid report date format. ISO 8601 expected." }).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const start = Date.now();
  let userId: string | undefined;

  try {
    const currentUser = await getCurrentUser(request);
    userId = currentUser?.id;

    if (!currentUser || !userId) {
      return sendErrorResponse("Unauthorized: User not authenticated.", 401);
    }

    const canUploadReport = await hasPermission(userId, "LIS_UPLOAD_REPORT_METADATA");
    if (!canUploadReport) {
      await auditLogService.logEvent(userId, "LIS_UPLOAD_REPORT_METADATA_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to upload LIS report metadata.", 403);
    }

    const body: unknown = await request.json();
    console.log(`[LIS_REPORTS_POST] User ${userId} attempting to create lab report metadata with body:`, body);

    const validation = createLabReportSchema.safeParse(body);
    if (!validation.success) {
      console.warn("[LIS_REPORTS_POST] Validation failed:", validation.error.flatten());
      await auditLogService.logEvent(userId, "LIS_UPLOAD_REPORT_METADATA_VALIDATION_FAILED", { path: request.nextUrl.pathname, errors: validation.error.flatten() });
      return sendErrorResponse("Invalid input", 400, validation.error.flatten().fieldErrors);
    }

    const validatedData = validation.data;
    const reportedById = userId;

    let finalReportDate: Date;
    if (typeof validatedData.reportDate === "string") {
        finalReportDate = new Date(validatedData.reportDate);
    } else {
        finalReportDate = new Date(); 
    }

    const dataToCreate: Prisma.LabReportUncheckedCreateInput = {
        labOrderId: validatedData.labOrderId,
        reportedById: reportedById,
        fileName: validatedData.fileName,
        fileType: validatedData.fileType,
        fileSize: validatedData.fileSize,
        storagePath: validatedData.storagePath,
        status: validatedData.status || LabReportStatus.DRAFT,
        observations: validatedData.observations,
        reportDate: finalReportDate,
        updatedById: userId, 
    };

    const newLabReport = await prisma.labReport.create({
      data: dataToCreate,
      include: {
        labOrder: { include: { patient: {select: {id: true, firstName: true, lastName: true}}, testItems: {select: {id: true, name: true}} } },
        reportedBy: { select: { id: true, name: true } },
      },
    });

    if (newLabReport.status === LabReportStatus.FINALIZED) {
      await prisma.labOrder.update({
        where: { id: validatedData.labOrderId }, 
        data: { status: LabOrderStatus.REPORT_AVAILABLE },
      });
      await auditLogService.logEvent(userId, "LIS_ORDER_STATUS_AUTO_UPDATED_TO_REPORT_AVAILABLE", { labOrderId: validatedData.labOrderId, reportId: newLabReport.id });
    }

    console.log(`[LIS_REPORTS_POST] User ${userId} successfully created lab report metadata ID: ${newLabReport.id}`);
    await auditLogService.logEvent(userId, "LIS_UPLOAD_REPORT_METADATA_SUCCESS", { path: request.nextUrl.pathname, reportId: newLabReport.id, data: newLabReport });
    const duration = Date.now() - start;
    console.log(`[LIS_REPORTS_POST] Request processed in ${duration}ms.`);
    return sendSuccessResponse(newLabReport, 201);

  } catch (error: any) {
    console.error("[LIS_REPORTS_POST_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    let errStatus = 500;
    let errMessage = "Internal Server Error";
    let errDetails: string | { target?: readonly string[] | string } | undefined = error.message;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = error.meta as { target?: readonly string[] | string; cause?: string };
      errDetails = meta;
      if (error.code === "P2002") {
        errStatus = 409;
        errMessage = "Conflict: This lab report metadata cannot be created due to a conflict.";
        const target = Array.isArray(meta?.target) ? meta.target.join(", ") : String(meta?.target);
        errDetails = `A unique constraint was violated. Fields: ${target}`;
      } else if (error.code === "P2025") {
        errStatus = 400;
        errMessage = "Bad Request: A related record (e.g., LabOrder or ReportedBy User) was not found.";
        errDetails = meta?.cause || "Failed to find a related entity for the report.";
      }
    }
    await auditLogService.logEvent(userId, "LIS_UPLOAD_REPORT_METADATA_FAILED", { path: request.nextUrl.pathname, error: errMessage, details: String(errDetails) });
    const duration = Date.now() - start;
    console.error(`[LIS_REPORTS_POST] Request failed after ${duration}ms.`);
    return sendErrorResponse(errMessage, errStatus, String(errDetails));
  }
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  let userId: string | undefined;

  try {
    const currentUser = await getCurrentUser(request);
    userId = currentUser?.id;

    if (!currentUser || !userId) {
      return sendErrorResponse("Unauthorized: User not authenticated.", 401);
    }

    const canViewAll = await hasPermission(userId, "LIS_VIEW_ALL_REPORTS");
    const canViewPatient = await hasPermission(userId, "LIS_VIEW_PATIENT_REPORTS");

    if (!canViewAll && !canViewPatient) {
      await auditLogService.logEvent(userId, "LIS_VIEW_REPORTS_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to view LIS reports.", 403);
    }

    const { searchParams } = new URL(request.url);
    const labOrderIdParam = searchParams.get("labOrderId");
    const patientIdParam = searchParams.get("patientId");
    const reportStatusParam = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const whereClause: Prisma.LabReportWhereInput = {};

    if (labOrderIdParam) {
      if (!z.string().cuid().safeParse(labOrderIdParam).success) return sendErrorResponse("Invalid labOrderId format.", 400);
      whereClause.labOrderId = labOrderIdParam;
    }
    if (patientIdParam) {
      if (!z.string().cuid().safeParse(patientIdParam).success) return sendErrorResponse("Invalid patientId format.", 400);
      whereClause.labOrder = { patientId: patientIdParam };
    }
    if (reportStatusParam) {
      if (!(labReportStatusValues as string[]).includes(reportStatusParam)) {
        return sendErrorResponse(`Invalid report status. Must be one of: ${labReportStatusValues.join(", ")}`, 400);
      }
      whereClause.status = reportStatusParam as LabReportStatus;
    }
    
    if (!canViewAll && !patientIdParam && !labOrderIdParam) {
        await auditLogService.logEvent(userId, "LIS_VIEW_REPORTS_DENIED_NO_FILTER_FOR_NON_ADMIN", { path: request.nextUrl.pathname });
        return sendErrorResponse("Forbidden: Please specify a patient or order to view reports.", 403);
    }

    console.log(`[LIS_REPORTS_GET] User ${userId} fetching lab reports with filters:`, whereClause);

    const [labReports, totalCount] = await prisma.$transaction([
      prisma.labReport.findMany({
        where: whereClause,
        include: {
          labOrder: {
            select: { 
              id: true, orderDate: true, status: true, 
              patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
              testItems: { select: { id: true, name: true, code: true } }
            }
          },
          reportedBy: { select: { id: true, name: true } },
        },
        orderBy: { reportDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.labReport.count({ where: whereClause })
    ]);

    await auditLogService.logEvent(userId, "LIS_VIEW_REPORTS_SUCCESS", { path: request.nextUrl.pathname, filters: whereClause, count: labReports.length, totalCount });
    const duration = Date.now() - start;
    console.log(`[LIS_REPORTS_GET] Request processed in ${duration}ms.`);
    
    return sendSuccessResponse({
      data: labReports,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });

  } catch (error: any) {
    console.error("[LIS_REPORTS_GET_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    await auditLogService.logEvent(userId, "LIS_VIEW_REPORTS_FAILED", { path: request.nextUrl.pathname, error: String(error.message) });
    const duration = Date.now() - start;
    console.error(`[LIS_REPORTS_GET] Request failed after ${duration}ms.`);
    return sendErrorResponse("Internal Server Error", 500, String(error.message));
  }
}

