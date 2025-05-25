import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database migration utility for the HMS System Infrastructure & Security module
 */
async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'hms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Get list of applied migrations
    const { rows: appliedMigrations } = await pool.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map((row: any) => row.name);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations are applied in order

    console.log('Starting database migrations...');

    // Apply each migration that hasn't been applied yet
    for (const file of migrationFiles) {
      if (!appliedMigrationNames.includes(file)) {
        console.log(`Applying migration: ${file}`);
        
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');
          
          // Run the migration
          await client.query(migrationSql);
          
          // Record the migration
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          await client.query('COMMIT');
          console.log(`Migration applied successfully: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, error);
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
