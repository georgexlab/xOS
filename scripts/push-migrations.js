
#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

// Push migration history
function pushMigrations() {
  log.info('Pushing migration history...');
  try {
    execSync('npx drizzle-kit push:pg --skip-migrate', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    log.success('Migration history pushed');

    log.info('Checking migration status...');
    execSync('npx drizzle-kit status:pg', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (error) {
    log.error('Failed to push migrations');
    process.exit(1);
  }
}

pushMigrations();
