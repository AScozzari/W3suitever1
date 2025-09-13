/**
 * W3 Suite Enterprise Reverse Proxy - Routing Configuration
 * Intelligent routing rules for W3 Suite and Brand Interface services
 */

import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from './config.js';
import logger from './logger.js';

/**
 * Proxy configuration options factory
 */
const createProxyOptions = (
  target: string,
  pathRewrite?: Record<string, string>
): Options => ({
  target,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  xfwd: true, // Add X-Forwarded-* headers
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000,
  pathRewrite,
  
  // Enhanced logging with sanitized headers
  onProxyReq: (proxyReq, req) => {
    // Sanitize headers to avoid logging sensitive information
    const sanitizedHeaders = { ...req.headers };
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.cookie;
    delete sanitizedHeaders['set-cookie'];
    
    logger.debug('Proxying request', {
      method: req.method,
      url: req.url,
      target,
      headers: sanitizedHeaders,
      requestId: req.headers['x-request-id'],
    });
  },
  
  onProxyRes: (proxyRes, req) => {
    logger.debug('Proxy response', {
      method: req.method,
      url: req.url,
      target,
      statusCode: proxyRes.statusCode,
      responseTime: Date.now() - (req as any).startTime,
      requestId: req.headers['x-request-id'],
    });
  },
  
  onError: (err, req, res) => {
    logger.error('Proxy error', {
      error: err.message,
      method: req.method,
      url: req.url,
      target,
      requestId: req.headers['x-request-id'],
    });
    
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Upstream service unavailable',
        service: target,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      });
    }
  },
});

/**
 * ROUTING RULES DOCUMENTATION
 * ===========================
 * 
 * /* (all other routes)           → W3 Suite Frontend (port 3000)
 * /api/*                         → W3 Suite Backend (port 3004)
 * /brandinterface/*              → Brand Interface Frontend (port 3001)
 * /brand-api/*                   → Brand Interface Backend (port 3002)
 * 
 * Priority Order:
 * 1. Health endpoints (/health, /health/*)
 * 2. Brand Interface API (/brand-api/*)
 * 3. W3 Suite API (/api/*)
 * 4. Brand Interface Frontend (/brandinterface/*)
 * 5. W3 Suite Frontend (/* - catch-all)
 */

/**
 * Brand Interface Backend API Proxy
 * Handles: /brand-api/* → localhost:3002/brand-api/*
 */
export const brandApiProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.brandBackend.host}:${config.upstream.brandBackend.port}`),
  filter: (pathname) => pathname.startsWith('/brand-api/'),
});

/**
 * W3 Suite Backend API Proxy
 * Handles: /api/* → localhost:3004/api/*
 */
export const w3ApiProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`),
  filter: (pathname) => pathname.startsWith('/api/'),
});

/**
 * Brand Interface Frontend Proxy
 * Handles: /brandinterface/* → localhost:3001/brandinterface/*
 */
export const brandFrontendProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.brandFrontend.host}:${config.upstream.brandFrontend.port}`),
  filter: (pathname) => pathname.startsWith('/brandinterface/'),
});

/**
 * W3 Suite Frontend Proxy (Catch-all)
 * Handles: /* → localhost:3000/*
 */
export const w3FrontendProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.w3Frontend.host}:${config.upstream.w3Frontend.port}`),
  filter: (pathname) => {
    // Exclude paths already handled by other proxies
    return !pathname.startsWith('/api/') && 
           !pathname.startsWith('/brand-api/') && 
           !pathname.startsWith('/brandinterface/') &&
           !pathname.startsWith('/health');
  },
});

/**
 * Routing Rules Summary for Logging
 */
export const routingRules = [
  {
    pattern: '/health',
    target: 'Internal Health Check',
    description: 'Proxy health status and upstream service monitoring',
  },
  {
    pattern: '/brand-api/*',
    target: `${config.upstream.brandBackend.host}:${config.upstream.brandBackend.port}`,
    description: 'Brand Interface Backend API',
  },
  {
    pattern: '/api/*',
    target: `${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`,
    description: 'W3 Suite Backend API',
  },
  {
    pattern: '/brandinterface/*',
    target: `${config.upstream.brandFrontend.host}:${config.upstream.brandFrontend.port}`,
    description: 'Brand Interface Frontend',
  },
  {
    pattern: '/*',
    target: `${config.upstream.w3Frontend.host}:${config.upstream.w3Frontend.port}`,
    description: 'W3 Suite Frontend (catch-all)',
  },
];

/**
 * Log routing rules on startup
 */
export const logRoutingRules = (): void => {
  logger.info('='.repeat(60));
  logger.info('W3 SUITE ENTERPRISE REVERSE PROXY - ROUTING RULES');
  logger.info('='.repeat(60));
  
  routingRules.forEach((rule, index) => {
    logger.info(`${index + 1}. ${rule.pattern.padEnd(20)} → ${rule.target}`, {
      description: rule.description,
    });
  });
  
  logger.info('='.repeat(60));
  logger.info(`Environment: ${config.environment.toUpperCase()}`);
  logger.info(`Proxy Port: ${config.port}`);
  logger.info(`Security: Helmet=${config.security.enableHelmet}, RateLimit=${config.security.enableRateLimit}`);
  logger.info('='.repeat(60));
};