// ARCH-1: Migrate to Enterprise Database Solution (Implement PostgreSQL Adapter)
// Research notes: research_notes_postgresql_adapter_article1.md, research_notes_postgresql_adapter_github_scan.md, research_notes_postgresql_adapter_egomobile_repo.md

import { Pool, PoolClient, QueryResult } from "pg";

// Placeholder for configuration - in a real app, this would come from environment variables or a config service
const PG_CONFIG = {
  user: process.env.DB_USER || "your_db_user", // Placeholder
  host: process.env.DB_HOST || "your_db_host", // Placeholder
  database: process.env.DB_NAME || "your_db_name", // Placeholder
  password: process.env.DB_PASSWORD || "your_db_password", // Placeholder
  port: parseInt(process.env.DB_PORT || "5432", 10), // Placeholder
};

/**
 * @interface IDatabaseAdapter
 * Defines the contract for database adapters.
 */
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute<T = any>(queryText: string, params?: any[]): Promise<QueryResult<T>>;
  beginTransaction(): Promise<PoolClient>;
  commitTransaction(client: PoolClient): Promise<void>;
  rollbackTransaction(client: PoolClient): Promise<void>;
}

/**
 * @class PostgresqlAdapter
 * Implements the IDatabaseAdapter for PostgreSQL.
 * Handles connection pooling, query execution, and transaction management.
 */
export class PostgresqlAdapter implements IDatabaseAdapter {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(PG_CONFIG);

    this.pool.on("error", (err, client) => {
      console.error("Unexpected error on idle client", err);
      // process.exit(-1); // Consider a more graceful shutdown or error handling strategy
    });
  }

  /**
   * Connects to the PostgreSQL database.
   * In reality, the pool handles connections, so this might just test a connection.
   */
  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log("Successfully connected to PostgreSQL via pool.");
      client.release();
    } catch (error) {
      console.error("Failed to connect to PostgreSQL:", error);
      throw error;
    }
  }

  /**
   * Disconnects from the PostgreSQL database by ending the pool.
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      console.log("PostgreSQL pool has been closed.");
    } catch (error) {
      console.error("Error closing PostgreSQL pool:", error);
      throw error;
    }
  }

  /**
   * Executes a SQL query.
   * @param queryText The SQL query string.
   * @param params Optional parameters for the query.
   * @returns A Promise resolving to the query result.
   */
  async execute<T = any>(
    queryText: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(queryText, params);
      return result;
    } catch (error) {
      console.error(`Error executing query: ${queryText}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Begins a database transaction.
   * @returns A Promise resolving to the client for the transaction.
   */
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      return client;
    } catch (error) {
      client.release(); // Release client if BEGIN fails
      console.error("Error beginning transaction", error);
      throw error;
    }
  }

  /**
   * Commits a database transaction.
   * @param client The client that holds the transaction.
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query("COMMIT");
    } catch (error) {
      console.error("Error committing transaction", error);
      // Attempt to rollback on commit error
      try {
        await client.query("ROLLBACK");
        console.warn("Transaction rolled back due to commit error.");
      } catch (rollbackError) {
        console.error("Error rolling back transaction after commit error", rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rolls back a database transaction.
   * @param client The client that holds the transaction.
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction", error);
      // Even if rollback fails, we must release the client
      throw error; // Re-throw original error or a new one indicating rollback failure
    } finally {
      client.release();
    }
  }
}

// Example Usage (for testing purposes, remove or comment out for production):
/*
async function testAdapter() {
  const adapter = new PostgresqlAdapter();
  try {
    await adapter.connect();

    // Example: Create a table (ensure it doesn't exist or use IF NOT EXISTS)
    // await adapter.execute(
    //   `CREATE TABLE IF NOT EXISTS test_items (
    //     id SERIAL PRIMARY KEY,
    //     name VARCHAR(100) NOT NULL
    //   )`
    // );
    // console.log("Table created or already exists.");

    // Example: Insert data
    // const insertResult = await adapter.execute(
    //   "INSERT INTO test_items (name) VALUES ($1) RETURNING *",
    //   ["Test Item 1"]
    // );
    // console.log("Insert result:", insertResult.rows[0]);

    // Example: Select data
    // const selectResult = await adapter.execute("SELECT * FROM test_items");
    // console.log("Select result:", selectResult.rows);

    // Example: Transaction
    const client = await adapter.beginTransaction();
    try {
      // const txInsertResult = await client.query(
      //   "INSERT INTO test_items (name) VALUES ($1) RETURNING *",
      //   ["Transaction Item"]
      // );
      // console.log("Transaction insert result:", txInsertResult.rows[0]);
      // Simulating an error to test rollback
      // throw new Error("Simulated error during transaction");
      await adapter.commitTransaction(client);
      console.log("Transaction committed successfully.");
    } catch (txError) {
      console.error("Transaction error, attempting rollback:", txError);
      await adapter.rollbackTransaction(client); // Rollback is handled by commitTransaction on error, but can be called explicitly
      console.log("Transaction rolled back.");
    }

  } catch (error) {
    console.error("Adapter test failed:", error);
  } finally {
    await adapter.disconnect();
  }
}

testAdapter();
*/

