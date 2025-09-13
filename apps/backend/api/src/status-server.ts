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
      'W3 Frontend': 'http://127.0.0.1:3000',
      'W3 Backend': 'http://127.0.0.1:3004', 
      'Brand Frontend': 'http://127.0.0.1:3001',
      'Brand Backend': 'http://127.0.0.1:3002'
    }
  });
});

// Brand Interface Frontend - strict path matching to prevent root capture
app.use('/brandinterface', createProxyMiddleware({
  target: 'http://127.0.0.1:3001',
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

// W3 Suite Frontend - serve directly without proxy (clean URL)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>W3 Suite Enterprise</title>
        <style>
            body { font-family: Inter, sans-serif; background: linear-gradient(135deg, #FF6900, #7B2CBF); color: white; margin: 0; padding: 40px; text-align: center; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
            .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 40px; }
            h1 { font-size: 3rem; margin-bottom: 20px; }
            p { font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9; }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
            .feature { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 20px; }
            .brand-link { display: inline-block; margin-top: 30px; padding: 15px 30px; background: rgba(255,255,255,0.2); border-radius: 10px; color: white; text-decoration: none; transition: all 0.3s; }
            .brand-link:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 W3 Suite Enterprise</h1>
            <p>Piattaforma enterprise multitenant completa per la gestione aziendale</p>
            
            <div class="features">
                <div class="feature">
                    <h3>📊 CRM</h3>
                    <p>Gestione clienti</p>
                </div>
                <div class="feature">
                    <h3>🏪 POS</h3>
                    <p>Punto vendita</p>
                </div>
                <div class="feature">
                    <h3>📦 Magazzino</h3>
                    <p>Gestione stock</p>
                </div>
                <div class="feature">
                    <h3>👥 HR</h3>
                    <p>Risorse umane</p>
                </div>
            </div>
            
            <a href="/brandinterface" class="brand-link">🏢 Brand Interface HQ →</a>
            
            <p style="margin-top: 40px; font-size: 0.9rem; opacity: 0.7;">
                ✅ URL pulito senza numeri di porta • Reverse proxy attivo • Architettura multi-service
            </p>
        </div>
    </body>
    </html>
  `);
});

// Catch-all for W3 Suite routes
app.get('/*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/brandinterface') && !req.path.startsWith('/brand-api')) {
    res.redirect('/');
  }
});

// Start server on port 5000
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 W3 Suite Reverse Proxy running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Routes configured:`);
  console.log(`   / → W3 Frontend (3000)`);
  console.log(`   /api → W3 Backend (3004)`);
  console.log(`   /brandinterface → Brand Frontend (3001)`);
  console.log(`   /brand-api → Brand Backend (3002)`);
});