#!/usr/bin/env node

const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');

// Create Express app for port 5000 (to satisfy workflow requirement)
const app = express();
app.use(cors());

// Start Backend API Server
console.log('🚀 Starting W3 Suite Backend API on port 3004...');
const backendEnv = { 
  ...process.env, 
  NODE_ENV: 'development', 
  API_PORT: '3004',
  JWT_SECRET: 'w3suite-dev-secret-2025'
};

const backend = spawn('tsx', ['apps/backend/api/src/index.ts'], {
  env: backendEnv,
  stdio: 'inherit'
});

// Start Frontend Dev Server after a delay
setTimeout(() => {
  console.log('🚀 Starting W3 Suite Frontend on port 3000...');
  
  const frontendEnv = {
    ...process.env,
    VITE_API_URL: 'http://localhost:3004'
  };
  
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: 'apps/frontend/web',
    env: frontendEnv,
    stdio: 'inherit'
  });

  // Handle cleanup
  const cleanup = () => {
    console.log('\n🛑 Shutting down services...');
    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');
    setTimeout(() => {
      backend.kill('SIGKILL');
      frontend.kill('SIGKILL');
      process.exit();
    }, 2000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  // Also handle backend/frontend crashes
  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend crashed with code ${code}`);
      cleanup();
    }
  });

  frontend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Frontend crashed with code ${code}`);
      cleanup();
    }
  });
}, 3000);

// Create redirect server on port 5000
setTimeout(() => {
  // Simple HTML page that redirects to the actual frontend
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>W3 Suite - Redirecting...</title>
        <meta http-equiv="refresh" content="2;url=http://localhost:3000">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          h1 { margin: 0 0 1rem 0; }
          p { margin: 0.5rem 0; opacity: 0.9; }
          .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>W3 Suite is starting...</h1>
          <div class="spinner"></div>
          <p>Redirecting to the application...</p>
          <p style="font-size: 0.9em; opacity: 0.7;">If not redirected, <a href="http://localhost:3000" style="color: white;">click here</a></p>
        </div>
      </body>
      </html>
    `);
  });

  // Proxy API calls
  app.all('/api/*', (req, res) => {
    res.redirect(307, `http://localhost:3004${req.url}`);
  });

  // Everything else redirects to frontend
  app.get('*', (req, res) => {
    res.redirect(`http://localhost:3000${req.url}`);
  });

  app.listen(5000, '0.0.0.0', () => {
    console.log('\n✨ W3 Suite Application is running!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Main Entry Point: http://localhost:5000');
    console.log('📍 Frontend (React): http://localhost:3000');
    console.log('📍 Backend API: http://localhost:3004');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nPress Ctrl+C to stop all services\n');
  });
}, 8000);