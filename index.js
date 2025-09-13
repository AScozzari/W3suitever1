#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting W3 Suite fullstack application...');

// Start backend on port 3001
const backend = spawn('node', ['--loader', 'tsx/esm', 'apps/backend/api/src/index.ts'], {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'pipe'
});

backend.stdout.on('data', (data) => {
  console.log(`[BACKEND] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
});

// Start frontend on port 5000 after a short delay
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'apps/frontend/web'),
    env: process.env,
    stdio: 'pipe'
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[FRONTEND] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
  });

  frontend.on('close', (code) => {
    console.log(`[FRONTEND] Process exited with code ${code}`);
  });

}, 3000);

backend.on('close', (code) => {
  console.log(`[BACKEND] Process exited with code ${code}`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🚫 Shutting down W3 Suite...');
  backend.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🚫 Shutting down W3 Suite...');
  backend.kill();
  process.exit(0);
});