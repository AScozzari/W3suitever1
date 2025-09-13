#!/usr/bin/env node
/**
 * Port 5000 Shim - Redirects to Reverse Proxy on 6000
 * Keeps Replit workflow happy while routing to actual enterprise stack
 */

import http from 'http';

const server = http.createServer((req, res) => {
  // Redirect all requests to reverse proxy on 6000
  const redirectUrl = `http://localhost:6000${req.url}`;
  
  res.writeHead(307, {
    'Location': redirectUrl,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  });
  res.end(`Redirecting to Enterprise Stack: ${redirectUrl}`);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('🔗 Port 5000 Shim: Redirecting to Enterprise Stack on port 6000');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Port 5000 Shim shutting down...');
  server.close(() => process.exit(0));
});