import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * W3 Suite API Gateway
 * Routes traffic between frontend and backend services
 * - Frontend (W3 Suite): http://localhost:3000
 * - Backend API: http://localhost:3004 (W3_PORT/API_PORT)
 * - Brand Interface: http://localhost:3001 (BRAND_PORT)
 */

const app = express();
app.set('trust proxy', 1);

// Logging middleware
function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [gateway] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// ==================== PROXY CONFIGURATION ====================

// Backend API proxy (W3 Suite API + OAuth2)
const W3_PORT = Number(process.env.W3_PORT || process.env.API_PORT || 3004);
const backendProxy = createProxyMiddleware({
  target: `http://localhost:${W3_PORT}`,
  changeOrigin: true,
  xfwd: true, // Forward X-Forwarded-* headers to fix :8000 redirect issues
  secure: false,
  ws: true, // Enable WebSocket proxying
  pathRewrite: {
    '^/api(?=/|$)': '' // Remove /api prefix - backend routes are mounted at root
  },
  on: {
    error: (err, req, res) => {
      log(`Backend proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).json({ error: 'Backend service unavailable' });
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Backend: ${req.method} ${req.url} → ${proxyReq.path}`);
    }
  }
});

// W3 Suite Frontend proxy (separate frontend dev server)
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);
const frontendProxy = createProxyMiddleware({
  target: `http://localhost:${FRONTEND_PORT}`,
  changeOrigin: false,  // Preserve original host for Vite HMR
  xfwd: true,          // Forward x-forwarded headers
  secure: false,
  ws: true, // Enable WebSocket proxying for HMR
  on: {
    error: (err, req, res) => {
      log(`Frontend proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).json({ error: 'Frontend service unavailable' });
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Frontend: ${req.method} ${req.url}`);
    }
  }
});

// Brand Interface proxy (Brand Interface frontend + API)
const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
const brandInterfaceProxy = createProxyMiddleware({
  target: `http://localhost:${BRAND_PORT}`,
  changeOrigin: true,
  secure: false,
  ws: true, // Enable WebSocket proxying
  // Don't filter paths here - let middleware handle routing
  on: {
    error: (err, req, res) => {
      log(`Brand Interface proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).json({ error: 'Brand Interface service unavailable' });
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Brand Interface: ${req.method} ${req.url} → ${proxyReq.path}`);
    }
  }
});

// Custom middleware to handle Brand Interface routing
function brandInterfaceHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Check if the request is for Brand Interface paths
  if (req.path.startsWith('/brandinterface') || req.path.startsWith('/brand-api')) {
    log(`Custom Brand Interface handler: ${req.method} ${req.originalUrl}`);
    // Use the proxy but preserve the full original URL
    brandInterfaceProxy(req, res, next);
  } else {
    next();
  }
}

// Frontend startup function
async function startFrontendServer() {
  log("🚀 Starting W3 Suite Frontend server...");
  
  const FRONTEND_PATH = path.resolve(__dirname, "apps", "frontend", "web");
  
  const frontendProcess = spawn("npm", ["run", "dev"], {
    cwd: FRONTEND_PATH,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: process.env.FRONTEND_PORT || "3000",
      VITE_API_URL: "http://localhost:5000/api"
    }
  });

  frontendProcess.on("error", (error: any) => {
    log(`❌ Frontend Server failed to start: ${error.message}`);
  });

  frontendProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      log(`🚫 Frontend Server killed with signal ${signal}`);
    } else {
      log(`🚫 Frontend Server exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        log("🔄 Restarting Frontend Server...");
        startFrontendServer();
      }, 2000);
    }
  });

  log("✅ W3 Suite Frontend server started");
  log(`🌐 Frontend Server running on: http://localhost:${FRONTEND_PORT}`);
  return frontendProcess;
}

// ==================== ROUTING CONFIGURATION ====================

// ✅ Health check handlers - STOP HEAD /api/ loop by intercepting BEFORE proxy
app.head('/api', (req, res) => res.status(200).end());
app.head('/api/', (req, res) => res.status(200).end());
app.get('/api', (req, res) => res.json({ status: 'W3 Suite API Gateway - OK', timestamp: Date.now() }));
app.get('/api/', (req, res) => res.json({ status: 'W3 Suite API Gateway - OK', timestamp: Date.now() }));

// Brand Interface custom middleware (preserves full paths)
app.use(brandInterfaceHandler);

// Route API calls to backend
app.use('/api', backendProxy);
app.use('/oauth2', backendProxy);
app.use('/.well-known', backendProxy);

// Route all other requests to separated W3 Suite frontend (catch-all)
app.use('/', frontendProxy);

// Health check for gateway
app.get('/gateway/health', (req, res) => {
  const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      frontend: `http://localhost:${FRONTEND_PORT}`,
      backend: `http://localhost:${W3_PORT}`,
      brandInterface: `http://localhost:${BRAND_PORT}`,
      routes: {
        w3Suite: 'http://localhost:5000',
        w3SuiteApi: 'http://localhost:5000/api',
        brandInterface: 'http://localhost:5000/brandinterface',
        brandInterfaceApi: 'http://localhost:5000/brand-api'
      }
    }
  });
});


// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  log(`Gateway error: ${err.message}`);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ 
    error: 'Gateway error',
    message: err.message 
  });
});

// ==================== CHILD PROCESS MANAGEMENT ====================

let apiServerProcess: any = null;
let brandInterfaceProcess: any = null;
let frontendServerProcess: any = null;

function startApiServer() {
  log("🚀 Starting W3 Suite API server...");
  
  const API_PATH = path.resolve(__dirname, "apps", "backend", "api");
  
  apiServerProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: API_PATH,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      W3_PORT: process.env.W3_PORT || process.env.API_PORT || "3004",
      JWT_SECRET: process.env.JWT_SECRET || "w3suite-dev-secret-2025",
      GATEWAY_CHILD: "1", // Prevent child API from starting gateway recursively
      PORT: "" // Clear PORT to prevent gateway detection in child process
    }
  });

  apiServerProcess.on("error", (error: any) => {
    log(`❌ API Server failed to start: ${error.message}`);
  });

  apiServerProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      log(`🚫 API Server killed with signal ${signal}`);
    } else {
      log(`🚫 API Server exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        log("🔄 Restarting API Server...");
        startApiServer();
      }, 2000);
    }
  });

  log("✅ W3 Suite API server started");
  log(`🔌 API Server running on: http://localhost:${W3_PORT}`);
}

function startBrandInterface() {
  log("🚀 Starting Brand Interface server...");
  
  const BRAND_PATH = path.resolve(__dirname, "apps", "backend", "brand-api");
  
  brandInterfaceProcess = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: BRAND_PATH,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      BRAND_PORT: process.env.BRAND_PORT || "3001",
      BRAND_JWT_SECRET: process.env.BRAND_JWT_SECRET || "brand-dev-secret-2025",
      JWT_SECRET: process.env.JWT_SECRET || "w3suite-dev-secret-2025"
    }
  });

  brandInterfaceProcess.on("error", (error: any) => {
    log(`❌ Brand Interface failed to start: ${error.message}`);
  });

  brandInterfaceProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      log(`🚫 Brand Interface killed with signal ${signal}`);
    } else {
      log(`🚫 Brand Interface exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        log("🔄 Restarting Brand Interface...");
        startBrandInterface();
      }, 2000);
    }
  });

  const brandPort = process.env.BRAND_PORT || "3001";
  log("✅ Brand Interface server started");
  log(`🌐 Brand Interface available at: http://localhost:${brandPort}/brandinterface/login`);
}

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Start child processes in development
    if (process.env.NODE_ENV === "development") {
      startApiServer();
      startBrandInterface();
      
      // Only auto-start frontend if explicitly enabled (default: false)
      // This prevents port conflicts when frontend runs separately
      if (process.env.AUTO_START_FRONTEND === "true") {
        log("🎯 AUTO_START_FRONTEND=true - Starting integrated frontend server");
        frontendServerProcess = await startFrontendServer();
      } else {
        log("🎯 AUTO_START_FRONTEND not enabled - Frontend should run separately on port 3000");
        log("💡 To enable auto-start: set AUTO_START_FRONTEND=true");
      }
      
      // Add small delay to let services start
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      // In production, serve static files from dist
      const webDistPath = path.resolve(__dirname, "apps", "frontend", "web", "dist");
      app.use('/', express.static(webDistPath));
      
      // Catch-all for SPA routes in production
      app.get('*', (req, res, next) => {
        // Skip API routes, Brand Interface routes, and static assets
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/brandinterface/') || 
            req.path.startsWith('/brand-api/') ||
            req.path.startsWith('/oauth2/') ||
            req.path.startsWith('/.well-known/') ||
            req.path.startsWith('/gateway/') ||
            req.path.includes('.')) {
          return next();
        }
        
        const indexPath = path.join(webDistPath, 'index.html');
        if (existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(503).send(`
            <!DOCTYPE html>
            <html>
              <head><title>W3 Suite - Not Built</title></head>
              <body>
                <h1>W3 Suite Not Built</h1>
                <p>Please build the frontend first:</p>
                <code>cd apps/frontend/web && npm run build</code>
              </body>
            </html>
          `);
        }
      });
    }

    const port = parseInt(process.env.PORT || '5000', 10);

    app.listen(port, '0.0.0.0', () => {
      const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
      log(`\n🚀 W3 Suite API Gateway running on port ${port}`);
      log('📍 Service endpoints:');
      log('   • Gateway:          http://localhost:5000');
      log(`   • Frontend (W3):    http://localhost:${FRONTEND_PORT} (proxied)`);
      log(`   • Backend API:      http://localhost:${W3_PORT} (proxied)`);
      log(`   • Brand Interface:  http://localhost:${BRAND_PORT} (standalone)`);
      log('\n🔗 Access your app at: http://localhost:5000\n');
    });
  } catch (error) {
    log(`❌ Server startup failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  log('🚫 Gateway shutting down gracefully');
  if (apiServerProcess) {
    log('🚫 Stopping API Server...');
    apiServerProcess.kill('SIGTERM');
  }
  if (brandInterfaceProcess) {
    log('🚫 Stopping Brand Interface...');
    brandInterfaceProcess.kill('SIGTERM');
  }
  if (frontendServerProcess) {
    log('🚫 Stopping Frontend Server...');
    frontendServerProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🚫 Gateway shutting down gracefully');
  if (apiServerProcess) {
    log('🚫 Stopping API Server...');
    apiServerProcess.kill('SIGTERM');
  }
  if (brandInterfaceProcess) {
    log('🚫 Stopping Brand Interface...');
    brandInterfaceProcess.kill('SIGTERM');
  }
  if (frontendServerProcess) {
    log('🚫 Stopping Frontend Server...');
    frontendServerProcess.kill('SIGTERM');
  }
  process.exit(0);
});
