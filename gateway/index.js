
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

  const [w3Suite, brandInterface] = await Promise.all([
    checkService('w3-suite', 'http://localhost:3000/api/health'),
    checkService('brand-interface', 'http://localhost:3001/brand-api/health')
  ]);

  healthStatus.services['w3-suite'] = w3Suite;
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

// Brand Interface Frontend
app.use('/brandinterface', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-interface', { 
    ws: true
  })
));

// Brand Interface API
app.use('/brand-api', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-api')
));

// W3 Suite API
app.use('/api', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-api')
));

// OAuth2
app.use('/oauth2', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-oauth2')
));

// Well-known
app.use('/.well-known', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-wellknown')
));

// W3 Suite Frontend (catch-all)
app.use('/', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-suite', {
    ws: true
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
let w3Process, brandProcess;

async function checkPortAvailable(port) {
  return new Promise(async (resolve) => {
    try {
      const net = await import('net');
      const server = net.createServer();
      server.listen(port, '0.0.0.0', (err) => {
        if (err) {
          resolve(false);
        } else {
          server.close(() => resolve(true));
        }
      });
      server.on('error', () => resolve(false));
    } catch (error) {
      resolve(false);
    }
  });
}

if (process.env.NODE_ENV === 'development' && !process.env.GATEWAY_ONLY) {
  console.log('🚀 Auto-starting backend services...');
  
  const killExistingProcesses = async () => {
    try {
      await new Promise(async (resolve) => {
        try {
          const killCmd = spawn('pkill', ['-f', 'tsx.*apps/backend'], { stdio: 'inherit' });
          killCmd.on('exit', () => resolve());
          killCmd.on('error', () => resolve());
        } catch (error) {
          resolve();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('🧹 Process cleanup completed');
    }
  };
  
  setTimeout(async () => {
    await killExistingProcesses();
    
    let port3000Available = await checkPortAvailable(3000);
    let port3001Available = await checkPortAvailable(3001);
    
    console.log(`🔍 Port status: 3000=${port3000Available ? 'available' : 'busy'}, 3001=${port3001Available ? 'available' : 'busy'}`);
    
    if (port3000Available) {
      console.log('🔄 Starting W3 Suite on port 3000...');
      w3Process = spawn('npx', ['tsx', 'apps/backend/api/src/index.ts'], {
        stdio: ['pipe', 'inherit', 'inherit'],
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          NODE_ENV: 'development', 
          GATEWAY_LAUNCHED: 'true',
          PORT: '3000'
        }
      });
      
      w3Process.on('error', (error) => {
        console.error('❌ W3 Process error:', error);
        w3Process = null;
      });

      w3Process.on('exit', (code) => {
        console.log(`🚫 W3 Suite process exited with code ${code}`);
        w3Process = null;
      });
    } else {
      console.log('❌ Port 3000 still busy, W3 Suite startup skipped');
    }
    
    setTimeout(async () => {
      port3001Available = await checkPortAvailable(3001);
      
      if (port3001Available) {
        console.log('🔄 Starting Brand Interface on port 3001...');
        brandProcess = spawn('npx', ['tsx', 'apps/backend/brand-api/src/index.ts'], {
          stdio: ['pipe', 'inherit', 'inherit'],
          cwd: process.cwd(),
          env: { 
            ...process.env, 
            NODE_ENV: 'development', 
            GATEWAY_LAUNCHED: 'true',
            PORT: '3001'
          }
        });
        
        brandProcess.on('error', (error) => {
          console.error('❌ Brand Process error:', error);
          brandProcess = null;
        });

        brandProcess.on('exit', (code) => {
          console.log(`🚫 Brand Interface process exited with code ${code}`);
          brandProcess = null;
        });
      } else {
        console.log('❌ Port 3001 still busy, Brand Interface startup skipped');
      }
      
      console.log('✅ Backend services startup sequence completed');
      
      setTimeout(async () => {
        console.log('🔍 Performing post-startup health check...');
        try {
          const w3Health = await axios.get('http://localhost:3000/api/health', { timeout: 3000 }).catch(() => null);
          const brandHealth = await axios.get('http://localhost:3001/brand-api/health', { timeout: 3000 }).catch(() => null);
          
          console.log(`📊 W3 Suite: ${w3Health ? '✅ Healthy' : '❌ Unavailable'}`);
          console.log(`📊 Brand Interface: ${brandHealth ? '✅ Healthy' : '❌ Unavailable'}`);
        } catch (error) {
          console.log('📊 Health check completed with errors');
        }
      }, 5000);
    }, 4000);
  }, 2000);
}

// ==================== SERVER STARTUP ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log('');
  console.log('📡 Routing Configuration:');
  console.log('  /brandinterface/*     → http://localhost:3001 (Brand Interface Frontend)');
  console.log('  /brand-api/*          → http://localhost:3001 (Brand Interface API)');
  console.log('  /api/*                → http://localhost:3000 (W3 Suite API)');
  console.log('  /oauth2/*             → http://localhost:3000 (OAuth2 Server)');
  console.log('  /.well-known/*        → http://localhost:3000 (OAuth2 Discovery)');
  console.log('  /*                    → http://localhost:3000 (W3 Suite Frontend)');
  console.log('');
  console.log('🌐 Access Points:');
  console.log(`  W3 Suite:        http://localhost:${PORT}`);
  console.log(`  Brand Interface: http://localhost:${PORT}/brandinterface/login`);
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
  
  if (w3Process) {
    console.log('⏹️ Stopping W3 Suite service...');
    w3Process.kill('SIGTERM');
  }
  if (brandProcess) {
    console.log('⏹️ Stopping Brand Interface service...');
    brandProcess.kill('SIGTERM');
  }
  
  server.close(() => {
    console.log('✅ API Gateway stopped accepting new connections');
    console.log('⏳ Waiting for existing connections to close...');
    
    setTimeout(() => {
      console.log('✅ API Gateway shutdown complete');
      process.exit(0);
    }, 10000);
  });
  
  setTimeout(() => {
    console.error('⚠️ API Gateway forced shutdown after 30 seconds');
    if (w3Process) w3Process.kill('SIGKILL');
    if (brandProcess) brandProcess.kill('SIGKILL');
    process.exit(1);
  }, 30000);
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
