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

// W3 Suite Multi-Service Orchestrator
console.log('🚀 Starting W3 Suite Multi-App Architecture...');
console.log('🏗️  Services: W3 Backend + Brand Backend + W3 Frontend + Brand Frontend + Reverse Proxy');

// Store all child processes for cleanup
const childProcesses: Array<{ name: string; process: any }> = [];

// Graceful shutdown handler
function gracefulShutdown() {
  console.log('\n🛑 Shutting down all services...');
  childProcesses.forEach(({ name, process }) => {
    if (process && !process.killed) {
      console.log(`   Stopping ${name}...`);
      process.kill('SIGTERM');
    }
  });
  
  // Force kill after 5 seconds if they don't stop gracefully
  setTimeout(() => {
    childProcesses.forEach(({ name, process }) => {
      if (process && !process.killed) {
        console.log(`   Force killing ${name}...`);
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
}

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('exit', gracefulShutdown);

const app = express();

// Multi-service orchestration for development
if (process.env.NODE_ENV === 'development') {
  console.log('\n📋 Service Startup Sequence:');
  console.log('   Phase 1: Backend Services (W3 Suite + Brand Interface)');
  console.log('   Phase 2: Frontend Services (W3 Suite + Brand Interface)');
  console.log('   Phase 3: Reverse Proxy (Port 5000)\n');

  // Phase 1: Start Backend Services
  setTimeout(() => {
    console.log('🔧 Phase 1: Starting Backend Services...');
    
    // Start Brand Interface Backend on port 3002
    console.log('   Starting Brand Interface Backend (port 3002)...');
    const brandBackend = spawn('tsx', ['apps/backend/brand-api/src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, BRAND_BACKEND_PORT: '3002' }
    });
    childProcesses.push({ name: 'Brand Backend', process: brandBackend });
    
    // Prefix Brand Backend output
    brandBackend.stdout?.on('data', (data) => {
      process.stdout.write(`[BRAND-API] ${data}`);
    });
    brandBackend.stderr?.on('data', (data) => {
      process.stderr.write(`[BRAND-API] ${data}`);
    });
    
    brandBackend.on('error', (err) => {
      console.error('[BRAND-API] Failed to start:', err);
    });

  }, 500);

  // Phase 2: Start Frontend Services
  setTimeout(() => {
    console.log('🎨 Phase 2: Starting Frontend Services...');
    
    // Start W3 Suite Frontend on localhost:3000 (private)
    console.log('   Starting W3 Suite Frontend on localhost:3000 (private)...');
    const w3Frontend = spawn('npm', ['run', 'dev'], {
      cwd: 'apps/frontend/web',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3000' }
    });
    childProcesses.push({ name: 'W3 Frontend', process: w3Frontend });
    
    // Prefix W3 Frontend output
    w3Frontend.stdout?.on('data', (data) => {
      process.stdout.write(`[W3-WEB] ${data}`);
    });
    w3Frontend.stderr?.on('data', (data) => {
      process.stderr.write(`[W3-WEB] ${data}`);
    });
    
    w3Frontend.on('error', (err) => {
      console.error('[W3-WEB] Failed to start:', err);
    });

    // Start Brand Interface Frontend on port 3001
    console.log('   Starting Brand Interface Frontend (port 3001)...');
    const brandFrontend = spawn('npm', ['run', 'dev'], {
      cwd: 'apps/frontend/brand-web',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    childProcesses.push({ name: 'Brand Frontend', process: brandFrontend });
    
    // Prefix Brand Frontend output
    brandFrontend.stdout?.on('data', (data) => {
      process.stdout.write(`[BRAND-WEB] ${data}`);
    });
    brandFrontend.stderr?.on('data', (data) => {
      process.stderr.write(`[BRAND-WEB] ${data}`);
    });
    
    brandFrontend.on('error', (err) => {
      console.error('[BRAND-WEB] Failed to start:', err);
    });

  }, 3500); // Start frontends 3 seconds after backends

  // Phase 3: Start Reverse Proxy
  setTimeout(() => {
    console.log('🔄 Phase 3: Starting Reverse Proxy...');
    console.log('   Starting Reverse Proxy (port 5000)...');
    
    const reverseProxy = spawn('tsx', ['apps/backend/api/src/status-server.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    childProcesses.push({ name: 'Reverse Proxy', process: reverseProxy });
    
    // Prefix Reverse Proxy output  
    reverseProxy.stdout?.on('data', (data) => {
      process.stdout.write(`[PROXY] ${data}`);
    });
    reverseProxy.stderr?.on('data', (data) => {
      process.stderr.write(`[PROXY] ${data}`);
    });
    
    reverseProxy.on('error', (err) => {
      console.error('[PROXY] Failed to start:', err);
    });

    // Show final status
    setTimeout(() => {
      console.log('\n✅ All services started! Access points:');
      console.log('   🌐 W3 Suite: http://localhost:5000/');
      console.log('   🏢 Brand Interface: http://localhost:5000/brandinterface');
      console.log('   🏥 Health Check: http://localhost:5000/health');
      console.log('   📊 Direct Backend APIs:');
      console.log('      - W3 Suite API: http://localhost:3004/api');
      console.log('      - Brand API: http://localhost:3002/brand-api');
      console.log('\n🔍 Service Status: All services orchestrated and ready!');
    }, 2000);

  }, 6000); // Start proxy 6 seconds after main start, allowing frontends to boot
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
httpServer.listen(W3_PORT, "127.0.0.1", () => {
  console.log(`[W3-API] ✅ W3 Suite Backend running on port ${W3_PORT} (localhost only)`);
  console.log(`[W3-API] 🔌 API endpoints available at: http://127.0.0.1:${W3_PORT}/api`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[W3-API] 🏗️  Part of multi-service architecture - orchestrating all services...`);
  }
});