import express from "express";
import cors from "cors";
import { registerBrandRoutes } from "./core/routes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


// Error handling per mantenere il processo attivo in development
process.on('uncaughtException', (error) => {
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
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
  app.use('/', brandApiLimiter);
  app.use('/auth/login', brandAuthLimiter);
  
  // CORS configuration for Brand Interface - Accepts requests from frontend on port 3001
  const BRAND_BACKEND_PORT = Number(process.env.BRAND_BACKEND_PORT || 3002);
  const BRAND_FRONTEND_PORT = Number(process.env.BRAND_FRONTEND_PORT || 3001);
  app.use(cors({
    origin: process.env.BRAND_CORS_ORIGINS?.split(',') || [`http://localhost:${BRAND_FRONTEND_PORT}`, 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // Cache preflight for 24 hours
  }));
  
  app.use(express.json());

  // Crea il server HTTP per Brand Interface Backend (solo API)
  const httpServer = await registerBrandRoutes(app);

  // Event handlers per il server HTTP
  httpServer.on('error', (error) => {
    // Handle server errors silently in production
  });

  // Avvia il server Brand Interface Backend su porta 3002
  httpServer.listen(BRAND_BACKEND_PORT, "127.0.0.1", () => {
    console.log(`🚀 Brand Interface Backend running on http://127.0.0.1:${BRAND_BACKEND_PORT} (localhost only)`);
  });

} catch (error) {
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
}