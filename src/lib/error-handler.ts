/**
 * Error Handler for HMS Support Services Management
 * Provides consistent error handling, HIPAA-compliant error messages,
 * and appropriate status codes for all API responses
 */
export class ErrorHandler {
  // Standard error types with their corresponding status codes
  private static readonly ERROR_TYPES = {
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    VALIDATION: 422,
    CONFLICT: 409,
    INTERNAL: 500,
    BAD_REQUEST: 400,
    SERVICE_UNAVAILABLE: 503,
  };

  // Error codes for specific domain errors
  private static readonly ERROR_CODES = {
    // Housekeeping errors
    HOUSEKEEPING_REQUEST_NOT_FOUND: 'HOUSEKEEPING_REQUEST_NOT_FOUND',
    HOUSEKEEPING_STAFF_NOT_AVAILABLE: 'HOUSEKEEPING_STAFF_NOT_AVAILABLE',
    HOUSEKEEPING_SCHEDULE_CONFLICT: 'HOUSEKEEPING_SCHEDULE_CONFLICT',
    
    // Maintenance errors
    MAINTENANCE_REQUEST_NOT_FOUND: 'MAINTENANCE_REQUEST_NOT_FOUND',
    MAINTENANCE_ASSET_NOT_FOUND: 'MAINTENANCE_ASSET_NOT_FOUND',
    MAINTENANCE_STAFF_NOT_AVAILABLE: 'MAINTENANCE_STAFF_NOT_AVAILABLE',
    MAINTENANCE_PARTS_UNAVAILABLE: 'MAINTENANCE_PARTS_UNAVAILABLE',
    
    // Dietary errors
    DIETARY_REQUEST_NOT_FOUND: 'DIETARY_REQUEST_NOT_FOUND',
    DIETARY_MENU_NOT_FOUND: 'DIETARY_MENU_NOT_FOUND',
    DIETARY_RESTRICTION_CONFLICT: 'DIETARY_RESTRICTION_CONFLICT',
    
    // Ambulance errors
    AMBULANCE_NOT_FOUND: 'AMBULANCE_NOT_FOUND',
    AMBULANCE_UNAVAILABLE: 'AMBULANCE_UNAVAILABLE',
    AMBULANCE_CREW_UNAVAILABLE: 'AMBULANCE_CREW_UNAVAILABLE',
    
    // Feedback errors
    FEEDBACK_NOT_FOUND: 'FEEDBACK_NOT_FOUND',
    COMPLAINT_NOT_FOUND: 'COMPLAINT_NOT_FOUND',
    
    // Marketing errors
    CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
    SEGMENT_NOT_FOUND: 'SEGMENT_NOT_FOUND',
    CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
    LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
    
    // General errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  };

  /**
   * Process an error and return a standardized error response
   * @param error The error to process
   * @returns Standardized error response with status, message, code, and logging flag
   */
  public static processError(error: any): {
    status: number;
    message: string;
    errorCode: string;
    shouldLog: boolean;
  } {
    // Default values
    let status = 500;
    let message = 'An unexpected error occurred';
    let errorCode = this.ERROR_CODES.INTERNAL_SERVER_ERROR;
    let shouldLog = true;

    // Handle known error types
    if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
      status = this.ERROR_TYPES.NOT_FOUND;
      message = this.sanitizeErrorMessage(error.message) || 'Resource not found';
      
      // Determine specific error code based on message content
      if (error.message?.includes('housekeeping')) {
        errorCode = this.ERROR_CODES.HOUSEKEEPING_REQUEST_NOT_FOUND;
      } else if (error.message?.includes('maintenance')) {
        errorCode = this.ERROR_CODES.MAINTENANCE_REQUEST_NOT_FOUND;
      } else if (error.message?.includes('dietary')) {
        errorCode = this.ERROR_CODES.DIETARY_REQUEST_NOT_FOUND;
      } else if (error.message?.includes('ambulance')) {
        errorCode = this.ERROR_CODES.AMBULANCE_NOT_FOUND;
      } else if (error.message?.includes('feedback')) {
        errorCode = this.ERROR_CODES.FEEDBACK_NOT_FOUND;
      } else if (error.message?.includes('complaint')) {
        errorCode = this.ERROR_CODES.COMPLAINT_NOT_FOUND;
      } else if (error.message?.includes('campaign')) {
        errorCode = this.ERROR_CODES.CAMPAIGN_NOT_FOUND;
      } else if (error.message?.includes('segment')) {
        errorCode = this.ERROR_CODES.SEGMENT_NOT_FOUND;
      } else if (error.message?.includes('contact')) {
        errorCode = this.ERROR_CODES.CONTACT_NOT_FOUND;
      } else if (error.message?.includes('lead')) {
        errorCode = this.ERROR_CODES.LEAD_NOT_FOUND;
      }
    } else if (error.name === 'ValidationError' || error.name === 'ZodError') {
      status = this.ERROR_TYPES.VALIDATION;
      message = 'Validation error';
      errorCode = this.ERROR_CODES.VALIDATION_ERROR;
      shouldLog = false; // Validation errors are expected and don't need to be logged
    } else if (error.name === 'UnauthorizedError') {
      status = this.ERROR_TYPES.UNAUTHORIZED;
      message = 'Unauthorized access';
      errorCode = this.ERROR_CODES.UNAUTHORIZED_ACCESS;
    } else if (error.name === 'ForbiddenError') {
      status = this.ERROR_TYPES.FORBIDDEN;
      message = 'Permission denied';
      errorCode = this.ERROR_CODES.PERMISSION_DENIED;
    } else if (error.name === 'ConflictError') {
      status = this.ERROR_TYPES.CONFLICT;
      message = this.sanitizeErrorMessage(error.message) || 'Resource conflict';
      
      // Determine specific conflict type
      if (error.message?.includes('housekeeping schedule')) {
        errorCode = this.ERROR_CODES.HOUSEKEEPING_SCHEDULE_CONFLICT;
      } else if (error.message?.includes('dietary restriction')) {
        errorCode = this.ERROR_CODES.DIETARY_RESTRICTION_CONFLICT;
      }
    } else if (error.name === 'PrismaClientKnownRequestError') {
      status = this.ERROR_TYPES.BAD_REQUEST;
      message = 'Database operation failed';
      errorCode = this.ERROR_CODES.DATABASE_ERROR;
    } else if (error.name === 'PrismaClientUnknownRequestError') {
      status = this.ERROR_TYPES.INTERNAL;
      message = 'Database error';
      errorCode = this.ERROR_CODES.DATABASE_ERROR;
    } else if (error.name === 'IntegrationError') {
      status = this.ERROR_TYPES.SERVICE_UNAVAILABLE;
      message = 'Integration service unavailable';
      errorCode = this.ERROR_CODES.INTEGRATION_ERROR;
    } else if (error.status && typeof error.status === 'number') {
      // Use the status from the error if available
      status = error.status;
      message = this.sanitizeErrorMessage(error.message) || 'An error occurred';
      errorCode = error.code || this.ERROR_CODES.INTERNAL_SERVER_ERROR;
    }

    return {
      status,
      message,
      errorCode,
      shouldLog,
    };
  }

  /**
   * Create a domain-specific error with appropriate type and code
   * @param message Error message
   * @param type Error type
   * @param code Error code
   * @returns Typed error object
   */
  public static createError(
    message: string,
    type: keyof typeof ErrorHandler.ERROR_TYPES,
    code: keyof typeof ErrorHandler.ERROR_CODES
  ): Error & { status: number; code: string } {
    const error = new Error(message) as Error & { status: number; code: string };
    error.name = `${type}Error`;
    error.status = this.ERROR_TYPES[type];
    error.code = this.ERROR_CODES[code];
    return error;
  }

  /**
   * Sanitize error messages to ensure HIPAA compliance
   * Removes any potentially sensitive information from error messages
   * @param message The original error message
   * @returns Sanitized error message
   */
  private static sanitizeErrorMessage(message: string): string {
    if (!message) return '';

    // Remove any potential PHI (Patient Health Information)
    let sanitized = message
      // Remove any potential patient identifiers
      .replace(/\b(?:patient|person|individual)\s+(?:id|identifier|number)\s*[:=]?\s*\w+/gi, '[REDACTED]')
      // Remove any potential MRN (Medical Record Number)
      .replace(/\b(?:mrn|medical\s+record\s+number)\s*[:=]?\s*\w+/gi, '[REDACTED]')
      // Remove any potential SSN (Social Security Number)
      .replace(/\b(?:ssn|social\s+security)\s*[:=]?\s*[\w-]+/gi, '[REDACTED]')
      // Remove any potential dates of birth
      .replace(/\b(?:dob|date\s+of\s+birth)\s*[:=]?\s*[\w\/-]+/gi, '[REDACTED]')
      // Remove any potential email addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED]')
      // Remove any potential phone numbers
      .replace(/\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[REDACTED]')
      // Remove any potential addresses
      .replace(/\b\d+\s+[A-Za-z\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|plaza|plz|square|sq|parkway|pkwy)\b/gi, '[REDACTED]');

    // Ensure the message doesn't contain any stack traces or sensitive paths
    sanitized = sanitized
      .replace(/at\s+[\w\s./<>]+\s+\([\w\s./<>:]+\)/g, '')
      .replace(/file:\/\/\/[\w\s./<>:]+/g, '')
      .replace(/\/[\w\s./<>:]+/g, '');

    return sanitized;
  }
}
