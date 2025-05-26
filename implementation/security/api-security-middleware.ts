/**
 * API Security Middleware
 * 
 * This file implements comprehensive security middleware for the HMS API endpoints,
 * including:
 * - Request validation and sanitization
 * - Rate limiting and DDoS protection
 * - API key validation
 * - JWT token validation with JWK support
 * - CORS configuration
 * - Content Security Policy implementation
 * - HTTP security headers
 * 
 * The implementation follows OWASP API Security best practices and
 * healthcare security standards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rate-limiter';
import { validateJWT } from './jwt-validator';
import { validateApiKey } from './api-key-validator';
import { sanitizeInput } from './input-sanitizer';
import { logAuditEvent, AuditEventType, Resource } from '../security/enhanced-security-framework';

// Security configuration
const securityConfig = {
  // Rate limiting configuration
  rateLimit: {
    enabled: true,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Too many requests, please try again later.',
    statusCode: 429
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      'https://hospital.example.com',
      'https://admin.hospital.example.com'
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Correlation-ID'
    ],
    exposedHeaders: [
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    maxAge: 86400, // 24 hours
    credentials: true
  },
  
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.hospital.example.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.hospital.example.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn.hospital.example.com'],
      connectSrc: ["'self'", 'https://api.hospital.example.com'],
      fontSrc: ["'self'", 'https://cdn.hospital.example.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Security headers
  securityHeaders: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  
  // Authentication configuration
  auth: {
    jwtRequired: true,
    apiKeyAllowed: true,
    publicPaths: [
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/health'
    ]
  }
};

/**
 * API Security Middleware
 * 
 * This middleware applies security measures to all API requests.
 * 
 * @param req - The incoming request
 * @param context - The middleware context
 * @returns The response or passes to the next middleware
 */
export async function apiSecurityMiddleware(
  req: NextRequest,
  context: { params: Record<string, string> }
) {
  try {
    const { pathname } = new URL(req.url);
    const method = req.method;
    
    // Create a session object for audit logging
    const session = {
      id: req.headers.get('X-Session-ID') || 'unknown',
      userId: 'unknown', // Will be populated after authentication
      username: 'unknown', // Will be populated after authentication
      ipAddress: req.headers.get('X-Forwarded-For') || req.ip || 'unknown',
      userAgent: req.headers.get('User-Agent') || 'unknown'
    };
    
    // Check if path is public
    const isPublicPath = securityConfig.publicPaths.some(path => 
      pathname.startsWith(path)
    );
    
    // Apply rate limiting
    if (securityConfig.rateLimit.enabled) {
      const rateLimitResult = await rateLimit(req);
      
      if (!rateLimitResult.success) {
        // Log rate limit exceeded
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.SYSTEM_CONFIG,
          'rate limit exceeded',
          'failure',
          { 
            path: pathname,
            method,
            ipAddress: session.ipAddress
          },
          undefined,
          'Rate limit exceeded'
        );
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Too many requests',
            message: securityConfig.rateLimit.message
          }),
          { 
            status: securityConfig.rateLimit.statusCode,
            headers: {
              'Content-Type': 'application/json',
              'X-Rate-Limit-Limit': rateLimitResult.limit.toString(),
              'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
              'X-Rate-Limit-Reset': rateLimitResult.reset.toString(),
              ...getSecurityHeaders()
            }
          }
        );
      }
    }
    
    // Apply CORS
    const origin = req.headers.get('Origin');
    
    if (origin) {
      // Check if origin is allowed
      const isAllowedOrigin = securityConfig.cors.allowedOrigins.includes(origin) || 
                             securityConfig.cors.allowedOrigins.includes('*');
      
      if (!isAllowedOrigin) {
        // Log CORS violation
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.SYSTEM_CONFIG,
          'CORS violation',
          'failure',
          { 
            path: pathname,
            method,
            origin,
            ipAddress: session.ipAddress
          },
          undefined,
          'CORS violation'
        );
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'CORS error',
            message: 'Origin not allowed'
          }),
          { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...getSecurityHeaders()
            }
          }
        );
      }
    }
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      const headers = {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': securityConfig.cors.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': securityConfig.cors.allowedHeaders.join(', '),
        'Access-Control-Expose-Headers': securityConfig.cors.exposedHeaders.join(', '),
        'Access-Control-Max-Age': securityConfig.cors.maxAge.toString(),
        ...getSecurityHeaders()
      };
      
      if (securityConfig.cors.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      
      return new NextResponse(null, { 
        status: 204,
        headers
      });
    }
    
    // Authenticate request if not public
    if (!isPublicPath) {
      let authenticated = false;
      let userId = '';
      let username = '';
      
      // Check for JWT token
      if (securityConfig.auth.jwtRequired) {
        const authHeader = req.headers.get('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const jwtResult = await validateJWT(token);
          
          if (jwtResult.valid) {
            authenticated = true;
            userId = jwtResult.payload.sub;
            username = jwtResult.payload.username || jwtResult.payload.sub;
            
            // Update session with user info
            session.userId = userId;
            session.username = username;
          } else if (!securityConfig.auth.apiKeyAllowed) {
            // Log authentication failure
            await logAuditEvent(
              session,
              AuditEventType.ACCESS,
              Resource.SYSTEM_CONFIG,
              'authentication failure',
              'failure',
              { 
                path: pathname,
                method,
                reason: jwtResult.error
              },
              undefined,
              'JWT validation failed'
            );
            
            return new NextResponse(
              JSON.stringify({ 
                error: 'Unauthorized',
                message: 'Invalid or expired token'
              }),
              { 
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                  ...getSecurityHeaders()
                }
              }
            );
          }
        }
      }
      
      // Check for API key if JWT not provided or invalid
      if (!authenticated && securityConfig.auth.apiKeyAllowed) {
        const apiKey = req.headers.get('X-API-Key');
        
        if (apiKey) {
          const apiKeyResult = await validateApiKey(apiKey);
          
          if (apiKeyResult.valid) {
            authenticated = true;
            userId = apiKeyResult.userId;
            username = apiKeyResult.username || apiKeyResult.userId;
            
            // Update session with user info
            session.userId = userId;
            session.username = username;
          }
        }
      }
      
      // If still not authenticated, return 401
      if (!authenticated) {
        // Log authentication failure
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.SYSTEM_CONFIG,
          'authentication failure',
          'failure',
          { 
            path: pathname,
            method
          },
          undefined,
          'No valid authentication provided'
        );
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Unauthorized',
            message: 'Authentication required'
          }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...getSecurityHeaders()
            }
          }
        );
      }
    }
    
    // Sanitize input data
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const contentType = req.headers.get('Content-Type') || '';
        
        if (contentType.includes('application/json')) {
          const body = await req.json();
          const sanitizedBody = sanitizeInput(body);
          
          // Create a new request with sanitized body
          const newRequest = new NextRequest(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(sanitizedBody),
            cache: req.cache,
            credentials: req.credentials,
            integrity: req.integrity,
            keepalive: req.keepalive,
            mode: req.mode,
            redirect: req.redirect
          });
          
          // Replace the original request with the sanitized one
          Object.defineProperty(req, 'body', {
            value: newRequest.body
          });
        }
      } catch (error) {
        console.error('Error sanitizing input:', error);
        
        // Log input validation failure
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.SYSTEM_CONFIG,
          'input validation failure',
          'failure',
          { 
            path: pathname,
            method,
            error: error.message
          },
          undefined,
          'Input validation failed'
        );
        
        return new NextResponse(
          JSON.stringify({ 
            error: 'Bad Request',
            message: 'Invalid input data'
          }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...getSecurityHeaders()
            }
          }
        );
      }
    }
    
    // Log successful access
    await logAuditEvent(
      session,
      AuditEventType.ACCESS,
      Resource.SYSTEM_CONFIG,
      'api access',
      'success',
      { 
        path: pathname,
        method
      }
    );
    
    // Add security headers to the response
    const response = await context.next();
    const headers = new Headers(response.headers);
    
    // Add security headers
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    // Add CORS headers if origin is present
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      
      if (securityConfig.cors.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      headers.set('Access-Control-Expose-Headers', securityConfig.cors.exposedHeaders.join(', '));
    }
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    console.error('Error in API security middleware:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getSecurityHeaders()
        }
      }
    );
  }
}

/**
 * Get security headers
 * 
 * @returns Object containing security headers
 */
function getSecurityHeaders(): Record<string, string> {
  const headers = { ...securityConfig.securityHeaders };
  
  // Add Content-Security-Policy header
  const cspDirectives = Object.entries(securityConfig.csp.directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
  
  headers['Content-Security-Policy'] = cspDirectives;
  
  return headers;
}

export default apiSecurityMiddleware;
