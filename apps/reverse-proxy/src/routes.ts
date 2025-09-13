/**
 * W3 Suite Enterprise Reverse Proxy - Routing Configuration
 * Intelligent routing rules for W3 Suite and Brand Interface services
 */

import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from './config.js';
import logger from './logger.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Proxy configuration options factory
 */
const createProxyOptions = (
  target: string,
  pathRewrite?: Record<string, string>
) => ({
  target,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  xfwd: true, // Add X-Forwarded-* headers
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000,
  pathRewrite,

  // Enhanced logging with sanitized headers
  onProxyReq: (proxyReq: any, req: any) => {
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

  onProxyRes: (proxyRes: any, req: any) => {
    logger.debug('Proxy response', {
      method: req.method,
      url: req.url,
      target,
      statusCode: proxyRes.statusCode,
      responseTime: Date.now() - (req as any).startTime,
      requestId: req.headers['x-request-id'],
    });
  },

  onError: (err: any, req: any, res: any) => {
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
 * /oauth2/*                      → W3 Suite Backend (port 3004) - OAuth2 endpoints
 * /.well-known/*                 → W3 Suite Backend (port 3004) - Discovery endpoints
 * /api/*                         → W3 Suite Backend (port 3004)
 * /brandinterface/*              → Brand Interface Frontend (port 3001)
 * /brand-api/*                   → Brand Interface Backend (port 3002)
 *
 * Priority Order:
 * 1. Health endpoints (/health, /health/*)
 * 2. OAuth2 Authorization Server (/oauth2/*, /.well-known/*)
 * 3. Brand Interface API (/brand-api/*)
 * 4. W3 Suite API (/api/*)
 * 5. Brand Interface Frontend (/brandinterface/*)
 * 6. W3 Suite Frontend (/* - catch-all)
 */

/**
 * Brand Interface Backend API Proxy
 * Handles: /brand-api/* → localhost:3002/brand-api/*
 */
export const brandApiProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.brandBackend.host}:${config.upstream.brandBackend.port}`),
  filter: (pathname: string) => pathname.startsWith('/brand-api/'),
});

/**
 * OAuth2 Authorization Server Proxy
 * Handles: /oauth2/* → localhost:3004/oauth2/*
 * Handles: /.well-known/* → localhost:3004/.well-known/*
 */
export const oauthProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`),
  filter: (pathname: string) => pathname.startsWith('/oauth2/') || pathname.startsWith('/.well-known/'),
});

/**
 * W3 Suite Backend API Proxy
 * Handles: /api/* → localhost:3004/api/*
 */
export const w3ApiProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`),
  filter: (pathname: string) => pathname.startsWith('/api/'),
});

/**
 * Brand Interface Frontend Proxy
 * Handles: /brandinterface/* → localhost:3001/* (with pathRewrite to remove /brandinterface prefix)
 */
export const brandFrontendProxy = createProxyMiddleware({
  ...createProxyOptions(
    `http://${config.upstream.brandFrontend.host}:${config.upstream.brandFrontend.port}`,
    { '^/brandinterface': '' } // Remove /brandinterface prefix
  ),
  filter: (pathname: string) => pathname.startsWith('/brandinterface/'),
});

/**
 * Static Welcome Page Handler
 * Serves welcome.html for root URL
 */
export const staticWelcomeHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only serve welcome page for exactly "/" - let SPA routes pass through
  if (req.path === '/' && req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) {
    const welcomePath = path.join(__dirname, '../../../public/welcome.html');
    res.sendFile(welcomePath, (err) => {
      if (err) {
        logger.error('Failed to serve welcome page', { error: err.message });
        next(); // Fall back to W3 Frontend proxy
      }
    });
  } else {
    next();
  }
};

/**
 * W3 Suite Frontend Proxy (Catch-all)
 * Handles: /* → localhost:3000/*
 * Special SPA handling: rewrites all non-API routes to / for React Router
 */
export const w3FrontendProxy = createProxyMiddleware({
  ...createProxyOptions(`http://${config.upstream.w3Frontend.host}:${config.upstream.w3Frontend.port}`, {
    // SPA rewrite: any route that doesn't exist as a file should go to index
    '^/staging/.*$': '/',
    '^/[^/]+/.*$': '/',
    '^/[^/.]+$': '/'
  }),
  filter: (pathname: string) => {
    // Exclude paths already handled by other proxies (but allow root for SPA)
    return !pathname.startsWith('/api/') &&
           !pathname.startsWith('/oauth2/') &&
           !pathname.startsWith('/.well-known/') &&
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
    pattern: '/oauth2/*',
    target: `${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`,
    description: 'OAuth2 Authorization Server',
  },
  {
    pattern: '/.well-known/*',
    target: `${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`,
    description: 'OAuth2 Discovery Endpoints',
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
    description: 'Brand Interface Frontend (pathRewrite removes /brandinterface)',
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