#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting W3 Suite with Secure API Gateway Architecture...\n');

// Services configuration
const services = [];
let shutdownInProgress = false;

// Start Gateway first (port 5000 - main entry point)
console.log('📡 Starting API Gateway on port 5000...');
const gateway = spawn('npx', ['tsx', 'gateway/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});
services.push({ name: 'API Gateway', process: gateway });

// Give gateway time to start
setTimeout(() => {
  // Start W3 Suite (port 3000)
  console.log('🌐 Starting W3 Suite on port 3000...');
  const w3 = spawn('npx', ['tsx', 'apps/backend/api/src/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  services.push({ name: 'W3 Suite', process: w3 });

  // Start Brand Interface (port 3001)
  console.log('🏢 Starting Brand Interface on port 3001...');
  const brand = spawn('npx', ['tsx', 'apps/backend/brand-api/src/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });
  services.push({ name: 'Brand Interface', process: brand });

  console.log('\n✅ All services started!');
  console.log('\n🌐 Access Points:');
  console.log('  W3 Suite:        http://localhost:5000');
  console.log('  Brand Interface: http://localhost:5000/brandinterface/login');
  console.log('  Health Check:    http://localhost:5000/health');
  console.log('\nPress Ctrl+C to stop all services\n');
}, 2000);

// Cleanup function
const cleanup = () => {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  
  console.log('\n🚫 Shutting down all services...');
  services.forEach(({ name, process }) => {
    try {
      process.kill('SIGTERM');
      console.log(`✅ ${name} stopped`);
    } catch (error) {
      console.error(`❌ Error stopping ${name}:`, error.message);
    }
  });
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
};

// Handle exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  cleanup();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});