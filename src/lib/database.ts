// ARCH-1: Migrate to Enterprise Database Solution (Integrate PostgreSQL Adapter)
// This file will serve as the main entry point for database interactions,
// allowing for conditional adapter selection in the future.

import { PostgresqlAdapter, IDatabaseAdapter } from "./database/postgresql_adapter";

let dbAdapter: IDatabaseAdapter;

/**
 * Initializes and returns the currently configured database adapter.
 * For now, it defaults to PostgresqlAdapter.
 *
 * @returns {IDatabaseAdapter} The initialized database adapter.
 */
function getDbAdapter(): IDatabaseAdapter {
  if (!dbAdapter) {
    // In a real application, this could be based on environment variables
    // or a more sophisticated configuration mechanism to choose between different adapters.
    console.log("Initializing PostgreSQL Adapter as the default database adapter.");
    dbAdapter = new PostgresqlAdapter();
    // Optionally, connect here or let services connect as needed
    // dbAdapter.connect().catch(err => console.error("Failed to auto-connect adapter:", err));
  }
  return dbAdapter;
}

// Export a singleton instance or a getter function
export const database = getDbAdapter();

/**
 * Gracefully disconnects the database adapter.
 * This should be called on application shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  if (dbAdapter) {
    await dbAdapter.disconnect();
  }
}

// Potentially export the interface and specific adapters if they need to be accessed directly elsewhere,
// though typically interaction should be through the unified `database` export.
export { IDatabaseAdapter, PostgresqlAdapter };

