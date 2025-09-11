#!/usr/bin/env node

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Brand Interface Orchestrator...');

// Paths for Brand Interface apps
const BRAND_API_PATH = join(__dirname, '..', 'apps', 'backend', 'brand-api');
const BRAND_WEB_PATH = join(__dirname, '..', 'apps', 'frontend', 'brand-web');

let brandApiProcess;
let brandWebProcess;

// Function to spawn a process with proper error handling
function spawnService(name, command, args, cwd, port) {
  console.log(`🔄 Starting ${name} from: ${cwd}`);
  
  const childProcess = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      BRAND_JWT_SECRET: 'brand-dev-secret-2025'
    }
  });

  childProcess.on('error', (error) => {
    console.error(`❌ ${name} failed to start:`, error);
  });

  childProcess.on('exit', (code, signal) => {
    if (signal) {
      console.log(`🚫 ${name} killed with signal ${signal}`);
    } else {
      console.log(`🚫 ${name} exited with code ${code}`);
    }
  });

  console.log(`✅ ${name} started (PID: ${childProcess.pid}) on port ${port}`);
  return childProcess;
}

// Start Brand Interface API (port 5002)
brandApiProcess = spawnService(
  'Brand API',
  'npx',
  ['tsx', 'src/index.ts'],
  BRAND_API_PATH,
  5002
);

// Wait a moment then start Brand Interface Frontend (port 5001)
setTimeout(() => {
  brandWebProcess = spawnService(
    'Brand Frontend',
    'npx',
    ['vite', '--port', '5001', '--host', '0.0.0.0'],
    BRAND_WEB_PATH,
    5001
  );
}, 2000);

// Graceful shutdown handlers
function cleanup() {
  console.log('\n🚫 Shutting down Brand Interface services...');
  
  if (brandApiProcess) {
    brandApiProcess.kill('SIGTERM');
  }
  
  if (brandWebProcess) {
    brandWebProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

console.log('✅ Brand Interface Orchestrator ready');
console.log('📱 Brand Interface Frontend: http://localhost:5001/brandinterface/login');
console.log('🔌 Brand Interface API: http://localhost:5002/brand-api/health');