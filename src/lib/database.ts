// Placeholder for database utility functions
// TODO: Implement actual database connection logic (e.g., using Prisma, Drizzle, etc.)

// --- D1 Database Interface Definitions ---
// Based on common usage patterns and error messages

interface D1Result<T = unknown> {
  results: T[]; // FIX: Made non-optional
  success: boolean;
  meta: {
    duration: number;
    // other meta fields if applicable
  };
  // other D1Result fields if applicable
}

interface D1PreparedStatement {
  bind: (...parameters: unknown[]) => {
    run: () => Promise<D1Result<never>>; // run doesn't typically return results
    all: <T = unknown>() => Promise<D1Result<T>>; // Generic 'all'
    first: <T = unknown>(colName?: string) => Promise<T | null>; // Generic 'first'
  };
  run: () => Promise<D1Result<never>>; // run doesn't typically return results
  all: <T = unknown>() => Promise<D1Result<T>>; // Generic 'all'
  first: <T = unknown>(colName?: string) => Promise<T | null>; // Generic 'first'
}

// Export the main Database interface used by API routes
export interface Database {
  prepare: (sql: string) => D1PreparedStatement;
  exec: (sql: string) => Promise<{ count: number; duration: number }>;
  // FIX: Added query method signature based on usage in ipd.ts/session.ts
  query: <T = unknown>(
    sql: string,
    parameters?: unknown[]
  ) => Promise<{ rows: T[] }>;
  // Add other methods if the actual D1 binding provides them (e.g., batch, dump)
}

// --- Mock Implementation ---

const mockPreparedStatement = (sql: string): D1PreparedStatement => {
  console.warn(`Mock DB Prepare: ${sql}`);
  let boundParameters: unknown[] = [];
  return {
    bind: (...parameters: unknown[]) => {
      console.warn(`Mock DB Bind:`, parameters);
      boundParameters = parameters;
      return {
        run: async (): Promise<D1Result<never>> => {
          console.warn(`Mock DB Run (Prepared): ${sql}`, boundParameters);
          // Return empty results array for run
          return { results: [], success: true, meta: { duration: 0 } };
        },
        all: async <T = unknown>(): Promise<D1Result<T>> => {
          console.warn(`Mock DB All (Prepared): ${sql}`, boundParameters);
          // Return mock results matching the generic type T[]
          return { results: [] as T[], success: true, meta: { duration: 0 } };
        },
        first: async <T = unknown>(colName?: string): Promise<T | null> => {
          console.warn(
            `Mock DB First (Prepared): ${sql}`,
            boundParameters,
            colName
          );
          // Return mock result matching the generic type T | null
          return undefined as T | null;
        },
      };
    },
    // Direct methods on prepared statement (matching interface)
    run: async (): Promise<D1Result<never>> => {
      console.warn(`Mock DB Run (Direct): ${sql}`);
      return { results: [], success: true, meta: { duration: 0 } };
    },
    all: async <T = unknown>(): Promise<D1Result<T>> => {
      console.warn(`Mock DB All (Direct): ${sql}`);
      return { results: [] as T[], success: true, meta: { duration: 0 } };
    },
    first: async <T = unknown>(colName?: string): Promise<T | null> => {
      console.warn(`Mock DB First (Direct): ${sql}`, colName);
      return undefined as T | null;
    },
  };
};

// Updated getDB to return Promise<Database>
export const getDB = async (): Promise<Database> => {
  console.warn("Database connection function 'getDB' is not implemented yet.");
  // Return object matching Database interface
  return {
    prepare: (sql: string): D1PreparedStatement => mockPreparedStatement(sql),
    exec: async (sql: string): Promise<{ count: number; duration: number }> => {
      console.warn(`Mock DB Exec: ${sql}`);
      return { count: 0, duration: 0 };
    },
    // FIX: Added mock query implementation matching interface
    query: async <T = unknown>(
      sql: string,
      parameters?: unknown[]
    ): Promise<{ rows: T[] }> => {
      console.warn(`Mock DB Query (getDB): ${sql}`, parameters);
      return { rows: [] as T[] };
    },
  };
};

// --- Other Placeholders (Potentially unused/conflicting) ---
// These might be remnants or alternative attempts. Keep or remove based on actual usage.

// Placeholder function for API routes importing 'getDb' (lowercase b)
// FIX: Update return type and implementation to match Database interface
export const getDatabase = async (): Promise<Database> => {
  console.warn("Database connection function 'getDb' is not implemented yet.");
  return {
    prepare: (sql: string) => mockPreparedStatement(sql),
    exec: async (sql: string) => {
      console.warn(`Mock DB Exec: ${sql}`);
      return { count: 0, duration: 0 };
    },
    query: async <T = unknown>(
      sql: string,
      parameters?: unknown[]
    ): Promise<{ rows: T[] }> => {
      console.warn(`Mock DB Query (getDb): ${sql}`, parameters);
      return { rows: [] as T[] };
    },
  };
};

// Placeholder object for API routes importing 'db'
// FIX: Update type and implementation to match Database interface
export const database: Database = {
  prepare: (sql: string) => mockPreparedStatement(sql),
  exec: async (sql: string) => {
    console.warn(`Mock DB Exec: ${sql}`);
    return { count: 0, duration: 0 };
  },
  query: async <T = unknown>(
    sql: string,
    parameters?: unknown[]
  ): Promise<{ rows: T[] }> => {
    console.warn(`Mock DB Query (db): ${sql}`, parameters);
    return { rows: [] as T[] };
  },
};

// Placeholder object for API routes importing 'DB'
// FIX: Update type and implementation to match Database interface
export const DB: Database = {
  prepare: (sql: string) => mockPreparedStatement(sql),
  exec: async (sql: string) => {
    console.warn(`Mock DB Exec: ${sql}`);
    return { count: 0, duration: 0 };
  },
  query: async <T = unknown>(
    sql: string,
    parameters?: unknown[]
  ): Promise<{ rows: T[] }> => {
    console.warn(`Mock DB Query (DB): ${sql}`, parameters);
    return { rows: [] as T[] };
  },
};

// Placeholder function for API routes importing 'initializeDb'
export const initializeDatabase = async () => {
  console.warn(
    "Database initialization function 'initializeDb' is not implemented yet."
  );
  return true;
};

// Default export might also be expected by some imports
export default DB;
