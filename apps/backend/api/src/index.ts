import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./core/routes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { seedCommercialAreas } from "./core/seed-areas.js";
import { spawn } from "child_process";

// Clean W3 Suite API server - direct JWT authentication
console.log('🚀 Starting W3 Suite API server...');
const app = express();

// Start minimal status server on port 5000 (required by workflow) and frontend
if (process.env.NODE_ENV === 'development') {
  // Start frontend dev server on port 3000
  setTimeout(() => {
    console.log('🎨 Starting frontend dev server on port 3000...');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: 'apps/frontend/web',
      stdio: 'inherit',
      shell: true
    });
    
    frontend.on('error', (err) => {
      console.error('Failed to start frontend:', err);
    });
    
    process.on('exit', () => {
      frontend.kill();
    });
  }, 500);
  
  // Start status server on port 5000
  setTimeout(() => {
    const statusServer = spawn('tsx', ['apps/backend/api/src/status-server.ts'], {
      stdio: 'inherit'
    });
    
    statusServer.on('error', (err) => {
      console.error('Failed to start status server:', err);
    });
    
    process.on('exit', () => {
      statusServer.kill();
    });
  }, 1000);
}

  // Trust first proxy for rate limiting and X-Forwarded headers
  app.set('trust proxy', 1);

// CORS Configuration for direct frontend communication
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://w3suite.com', 'https://*.w3suite.com']
    : ['http://localhost:3000', 'http://localhost:5173'], // Frontend dev servers only
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Demo-User'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Enable CORS before other middleware
const cors = (await import('cors')).default;
app.use(cors(corsOptions));


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


// Trust proxy configuration - use specific value instead of true for security
app.set('trust proxy', 1);

app.use(express.json());

// Seed dati di riferimento
await seedCommercialAreas();

// Crea il server HTTP
const httpServer = await registerRoutes(app);




// Start W3 Suite API server on port 3004
const W3_PORT = Number(process.env.W3_PORT || process.env.API_PORT || 3004);
httpServer.listen(W3_PORT, "0.0.0.0", () => {
  console.log(`✅ W3 Suite API server running on port ${W3_PORT}`);
  console.log(`🔌 API endpoints available at: http://localhost:${W3_PORT}/api`);
  console.log(`🌐 Frontend at: http://localhost:3000`);
});