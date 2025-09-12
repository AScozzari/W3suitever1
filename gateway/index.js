import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import helmet from 'helmet';
import { spawn } from 'child_process';

// Set development secrets if missing
if (process.env.NODE_ENV === 'development') {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'dev-jwt-secret-32-chars-minimum-secure';
    console.log('🔑 JWT_SECRET set for development');
  }
  if (!process.env.OAUTH_CLIENT_SECRET) {
    process.env.OAUTH_CLIENT_SECRET = 'dev-oauth-secret-32-chars-minimum-secure';
    console.log('🔑 OAUTH_CLIENT_SECRET set for development');
  }
}

// Security: Default to GATEWAY_ONLY mode
if (!process.env.GATEWAY_ONLY) {
  process.env.GATEWAY_ONLY = 'true';
  console.log('🔒 GATEWAY_ONLY enabled by default for security');
}

const app = express();
const PORT = 5000;

console.log('🚀 Starting API Gateway...');

// ==================== SECURITY HEADERS ====================
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: false,
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false
}));

// Custom security headers
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Server', 'W3Suite-Gateway/1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  next();
});

// ==================== LOGGING & MONITORING ====================
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'];
  const start = Date.now();

  console.log(`[GATEWAY] ${new Date().toISOString()} [${requestId}] ${req.method} ${req.originalUrl} - Client: ${req.ip}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[GATEWAY] ${new Date().toISOString()} [${requestId}] Response: ${res.statusCode} - Duration: ${duration}ms`);
  });

  next();
});

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  const checkService = async (name, url) => {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true
      });
      return {
        status: response.status < 500 ? 'healthy' : 'unhealthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        statusCode: response.status
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  };

  const [w3SuiteApi, w3SuiteFrontend, brandInterface] = await Promise.all([
    checkService('w3-suite-api', 'http://localhost:3004/api/health'),
    checkService('w3-suite-frontend', 'http://localhost:3000'),
    checkService('brand-interface', 'http://localhost:3001/brand-api/health')
  ]);

  healthStatus.services['w3-suite-api'] = w3SuiteApi;
  healthStatus.services['w3-suite-frontend'] = w3SuiteFrontend;
  healthStatus.services['brand-interface'] = brandInterface;

  const allHealthy = Object.values(healthStatus.services).every(
    service => service.status === 'healthy'
  );

  healthStatus.status = allHealthy ? 'healthy' : 'degraded';

  res.status(allHealthy ? 200 : 503).json(healthStatus);
});

// ==================== PROXY CONFIGURATION ====================
const createProxyConfig = (target, serviceName, options = {}) => {
  return {
    target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    ws: options.ws || false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',

    onProxyReq: (proxyReq, req, res) => {
      const requestId = req.headers['x-request-id'];

      proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress);
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
      proxyReq.setHeader('X-Forwarded-Port', PORT.toString());
      proxyReq.setHeader('X-Original-URI', req.originalUrl);
      proxyReq.setHeader('X-Service-Context', serviceName);
      proxyReq.setHeader('X-Request-ID', requestId);

      console.log(`[GATEWAY->${serviceName.toUpperCase()}] [${requestId}] Proxying ${req.method} ${req.originalUrl} to ${target}`);

      if (options.onProxyReq) {
        options.onProxyReq(proxyReq, req, res);
      }
    },

    onProxyRes: (proxyRes, req, res) => {
      const requestId = req.headers['x-request-id'];

      console.log(`[GATEWAY<-${serviceName.toUpperCase()}] [${requestId}] Response: ${proxyRes.statusCode}`);

      if (options.onProxyRes) {
        options.onProxyRes(proxyRes, req, res);
      }
    },

    onError: async (err, req, res) => {
      const requestId = req.headers['x-request-id'];
      console.error(`[GATEWAY->${serviceName.toUpperCase()} ERROR] [${requestId}]`, err.message);

      const statusCode = err.code === 'ETIMEDOUT' ? 504 : 502;
      res.status(statusCode).json({
        error: statusCode === 504 ? 'gateway_timeout' : 'bad_gateway',
        message: `${serviceName} service ${statusCode === 504 ? 'timeout' : 'unavailable'}`,
        service: serviceName,
        requestId: requestId,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    },

    ...options
  };
};

// ==================== ROUTING ====================

// Brand Interface Frontend (SPA) - MUST be before catch-all
app.use('/brandinterface', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-web', {
    ws: true, // Enable HMR for Brand Web
    pathRewrite: { '^/brandinterface': '/' } // Strip prefix for SPA
  })
));

// Brand Interface API
app.use('/brand-api', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-api')
));

// W3 Suite API
app.use('/api', createProxyMiddleware(
  createProxyConfig('http://localhost:3004', 'w3-api')
));

// OAuth2
app.use('/oauth2', createProxyMiddleware(
  createProxyConfig('http://localhost:3004', 'w3-oauth2')
));

// Well-known
app.use('/.well-known', createProxyMiddleware(
  createProxyConfig('http://localhost:3004', 'w3-wellknown')
));

// W3 Suite Frontend (catch-all)
app.use('/', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-suite-frontend', {
    ws: true // Enable HMR for W3 Suite Frontend
  })
));

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  console.error(`[GATEWAY ERROR] [${requestId}]`, err);

  res.status(500).json({
    error: 'internal_server_error',
    message: 'An internal error occurred in the gateway',
    requestId: requestId,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== AUTO-START SERVICES ====================
// SECURITY CRITICAL: Auto-start logic removed due to dangerous pkill usage
// Services must be started manually to prevent system process interference
//
// IMPORTANT: This gateway now operates in GATEWAY_ONLY mode by default
// To start services manually:
// 1. W3 Suite API: npx tsx apps/backend/api/src/index.ts (port 3004)
// 2. W3 Suite Frontend: cd apps/frontend/web && npm run dev (port 3000)
// 3. Brand API: npx tsx apps/backend/brand-api/src/index.ts (port 3001)
// 4. Brand Web: cd apps/frontend/brand-web && npm run dev (port 3002)

if (process.env.NODE_ENV === 'development' && !process.env.GATEWAY_ONLY) {
  console.log('⚠️  SECURITY NOTICE: Auto-start disabled for security reasons');
  console.log('🔧 To enable auto-start, set GATEWAY_ONLY=false (not recommended)');
  console.log('🚀 Please start services manually:');
  console.log('   W3 Suite: cd apps/backend/api && npm run dev (port 3004)');
  console.log('   Brand Interface: cd apps/backend/brand-api && npm run dev (port 3001)');
  console.log('   Brand Web Frontend: cd apps/frontend/brand-web && npm run dev (port 3002)');
  console.log('');
}

// ==================== SERVER STARTUP ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log('');
  console.log('📡 Routing Configuration:');
  console.log('  /brandinterface/*     → http://localhost:3001 (Brand Interface Frontend)');
  console.log('  /brand-api/*          → http://localhost:3001 (Brand Interface API)');
  console.log('  /api/*                → http://localhost:3004 (W3 Suite API)');
  console.log('  /oauth2/*             → http://localhost:3004 (OAuth2 Server)');
  console.log('  /.well-known/*        → http://localhost:3004 (OAuth2 Discovery)');
  console.log('  /*                    → http://localhost:3000 (W3 Suite Frontend)');
  console.log('');
  console.log('🌐 Access Points:');
  console.log(`  W3 Suite:        http://localhost:${PORT}`);
  console.log(`  Health Check:    http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔍 Monitoring:');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Process ID: ${process.pid}`);
  console.log(`  Node Version: ${process.version}`);
});

// ==================== GRACEFUL SHUTDOWN ====================
const gracefulShutdown = (signal) => {
  console.log(`\n🚫 API Gateway received ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log('✅ API Gateway stopped accepting new connections');
    console.log('⏳ Waiting for existing connections to close...');

    setTimeout(() => {
      console.log('✅ API Gateway shutdown complete');
      process.exit(0);
    }, 5000);
  });

  setTimeout(() => {
    console.error('⚠️ API Gateway forced shutdown after 15 seconds');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ API Gateway uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ API Gateway unhandled rejection at:', promise, 'reason:', reason);
});