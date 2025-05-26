/**
 * Enhanced Error Handling Middleware for HMS Support Services
 * 
 * This middleware provides comprehensive error handling for all API routes
 * in the HMS Support Services module, with HIPAA-compliant logging and
 * standardized error responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  ValidationError, 
  NotFoundError, 
  AuthorizationError, 
  DatabaseError, 
  ExternalServiceError,
  RateLimitError,
  ConflictError
} from '@/lib/errors';
import { AuditLogger } from '@/lib/audit';
import { SecurityService } from '@/lib/security.service';

export async function errorHandlingMiddleware(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract request information for logging
    const requestId = crypto.randomUUID();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const contentType = request.headers.get('content-type');
    const authHeader = request.headers.get('authorization');
    
    // Extract user information from auth token if present
    let userId = 'anonymous';
    let userRoles: string[] = [];
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decodedToken = await SecurityService.verifyToken(token);
        userId = decodedToken.userId;
        userRoles = decodedToken.roles || [];
      } catch (error) {
        // Token verification failed, continue as anonymous
        console.warn(`Token verification failed: ${error}`);
      }
    }
    
    // Create audit context
    const auditLogger = new AuditLogger({
      requestId,
      userId,
      userRoles,
      userAgent,
      method,
      url
    });
    
    // Log request (sanitizing sensitive data)
    await auditLogger.log({
      action: 'api.request',
      resourceId: requestId,
      userId,
      details: {
        method,
        url: SecurityService.sanitizeUrl(url),
        contentType,
        timestamp: new Date().toISOString()
      }
    });
    
    // Attach audit logger to request for use in handlers
    const requestWithContext = new NextRequest(request, {
      auditLogger,
      userId,
      userRoles,
      requestId
    });
    
    // Execute the handler
    const response = await handler(requestWithContext);
    
    // Log successful response (excluding sensitive data)
    await auditLogger.log({
      action: 'api.response',
      resourceId: requestId,
      userId,
      details: {
        status: response.status,
        timestamp: new Date().toISOString()
      }
    });
    
    return response;
  } catch (error) {
    console.error('API Error:', error);
    
    // Default error values
    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details = {};
    
    // Map known error types to appropriate responses
    if (error instanceof ValidationError) {
      status = 400;
      message = error.message;
      code = 'VALIDATION_ERROR';
      details = error.details || {};
    } else if (error instanceof NotFoundError) {
      status = 404;
      message = error.message;
      code = 'NOT_FOUND';
    } else if (error instanceof AuthorizationError) {
      status = 403;
      message = error.message;
      code = 'FORBIDDEN';
    } else if (error instanceof RateLimitError) {
      status = 429;
      message = error.message;
      code = 'RATE_LIMIT_EXCEEDED';
    } else if (error instanceof ConflictError) {
      status = 409;
      message = error.message;
      code = 'CONFLICT';
    } else if (error instanceof ExternalServiceError) {
      status = 502;
      message = 'External service error';
      code = 'EXTERNAL_SERVICE_ERROR';
      // Don't expose external service details in response
      details = { service: error.serviceName };
    } else if (error instanceof DatabaseError) {
      status = 500;
      message = 'Database operation failed';
      code = 'DATABASE_ERROR';
      // Don't expose database details in response
    }
    
    // Log error with appropriate sanitization for HIPAA compliance
    try {
      const auditLogger = new AuditLogger({
        requestId: crypto.randomUUID(),
        userId: 'system',
        method: request.method,
        url: request.url
      });
      
      await auditLogger.log({
        action: 'api.error',
        resourceId: crypto.randomUUID(),
        userId: 'system',
        details: {
          errorType: error.constructor.name,
          errorCode: code,
          errorMessage: SecurityService.sanitizeErrorMessage(message),
          status,
          url: SecurityService.sanitizeUrl(request.url),
          method: request.method,
          timestamp: new Date().toISOString()
        }
      });
    } catch (loggingError) {
      console.error('Error logging failed:', loggingError);
    }
    
    // Return standardized error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          details: Object.keys(details).length > 0 ? details : undefined
        }
      },
      { status }
    );
  }
}
