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
const PORT = 8080; // Changed from 5000 to avoid conflicts

console.log('🚀 Starting API Gateway...');

// ==================== SECURITY HEADERS ====================
// Apply security headers at gateway level for uniformity
app.use(helmet({
  contentSecurityPolicy: false, // Let each app handle its own CSP
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // X-Frame-Options will be set per service
  frameguard: false,
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false
}));

// Custom security headers
app.use((req, res, next) => {
  // Add X-Request-ID for tracing
  const requestId = req.headers['x-request-id'] || `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Add Server header obfuscation
  res.setHeader('Server', 'W3Suite-Gateway/1.0');
  
  // Add X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent DNS prefetch
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Prevent IE from executing downloads in site context
  res.setHeader('X-Download-Options', 'noopen');
  
  next();
});

// ==================== LOGGING & MONITORING ====================
// Enhanced logging middleware with request ID
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'];
  const start = Date.now();
  
  // Log request
  console.log(`[GATEWAY] ${new Date().toISOString()} [${requestId}] ${req.method} ${req.originalUrl} - Client: ${req.ip}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[GATEWAY] ${new Date().toISOString()} [${requestId}] Response: ${res.statusCode} - Duration: ${duration}ms`);
  });
  
  next();
});

// ==================== HEALTH CHECK ADVANCED ====================
// Enhanced health check that verifies upstream services
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };

  // Check upstream services with timeout
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

  // Check all upstream services
  const [w3Suite, brandInterface] = await Promise.all([
    checkService('w3-suite', 'http://localhost:3000/api/health'),
    checkService('brand-interface', 'http://localhost:3001/brand-api/health')
  ]);

  healthStatus.services['w3-suite'] = w3Suite;
  healthStatus.services['brand-interface'] = brandInterface;

  // Determine overall health
  const allHealthy = Object.values(healthStatus.services).every(
    service => service.status === 'healthy'
  );
  
  healthStatus.status = allHealthy ? 'healthy' : 'degraded';
  
  res.status(allHealthy ? 200 : 503).json(healthStatus);
});

// ==================== PROXY CONFIGURATION FACTORY ====================
// Factory function to create proxy configurations with common settings
const createProxyConfig = (target, serviceName, options = {}) => {
  return {
    target,
    changeOrigin: true,
    timeout: 30000, // 30 second timeout
    proxyTimeout: 30000,
    ws: options.ws || false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    
    // Add X-Forwarded headers
    onProxyReq: (proxyReq, req, res) => {
      const requestId = req.headers['x-request-id'];
      
      // Add forwarding headers
      proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress);
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
      proxyReq.setHeader('X-Forwarded-Port', PORT.toString());
      proxyReq.setHeader('X-Original-URI', req.originalUrl);
      
      // Add service context header
      proxyReq.setHeader('X-Service-Context', serviceName);
      proxyReq.setHeader('X-Request-ID', requestId);
      
      // Log proxy request
      console.log(`[GATEWAY->${serviceName.toUpperCase()}] [${requestId}] Proxying ${req.method} ${req.originalUrl} to ${target}`);
      
      // Call custom onProxyReq if provided
      if (options.onProxyReq) {
        options.onProxyReq(proxyReq, req, res);
      }
    },
    
    // Cookie rewrite for isolation
    onProxyRes: (proxyRes, req, res) => {
      const requestId = req.headers['x-request-id'];
      
      // Rewrite Set-Cookie headers for path isolation
      if (proxyRes.headers['set-cookie']) {
        const cookies = proxyRes.headers['set-cookie'];
        proxyRes.headers['set-cookie'] = cookies.map(cookie => {
          // Add appropriate Path based on service
          if (serviceName === 'brand-interface' || serviceName === 'brand-api') {
            // Brand Interface cookies should be isolated to /brandinterface
            if (!cookie.includes('Path=')) {
              cookie += '; Path=/brandinterface';
            } else {
              cookie = cookie.replace(/Path=\/[^;]*/i, 'Path=/brandinterface');
            }
          } else {
            // W3 Suite cookies keep their original paths
            if (!cookie.includes('Path=') || cookie.includes('Path=/brandinterface')) {
              cookie = cookie.replace(/Path=\/brandinterface[^;]*/i, 'Path=/');
              if (!cookie.includes('Path=')) {
                cookie += '; Path=/';
              }
            }
          }
          
          // Add security flags if not present
          if (!cookie.includes('SameSite=')) {
            cookie += '; SameSite=Lax';
          }
          if (!cookie.includes('HttpOnly') && !cookie.toLowerCase().includes('httponly')) {
            cookie += '; HttpOnly';
          }
          if (process.env.NODE_ENV === 'production' && !cookie.includes('Secure')) {
            cookie += '; Secure';
          }
          
          return cookie;
        });
      }
      
      // Add X-Frame-Options based on service
      if (serviceName === 'brand-interface' || serviceName === 'brand-api') {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow iframe within same origin for Brand
      } else {
        res.setHeader('X-Frame-Options', 'DENY'); // Deny for W3 Suite
      }
      
      // Log response
      console.log(`[GATEWAY<-${serviceName.toUpperCase()}] [${requestId}] Response: ${proxyRes.statusCode}`);
      
      // Call custom onProxyRes if provided
      if (options.onProxyRes) {
        options.onProxyRes(proxyRes, req, res);
      }
    },
    
    // Enhanced error handling with retry logic
    onError: async (err, req, res) => {
      const requestId = req.headers['x-request-id'];
      console.error(`[GATEWAY->${serviceName.toUpperCase()} ERROR] [${requestId}]`, err.message);
      
      // Retry logic for temporary failures
      if (options.retry !== false && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT')) {
        console.log(`[GATEWAY] [${requestId}] Retrying request to ${serviceName}...`);
        
        // Simple retry once after 1 second
        setTimeout(async () => {
          try {
            const retryResponse = await axios({
              method: req.method,
              url: `${target}${req.originalUrl}`,
              headers: req.headers,
              data: req.body,
              timeout: 5000
            });
            
            // Forward successful retry response
            res.status(retryResponse.status).json(retryResponse.data);
          } catch (retryError) {
            // Retry failed, send error response
            res.status(502).json({
              error: 'bad_gateway',
              message: `${serviceName} service unavailable after retry`,
              service: serviceName,
              requestId: requestId,
              details: process.env.NODE_ENV === 'development' ? retryError.message : undefined
            });
          }
        }, 1000);
      } else {
        // No retry or non-retryable error
        const statusCode = err.code === 'ETIMEDOUT' ? 504 : 502;
        res.status(statusCode).json({
          error: statusCode === 504 ? 'gateway_timeout' : 'bad_gateway',
          message: `${serviceName} service ${statusCode === 504 ? 'timeout' : 'unavailable'}`,
          service: serviceName,
          requestId: requestId,
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    },
    
    ...options // Allow overriding defaults
  };
};

// ==================== BRAND INTERFACE ROUTING ====================
// Route all Brand Interface frontend requests to port 3001
app.use('/brandinterface', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-interface', { 
    ws: true, // Enable WebSocket for HMR
    pathRewrite: {
      '^/brandinterface': '/brandinterface' // Keep the path as-is
    },
    onProxyReqWs: (proxyReq, req, socket, head) => {
      // Handle WebSocket upgrade for HMR
      const requestId = req.headers['x-request-id'] || 'ws-' + Date.now();
      console.log(`[GATEWAY->BRAND WS] [${requestId}] WebSocket upgrade for ${req.url}`);
    }
  })
));

// Route Brand Interface HMR WebSocket on port 24678
app.use('/brandinterface-hmr', createProxyMiddleware(
  createProxyConfig('ws://localhost:24678', 'brand-hmr', {
    ws: true,
    changeOrigin: true,
    onProxyReqWs: (proxyReq, req, socket, head) => {
      console.log(`[GATEWAY->BRAND HMR] WebSocket connection for HMR`);
    }
  })
));

// Route all Brand API requests to port 3001
app.use('/brand-api', createProxyMiddleware(
  createProxyConfig('http://localhost:3001', 'brand-api', {
    pathRewrite: {
      '^/brand-api': '/brand-api' // Explicitly preserve the path
    }
  })
));

// ==================== W3 SUITE ROUTING ====================
// Route all W3 Suite API requests to port 3000
app.use('/api', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-api')
));

// OAuth2 endpoints routing to W3 Suite
app.use('/oauth2', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-oauth2', {
    // OAuth2 specific handling
    onProxyReq: (proxyReq, req, res) => {
      // Preserve OAuth2 headers
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  })
));

// .well-known endpoints routing to W3 Suite
app.use('/.well-known', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-wellknown', {
    // Cache well-known responses
    onProxyRes: (proxyRes, req, res) => {
      if (proxyRes.statusCode === 200) {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      }
    }
  })
));

// ==================== CATCH-ALL ROUTING ====================
// Route all other requests to W3 Suite (frontend and other resources)
// IMPORTANT: This must be LAST to not intercept specific routes
app.use('/', createProxyMiddleware(
  createProxyConfig('http://localhost:3000', 'w3-suite', {
    ws: true // Enable WebSocket for W3 Suite HMR
  })
));

// ==================== ERROR HANDLING ====================
// Global error handler
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
// Auto-start backend services in development
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
}</async>

async function killProcessOnPort(port) {
  return new Promise(async (resolve) => {
    try {
      const { spawn } = await import('child_process');
      const killProcess = spawn('npx', ['kill-port', port.toString()], {
        stdio: 'inherit'
      });
      killProcess.on('exit', () => resolve());
      killProcess.on('error', () => resolve());
    } catch (error) {
      resolve();
    }
  });
}



if (process.env.NODE_ENV === 'development' && !process.env.GATEWAY_ONLY) {
  console.log('🚀 Auto-starting backend services...');
  
  // Kill any existing processes first
  const killExistingProcesses = async () => {
    try {
      // Kill any existing tsx processes for our apps
      await new Promise(async (resolve) => {
        try {
          const killCmd = spawn('pkill', ['-f', 'tsx.*apps/backend'], { stdio: 'inherit' });
          killCmd.on('exit', () => resolve());
          killCmd.on('error', () => resolve());
        } catch (error) {
          resolve();
        }
      });
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('🧹 Process cleanup completed');
    }
  };
  
  // Wait a moment before starting services
  setTimeout(async () => {
    await killExistingProcesses();
    
    // Check if ports are available after cleanup
    let port3000Available = await checkPortAvailable(3000);
    let port3001Available = await checkPortAvailable(3001);
    
    console.log(`🔍 Port status: 3000=${port3000Available ? 'available' : 'busy'}, 3001=${port3001Available ? 'available' : 'busy'}`);
    
    if (port3000Available) {
      // Start W3 Suite (port 3000)
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
    
    // Start Brand Interface (port 3001) after a delay
    setTimeout(async () => {
      // Recheck port availability
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
      
      // Health check after startup
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
// Start the gateway server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log('');
  console.log('🔒 Security Features:');
  console.log('  ✓ X-Forwarded headers for origin tracking');
  console.log('  ✓ 30-second timeout for all proxied requests');
  console.log('  ✓ Cookie path isolation (W3: /, Brand: /brandinterface)');
  console.log('  ✓ Service context tracking with X-Service-Context');
  console.log('  ✓ Request ID tracking for distributed tracing');
  console.log('  ✓ Automatic retry for temporary failures');
  console.log('  ✓ Security headers (HSTS, XSS, CSP per app)');
  console.log('');
  console.log('📡 Routing Configuration:');
  console.log('  /brandinterface/*     → http://localhost:3001 (Brand Interface Frontend)');
  console.log('  /brandinterface-hmr/* → ws://localhost:24678 (Brand HMR WebSocket)');
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
// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🚫 API Gateway received ${signal}, shutting down gracefully...`);
  
  // Stop backend services first
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
    
    // Give existing connections 10 seconds to close
    setTimeout(() => {
      console.log('✅ API Gateway shutdown complete');
      process.exit(0);
    }, 10000);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ API Gateway forced shutdown after 30 seconds');
    if (w3Process) w3Process.kill('SIGKILL');
    if (brandProcess) brandProcess.kill('SIGKILL');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ API Gateway uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ API Gateway unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});