import express from "express";
import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./core/routes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { seedCommercialAreas } from "./core/seed-areas.js";

const app = express();

// Trust first proxy for rate limiting and X-Forwarded headers
app.set('trust proxy', 1);

// W3 Suite standalone - Brand Interface completamente isolato su porta 5001

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
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000', // Frontend (W3 Suite)
    'http://localhost:5000'  // Gateway
  ];
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

// Trust proxy for rate limiting with X-Forwarded-For
app.set('trust proxy', true);

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);

// ==================== API-ONLY BACKEND ====================
// Frontend serving is handled by the gateway (server.ts)
// This backend is API-only to maintain service separation

// ==================== BRAND INTERFACE STANDALONE PROCESS ====================
// Brand Interface completamente isolato su porta 5001

let brandInterfaceProcess: any = null;

function startBrandInterface() {
  console.log("🚀 Starting Brand Interface standalone service...");
  
  // Path per Brand Interface (completo: frontend + backend su porta 5001)
  const BRAND_PATH = join(__dirname, "..", "..", "..", "backend", "brand-api");
  
  // Avvia Brand Interface standalone con porta configurabile
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
    console.error("❌ Brand Interface failed to start:", error);
  });

  brandInterfaceProcess.on("exit", (code: any, signal: any) => {
    if (signal) {
      console.log(`🚫 Brand Interface killed with signal ${signal}`);
    } else {
      console.log(`🚫 Brand Interface exited with code ${code}`);
    }
    // Respawn after 2 seconds if not intentionally killed
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      setTimeout(() => {
        console.log("🔄 Restarting Brand Interface...");
        startBrandInterface();
      }, 2000);
    }
  });

  const brandPort = process.env.BRAND_PORT || "3001";
  console.log("✅ Brand Interface standalone service started");
  console.log(`🌐 Brand Interface (frontend + backend): http://localhost:${brandPort}/brandinterface/login`);
  console.log(`🔌 Brand Interface API: http://localhost:${brandPort}/brand-api/health`);
}

// Avvia Brand Interface solo in development come processo separato
if (process.env.NODE_ENV === "development") {
  startBrandInterface();
}

// W3 Suite cleanup - gestisce anche il processo Brand Interface separato
process.on("SIGTERM", () => {
  console.log("🚫 W3 Suite shutting down");
  if (brandInterfaceProcess) brandInterfaceProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("🚫 W3 Suite shutting down");
  if (brandInterfaceProcess) brandInterfaceProcess.kill("SIGTERM");
  process.exit(0);
});

// Avvia il server W3 Suite API su porta 3004 (separato dal gateway)
const W3_PORT = Number(process.env.W3_PORT || process.env.API_PORT || 3004);
httpServer.listen(W3_PORT, "0.0.0.0", () => {
  console.log(`✅ W3 Suite API server running on port ${W3_PORT}`);
  console.log(`🔌 API endpoints available at: http://localhost:${W3_PORT}/api`);
});