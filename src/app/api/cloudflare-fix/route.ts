// import { NextRequest } from "next/server";
import { D1Database } from "@cloudflare/workers-types"; // FIX: Import D1Database type

// Define the expected structure of the Cloudflare environment bindings
interface Environment {
  DB: D1Database; // FIX: Uncomment and use correct type
  // Add other bindings like KV namespaces, secrets, etc., here
}

// Example function to get the environment bindings
// This assumes the Cloudflare Pages/Workers environment provides the bindings
// via the second argument to the handler function or through a global context.
// The exact mechanism might vary based on the specific setup (e.g., using Hono or other frameworks).

// For standard Next.js API routes deployed on Cloudflare Pages,
// bindings are typically accessed via `request.cf` or context passed during runtime.
// However, direct access like in Workers might require specific adapters or configurations.

// Let's assume a hypothetical `getCloudflareBindings` function for demonstration.
// In a real Cloudflare Worker, it would be `env` passed to the fetch handler.
// In Next.js on Cloudflare, this might need a custom server setup or adapter.

// Placeholder for accessing bindings - Actual implementation depends on deployment specifics
function getCloudflareBindings(): Environment | undefined {
  // Parameter prefixed as unused in this placeholder
  // Cloudflare Pages passes bindings via the `request.cf` object or context
  // This is a simplified example; the actual access method might differ.
  // Refer to Cloudflare Pages Functions documentation for the correct way.
  // Example: return (request as any).cf?.env as Env;
  // Or if using a framework adapter, it might be passed differently.
  console.warn(
    "Accessing Cloudflare bindings in Next.js API routes on Cloudflare Pages requires specific setup. This is a placeholder."
  );
  // Returning undefined to indicate bindings might not be directly available this way without proper setup.
  // For testing purposes, let's mock a return if needed, otherwise keep as undefined.
  // return { DB: {} as D1Database }; // Mock example
  return undefined;
}

// FIX: Renamed 'request' to '_request' to satisfy @typescript-eslint/no-unused-vars
export async function GET() {
  try {
    // Attempt to get Cloudflare bindings (replace with actual method)
    // FIX: Removed argument from getCloudflareBindings call
    const environment = getCloudflareBindings();

    if (!environment || !environment.DB) {
      console.error(
        "Cloudflare DB binding not found. Ensure the project is configured correctly for Cloudflare Pages/Workers."
      );
      return new Response(
        JSON.stringify({ error: "Database binding not available" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Example: Querying the D1 database
    // FIX: Use environment.DB instead of env.DB
    // FIX: Ensure the type assertion is correct for D1Database methods
    const { results } = await environment.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

    return new Response(JSON.stringify({ tables: results }), { // FIX: Return actual results
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error accessing Cloudflare bindings or DB:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(
      JSON.stringify({
        error: "Failed to access Cloudflare resources",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Note: The previous implementation used `import { DB } from \'@/lib/db\';`
// This likely needs to be refactored. The `@/lib/db` should probably initialize
// and export the D1 binding obtained from the Cloudflare environment context,
// rather than trying to import it directly.

// Example refactor for @/lib/db.ts (conceptual):
/*
import { D1Database } from '@cloudflare/workers-types';

let dbInstance: D1Database | null = null;

// Function to initialize DB (call this from middleware or route handler with env)
export function initializeDb(env: { DB: D1Database }): void {
  if (!dbInstance) {
    dbInstance = env.DB;
  }
}

// Function to get the DB instance
export function getDb(): D1Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDb first.');
  }
  return dbInstance;
}

// Usage in API route:
// import { initializeDb, getDb } from '@/lib/db';
// import { NextRequest } from 'next/server';
//
// export async function GET(request: NextRequest, { env }: { env: { DB: D1Database } }) {
//   initializeDb(env); // Initialize DB with bindings from Cloudflare
//   const DB = getDb();
//   const { results } = await DB.prepare(...).all();
//   ...
// }
*/
