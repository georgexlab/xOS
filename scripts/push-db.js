#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Push Drizzle schema to database
function pushDrizzleSchema() {
  log.info('Pushing Drizzle schema to database...');
  
  try {
    execSync('npx drizzle-kit push:pg', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    });
    
    log.success('Drizzle schema pushed successfully');
  } catch (error) {
    log.error('Failed to push Drizzle schema');
    console.error(error);
    process.exit(1);
  }
}

// Main function
async function main() {
  pushDrizzleSchema();
}

main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});