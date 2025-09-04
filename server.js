// Temporary bridge file to run the new structure
import { spawn } from 'child_process';

const server = spawn('tsx', ['apps/backend/api/src/main.ts'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});