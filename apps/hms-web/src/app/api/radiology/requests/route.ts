// app/api/radiology/requests/route.ts
import { NextRequest } from "next/server";
import { PrismaClient, Prisma, RadiologyRequestStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/authUtils";
import { auditLogService } from "@/lib/auditLogUtils";
import { sendErrorResponse, sendSuccessResponse } from "@/lib/apiResponseUtils";

const prisma = new PrismaClient();

const radiologyRequestStatusValues = Object.values(RadiologyRequestStatus);

const createRadiologyRequestSchema = z.object({
  patientId: z.string().cuid("Invalid patient ID"),
  orderedById: z.string().cuid("Invalid orderedBy ID"),
  procedureIds: z.array(z.string().cuid("Invalid procedure ID")).min(1, "At least one procedure is required"),
  status: z.nativeEnum(RadiologyRequestStatus).default(RadiologyRequestStatus.PENDING_SCHEDULE).optional(),
  reason: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  scheduledDate: z.string().datetime({ offset: true, message: "Invalid scheduled date format. ISO 8601 expected." }).optional().nullable(),
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

    const canCreateRequest = await hasPermission(userId, "RADIOLOGY_CREATE_REQUEST");
    if (!canCreateRequest) {
      await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to create radiology requests.", 403);
    }

    const body: unknown = await request.json();
    console.log(`[RADIOLOGY_REQUESTS_POST] User ${userId} attempting to create radiology request with body:`, body);

    const validation = createRadiologyRequestSchema.safeParse(body);
    if (!validation.success) {
      console.warn("[RADIOLOGY_REQUESTS_POST] Validation failed:", validation.error.flatten());
      await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_VALIDATION_FAILED", { path: request.nextUrl.pathname, errors: validation.error.flatten() });
      return sendErrorResponse("Invalid input", 400, validation.error.flatten().fieldErrors);
    }

    const { patientId, orderedById, procedureIds, status, reason, notes, scheduledDate } = validation.data;

    const [patient, orderedByUser, procedures] = await Promise.all([
        prisma.patient.findUnique({ where: { id: patientId } }),
        prisma.user.findUnique({ where: { id: orderedById } }),
        prisma.radiologyProcedure.findMany({ where: { id: { in: procedureIds } } })
    ]);

    if (!patient) {
      await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_FAILED_PATIENT_NOT_FOUND", { patientId });
      return sendErrorResponse("Patient not found.", 404, { patientId });
    }
    if (!orderedByUser) {
      await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_FAILED_ORDERER_NOT_FOUND", { orderedById });
      return sendErrorResponse("Ordering user not found.", 404, { orderedById });
    }
    if (procedures.length !== procedureIds.length) {
      const foundIds = procedures.map(p => p.id);
      const notFoundIds = procedureIds.filter(id => !foundIds.includes(id));
      await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_FAILED_PROCEDURE_NOT_FOUND", { notFoundProcedureIds: notFoundIds });
      return sendErrorResponse("One or more procedures not found.", 404, { notFoundProcedureIds: notFoundIds });
    }

    const dataToCreate: Prisma.RadiologyRequestCreateInput = {
        patient: { connect: { id: patientId } },
        orderedBy: { connect: { id: orderedById } },
        status: status || RadiologyRequestStatus.PENDING_SCHEDULE,
        reason: reason,
        notes: notes,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        procedures: {
          connect: procedureIds.map((id: string) => ({ id })),
        },
      };

    const newRadiologyRequest = await prisma.radiologyRequest.create({
      data: dataToCreate,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
        orderedBy: { select: { id: true, name: true } },
        procedures: { select: { id: true, name: true, code: true } },
      },
    });

    console.log(`[RADIOLOGY_REQUESTS_POST] User ${userId} successfully created radiology request ID: ${newRadiologyRequest.id}`);
    await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_SUCCESS", { path: request.nextUrl.pathname, requestId: newRadiologyRequest.id, data: newRadiologyRequest });
    const duration = Date.now() - start;
    console.log(`[RADIOLOGY_REQUESTS_POST] Request processed in ${duration}ms.`);
    return sendSuccessResponse(newRadiologyRequest, 201);

  } catch (error: any) {
    console.error("[RADIOLOGY_REQUESTS_POST_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    let errStatus = 500;
    let errMessage = "Internal Server Error";
    let errDetails: string | undefined = error.message;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = error.meta as { target?: string[] | string; cause?: string };
      if (error.code === "P2002") { 
        errStatus = 409;
        errMessage = "Conflict: This radiology request cannot be created due to a conflict.";
        const target = Array.isArray(meta?.target) ? meta.target.join(", ") : String(meta?.target);
        errDetails = `A unique constraint was violated. Fields: ${target}`;
      } else if (error.code === "P2025") { 
        errStatus = 400; 
        errMessage = "Bad Request: A related record was not found.";
        errDetails = meta?.cause || "Failed to find a related entity for the request.";
      }
    }
    await auditLogService.logEvent(userId, "RADIOLOGY_CREATE_REQUEST_FAILED", { path: request.nextUrl.pathname, error: errMessage, details: String(errDetails) });
    const duration = Date.now() - start;
    console.error(`[RADIOLOGY_REQUESTS_POST] Request failed after ${duration}ms.`);
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

    const canViewAll = await hasPermission(userId, "RADIOLOGY_VIEW_ALL_REQUESTS");
    const canViewPatient = await hasPermission(userId, "RADIOLOGY_VIEW_PATIENT_REQUESTS");

    if (!canViewAll && !canViewPatient) {
      await auditLogService.logEvent(userId, "RADIOLOGY_VIEW_REQUESTS_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to view radiology requests.", 403);
    }

    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get("patientId");
    const statusParam = searchParams.get("status");
    const orderedByIdParam = searchParams.get("orderedById");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const whereClause: Prisma.RadiologyRequestWhereInput = {};
    if (patientIdParam) {
      if (!z.string().cuid().safeParse(patientIdParam).success) return sendErrorResponse("Invalid patientId format.", 400);
      whereClause.patientId = patientIdParam;
    }
    if (statusParam) {
      if (!(radiologyRequestStatusValues as string[]).includes(statusParam)) {
        return sendErrorResponse(`Invalid status value. Must be one of: ${radiologyRequestStatusValues.join(", ")}`, 400);
      }
      whereClause.status = statusParam as RadiologyRequestStatus;
    }
    if (orderedByIdParam) {
      if (!z.string().cuid().safeParse(orderedByIdParam).success) return sendErrorResponse("Invalid orderedById format.", 400);
      whereClause.orderedById = orderedByIdParam;
    }

    if (!canViewAll && canViewPatient && userId) {
        if (!patientIdParam) {
            whereClause.orderedById = userId;
        }
    }

    console.log(`[RADIOLOGY_REQUESTS_GET] User ${userId} fetching radiology requests with filters:`, whereClause);

    const [radiologyRequests, totalCount] = await prisma.$transaction([
      prisma.radiologyRequest.findMany({
        where: whereClause,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
          orderedBy: { select: { id: true, name: true } },
          procedures: { select: { id: true, name: true, code: true } },
          RadiologyReport: { select: { id: true, reportDate: true, status: true } }
        },
        orderBy: { requestDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.radiologyRequest.count({ where: whereClause })
    ]);

    await auditLogService.logEvent(userId, "RADIOLOGY_VIEW_REQUESTS_SUCCESS", { path: request.nextUrl.pathname, filters: whereClause, count: radiologyRequests.length, totalCount });
    const duration = Date.now() - start;
    console.log(`[RADIOLOGY_REQUESTS_GET] Request processed in ${duration}ms.`);
    
    return sendSuccessResponse({
      data: radiologyRequests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });

  } catch (error: any) {
    console.error("[RADIOLOGY_REQUESTS_GET_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    await auditLogService.logEvent(userId, "RADIOLOGY_VIEW_REQUESTS_FAILED", { path: request.nextUrl.pathname, error: String(error.message) });
    const duration = Date.now() - start;
    console.error(`[RADIOLOGY_REQUESTS_GET] Request failed after ${duration}ms.`);
    return sendErrorResponse("Internal Server Error", 500, String(error.message));
  }
}

