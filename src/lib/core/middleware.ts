/**
 * Core middleware implementation for the Financial Management system
 * Provides standardized request handling, validation, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError, ValidationError, AuthorizationError } from './errors';
import { formatError } from './errors';
import { PermissionService } from './service';
import { logger } from './logging';

// Request body validation middleware
export function validateBody<T>(schema: z.ZodType<T>) {
  return async (req: NextRequest): Promise<T> => {
    try {
      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid request body',
          'INVALID_REQUEST_BODY',
          { errors: error.errors }
        );
      }
      throw new ValidationError('Failed to parse request body');
    }
  };
}

// Query parameter validation middleware
export function validateQuery<T>(schema: z.ZodType<T>) {
  return (req: NextRequest): T => {
    try {
      const url = new URL(req.url);
      const queryParams: Record<string, string> = {};
      
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      
      return schema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Invalid query parameters',
          'INVALID_QUERY_PARAMS',
          { errors: error.errors }
        );
      }
      throw new ValidationError('Failed to parse query parameters');
    }
  };
}

// Permission checking middleware
export function checkPermission(
  permissionService: PermissionService,
  action: string,
  resource: string
) {
  return async (req: NextRequest): Promise<void> => {
    // Extract user ID from authorization header or token
    // This is a simplified implementation
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new AuthorizationError('User not authenticated');
    }
    
    // In a real application, you would validate the token and extract the user ID
    // For demonstration, we'll use a simple mapping
    const tokenToUserId: Record<string, string> = {
      'admin_token': 'user1',
      'user_token': 'user2',
      'manager_token': 'user3',
    };
    
    const token = authHeader.replace('Bearer ', '');
    const userId = tokenToUserId[token];
    
    if (!userId) {
      throw new AuthorizationError('Invalid token');
    }
    
    const hasPermission = await permissionService.hasPermission(userId, action, resource);
    if (!hasPermission) {
      throw new AuthorizationError(`User does not have permission to ${action} ${resource}`);
    }
  };
}

// Global error handling middleware
export function withErrorHandling(handler: Function) {
  return async (req: NextRequest, context: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      logger.error('Request error', {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      const formattedError = formatError(error instanceof Error ? error : new Error('Unknown error'));
      
      return NextResponse.json(
        {
          status: 'error',
          error: formattedError,
        },
        {
          status: formattedError.statusCode,
        }
      );
    }
  };
}

// Success response creator
export function createSuccessResponse<T>(data: T, meta?: Record<string, any>) {
  return NextResponse.json({
    status: 'success',
    data,
    ...(meta && { meta }),
  });
}

// Paginated response creator
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize);
  
  return NextResponse.json({
    status: 'success',
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}
