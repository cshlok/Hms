/**
 * Security Service for HMS Support Services
 * 
 * This service provides HIPAA-compliant security features including:
 * - Field-level encryption for PHI/PII
 * - Token verification and management
 * - Data sanitization
 * - Security utilities
 */

import * as crypto from 'crypto';
import { AuditLogger } from '@/lib/audit';

export class SecurityService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-for-development-only-change-in-prod';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-for-development-only-change-in-prod';
  
  /**
   * Encrypts sensitive field data using AES-256-GCM
   * @param data The data to encrypt
   * @returns Encrypted data string (format: iv:authTag:encryptedData)
   */
  public static encryptField(data: string): string {
    if (!data) return data;
    
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.ENCRYPTION_ALGORITHM, 
        Buffer.from(this.ENCRYPTION_KEY), 
        iv
      );
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag().toString('hex');
      
      // Return the IV, auth tag, and encrypted data as a single string
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypts encrypted field data
   * @param encryptedData The encrypted data string (format: iv:authTag:encryptedData)
   * @returns Decrypted data
   */
  public static decryptField(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
    
    try {
      // Split the encrypted data into its components
      const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
      
      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.ENCRYPTION_ALGORITHM, 
        Buffer.from(this.ENCRYPTION_KEY), 
        iv
      );
      
      // Set the authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Verifies a JWT token and returns the decoded payload
   * @param token The JWT token to verify
   * @returns Decoded token payload
   */
  public static async verifyToken(token: string): Promise<any> {
    try {
      // In a real implementation, this would use a proper JWT library
      // For this example, we'll simulate token verification
      
      // Split the token into parts
      const [headerB64, payloadB64, signature] = token.split('.');
      
      // Decode the payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      
      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      
      // Verify signature (simplified for example)
      const expectedSignature = crypto
        .createHmac('sha256', this.JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid token signature');
      }
      
      return payload;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }
  
  /**
   * Sanitizes a URL to remove sensitive information
   * @param url The URL to sanitize
   * @returns Sanitized URL
   */
  public static sanitizeUrl(url: string): string {
    if (!url) return url;
    
    try {
      const urlObj = new URL(url);
      
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'password', 'secret', 'key', 'auth'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      
      return urlObj.toString();
    } catch (error) {
      // If URL parsing fails, do basic redaction
      return url.replace(/([?&](token|password|secret|key|auth)=)[^&]+/gi, '$1[REDACTED]');
    }
  }
  
  /**
   * Sanitizes error messages to prevent leaking sensitive information
   * @param message The error message to sanitize
   * @returns Sanitized error message
   */
  public static sanitizeErrorMessage(message: string): string {
    if (!message) return message;
    
    // Redact potential PHI/PII patterns
    const sanitized = message
      // Redact email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]')
      // Redact phone numbers
      .replace(/(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE REDACTED]')
      // Redact SSNs
      .replace(/\d{3}-\d{2}-\d{4}/g, '[SSN REDACTED]')
      // Redact credit card numbers
      .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[CC REDACTED]')
      // Redact patient IDs (assuming format like P12345678)
      .replace(/\b[P]\d{8}\b/g, '[PATIENT ID REDACTED]')
      // Redact names (this is a simplified approach)
      .replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME REDACTED]');
    
    return sanitized;
  }
  
  /**
   * Checks if a user has the required role
   * @param userRoles The user's roles
   * @param requiredRole The required role
   * @returns True if the user has the required role
   */
  public static hasRole(userRoles: string[], requiredRole: string): boolean {
    if (!userRoles || !Array.isArray(userRoles)) return false;
    
    // Admin role has access to everything
    if (userRoles.includes('admin')) return true;
    
    return userRoles.includes(requiredRole);
  }
  
  /**
   * Checks if a user has any of the required roles
   * @param userRoles The user's roles
   * @param requiredRoles The required roles
   * @returns True if the user has any of the required roles
   */
  public static hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    if (!userRoles || !Array.isArray(userRoles) || !requiredRoles || !Array.isArray(requiredRoles)) {
      return false;
    }
    
    // Admin role has access to everything
    if (userRoles.includes('admin')) return true;
    
    return requiredRoles.some(role => userRoles.includes(role));
  }
  
  /**
   * Generates a secure hash of data
   * @param data The data to hash
   * @returns Hashed data
   */
  public static hashData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  /**
   * Validates a password against security requirements
   * @param password The password to validate
   * @returns Validation result with success flag and message
   */
  public static validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) {
      return { valid: false, message: 'Password is required' };
    }
    
    if (password.length < 12) {
      return { valid: false, message: 'Password must be at least 12 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true };
  }
  
  /**
   * Masks sensitive data for display
   * @param data The data to mask
   * @param type The type of data to mask
   * @returns Masked data
   */
  public static maskSensitiveData(data: string, type: 'email' | 'phone' | 'ssn' | 'creditCard'): string {
    if (!data) return data;
    
    switch (type) {
      case 'email':
        const [username, domain] = data.split('@');
        return `${username.charAt(0)}${'*'.repeat(username.length - 2)}${username.charAt(username.length - 1)}@${domain}`;
        
      case 'phone':
        return data.replace(/^(\d{3})\d{3}(\d{4})$/, '$1-***-$2');
        
      case 'ssn':
        return data.replace(/^(\d{3})-\d{2}-(\d{4})$/, '$1-**-$2');
        
      case 'creditCard':
        return data.replace(/^(\d{4})\d+(\d{4})$/, '$1-****-****-$2');
        
      default:
        return data;
    }
  }
}
