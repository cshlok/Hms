/**
 * Core logging module for the Financial Management system
 * Provides standardized logging with sensitive data masking
 */

// Logger interface
export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}

// Sensitive fields that should be masked in logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'bankAccount',
  'routingNumber',
  'accountNumber',
  'pin',
  'accessCode',
  'authorizationCode',
];

// Function to mask sensitive data in objects
function maskSensitiveData(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => maskSensitiveData(item));
    }
    
    const maskedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        // Mask sensitive field
        maskedData[key] = typeof value === 'string' 
          ? '***MASKED***' 
          : '[MASKED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively mask nested objects
        maskedData[key] = maskSensitiveData(value);
      } else {
        // Pass through non-sensitive data
        maskedData[key] = value;
      }
    }
    
    return maskedData;
  }
  
  return data;
}

// Default logger implementation
class DefaultLogger implements Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }
  
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }
  
  private formatLog(level: string, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const maskedContext = context ? maskSensitiveData(context) : undefined;
    
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(maskedContext && { context: maskedContext }),
    });
  }
  
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatLog('debug', message, context));
    }
  }
  
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatLog('info', message, context));
    }
  }
  
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }
  
  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }
}

// Create logger instance based on environment
const logLevel = process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' || 'info';
export const logger: Logger = new DefaultLogger(logLevel);

// Correlation ID for request tracking
let currentCorrelationId: string | null = null;

// Set correlation ID for the current context
export function setCorrelationId(correlationId: string): void {
  currentCorrelationId = correlationId;
}

// Get current correlation ID
export function getCorrelationId(): string | null {
  return currentCorrelationId;
}

// Clear correlation ID
export function clearCorrelationId(): void {
  currentCorrelationId = null;
}

// Logger with correlation ID
export class CorrelatedLogger implements Logger {
  constructor(private baseLogger: Logger) {}
  
  debug(message: string, context?: Record<string, any>): void {
    this.baseLogger.debug(message, this.addCorrelationId(context));
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.baseLogger.info(message, this.addCorrelationId(context));
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.baseLogger.warn(message, this.addCorrelationId(context));
  }
  
  error(message: string, context?: Record<string, any>): void {
    this.baseLogger.error(message, this.addCorrelationId(context));
  }
  
  private addCorrelationId(context?: Record<string, any>): Record<string, any> {
    const correlationId = getCorrelationId();
    if (!correlationId) return context || {};
    
    return {
      ...(context || {}),
      correlationId,
    };
  }
}

// Create correlated logger
export const correlatedLogger: Logger = new CorrelatedLogger(logger);
