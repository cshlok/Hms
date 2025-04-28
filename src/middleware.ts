// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, isCloudflareEnvironment } from '@/lib/db';

/**
 * Middleware to initialize database connection for all API routes
 * This runs before API routes are processed
 */
export function middleware(request: NextRequest) {
  // Only process API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if we're running in a Cloudflare environment
  if (isCloudflareEnvironment()) {
    try {
      // In a real Cloudflare deployment, we would access bindings here
      // The exact method depends on how Next.js is deployed to Cloudflare
      const env = (request as any).cf?.env;
      
      if (env && env.DB) {
        // Initialize the database with the D1 binding
        initializeDb(env);
        console.log('Database initialized in middleware');
      } else {
        console.warn('Cloudflare bindings not found in request context');
      }
    } catch (error) {
      console.error('Error initializing database in middleware:', error);
    }
  } else {
    console.log('Not running in Cloudflare environment, skipping DB initialization');
  }

  return NextResponse.next();
}

// Configure middleware to run only for API routes
export const config = {
  matcher: '/api/:path*',
};
