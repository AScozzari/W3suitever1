import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { registerRoutes } from "./core/routes.js";
import { seedCommercialAreas } from "./core/seed-areas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if running in Replit environment
const isReplit = !!(process.env.REPL_ID || process.env.REPL_SLUG || process.env.PORT === '5000');

// If in Replit, start the reverse proxy instead of just the backend
if (isReplit) {
  console.log('🔄 Replit environment detected - starting reverse proxy on port 5000...');
  
  const proxyPath = path.join(__dirname, '../../../reverse-proxy/src/index.ts');
  // Start W3 Backend on port 3004 first
  console.log('🔧 Starting W3 Suite backend on port 3004...');
  startBackend();

  // Then start reverse proxy on port 5000
  const proxy = spawn('tsx', [proxyPath], {
    env: { ...process.env, NODE_ENV: 'development', PROXY_PORT: '5000' },
    stdio: 'inherit'
  });
  
  proxy.on('error', (error) => {
    console.error('❌ Failed to start reverse proxy:', error);
    // Fallback to backend only
    startBackend();
  });
  
  proxy.on('close', (code) => {
    console.log(`🚫 Reverse proxy exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle process termination
  const cleanup = () => {
    console.log('🚫 Shutting down reverse proxy...');
    proxy.kill('SIGTERM');
    setTimeout(() => proxy.kill('SIGKILL'), 5000);
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  
} else {
  // Local development - start backend only
  startBackend();
}

async function startBackend() {
  const app = express();

  // W3 Suite backend standalone - senza Brand Interface

  // CORS configuration - accept requests from frontend (3000) and reverse proxy (5000)
  app.use(cors({
    origin: [
      'http://localhost:3000',  // W3 Suite frontend
      'http://localhost:5000',  // Reverse proxy
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User', 'X-Auth-Session']
  }));

  app.use(express.json());

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../../../public");
  app.use(express.static(publicPath));

  // Seed dati di riferimento
  await seedCommercialAreas();

  // Crea il server HTTP
  const httpServer = await registerRoutes(app);

  // API-only backend - frontend apps handle their own routing
  // Only serve API, OAuth2, and well-known endpoints

  // W3 Suite backend cleanup
  process.on("SIGTERM", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🚫 W3 Suite backend shutting down");
    process.exit(0);
  });

  // Fixed port for W3 Backend - always use 3004, reverse proxy handles 5000
  const port = parseInt(process.env.W3_BACKEND_PORT || '3004', 10);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`🚀 W3 Suite backend running on fixed port ${port}`);
    console.log(`🔌 API available at: http://localhost:${port}/api`);
    console.log(`🔍 Health check: http://localhost:${port}/api/tenants`);
  });
}