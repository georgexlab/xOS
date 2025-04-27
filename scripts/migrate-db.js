#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (message) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
};

// Apply migrations
async function applyMigrations() {
  log.info('Applying migrations to database...');
  
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'drizzle', '0000_supreme_sleeper.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await pool.query(migrationSql);
    
    log.success('Migrations applied successfully');
  } catch (error) {
    log.error('Failed to apply migrations');
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Main function
async function main() {
  await applyMigrations();
}

main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});