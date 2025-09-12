#!/usr/bin/env node

// Complete W3 Suite startup with Gateway + API
import { spawn } from 'child_process';

process.env.NODE_ENV = 'development';
process.env.GATEWAY_ONLY = 'true';

console.log('🚀 Starting W3 Suite Gateway + API via concurrently...');

// Use concurrently to run both gateway and API
const concurrentlyProcess = spawn('npx', [
  'concurrently', 
  '-k', '-s', 'first', 
  '-n', 'GATEWAY,API', 
  '-c', 'blue,green',
  'node gateway/index.js',
  'NODE_ENV=development GATEWAY_LAUNCHED=true tsx apps/backend/api/src/index.ts'
], {
  stdio: 'inherit',
  cwd: process.cwd()
});

concurrentlyProcess.on('error', (error) => {
  console.error('❌ Concurrently startup error:', error);
  process.exit(1);
});

concurrentlyProcess.on('exit', (code) => {
  console.log(`🚫 Concurrently exited with code ${code}`);
  process.exit(code || 0);
});