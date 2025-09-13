import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';

const app = express();

console.log('🚀 SIMPLE REVERSE PROXY STARTING...');

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', proxy: 'working', port: 6000 });
});

// Simple proxy to W3 backend on 3004 
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3004',
  changeOrigin: true,
  logLevel: 'info'
}));

// Catch all - return simple message
app.use('*', (req, res) => {
  res.send(`
    <h1>W3 Suite Enterprise - Working!</h1>
    <p>Reverse Proxy Active on Port 6000</p>
    <p>Time: ${new Date().toISOString()}</p>
    <p>Path: ${req.path}</p>
  `);
});

const server = app.listen(6000, '0.0.0.0', () => {
  console.log('✅ SIMPLE PROXY WORKING ON PORT 6000');
  console.log('📊 Health: http://localhost:6000/health');
  console.log('🌐 Ready to serve!');
});

server.on('error', (err) => {
  console.error('❌ PROXY ERROR:', err);
});