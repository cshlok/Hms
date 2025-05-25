import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware for the HMS System Infrastructure & Security module
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  console.error('Error:', err);
  
  // Determine if this is a known error type
  if (err.name === 'ValidationError') {
    res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: err.message
    });
    return;
  }
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      details: err.message
    });
    return;
  }
  
  if (err.name === 'ForbiddenError') {
    res.status(403).json({
      status: 'error',
      message: 'Insufficient permissions',
      details: err.message
    });
    return;
  }
  
  if (err.name === 'NotFoundError') {
    res.status(404).json({
      status: 'error',
      message: 'Resource not found',
      details: err.message
    });
    return;
  }
  
  // Default to 500 internal server error
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    // Only include error details in non-production environments
    details: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
};

/**
 * Custom error classes for the HMS System Infrastructure & Security module
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
