#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Enterprise Stack with API Gateway...\n');

// Start Gateway first (port 5000 - required by Replit)
const gateway = spawn('npx', ['tsx', 'gateway/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

// Give gateway time to start
setTimeout(() => {
  // Start W3 Suite (port 3000)
  const w3 = spawn('npx', ['tsx', 'apps/backend/api/src/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Start Brand Interface (port 3001)
  const brand = spawn('npx', ['tsx', 'apps/backend/brand-api/src/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Handle exit
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping all services...');
    gateway.kill();
    w3.kill();
    brand.kill();
    process.exit(0);
  });
}, 2000);