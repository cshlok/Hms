// app/api/lis/orders/route.ts
import { NextRequest } from "next/server";
import { PrismaClient, Prisma, LabOrderStatus } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/authUtils";
import { auditLogService } from "@/lib/auditLogUtils";
import { sendErrorResponse, sendSuccessResponse } from "@/lib/apiResponseUtils";

const prisma = new PrismaClient();

const labOrderStatusValues = Object.values(LabOrderStatus);

const createLabOrderSchema = z.object({
  patientId: z.string().cuid({ message: "Invalid patient ID format." }),
  orderedById: z.string().cuid({ message: "Invalid orderedBy user ID format." }),
  testItemIds: z.array(z.string().cuid({ message: "Invalid test item ID format." })).min(1, "At least one test item is required."),
  status: z.nativeEnum(LabOrderStatus).default(LabOrderStatus.PENDING_SAMPLE).optional(),
  sampleId: z.string().max(100).optional().nullable(),
  collectionDate: z.string().datetime({ offset: true, message: "Invalid collection date format. ISO 8601 expected." }).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
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

    const canCreateOrder = await hasPermission(userId, "LIS_CREATE_ORDER");
    if (!canCreateOrder) {
      await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to create LIS orders.", 403);
    }

    const body: unknown = await request.json();
    console.log(`[LIS_ORDERS_POST] User ${userId} attempting to create lab order with body:`, body);

    const validation = createLabOrderSchema.safeParse(body);
    if (!validation.success) {
      console.warn("[LIS_ORDERS_POST] Validation failed:", validation.error.flatten());
      await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_VALIDATION_FAILED", { path: request.nextUrl.pathname, errors: validation.error.flatten() });
      return sendErrorResponse("Invalid input", 400, validation.error.flatten().fieldErrors);
    }

    const { patientId, orderedById, testItemIds, status, sampleId, collectionDate, notes } = validation.data;

    const [patient, orderedByUsr, testItems] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.user.findUnique({ where: { id: orderedById } }),
      prisma.labTestItem.findMany({ where: { id: { in: testItemIds } } })
    ]);

    if (!patient) {
      await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_FAILED_PATIENT_NOT_FOUND", { patientId });
      return sendErrorResponse("Patient not found.", 404, { patientId });
    }
    if (!orderedByUsr) {
      await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_FAILED_ORDERER_NOT_FOUND", { orderedById });
      return sendErrorResponse("Ordering user not found.", 404, { orderedById });
    }
    if (testItems.length !== testItemIds.length) {
      const foundIds = testItems.map(ti => ti.id);
      const notFoundIds = testItemIds.filter(id => !foundIds.includes(id));
      await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_FAILED_TEST_ITEM_NOT_FOUND", { notFoundTestItemIds: notFoundIds });
      return sendErrorResponse("One or more test items not found.", 404, { notFoundTestItemIds: notFoundIds });
    }

    const dataToCreate: Prisma.LabOrderCreateInput = {
        patient: { connect: { id: patientId } },
        orderedBy: { connect: { id: orderedById } },
        status: status || LabOrderStatus.PENDING_SAMPLE,
        sampleId: sampleId,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        notes: notes,
        testItems: {
          connect: testItemIds.map((id: string) => ({ id })),
        },
      };

    const newLabOrder = await prisma.labOrder.create({
      data: dataToCreate,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
        orderedBy: { select: { id: true, name: true } },
        testItems: { select: { id: true, name: true, code: true } },
      },
    });

    console.log(`[LIS_ORDERS_POST] User ${userId} successfully created lab order ID: ${newLabOrder.id}`);
    await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_SUCCESS", { path: request.nextUrl.pathname, labOrderId: newLabOrder.id, data: newLabOrder });
    const duration = Date.now() - start;
    console.log(`[LIS_ORDERS_POST] Request processed in ${duration}ms.`);
    return sendSuccessResponse(newLabOrder, 201);

  } catch (error: any) {
    console.error("[LIS_ORDERS_POST_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    let errStatus = 500;
    let errMessage = "Internal Server Error";
    let errDetails: string | undefined = error.message;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = error.meta as { target?: string[] | string; cause?: string };
      if (error.code === "P2002") { 
        errStatus = 409;
        errMessage = "Conflict: This lab order cannot be created due to a conflict with existing data.";
        const target = Array.isArray(meta?.target) ? meta.target.join(", ") : String(meta?.target);
        errDetails = `A unique constraint was violated. Fields: ${target}`;
      } else if (error.code === "P2025") { 
        errStatus = 400; 
        errMessage = "Bad Request: A related record was not found.";
        errDetails = meta?.cause || "Failed to find a related entity for the order.";
      }
    }
    await auditLogService.logEvent(userId, "LIS_CREATE_ORDER_FAILED", { path: request.nextUrl.pathname, error: errMessage, details: String(errDetails) });
    const duration = Date.now() - start;
    console.error(`[LIS_ORDERS_POST] Request failed after ${duration}ms.`);
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

    const canViewAllOrders = await hasPermission(userId, "LIS_VIEW_ALL_ORDERS");
    const canViewPatientOrders = await hasPermission(userId, "LIS_VIEW_PATIENT_ORDERS");

    if (!canViewAllOrders && !canViewPatientOrders) {
      await auditLogService.logEvent(userId, "LIS_VIEW_ORDERS_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to view LIS orders.", 403);
    }

    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get("patientId");
    const statusParam = searchParams.get("status");
    const orderedByIdParam = searchParams.get("orderedById");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const whereClause: Prisma.LabOrderWhereInput = {};
    if (patientIdParam) {
      if (!z.string().cuid().safeParse(patientIdParam).success) {
        return sendErrorResponse("Invalid patientId format.", 400);
      }
      whereClause.patientId = patientIdParam;
    }
    if (statusParam) {
      if (!(labOrderStatusValues as string[]).includes(statusParam)) {
        return sendErrorResponse(`Invalid status value. Must be one of: ${labOrderStatusValues.join(", ")}`, 400);
      }
      whereClause.status = statusParam as LabOrderStatus;
    }
    if (orderedByIdParam) {
       if (!z.string().cuid().safeParse(orderedByIdParam).success) {
        return sendErrorResponse("Invalid orderedById format.", 400);
      }
      whereClause.orderedById = orderedByIdParam;
    }

    if (!canViewAllOrders && canViewPatientOrders) {
      if (!patientIdParam && userId) { 
         whereClause.orderedById = userId; 
      }
    }
    
    console.log(`[LIS_ORDERS_GET] User ${userId} fetching lab orders with filters:`, whereClause);

    const [labOrders, totalCount] = await prisma.$transaction([
      prisma.labOrder.findMany({
        where: whereClause,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
          orderedBy: { select: { id: true, name: true } },
          testItems: { select: { id: true, name: true, code: true } },
          LabReport: { select: { id: true, reportDate: true, status: true } }
        },
        orderBy: { orderDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.labOrder.count({ where: whereClause })
    ]);

    await auditLogService.logEvent(userId, "LIS_VIEW_ORDERS_SUCCESS", { path: request.nextUrl.pathname, filters: whereClause, count: labOrders.length, totalCount });
    const duration = Date.now() - start;
    console.log(`[LIS_ORDERS_GET] Request processed in ${duration}ms.`);
    
    return sendSuccessResponse({
      data: labOrders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    });

  } catch (error: any) {
    console.error("[LIS_ORDERS_GET_ERROR]", { userId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    await auditLogService.logEvent(userId, "LIS_VIEW_ORDERS_FAILED", { path: request.nextUrl.pathname, error: String(error.message) });
    const duration = Date.now() - start;
    console.error(`[LIS_ORDERS_GET] Request failed after ${duration}ms.`);
    return sendErrorResponse("Internal Server Error", 500, String(error.message));
  }
}

