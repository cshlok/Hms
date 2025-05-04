import type { D1Database } from "@cloudflare/workers-types";

export interface CloudflareEnv {
  DB: D1Database;
  // Add other expected environment bindings here
  [key: string]: unknown; // Index signature for flexibility
}

