import type { D1Result, D1Database, D1PreparedStatement } from "@cloudflare/workers-types";

// Define a more specific type for D1Result that includes expected meta properties
export interface D1ResultWithMeta<T = unknown> extends D1Result<T> {
  meta: {
    last_row_id?: number;
    changes?: number;
    duration?: number;
    served_by?: string;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

// Re-export D1Database, D1PreparedStatement, and D1Result so they can be imported from "@/types/cloudflare"
// This ensures that API routes can use these types directly from this local type definition file.
export type { D1Database, D1PreparedStatement, D1Result };

