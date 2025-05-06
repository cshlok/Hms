import type { D1Database, D1PreparedStatement, D1Result, D1ExecResult, D1Meta, D1DatabaseSession, D1SessionBookmark } from "@cloudflare/workers-types";

// Add the query method to the Database interface
export interface Database extends D1Database {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<D1Result<T>>; // Added query method
}

const mockPreparedStatement = (sql: string): D1PreparedStatement => {
  console.warn(`Mock DB Prepare: ${sql}`);
  let boundParameters: unknown[] = [];

  // Define a complete D1Meta object for reuse
  const createMockMeta = (changes: number): D1Meta => ({
    duration: 0,
    changes,
    last_row_id: 0, // last_row_id must be a number
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    changed_db: changes > 0,
  });

  const self: D1PreparedStatement = {
    bind: (...parameters: unknown[]): D1PreparedStatement => {
      console.warn(`Mock DB Bind for ${sql}:`, parameters);
      boundParameters = parameters;
      return self;
    },
    run: async <T = unknown>(): Promise<D1Result<T>> => {
      console.warn(`Mock DB Run (Prepared): ${sql}`, boundParameters);
      const meta = createMockMeta(1);
      return { results: [] as T[], success: true, meta: meta as (D1Meta & Record<string, unknown>) };
    },
    all: async <T = unknown>(): Promise<D1Result<T>> => {
      console.warn(`Mock DB All (Prepared): ${sql}`, boundParameters);
      const meta = createMockMeta(0);
      return { results: [] as T[], success: true, meta: meta as (D1Meta & Record<string, unknown>) };
    },
    first: async <T = unknown>(colName?: string): Promise<T | null> => {
      console.warn(`Mock DB First (Prepared): ${sql}`, boundParameters, colName);
      return null;
    },
    // Use a more permissive signature for the mock implementation to satisfy overloads
    raw: (async <T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> => {
      console.warn(`Mock DB Raw (Prepared): ${sql}`, boundParameters, options);
      if (options?.columnNames === true) {
        const result: [string[], ...T[]] = [[], ...([] as T[])];
        return result;
      } else {
        const result: T[] = [];
        return result;
      }
    }) as {
      <T = unknown[]>(options: { columnNames: true; }): Promise<[string[], ...T[]]>;
      <T = unknown[]>(options?: { columnNames?: false | undefined; } | undefined): Promise<T[]>;
    },
  };
  return self;
};

export const DB: Database = {
  prepare: (sql: string): D1PreparedStatement => mockPreparedStatement(sql),
  exec: async (sql: string): Promise<D1ExecResult> => {
    console.warn(`Mock DB Exec: ${sql}`);
    // D1ExecResult does not have a 'meta' property according to TS2353.
    return { count: 1, duration: 0 };
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
    const meta: D1Meta = {
        duration: 0,
        changes: 0,
        last_row_id: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
        changed_db: false,
    };
    return { results: [] as T[], success: true, meta: meta as (D1Meta & Record<string, unknown>) };
  },
  withSession: function (constraintOrBookmark?: string | D1SessionBookmark): D1DatabaseSession {
    console.warn(`Mock DB withSession called with: ${constraintOrBookmark}`);
    const currentDB = this as Database;
    return {
      ...currentDB,
      prepare: (query: string) => currentDB.prepare(query),
      exec: (query: string) => currentDB.exec(query),
      dump: () => currentDB.dump(),
      batch: <T = unknown>(statements: D1PreparedStatement[]) => currentDB.batch<T>(statements),
      query: <T = unknown>(sql: string, params?: unknown[]) => currentDB.query<T>(sql, params),
      getBookmark: (): D1SessionBookmark | null => {
        console.warn("Mock DB getBookmark called");
        return null;
      },
      // getMetrics method removed as D1Metrics is not an exported member
    } as D1DatabaseSession; 
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

