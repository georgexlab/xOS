#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warn: (message) => console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
};

// Create a drizzle migration config file
function createDrizzleConfig() {
  const fs = require('fs');
  const configPath = path.join(__dirname, '..', 'drizzle.config.js');
  
  if (!fs.existsSync(configPath)) {
    log.info('Creating Drizzle config file...');
    const configContent = `
module.exports = {
  schema: './shared/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
`;
    fs.writeFileSync(configPath, configContent);
    log.success('Drizzle config file created');
  }
}

// Run Drizzle migrations using pg library directly
async function runMigrations() {
  log.info('Creating migrations...');
  try {
    const fs = require('fs');
    const { Pool } = require('pg');
    
    log.info('Creating direct SQL migration...');
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        zoho_client_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        title TEXT NOT NULL,
        description TEXT,
        amount TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        zoho_quote_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER NOT NULL REFERENCES quotes(id),
        amount TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        transaction_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    const migrationSqlPath = path.join(__dirname, '..', 'migration.sql');
    fs.writeFileSync(migrationSqlPath, sql);
    
    log.info('Running SQL migration...');
    
    // Connect to database and run the SQL
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    try {
      await pool.query(sql);
      log.success('Migrations applied successfully');
    } catch (err) {
      log.error(`Database error: ${err.message}`);
      throw err;
    } finally {
      await pool.end();
    }
    
  } catch (error) {
    log.error(`Failed to run migrations: ${error.message}`);
    process.exit(1);
  }
}

// Main function
async function main() {
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  createDrizzleConfig();
  runMigrations();
}

main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});