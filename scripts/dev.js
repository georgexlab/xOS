#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
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

// Check if pnpm packages are installed
function checkDependencies() {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.info('Installing dependencies with pnpm...');
    try {
      execSync('pnpm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      log.success('Dependencies installed successfully');
    } catch (error) {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
  }
}

// Check database connection
function checkDatabase() {
  log.info('Checking database connection...');
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  try {
    // Create a test script
    const fs = require('fs');
    const testPath = path.join(__dirname, '..', 'test-db-connection.js');
    
    fs.writeFileSync(testPath, `
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
      async function testConnection() {
        try {
          const result = await pool.query('SELECT 1');
          console.log('Database connection successful');
          process.exit(0);
        } catch (error) {
          console.error('Database connection error:', error);
          process.exit(1);
        } finally {
          await pool.end();
        }
      }
      
      testConnection();
    `);
    
    // Run the test script
    execSync('node test-db-connection.js', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    
    // Clean up
    fs.unlinkSync(testPath);
    
    log.success('Database connection verified');
    return true;
  } catch (error) {
    log.error('Failed to connect to database');
    return false;
  }
}

// Skip Prisma client generation since we're using Drizzle ORM
function generatePrismaClient() {
  log.info('Skipping Prisma operations (using Drizzle ORM)...');
  log.success('Using Drizzle ORM for database operations');
}

// Start events-gateway service
function startEventsGateway() {
  log.info('Starting events-gateway service...');
  const gateway = spawn('pnpm', ['--filter', '@xos/events-gateway', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  gateway.on('close', (code) => {
    if (code !== 0) {
      log.error(`events-gateway exited with code ${code}`);
      process.exit(code);
    }
  });

  return gateway;
}

// Main function
async function main() {
  checkDependencies();
  
  if (checkDatabase()) {
    generatePrismaClient();
    const gateway = startEventsGateway();

    // Handle script termination
    process.on('SIGINT', () => {
      log.info('Shutting down services...');
      gateway.kill();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log.info('Shutting down services...');
      gateway.kill();
      process.exit(0);
    });
  }
}

main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
