import express from "express";
import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./core/routes.js";
import { setupVite } from "./core/vite.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { seedCommercialAreas } from "./core/seed-areas.js";

// Skip auto-start gateway if running via gateway
if (process.env.GATEWAY_LAUNCHED) {
  console.log('🚀 W3 Suite starting via Gateway on port 3000...');
} else {
  console.log('🔄 W3 Suite redirecting to API Gateway...');
  console.log('📡 Gateway will manage all services on port 5000');
  
  // Start gateway with flag to prevent infinite loop
  const gatewayProcess = spawn('npx', ['tsx', 'gateway/index.js'], {
    stdio: 'inherit',
    detached: true,
    env: { ...process.env, GATEWAY_LAUNCHED: 'true' }
  });
  
  // Detach the gateway process so it survives this process ending
  gatewayProcess.unref();
  
  // Keep this process alive to maintain the workflow
  console.log('⏳ Waiting for gateway to start services...');
  
  // Wait indefinitely (gateway will handle everything)
  setInterval(() => {
    // Do nothing, just keep process alive for Replit workflow
  }, 60000);
  return;
}0000);
}

const app = express();

// W3 Suite standalone - Brand Interface completamente isolato su porta 3001 (dietro API Gateway)

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'development' 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"] 
        : ["'self'", "https:"],
      styleSrc: process.env.NODE_ENV === 'development'
        ? ["'self'", "'unsafe-inline'", "https:"]
        : ["'self'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'rate_limit_exceeded',
      message: 'Too many requests from this IP, please try again later.' 
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  handler: (req, res) => {
    res.status(429).json({ 
      error: 'too_many_login_attempts',
      message: 'Too many login attempts, please try again later.' 
    });
  },
  skipSuccessfulRequests: true
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/oauth2/token', authLimiter);

// CORS configuration for W3 Suite
app.use((req, res, next) => {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// Setup Vite per servire il frontend W3 Suite in development
if (process.env.NODE_ENV === "development") {
  await setupVite(app, httpServer);
}

// Brand Interface is now running as a separate service on port 3001
// It's no longer spawned from W3 Suite but runs independently behind the API Gateway

// W3 Suite cleanup
process.on("SIGTERM", () => {
  console.log("🚫 W3 Suite shutting down");
});

process.on("SIGINT", () => {
  console.log("🚫 W3 Suite shutting down");
  process.exit(0);
});

// Avvia il server sulla porta 3000 (dietro API Gateway)
httpServer.listen(3000, "0.0.0.0", () => {
  console.log("W3 Suite server running on port 3000 (internal)");
  console.log("Frontend will be available via Gateway at: http://localhost:5000");
});