/**
 * Database module for HMS Diagnostics
 * 
 * This module provides database connectivity and query execution
 * functionality for the HMS Diagnostics module.
 */

/**
 * Database connection interface
 */
export interface DBConnection {
  query: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

/**
 * Returns a database connection instance
 * 
 * @returns Database connection instance
 */
export function DB(): DBConnection {
  return {
    query: async (sql: string, params: any[] = []) => {
      try {
        // In a real implementation, this would execute the query against a database
        // For testing purposes, we're returning a mock result
        console.log(`Executing query: ${sql}`);
        console.log(`With params: ${JSON.stringify(params)}`);
        
        return {
          results: [],
          insertId: 0,
          affectedRows: 0
        };
      } catch (error) {
        console.error('Database query error:', error);
        throw error;
      }
    },
    close: async () => {
      // Close the connection
      return Promise.resolve();
    }
  };
}

/**
 * Executes a transaction with multiple queries
 * 
 * @param queries Array of query objects with SQL and parameters
 * @returns Promise resolving to array of query results
 */
export async function executeTransaction(
  queries: { sql: string; params?: any[] }[]
): Promise<any[]> {
  const db = DB();
  const results: any[] = [];
  
  try {
    // Start transaction
    await db.query('BEGIN');
    
    // Execute each query
    for (const query of queries) {
      const result = await db.query(query.sql, query.params);
      results.push(result);
    }
    
    // Commit transaction
    await db.query('COMMIT');
    
    return results;
  } catch (error) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
    throw error;
  }
}
