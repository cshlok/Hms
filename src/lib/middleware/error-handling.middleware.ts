import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validatePermission } from '@/lib/permissions';
import { ErrorHandler } from '@/lib/error-handler';
import { auditService } from '@/lib/services/audit.service';

/**
 * Global error handler middleware for Support Services Management API routes
 * Implements consistent error handling, logging, and HIPAA-compliant responses
 */
export async function withErrorHandling(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    requiredPermission?: string;
    auditAction?: string;
    skipAuth?: boolean;
  } = {}
): Promise<NextResponse> {
  try {
    // Authentication check (unless explicitly skipped)
    if (!options.skipAuth) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        auditService.logActivity({
          action: 'UNAUTHORIZED_ACCESS',
          resourceType: 'API',
          resourceId: request.nextUrl.pathname,
          userId: null,
          metadata: {
            method: request.method,
            path: request.nextUrl.pathname,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          },
        });
        
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 401 }
        );
      }

      // Permission check (if required permission is specified)
      if (options.requiredPermission) {
        const hasPermission = await validatePermission(
          session.user.id,
          options.requiredPermission
        );
        
        if (!hasPermission) {
          auditService.logActivity({
            action: 'PERMISSION_DENIED',
            resourceType: 'API',
            resourceId: request.nextUrl.pathname,
            userId: session.user.id,
            metadata: {
              method: request.method,
              path: request.nextUrl.pathname,
              requiredPermission: options.requiredPermission,
            },
          });
          
          return NextResponse.json(
            { error: 'Permission denied' },
            { status: 403 }
          );
        }
      }

      // Audit trail for the request (if audit action is specified)
      if (options.auditAction) {
        auditService.logActivity({
          action: options.auditAction,
          resourceType: 'API',
          resourceId: request.nextUrl.pathname,
          userId: session.user.id,
          metadata: {
            method: request.method,
            path: request.nextUrl.pathname,
          },
        });
      }
    }

    // Execute the handler
    return await handler(request);
  } catch (error) {
    // Use the ErrorHandler to process the error
    const { status, message, errorCode, shouldLog } = ErrorHandler.processError(error);
    
    // Log the error if needed
    if (shouldLog) {
      console.error(`API Error (${status}):`, error);
      
      // Audit log for errors
      const session = await getServerSession(authOptions);
      auditService.logActivity({
        action: 'API_ERROR',
        resourceType: 'API',
        resourceId: request.nextUrl.pathname,
        userId: session?.user?.id || null,
        metadata: {
          method: request.method,
          path: request.nextUrl.pathname,
          errorCode,
          status,
        },
      });
    }
    
    // Return a sanitized error response (HIPAA compliant)
    return NextResponse.json(
      {
        error: message,
        code: errorCode,
      },
      { status }
    );
  }
}
