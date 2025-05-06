import type { D1Database, D1PreparedStatement, D1Result, D1ExecResult, D1Meta } from "@cloudflare/workers-types";

// Add the query method to the Database interface
export interface Database extends D1Database {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<D1Result<T>>; // Added query method
}

const mockPreparedStatement = (sql: string): D1PreparedStatement => {
  console.warn(`Mock DB Prepare: ${sql}`);
  let boundParameters: unknown[] = [];

  const self: D1PreparedStatement = {
    bind: (...parameters: unknown[]): D1PreparedStatement => {
      console.warn(`Mock DB Bind for ${sql}:`, parameters);
      boundParameters = parameters;
      return self;
    },
    run: async <T = unknown>(): Promise<D1Result<T>> => {
      console.warn(`Mock DB Run (Prepared): ${sql}`, boundParameters);
      // D1Result should have meta. D1Meta has changes, duration, last_row_id etc.
      const meta: D1Meta = { duration: 0, changes: 1, last_row_id: null, served_by: "mock", changes_frac: 0 };
      return { results: [] as T[], success: true, meta };
    },
    all: async <T = unknown>(): Promise<D1Result<T>> => {
      console.warn(`Mock DB All (Prepared): ${sql}`, boundParameters);
      const meta: D1Meta = { duration: 0, changes: 0, last_row_id: null, served_by: "mock", changes_frac: 0 };
      return { results: [] as T[], success: true, meta };
    },
    first: async <T = unknown>(colName?: string): Promise<T | null> => {
      console.warn(`Mock DB First (Prepared): ${sql}`, boundParameters, colName);
      // To satisfy D1Result structure if it were to return one, but first() returns T | null directly
      return null;
    },
    // Updated mock raw to align with D1PreparedStatement interface
    raw: async <T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> => {
      console.warn(`Mock DB Raw (Prepared): ${sql}`, boundParameters, options);
      if (options?.columnNames) {
        // Return type for columnNames: true is [string[], ...T[]]
        // For mock, we can return an empty array for column names and an empty array for data
        return [[], ...([] as T[])] as [string[], ...T[]];
      }
      return [] as T[];
    }
  };
  return self;
};

export const DB: Database = {
  prepare: (sql: string): D1PreparedStatement => mockPreparedStatement(sql),
  exec: async (sql: string): Promise<D1ExecResult> => {
    console.warn(`Mock DB Exec: ${sql}`);
    // D1ExecResult does not have a 'success' property.
    // It has 'count' and 'duration', and optional 'meta'.
    const meta: D1Meta = { duration: 0, changes: 1, last_row_id: null, served_by: "mock", changes_frac: 0 };
    return { count: 1, duration: 0, meta };
  },
  dump: async (): Promise<ArrayBuffer> => {
    console.warn("Mock DB Dump");
    return new ArrayBuffer(0);
  },
  batch: async <T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => {
    console.warn("Mock DB Batch", statements.length);
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      const res = await stmt.all<T>();
      results.push(res);
    }
    return results;
  },
  query: async <T = unknown>(sql: string, params?: unknown[]): Promise<D1Result<T>> => {
    console.warn(`Mock DB Query: ${sql}`, params);
    const meta: D1Meta = { duration: 0, changes: 0, last_row_id: null, served_by: "mock", changes_frac: 0 };
    return { results: [] as T[], success: true, meta };
  },
  // Added mock implementation for withSession
  withSession: function (sessionId: string | any): Database {
    console.warn(`Mock DB withSession called with sessionId: ${sessionId}`);
    // In a real scenario, this might return a new D1Database instance associated with the session.
    // For this mock, we can return the same DB instance.
    return this;
  }
};

export const getDB = async (): Promise<Database> => {
  console.warn("getDB() called, returning mock DB instance.");
  return DB;
};

export const getDatabase = async (): Promise<Database> => {
  console.warn("getDatabase() called, returning mock DB instance.");
  return DB;
};

export const database: Database = DB;

export const initializeDatabase = async () => {
  console.warn("Database initialization function \"initializeDatabase\" is not implemented yet.");
  return true;
};

export default DB;

