// lib/db.ts
import { D1Database } from '@cloudflare/workers-types';

// Singleton pattern for database access
let dbInstance: D1Database | null = null;

/**
 * Initialize the database with Cloudflare D1 binding
 * This should be called early in the request lifecycle, typically in middleware
 * or at the beginning of API route handlers that have access to Cloudflare bindings
 */
export function initializeDb(env: { DB: D1Database }): void {
  if (!dbInstance) {
    dbInstance = env.DB;
    console.log('Database initialized successfully');
  }
}

/**
 * Get the database instance
 * Throws an error if the database hasn't been initialized
 */
export function getDb(): D1Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDb first with Cloudflare bindings.');
  }
  return dbInstance;
}

/**
 * Legacy compatibility layer for existing code
 * This allows existing code that imports DB directly to continue working
 * but will throw a helpful error message if the database hasn't been initialized
 */
export const DB = new Proxy({} as D1Database, {
  get(target, prop) {
    const db = getDb();
    return db[prop as keyof D1Database];
  }
});

/**
 * Helper function to check if we're running in a Cloudflare environment
 */
export function isCloudflareEnvironment(): boolean {
  return typeof (global as any).caches !== 'undefined' && 
         typeof (global as any).caches.default !== 'undefined';
}

/**
 * Helper function to extract Cloudflare bindings from request context
 * The exact implementation depends on how Next.js is deployed to Cloudflare
 */
export function getCloudflareBindings(request: Request): { DB: D1Database } | null {
  // This is a simplified example; the actual method to access bindings
  // will depend on your specific Cloudflare Pages/Workers setup
  if (isCloudflareEnvironment()) {
    // For Cloudflare Pages Functions, bindings might be available via:
    // return (request as any).cf?.env;
    
    // For Cloudflare Workers, bindings are passed to the fetch handler:
    // This would be handled by your adapter or server setup
    
    console.warn('Attempting to access Cloudflare bindings. Implementation needs to be customized for your deployment setup.');
    return null;
  }
  
  console.warn('Not running in a Cloudflare environment');
  return null;
}
