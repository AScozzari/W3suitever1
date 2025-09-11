import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 5000;

console.log('🚀 Starting API Gateway...');

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint for the gateway itself
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString() 
  });
});

// ==================== BRAND INTERFACE ROUTING ====================
// Route all Brand Interface frontend requests to port 3001
app.use('/brandinterface', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true, // Enable WebSocket support for HMR
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[GATEWAY->BRAND] Proxying ${req.method} ${req.originalUrl} to port 3001`);
  },
  onError: (err, req, res) => {
    console.error(`[GATEWAY->BRAND ERROR]`, err);
    res.status(502).json({ 
      error: 'bad_gateway', 
      message: 'Brand Interface service unavailable',
      service: 'brand-interface'
    });
  }
}));

// Route all Brand API requests to port 3001
app.use('/brand-api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[GATEWAY->BRAND-API] Proxying ${req.method} ${req.originalUrl} to port 3001`);
  },
  onError: (err, req, res) => {
    console.error(`[GATEWAY->BRAND-API ERROR]`, err);
    res.status(502).json({ 
      error: 'bad_gateway', 
      message: 'Brand API service unavailable',
      service: 'brand-api'
    });
  }
}));

// ==================== W3 SUITE ROUTING ====================
// Route all W3 Suite API requests to port 3000
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[GATEWAY->W3-API] Proxying ${req.method} ${req.originalUrl} to port 3000`);
  },
  onError: (err, req, res) => {
    console.error(`[GATEWAY->W3-API ERROR]`, err);
    res.status(502).json({ 
      error: 'bad_gateway', 
      message: 'W3 Suite API service unavailable',
      service: 'w3-api'
    });
  }
}));

// OAuth2 endpoints routing to W3 Suite
app.use('/oauth2', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[GATEWAY->W3-OAuth2] Proxying ${req.method} ${req.originalUrl} to port 3000`);
  }
}));

// .well-known endpoints routing to W3 Suite
app.use('/.well-known', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  logLevel: 'debug'
}));

// ==================== CATCH-ALL ROUTING ====================
// Route all other requests to W3 Suite (frontend and other resources)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true, // Enable WebSocket support for HMR
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[GATEWAY->W3] Proxying ${req.method} ${req.originalUrl} to port 3000`);
  },
  onError: (err, req, res) => {
    console.error(`[GATEWAY->W3 ERROR]`, err);
    res.status(502).json({ 
      error: 'bad_gateway', 
      message: 'W3 Suite service unavailable',
      service: 'w3-suite'
    });
  }
}));

// Start the gateway server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log('');
  console.log('📡 Routing Configuration:');
  console.log('  /brandinterface/* → http://localhost:3001 (Brand Interface Frontend)');
  console.log('  /brand-api/*      → http://localhost:3001 (Brand Interface API)');
  console.log('  /api/*            → http://localhost:3000 (W3 Suite API)');
  console.log('  /oauth2/*         → http://localhost:3000 (OAuth2 Server)');
  console.log('  /.well-known/*    → http://localhost:3000 (OAuth2 Discovery)');
  console.log('  /*                → http://localhost:3000 (W3 Suite Frontend)');
  console.log('');
  console.log('🌐 Access Points:');
  console.log('  W3 Suite:        http://localhost:5000');
  console.log('  Brand Interface: http://localhost:5000/brandinterface/login');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🚫 API Gateway shutting down...');
  server.close(() => {
    console.log('API Gateway stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🚫 API Gateway shutting down...');
  server.close(() => {
    console.log('API Gateway stopped');
    process.exit(0);
  });
});