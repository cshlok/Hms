/**
 * Core error handling module for the Financial Management system
 * Provides standardized error classes and formatting utilities
 */

// Base application error class
export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  context?: Record<string, any>;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request - Validation Error
export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    errorCode = 'VALIDATION_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 400, errorCode, true, context);
  }
}

// 401 Unauthorized - Authentication Error
export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication failed',
    errorCode = 'AUTHENTICATION_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 401, errorCode, true, context);
  }
}

// 403 Forbidden - Authorization Error
export class AuthorizationError extends AppError {
  constructor(
    message = 'Not authorized to perform this action',
    errorCode = 'AUTHORIZATION_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 403, errorCode, true, context);
  }
}

// 404 Not Found - Resource Not Found Error
export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    errorCode = 'NOT_FOUND',
    context?: Record<string, any>
  ) {
    super(message, 404, errorCode, true, context);
  }
}

// 409 Conflict - Resource Conflict Error
export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict',
    errorCode = 'CONFLICT',
    context?: Record<string, any>
  ) {
    super(message, 409, errorCode, true, context);
  }
}

// 422 Unprocessable Entity - Business Logic Error
export class BusinessLogicError extends AppError {
  constructor(
    message = 'Business logic error',
    errorCode = 'BUSINESS_LOGIC_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 422, errorCode, true, context);
  }
}

// 429 Too Many Requests - Rate Limit Error
export class RateLimitError extends AppError {
  constructor(
    message = 'Rate limit exceeded',
    errorCode = 'RATE_LIMIT_EXCEEDED',
    context?: Record<string, any>
  ) {
    super(message, 429, errorCode, true, context);
  }
}

// 500 Internal Server Error - Database Error
export class DatabaseError extends AppError {
  constructor(
    message = 'Database error',
    errorCode = 'DATABASE_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 500, errorCode, true, context);
  }
}

// 502 Bad Gateway - External Service Error
export class ExternalServiceError extends AppError {
  constructor(
    message = 'External service error',
    errorCode = 'EXTERNAL_SERVICE_ERROR',
    context?: Record<string, any>
  ) {
    super(message, 502, errorCode, true, context);
  }
}

// Domain-specific error classes for financial management

// Billing Errors
export class BillingError extends BusinessLogicError {
  constructor(
    message = 'Billing operation failed',
    errorCode = 'BILLING_ERROR',
    context?: Record<string, any>
  ) {
    super(message, errorCode, context);
  }
}

// Invoice Errors
export class InvoiceError extends BusinessLogicError {
  constructor(
    message = 'Invoice operation failed',
    errorCode = 'INVOICE_ERROR',
    context?: Record<string, any>
  ) {
    super(message, errorCode, context);
  }
}

// Payment Errors
export class PaymentError extends BusinessLogicError {
  constructor(
    message = 'Payment operation failed',
    errorCode = 'PAYMENT_ERROR',
    context?: Record<string, any>
  ) {
    super(message, errorCode, context);
  }
}

// Insurance Errors
export class InsuranceError extends BusinessLogicError {
  constructor(
    message = 'Insurance operation failed',
    errorCode = 'INSURANCE_ERROR',
    context?: Record<string, any>
  ) {
    super(message, errorCode, context);
  }
}

// Claim Errors
export class ClaimError extends BusinessLogicError {
  constructor(
    message = 'Claim operation failed',
    errorCode = 'CLAIM_ERROR',
    context?: Record<string, any>
  ) {
    super(message, errorCode, context);
  }
}

// Specific financial error types
export class InsufficientFundsError extends PaymentError {
  constructor(
    message = 'Insufficient funds',
    context?: Record<string, any>
  ) {
    super(message, 'INSUFFICIENT_FUNDS', context);
  }
}

export class PaymentGatewayError extends ExternalServiceError {
  constructor(
    message = 'Payment gateway error',
    context?: Record<string, any>
  ) {
    super(message, 'PAYMENT_GATEWAY_ERROR', context);
  }
}

export class InsuranceVerificationError extends InsuranceError {
  constructor(
    message = 'Insurance verification failed',
    context?: Record<string, any>
  ) {
    super(message, 'INSURANCE_VERIFICATION_ERROR', context);
  }
}

export class ClaimSubmissionError extends ClaimError {
  constructor(
    message = 'Claim submission failed',
    context?: Record<string, any>
  ) {
    super(message, 'CLAIM_SUBMISSION_ERROR', context);
  }
}

export class BillingCalculationError extends BillingError {
  constructor(
    message = 'Billing calculation error',
    context?: Record<string, any>
  ) {
    super(message, 'BILLING_CALCULATION_ERROR', context);
  }
}

// Error formatting utility
export function formatError(error: Error) {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (error instanceof AppError) {
    return {
      status: 'error',
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      message: error.message,
      details: error.context,
      ...(isDev && { stack: error.stack }),
    };
  }
  
  // For non-AppError instances (unexpected errors)
  return {
    status: 'error',
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    message: isDev ? error.message : 'An unexpected error occurred',
    ...(isDev && { stack: error.stack }),
  };
}
