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

// Generate Drizzle migration
function generateMigration() {
  log.info('Generating Drizzle migration...');
  
  try {
    execSync('npx drizzle-kit generate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    });
    
    log.success('Drizzle migration generated successfully');
    
    // List all migration files in the drizzle folder
    const migrationDir = path.join(__dirname, '..', 'drizzle');
    if (fs.existsSync(migrationDir)) {
      log.info('Migration files generated:');
      const files = fs.readdirSync(migrationDir)
        .filter(file => file.endsWith('.sql') || file === 'meta')
        .map(file => `  - ${file}`);
      
      if (files.length > 0) {
        console.log(files.join('\n'));
        return 0;
      } else {
        log.info('No migration files found.');
        return 1;
      }
    } else {
      log.error('Migration directory not found');
      return 1;
    }
  } catch (error) {
    log.error('Failed to generate Drizzle migration');
    console.error(error);
    return 1;
  }
}

// Main function
async function main() {
  const statusCode = generateMigration();
  process.exit(statusCode);
}

main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});