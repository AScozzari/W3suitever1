#!/usr/bin/env node

// Simple script to start reverse proxy for Replit compatibility
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting W3 Suite Enterprise via Reverse Proxy...');

// Start reverse proxy which handles all routing
const proxy = spawn('tsx', ['apps/reverse-proxy/src/index.ts'], {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development', PROXY_PORT: '5000' },
  stdio: 'inherit'
});

proxy.on('error', (error) => {
  console.error('❌ Failed to start reverse proxy:', error);
  process.exit(1);
});

proxy.on('close', (code) => {
  console.log(`🚫 Reverse proxy exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
const cleanup = () => {
  console.log('🚫 Shutting down W3 Suite...');
  proxy.kill('SIGTERM');
  setTimeout(() => proxy.kill('SIGKILL'), 5000);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGUSR2', cleanup); // nodemon restart