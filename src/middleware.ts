import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to validate Content Security Policy headers
 * This middleware adds CSP headers to all responses
 */
export function cspMiddleware(req: NextRequest) {
  // Generate a unique nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Store the nonce in a header so it can be accessed by the application
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  // Define CSP directives
  const cspHeader = [
    // Default policy to deny everything
    "default-src 'self'",
    // Scripts can only be loaded from self and with the specific nonce
    `script-src 'self' 'nonce-${nonce}' https://trusted-cdn.com`,
    // Styles can be loaded from self and with the specific nonce
    `style-src 'self' 'nonce-${nonce}' https://trusted-cdn.com`,
    // Images can be loaded from self, data URIs, and trusted CDNs
    "img-src 'self' data: https://trusted-cdn.com",
    // Fonts can be loaded from self and trusted CDNs
    "font-src 'self' https://trusted-cdn.com",
    // Connect to self and trusted APIs
    "connect-src 'self' https://api.hospital.com",
    // Prevent embedding in iframes
    "frame-ancestors 'none'",
    // Base URI can only be self
    "base-uri 'self'",
    // Forms can only submit to self
    "form-action 'self'",
    // Prevent object tags
    "object-src 'none'",
  ].join('; ');

  // Additional security headers
  const responseHeaders = {
    'Content-Security-Policy': cspHeader,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  // Return the modified request with the nonce header
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
    headers: responseHeaders,
  });
}
