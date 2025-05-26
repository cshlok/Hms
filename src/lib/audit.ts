/**
 * Audit Logger Service for HMS Support Services
 * 
 * This service provides comprehensive HIPAA-compliant audit logging
 * for all operations within the HMS Support Services module.
 */

import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';

export interface AuditLogContext {
  requestId?: string;
  userId: string;
  userRoles?: string[];
  userAgent?: string;
  method?: string;
  url?: string;
  ipAddress?: string;
}

export interface AuditLogEntry {
  action: string;
  resourceId: string;
  userId: string;
  details: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export class AuditLogger {
  private context: AuditLogContext;
  
  constructor(context: AuditLogContext) {
    this.context = {
      requestId: context.requestId || crypto.randomUUID(),
      userId: context.userId || 'anonymous',
      userRoles: context.userRoles || [],
      userAgent: context.userAgent,
      method: context.method,
      url: context.url ? SecurityService.sanitizeUrl(context.url) : undefined,
      ipAddress: context.ipAddress
    };
  }
  
  /**
   * Logs an audit event to the database and console
   * @param entry The audit log entry to record
   * @returns The created audit log entry
   */
  public async log(entry: AuditLogEntry): Promise<any> {
    try {
      // Sanitize details to remove any PHI/PII
      const sanitizedDetails = this.sanitizeDetails(entry.details);
      
      // Determine severity if not provided
      const severity = entry.severity || this.determineSeverity(entry.action);
      
      // Create the audit log entry
      const logEntry = await prisma.auditLog.create({
        data: {
          requestId: this.context.requestId,
          timestamp: new Date(),
          action: entry.action,
          resourceId: entry.resourceId,
          userId: entry.userId,
          userRoles: this.context.userRoles,
          userAgent: this.context.userAgent,
          method: this.context.method,
          url: this.context.url,
          ipAddress: this.context.ipAddress,
          details: sanitizedDetails,
          severity
        }
      });
      
      // Also log to console for development/debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${severity.toUpperCase()} - ${entry.action} - User: ${entry.userId} - Resource: ${entry.resourceId}`);
      }
      
      return logEntry;
    } catch (error) {
      // Fallback to console logging if database logging fails
      console.error('Failed to write audit log to database:', error);
      console.log(`[AUDIT] ${entry.action} - User: ${entry.userId} - Resource: ${entry.resourceId} - Details:`, entry.details);
      
      // In production, we might want to use a more robust fallback
      if (process.env.NODE_ENV === 'production') {
        // Send to external logging service or write to file
        this.fallbackLogging(entry);
      }
      
      return null;
    }
  }
  
  /**
   * Sanitizes log details to remove any PHI/PII
   * @param details The details object to sanitize
   * @returns Sanitized details object
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    // Define sensitive field patterns
    const sensitiveFields = [
      'password', 'secret', 'token', 'key', 'auth',
      'ssn', 'socialSecurity', 'dob', 'dateOfBirth', 'birthDate',
      'address', 'phone', 'email', 'medicalRecord', 'diagnosis',
      'treatment', 'medication', 'insurance', 'payment', 'credit',
      'debit', 'card', 'account', 'license', 'patient'
    ];
    
    // Process each field in the details object
    for (const [key, value] of Object.entries(details)) {
      // Check if this is a sensitive field
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        // Redact sensitive fields
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeDetails(value);
      } else if (typeof value === 'string') {
        // Check for patterns in string values
        sanitized[key] = SecurityService.sanitizeErrorMessage(value);
      } else {
        // Pass through non-sensitive values
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Determines the severity level based on the action
   * @param action The audit action
   * @returns The severity level
   */
  private determineSeverity(action: string): 'info' | 'warning' | 'error' | 'critical' {
    // Security-related actions are higher severity
    if (action.includes('login') || action.includes('auth') || action.includes('permission')) {
      return 'warning';
    }
    
    // Error actions are error severity
    if (action.includes('error') || action.includes('fail') || action.includes('exception')) {
      return 'error';
    }
    
    // Data modification actions are warning severity
    if (
      action.includes('create') || 
      action.includes('update') || 
      action.includes('delete') || 
      action.includes('modify')
    ) {
      return 'warning';
    }
    
    // Security breaches or critical operations
    if (
      action.includes('breach') || 
      action.includes('security.violation') || 
      action.includes('critical')
    ) {
      return 'critical';
    }
    
    // Default to info
    return 'info';
  }
  
  /**
   * Fallback logging mechanism when database logging fails
   * @param entry The audit log entry to record
   */
  private fallbackLogging(entry: AuditLogEntry): void {
    // In a real implementation, this would write to a file or external service
    // For this example, we'll just log to console
    console.warn('[AUDIT FALLBACK] Failed to write to database, using fallback logging');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: this.context.requestId,
      action: entry.action,
      resourceId: entry.resourceId,
      userId: entry.userId,
      severity: entry.severity || this.determineSeverity(entry.action),
      details: this.sanitizeDetails(entry.details)
    }));
  }
}
