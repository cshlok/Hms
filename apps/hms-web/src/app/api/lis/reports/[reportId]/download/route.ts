// app/api/lis/reports/[reportId]/download/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/authUtils";
import { auditLogService } from "@/lib/auditLogUtils";
import { sendErrorResponse, sendSuccessResponse } from "@/lib/apiResponseUtils";

const prisma = new PrismaClient();

interface RouteContext {
  params: {
    reportId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const start = Date.now();
  let userId: string | undefined;
  const { reportId } = params;

  if (!z.string().cuid().safeParse(reportId).success) {
    return sendErrorResponse("Invalid report ID format.", 400, { reportId });
  }

  try {
    const currentUser = await getCurrentUser(request);
    userId = currentUser?.id;

    if (!currentUser || !userId) {
      return sendErrorResponse("Unauthorized: User not authenticated.", 401);
    }
    
    const canDownloadReport = await hasPermission(userId, "LIS_DOWNLOAD_REPORT");
    if (!canDownloadReport) {
      await auditLogService.logEvent(userId, "LIS_DOWNLOAD_REPORT_ATTEMPT_DENIED", { reportId, path: request.nextUrl.pathname });
      return sendErrorResponse("Forbidden: You do not have permission to download this LIS report.", 403);
    }

    console.log(`[LIS_REPORT_DOWNLOAD_GET] User ${userId} requesting download for report ID: ${reportId}`);

    const labReport = await prisma.labReport.findUnique({
      where: { id: reportId },
      select: {
        fileName: true,
        fileType: true,
        storagePath: true, 
        labOrder: { select: { patientId: true } } 
      },
    });

    if (!labReport || !labReport.storagePath || !labReport.fileName || !labReport.fileType) {
      await auditLogService.logEvent(userId, "LIS_DOWNLOAD_REPORT_FAILED_NOT_FOUND_OR_MISSING_INFO", { reportId });
      return sendErrorResponse("Lab report not found or file information missing.", 404, { reportId });
    }

    const responsePayload = {
      message: "File metadata retrieved. Client should initiate download from storage provider.",
      fileName: labReport.fileName,
      fileType: labReport.fileType,
      storagePath: labReport.storagePath,
    };

    await auditLogService.logEvent(userId, "LIS_DOWNLOAD_REPORT_METADATA_SUCCESS", { reportId, data: responsePayload });
    const duration = Date.now() - start;
    console.log(`[LIS_REPORT_DOWNLOAD_GET] Request processed in ${duration}ms.`);
    return sendSuccessResponse(responsePayload);

  } catch (error: any) {
    console.error("[LIS_REPORT_DOWNLOAD_GET_ERROR]", { userId, reportId, errorMessage: error.message, stack: error.stack, path: request.nextUrl.pathname });
    await auditLogService.logEvent(userId, "LIS_DOWNLOAD_REPORT_FAILED", { reportId, path: request.nextUrl.pathname, error: String(error.message) });
    const duration = Date.now() - start;
    console.error(`[LIS_REPORT_DOWNLOAD_GET] Request failed after ${duration}ms.`);
    return sendErrorResponse("Internal Server Error", 500, String(error.message));
  }
}

