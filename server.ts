import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer as createViteServer, createLogger } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viteLogger = createLogger();

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

// Brand Interface proxy (Brand Interface frontend + API)
const BRAND_PORT = Number(process.env.BRAND_PORT || 3001);
const brandInterfaceProxy = createProxyMiddleware({
  target: `http://localhost:${BRAND_PORT}`,
  changeOrigin: true,
  secure: false,
  ws: true, // Enable WebSocket proxying
  on: {
    error: (err, req, res) => {
      log(`Brand Interface proxy error: ${err.message}`);
      // Type guard: check if res is ServerResponse and not Socket
      if ('headersSent' in res && 'status' in res && !res.headersSent) {
        (res as express.Response).status(503).json({ error: 'Brand Interface service unavailable' });
      }
    },
    proxyReq: (proxyReq, req) => {
      log(`→ Brand Interface: ${req.method} ${req.url}`);
    }
  }
});

// Setup W3 Suite Vite middleware function
async function setupW3SuiteVite(app: express.Express) {
  log("🚀 Setting up W3 Suite Vite middleware...");
  
  const webFrontendPath = path.resolve(__dirname, "apps", "frontend", "web");
  
  const w3SuiteVite = await createViteServer({
    configFile: path.join(webFrontendPath, "vite.config.ts"),
    root: webFrontendPath,
    server: { 
      middlewareMode: true,
      hmr: { port: 24677 } // Different HMR port to avoid conflicts
    },
    appType: "spa",
    customLogger: {
      ...viteLogger,
      info: (msg) => log(`🔶 [W3 Suite Vite] ${msg}`),
      error: (msg, options) => {
        log(`❌ [W3 Suite Vite] ${msg}`);
        viteLogger.error(msg, options);
      },
    }
  });
  
  // FIRST: Vite middlewares for assets, HMR, @vite/client, etc.
  app.use(w3SuiteVite.middlewares);
  
  // SECOND: Catch-all for HTML document requests (SPA routing)
  app.use('/', async (req, res, next) => {
    // Only GET requests that accept HTML
    if (req.method !== 'GET') return next();
    
    const accept = req.headers.accept || '';
    const isHtmlRequest = accept.includes('text/html');
    
    // Skip API routes, Brand Interface routes, and assets
    const isApiRoute = req.path.startsWith('/api/') || 
                      req.path.startsWith('/brandinterface/') || 
                      req.path.startsWith('/brand-api/') ||
                      req.path.startsWith('/oauth2/') ||
                      req.path.startsWith('/.well-known/') ||
                      req.path.startsWith('/gateway/');
    
    // Skip assets: paths with dots, @vite paths, src paths
    const isAsset = req.path.includes('.') || 
                   req.path.startsWith('/@') || 
                   req.path.startsWith('/src/') ||
                   req.originalUrl.includes('/@') ||
                   req.originalUrl.includes('/src/');
    
    // Only serve HTML for document requests that aren't API routes or assets
    if (!isHtmlRequest || isApiRoute || isAsset) {
      return next();
    }
    
    try {
      log(`📄 [W3 Suite Vite] Serving HTML for: ${req.originalUrl}`);
      const tplPath = path.join(webFrontendPath, 'index.html');
      let tpl = await fs.promises.readFile(tplPath, 'utf-8');
      const html = await w3SuiteVite.transformIndexHtml(req.originalUrl, tpl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      log(`❌ [W3 Suite Vite] HTML transform error: ${(e as Error).message}`);
      w3SuiteVite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  log("✅ W3 Suite Vite middleware mounted at /");
  log("✅ W3 Suite HTML transform handler added");
  
  return w3SuiteVite;
}

// ==================== ROUTING CONFIGURATION ====================

// Route Brand Interface frontend and API
app.use('/brandinterface', brandInterfaceProxy);
app.use('/brand-api', brandInterfaceProxy);

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

// ==================== SERVER STARTUP ====================

async function startServer() {
  try {
    // Setup W3 Suite Vite middleware for frontend in development
    if (process.env.NODE_ENV === "development") {
      await setupW3SuiteVite(app);
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
        if (fs.existsSync(indexPath)) {
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
      log('   • Frontend (W3):    Direct Vite middleware (no proxy)');
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
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🚫 Gateway shutting down gracefully');
  process.exit(0);
});
