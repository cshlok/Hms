// app/api/lis/tests/route.ts
import { NextRequest } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/authUtils";
import { auditLogService } from "@/lib/auditLogUtils";
import { sendErrorResponse, sendSuccessResponse } from "@/lib/apiResponseUtils";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const start = Date.now();
  let userId: string | undefined;
  try {
    const currentUser = await getCurrentUser(request);
    userId = currentUser?.id;

    if (!currentUser || !userId) {
      return sendErrorResponse("Unauthorized: User not authenticated.", 401);
    }

    const canViewTests = await hasPermission(userId, "LIS_VIEW_ALL_TESTS");
    if (!canViewTests) {
      await auditLogService.logEvent(userId, "LIS_VIEW_ALL_TESTS_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to view LIS tests.", 403);
    }

    console.log(`[LIS_TESTS_GET] User ${userId} fetching all lab test items.`);
    const labTestItems = await prisma.labTestItem.findMany({
      orderBy: {
        name: "asc",
      },
    });

    await auditLogService.logEvent(userId, "LIS_VIEW_ALL_TESTS_SUCCESS", { path: request.nextUrl.pathname, count: labTestItems.length });
    const duration = Date.now() - start;
    console.log(`[LIS_TESTS_GET] Request processed in ${duration}ms.`);
    return sendSuccessResponse(labTestItems);

  } catch (error: any) {
    console.error("[LIS_TESTS_GET_ERROR]", {
      userId,
      errorMessage: error.message,
      stack: error.stack,
      path: request.nextUrl.pathname,
    });
    await auditLogService.logEvent(userId, "LIS_VIEW_ALL_TESTS_FAILED", { path: request.nextUrl.pathname, error: String(error.message) });
    const duration = Date.now() - start;
    console.error(`[LIS_TESTS_GET] Request failed after ${duration}ms.`);
    return sendErrorResponse("Internal Server Error", 500, String(error.message));
  }
}

const createLabTestItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  price: z.number().positive("Price must be positive").optional().nullable(),
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

    const canCreateTests = await hasPermission(userId, "LIS_CREATE_TEST_DEFINITION");
    if (!canCreateTests) {
      await auditLogService.logEvent(userId, "LIS_CREATE_TEST_DEFINITION_ATTEMPT_DENIED", { path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to create LIS tests.", 403);
    }

    const body: unknown = await request.json();
    console.log(`[LIS_TESTS_POST] User ${userId} attempting to create lab test item with body:`, body);

    const validation = createLabTestItemSchema.safeParse(body);

    if (!validation.success) {
      console.warn("[LIS_TESTS_POST] Validation failed:", validation.error.flatten());
      await auditLogService.logEvent(userId, "LIS_CREATE_TEST_DEFINITION_VALIDATION_FAILED", { path: request.nextUrl.pathname, errors: validation.error.flatten() });
      return sendErrorResponse("Invalid input", 400, validation.error.flatten().fieldErrors);
    }

    const { name, code, description, category, price } = validation.data;

    const dataToCreate: Prisma.LabTestItemUncheckedCreateInput = {
        name,
        code: code === undefined ? null : code,
        description: description === undefined ? null : description,
        category: category === undefined ? null : category,
        price: price === undefined ? null : price,
    };

    const newLabTestItem = await prisma.labTestItem.create({
      data: dataToCreate,
    });

    console.log(`[LIS_TESTS_POST] User ${userId} successfully created lab test item ID: ${newLabTestItem.id}`);
    await auditLogService.logEvent(userId, "LIS_CREATE_TEST_DEFINITION_SUCCESS", { path: request.nextUrl.pathname, testItemId: newLabTestItem.id, data: newLabTestItem });
    const duration = Date.now() - start;
    console.log(`[LIS_TESTS_POST] Request processed in ${duration}ms.`);
    return sendSuccessResponse(newLabTestItem, 201);

  } catch (error: any) {
    console.error("[LIS_TESTS_POST_ERROR]", {
      userId,
      errorMessage: error.message,
      stack: error.stack,
      path: request.nextUrl.pathname,
    });

    let errStatus = 500;
    let errMessage = "Internal Server Error";
    let errDetails: string | Record<string, unknown> | undefined = error.message;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errDetails = error.meta; 
      if (error.code === "P2002") { 
        errStatus = 409;
        errMessage = "Conflict: Lab test item with this code or name already exists.";
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : String(error.meta?.target);
        errDetails = `A lab test item with the same unique field (e.g., \"code\" or \"name\") already exists. Fields: ${target}`;
        console.warn(`[LIS_TESTS_POST] Prisma unique constraint violation (P2002) for user ${userId}. Details: ${errDetails}`);
      }
    }
    await auditLogService.logEvent(userId, "LIS_CREATE_TEST_DEFINITION_FAILED", { path: request.nextUrl.pathname, error: errMessage, details: String(errDetails) });
    const duration = Date.now() - start;
    console.error(`[LIS_TESTS_POST] Request failed after ${duration}ms.`);
    return sendErrorResponse(errMessage, errStatus, String(errDetails));
  }
}

