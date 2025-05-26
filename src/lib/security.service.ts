import { encryptionService } from '@/lib/services/encryption.service';
import { auditService } from '@/lib/services/audit.service';
import { ErrorHandler } from '@/lib/error-handler';

/**
 * Security Service for HMS Support Services Management
 * Provides centralized security functions including:
 * - Data encryption/decryption
 * - Input sanitization
 * - HIPAA compliance validation
 * - Security logging
 */
export class SecurityService {
  /**
   * Encrypt sensitive data using the encryption service
   * @param data Data to encrypt
   * @returns Encrypted data
   */
  public static encryptSensitiveData(data: any): string {
    try {
      return encryptionService.encryptData(data);
    } catch (error) {
      console.error('Encryption error:', error);
      throw ErrorHandler.createError(
        'Failed to encrypt sensitive data',
        'INTERNAL',
        'INTERNAL_SERVER_ERROR'
      );
    }
  }

  /**
   * Decrypt sensitive data using the encryption service
   * @param encryptedData Encrypted data to decrypt
   * @returns Decrypted data
   */
  public static decryptSensitiveData(encryptedData: string): any {
    try {
      return encryptionService.decryptData(encryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      throw ErrorHandler.createError(
        'Failed to decrypt sensitive data',
        'INTERNAL',
        'INTERNAL_SERVER_ERROR'
      );
    }
  }

  /**
   * Sanitize input data to prevent injection attacks
   * @param input Input data to sanitize
   * @returns Sanitized data
   */
  public static sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Remove potentially dangerous HTML/script tags
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<[^>]*>/g, '')
      // Prevent SQL injection attempts
      .replace(/'/g, ''')
      .replace(/"/g, '"')
      .replace(/;/g, '；')
      .replace(/--/g, '－－')
      .replace(/\/\*/g, '／＊')
      .replace(/\*\//g, '＊／')
      .replace(/union\s+select/gi, 'ｕｎｉｏｎ ｓｅｌｅｃｔ')
      .replace(/exec\s+/gi, 'ｅｘｅｃ ')
      .trim();
  }

  /**
   * Validate that data is HIPAA compliant
   * @param data Data to validate
   * @param context Context of the data (for logging)
   * @returns True if compliant, throws error if not
   */
  public static validateHipaaCompliance(data: any, context: string): boolean {
    // Check for common PHI patterns that should be encrypted
    const phiPatterns = [
      // Patient identifiers
      /\b(?:patient|person|individual)\s+(?:id|identifier|number)\s*[:=]?\s*\w+/i,
      // Medical Record Numbers
      /\b(?:mrn|medical\s+record\s+number)\s*[:=]?\s*\w+/i,
      // Social Security Numbers
      /\b\d{3}-\d{2}-\d{4}\b/,
      // Dates of birth
      /\b(?:dob|date\s+of\s+birth)\s*[:=]?\s*[\w\/-]+/i,
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
      // Phone numbers
      /\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
      // Addresses
      /\b\d+\s+[A-Za-z\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|plaza|plz|square|sq|parkway|pkwy)\b/i,
    ];

    const dataString = JSON.stringify(data);
    
    for (const pattern of phiPatterns) {
      if (pattern.test(dataString)) {
        // Log the compliance issue (without including the actual data)
        auditService.logActivity({
          action: 'HIPAA_COMPLIANCE_VIOLATION',
          resourceType: 'SECURITY',
          resourceId: 'data-validation',
          userId: null,
          metadata: {
            context,
            pattern: pattern.toString(),
          },
        });
        
        throw ErrorHandler.createError(
          'Data contains unencrypted PHI (Protected Health Information)',
          'BAD_REQUEST',
          'VALIDATION_ERROR'
        );
      }
    }
    
    return true;
  }

  /**
   * Log security-related events
   * @param action Security action
   * @param userId User ID
   * @param metadata Additional metadata
   */
  public static logSecurityEvent(action: string, userId: string | null, metadata: any): void {
    auditService.logActivity({
      action,
      resourceType: 'SECURITY',
      resourceId: 'security-event',
      userId,
      metadata,
    });
  }

  /**
   * Validate and sanitize an object's string properties
   * @param obj Object to sanitize
   * @returns Sanitized object
   */
  public static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}
