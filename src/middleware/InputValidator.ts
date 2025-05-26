import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from '../services/AuditLogService';

/**
 * Input Validation Middleware for the HMS System Infrastructure & Security module
 * Provides global input validation and sanitization
 */
export class InputValidator {
  private static instance: InputValidator;
  private auditLog: AuditLogService;

  private constructor() {
    this.auditLog = AuditLogService.getInstance();
  }

  /**
   * Get singleton instance of InputValidator
   * @returns InputValidator instance
   */
  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Validate request body against a schema
   * @param schema Joi schema to validate against
   * @returns Middleware function
   */
  public validateBody(schema: Joi.Schema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = await schema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true
        });
        
        // Replace request body with validated data
        req.body = validatedData;
        next();
      } catch (error) {
        if (error instanceof Joi.ValidationError) {
          // Log validation failure
          if (req.user) {
            await this.auditLog.logEvent({
              eventType: AuditEventType.VALIDATION,
              eventAction: AuditEventAction.EXECUTE,
              eventOutcome: AuditEventOutcome.MINOR_FAILURE,
              eventOutcomeDesc: 'Input validation failed',
              occurredAt: new Date(),
              agents: [
                {
                  agentType: 'user',
                  agentId: req.user.id,
                  agentName: req.user.username,
                  networkAddress: req.ip,
                  userAgent: req.headers['user-agent'] as string
                }
              ],
              entities: [
                {
                  entityType: 'api',
                  entityId: req.originalUrl,
                  entityDetail: {
                    method: req.method,
                    validationErrors: error.details.map(detail => detail.message)
                  }
                }
              ]
            });
          }
          
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }
        
        next(error);
      }
    };
  }

  /**
   * Validate request params against a schema
   * @param schema Joi schema to validate against
   * @returns Middleware function
   */
  public validateParams(schema: Joi.Schema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = await schema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true
        });
        
        // Replace request params with validated data
        req.params = validatedData;
        next();
      } catch (error) {
        if (error instanceof Joi.ValidationError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }
        
        next(error);
      }
    };
  }

  /**
   * Validate request query against a schema
   * @param schema Joi schema to validate against
   * @returns Middleware function
   */
  public validateQuery(schema: Joi.Schema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedData = await schema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true
        });
        
        // Replace request query with validated data
        req.query = validatedData;
        next();
      } catch (error) {
        if (error instanceof Joi.ValidationError) {
          return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }
        
        next(error);
      }
    };
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   * @param fields Array of field names to sanitize
   * @returns Middleware function
   */
  public sanitizeHtml(fields: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Simple HTML sanitization
        for (const field of fields) {
          if (req.body[field] && typeof req.body[field] === 'string') {
            req.body[field] = req.body[field]
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/\//g, '&#x2F;');
          }
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * CSRF protection middleware
   * @returns Middleware function
   */
  public csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip for GET, HEAD, OPTIONS requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }
        
        // Check CSRF token
        const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
        const expectedToken = req.cookies?.['csrf_token'];
        
        if (!csrfToken || !expectedToken || csrfToken !== expectedToken) {
          return res.status(403).json({
            success: false,
            message: 'CSRF token validation failed'
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Content Security Policy middleware
   * @returns Middleware function
   */
  public contentSecurityPolicy() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Set Content-Security-Policy header
        res.setHeader('Content-Security-Policy', [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data:",
          "connect-src 'self'",
          "frame-src 'none'",
          "object-src 'none'",
          "base-uri 'self'"
        ].join('; '));
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
