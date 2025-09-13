/**
 * Reverse Proxy for W3 Suite Multi-App Architecture
 * Runs on port 5000 - Routes traffic to separated apps
 * W3 Suite + Brand Interface routing
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'W3 Suite Reverse Proxy',
    timestamp: new Date().toISOString(),
    routes: {
      'W3 Frontend': 'http://127.0.0.1:35555',
      'W3 Backend': 'http://127.0.0.1:3004', 
      'Brand Frontend': 'http://127.0.0.1:35556',
      'Brand Backend': 'http://127.0.0.1:3002'
    }
  });
});

// Brand Interface Frontend - strict path matching to prevent root capture
app.use('/brandinterface', createProxyMiddleware({
  target: 'http://127.0.0.1:35556',
  changeOrigin: true,
  ws: true, // WebSocket support for Vite HMR
  pathRewrite: (path: string, req: any) => {
    const newPath = '/brandinterface' + (path === '/' ? '/' : path);
    console.log(`🔄 [BRAND PROXY] ${req.method} /brandinterface${path} -> ${newPath}`);
    return newPath;
  }
}));

// Brand Interface Backend - fix path duplication
app.use('/brand-api', createProxyMiddleware({
  target: 'http://127.0.0.1:3002',
  changeOrigin: true
}));

// W3 Suite Backend - prevent path duplication
app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:3004',
  changeOrigin: true
}));

// W3 Suite Frontend - proxy to localhost (private)
app.use('/', createProxyMiddleware({
  target: 'http://127.0.0.1:35555',
  changeOrigin: true,
  ws: true, // WebSocket support for Vite HMR
  logLevel: 'silent' // Reduce proxy logs
}));

// Start server on port 5000
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 W3 Suite Reverse Proxy running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Routes configured:`);
  console.log(`   / → W3 Frontend (35555)`);
  console.log(`   /api → W3 Backend (3004)`);
  console.log(`   /brandinterface → Brand Frontend (35556)`);
  console.log(`   /brand-api → Brand Backend (3002)`);
});