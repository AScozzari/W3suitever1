import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { nanoid } from "nanoid";
import { registerBrandRoutes } from "./core/routes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viteLogger = createLogger();

console.log("🚀 Starting Brand Interface Server...");

// Error handling per mantenere il processo attivo in development
process.on('uncaughtException', (error) => {
  console.error('❌ Brand Interface uncaught exception:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Brand Interface unhandled rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

try {
  const app = express();
  
  // Security Headers with Helmet - Brand Interface specific
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'development'
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
          : ["'self'"],
        styleSrc: process.env.NODE_ENV === 'development'
          ? ["'self'", "'unsafe-inline'"]
          : ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xFrameOptions: { action: 'sameorigin' }, // Allow iframe within same origin
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' },
    permittedCrossDomainPolicies: false
  }));
  
  // Rate Limiting for Brand Interface
  const brandApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute (more restrictive than W3 Suite)
    handler: (req, res) => {
      res.status(429).json({ 
        error: 'rate_limit_exceeded',
        message: 'Too many requests from this IP to Brand Interface' 
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  
  const brandAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 login attempts per 15 minutes (more restrictive)
    handler: (req, res) => {
      res.status(429).json({ 
        error: 'too_many_login_attempts',
        message: 'Too many login attempts to Brand Interface' 
      });
    },
    skipSuccessfulRequests: true
  });
  
  // Apply rate limiting
  app.use('/brand-api/', brandApiLimiter);
  app.use('/brand-api/auth/login', brandAuthLimiter);
  
  // CORS configuration for Brand Interface - MORE RESTRICTIVE
  app.use(cors({
    origin: process.env.BRAND_CORS_ORIGINS?.split(',') || ['http://localhost:5001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // Cache preflight for 24 hours
  }));
  
  app.use(express.json());

  // Setup Vite middleware for Brand Interface frontend in development
  if (process.env.NODE_ENV === "development") {
    await setupBrandInterfaceVite(app);
  }

  // Crea il server HTTP per Brand Interface (frontend + backend integrati)
  const httpServer = await registerBrandRoutes(app);

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    console.error('❌ Brand Interface server error:', error);
  });

  httpServer.on('close', () => {
    console.log('🚫 Brand Interface server closed');
  });

  // Avvia il server Brand Interface (frontend + backend) sulla porta 5001
  httpServer.listen(5001, "0.0.0.0", () => {
    console.log("✅ Brand Interface server running on port 5001");
    console.log("🌐 Brand Interface available at: http://localhost:5001/brandinterface/login");
    console.log("🔌 Brand Interface API available at: http://localhost:5001/brand-api/health");
  });

} catch (error) {
  console.error('❌ Brand Interface startup failed:', error);
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}

// Setup Brand Interface Vite middleware function
async function setupBrandInterfaceVite(app: express.Express) {
  console.log("🚀 Setting up Brand Interface Vite middleware...");
  
  const brandWebPath = path.resolve(__dirname, "..", "..", "..", "frontend", "brand-web");
  
  const brandVite = await createViteServer({
    configFile: path.join(brandWebPath, "vite.config.ts"),
    root: brandWebPath,
    base: '/brandinterface/',
    server: { 
      middlewareMode: true,
      hmr: { port: 24678 } // Different HMR port to avoid conflicts
    },
    appType: "spa",
    customLogger: {
      ...viteLogger,
      info: (msg) => console.log(`🔶 [Brand Vite] ${msg}`),
      error: (msg, options) => {
        console.error(`❌ [Brand Vite] ${msg}`);
        viteLogger.error(msg, options);
      },
    }
  });
  
  // PRIMO: Vite middlewares per asset, HMR, @vite/client, etc.
  app.use('/brandinterface', brandVite.middlewares);
  
  // SECONDO: Catch-all RISTRETTO solo per richieste HTML document
  app.use('/brandinterface', async (req, res, next) => {
    // Solo richieste GET che accettano HTML
    if (req.method !== 'GET') return next();
    
    const accept = req.headers.accept || '';
    const isHtmlRequest = accept.includes('text/html');
    
    // Skip assets: path con punto, @vite paths, src paths
    const isAsset = req.path.includes('.') || 
                   req.path.startsWith('/@') || 
                   req.path.startsWith('/src/') ||
                   req.originalUrl.includes('/brandinterface/@') ||
                   req.originalUrl.includes('/brandinterface/src/');
    
    // Solo HTML document requests, non assets
    if (!isHtmlRequest || isAsset) {
      console.log(`🔄 [Brand Vite] Skip HTML for: ${req.originalUrl} (asset=${isAsset}, html=${isHtmlRequest})`);
      return next();
    }
    
    try {
      console.log(`📄 [Brand Vite] Serving HTML for: ${req.originalUrl}`);
      const url = req.originalUrl.replace(/^\/brandinterface/, '') || '/';
      const tplPath = path.join(brandWebPath, 'index.html');
      let tpl = await fs.promises.readFile(tplPath, 'utf-8');
      const html = await brandVite.transformIndexHtml(url, tpl);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      console.error(`❌ [Brand Vite] HTML transform error:`, e);
      brandVite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  console.log("✅ Brand Interface Vite middleware mounted at /brandinterface");
  console.log("✅ Brand Interface HTML transform handler added");
  
  return brandVite;
}