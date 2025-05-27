/**
 * Core middleware implementation for the Financial Management module
 * Provides standardized request handling, validation, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, NotFoundError, ValidationError } from './errors';
import { logger } from './logging';

/**
 * Middleware for validating request body against a Zod schema
 * @param schema Zod schema to validate against
 * @returns Middleware function
 */
export function validateRequestBody<T>(schema: z.ZodType<T>) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request body', error.errors);
      }
      throw new ValidationError('Could not parse request body');
    }
  };
}

/**
 * Middleware for validating request query parameters against a Zod schema
 * @param schema Zod schema to validate against
 * @returns Middleware function
 */
export function validateQueryParams<T>(schema: z.ZodType<T>) {
  return (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const queryParams: Record<string, string> = {};
      
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      
      return schema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid query parameters', error.errors);
      }
      throw new ValidationError('Could not parse query parameters');
    }
  };
}

/**
 * Middleware for handling errors in API routes
 * @param handler API route handler
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      logger.error('API error', { 
        path: req.nextUrl.pathname,
        method: req.method,
        error
      });
      
      if (error instanceof AppError) {
        return NextResponse.json(
          { 
            error: error.message,
            code: error.code,
            details: error.details
          },
          { status: error.statusCode }
        );
      }
      
      // For unexpected errors, don't expose details in production
      const isProd = process.env.NODE_ENV === 'production';
      return NextResponse.json(
        { 
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          details: isProd ? undefined : String(error)
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for requiring authentication
 * @param handler API route handler
 * @returns Wrapped handler with authentication check
 */
export function withAuth(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    // In a real implementation, this would check session/token
    // For now, we'll assume authentication is handled by Next.js middleware
    const session = req.headers.get('x-session');
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    return handler(req, ...args);
  };
}

/**
 * Middleware for requiring specific permissions
 * @param permissions Required permissions
 * @param handler API route handler
 * @returns Wrapped handler with permission check
 */
export function withPermissions(
  permissions: string[],
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    // In a real implementation, this would check user permissions
    // For now, we'll assume a simple role-based check
    const userRole = req.headers.get('x-user-role');
    
    if (!userRole || (userRole !== 'admin' && !permissions.includes(userRole))) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    return handler(req, ...args);
  };
}
