import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

/**
 * W3 Suite API Gateway
 * Routes traffic between frontend and backend services
 * - Frontend (W3 Suite): http://localhost:3000
 * - Backend API: http://localhost:3000 (W3_PORT/API_PORT)
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
  secure: false,
  ws: true, // Enable WebSocket proxying
  on: {
    error: (err, req, res) => {
      log(`Backend proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).json({ error: 'Backend service unavailable' });
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Backend: ${req.method} ${req.url}`);
    }
  }
});

// Frontend proxy (W3 Suite SPA)
const frontendProxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  secure: false,
  ws: true, // Enable WebSocket proxying for HMR
  on: {
    error: (err, req, res) => {
      log(`Frontend proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).send(`
          <!DOCTYPE html>
          <html>
            <head><title>W3 Suite - Service Unavailable</title></head>
            <body>
              <h1>W3 Suite Frontend Unavailable</h1>
              <p>The frontend service is not running. Please start it with:</p>
              <code>cd apps/frontend/web && npm run dev</code>
            </body>
          </html>
        `);
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Frontend: ${req.method} ${req.url}`);
    }
  }
});

// ==================== ROUTING CONFIGURATION ====================

// Route API calls to backend
app.use('/api', backendProxy);
app.use('/oauth2', backendProxy);
app.use('/.well-known', backendProxy);

// Health check for gateway
app.get('/gateway/health', (req, res) => {
  const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      frontend: 'http://localhost:3000',
      backend: `http://localhost:${W3_PORT}`,
      brandInterface: `http://localhost:${BRAND_PORT}`
    }
  });
});

// Route all other requests to frontend (SPA catch-all)
app.use('/', frontendProxy);

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  log(`Gateway error: ${err.message}`);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ 
    error: 'Gateway error',
    message: err.message 
  });
});

// ==================== SERVER STARTUP ====================

const port = parseInt(process.env.PORT || '5000', 10);

app.listen(port, '0.0.0.0', () => {
  const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
  log(`\n🚀 W3 Suite API Gateway running on port ${port}`);
  log('📍 Service endpoints:');
  log('   • Gateway:          http://localhost:5000');
  log('   • Frontend (W3):    http://localhost:3000 (proxied)');
  log(`   • Backend API:      http://localhost:${W3_PORT} (proxied)`);
  log(`   • Brand Interface:  http://localhost:${BRAND_PORT} (standalone)`);
  log('\n🔗 Access your app at: http://localhost:5000\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('🚫 Gateway shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🚫 Gateway shutting down gracefully');
  process.exit(0);
});
