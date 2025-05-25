import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';

dotenv.config();

/**
 * Database service for the HMS System Infrastructure & Security module
 */
export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'hms',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Log connection events
    this.pool.on('connect', () => {
      console.log('Connected to database');
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get singleton instance of DatabaseService
   * @returns DatabaseService instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get a client from the pool
   * @returns Promise resolving to a database client
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query with parameters
   * @param text SQL query text
   * @param params Query parameters
   * @returns Query result
   */
  async query(text: string, params: any[] = []): Promise<any> {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Executed query', { text, duration, rows: result.rowCount });
    
    return result;
  }

  /**
   * Execute a transaction with multiple queries
   * @param callback Function that executes queries within the transaction
   * @returns Result of the transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
