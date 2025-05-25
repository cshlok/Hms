import { DatabaseService } from '../lib/DatabaseService';
import fs from 'fs';
import path from 'path';

/**
 * Script to run database migrations and validate schema
 */
async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Get database connection
    const db = DatabaseService.getInstance();
    
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Get list of applied migrations
    const { rows: appliedMigrations } = await db.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map((row: any) => row.name);
    
    console.log('Applied migrations:', appliedMigrationNames);
    
    // Get migration SQL file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001_initial_schema.sql');
    const migrationName = path.basename(migrationPath);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply migration if not already applied
    if (!appliedMigrationNames.includes(migrationName)) {
      console.log(`Applying migration: ${migrationName}`);
      
      await db.transaction(async (client) => {
        // Run the migration
        await client.query(migrationSql);
        
        // Record the migration
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );
      });
      
      console.log(`Migration applied successfully: ${migrationName}`);
    } else {
      console.log(`Migration already applied: ${migrationName}`);
    }
    
    // Validate schema by checking if key tables exist
    const tables = [
      'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
      'refresh_tokens', 'audit_events'
    ];
    
    for (const table of tables) {
      const { rows } = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = rows[0].exists;
      console.log(`Table ${table} exists: ${exists}`);
      
      if (!exists) {
        throw new Error(`Table ${table} does not exist. Migration may have failed.`);
      }
    }
    
    console.log('Schema validation successful. All required tables exist.');
    
    // Close database connection
    await db.close();
    
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration and validation process completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration and validation process failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
