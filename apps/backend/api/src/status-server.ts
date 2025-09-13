/**
 * Minimal status server for workflow health checks
 * Runs on port 5000 to satisfy workflow requirements
 * No proxy, no gateway - just health status
 */

import express from 'express';

const app = express();

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'W3 Suite Status Server',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint returns health status too
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'W3 Suite Status Server',
    message: 'Frontend runs on port 3000, Backend API on port 3004',
    frontend: 'http://localhost:3000',
    backend: 'http://localhost:3004',
    timestamp: new Date().toISOString()
  });
});

// Start server on port 5000
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📍 Status server running on port ${PORT}`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend at: http://localhost:3000`);
  console.log(`🔌 Backend API at: http://localhost:3004`);
});