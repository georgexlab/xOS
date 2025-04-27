#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

// Start events-gateway service directly
console.log('Starting xOS Events Gateway on port 5000...');

// Change to events-gateway directory
process.chdir(path.join(__dirname, '../services/events-gateway'));

// Start the server using ts-node-dev
const server = spawn('npx', ['ts-node-dev', '--respawn', '--transpile-only', 'src/index.ts'], {
  stdio: 'inherit'
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('Shutting down services...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down services...');
  server.kill();
  process.exit(0);
});