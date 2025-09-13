/**
 * W3 Suite Enterprise Reverse Proxy - Middleware Stack
 * Enterprise-grade middleware for security, performance, and monitoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from './config.js';
import logger from './logger.js';

/**
 * Configure CORS middleware with environment-aware settings
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (config.security.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, be more permissive
    if (config.environment === 'development') {
      return callback(null, true);
    }
    
    const msg = `CORS policy violation: Origin ${origin} not allowed`;
    logger.warn(msg, { origin });
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
});

/**
 * Security middleware with Helmet
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: config.environment === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for iframe scenarios
});

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.environment === 'development' ? 1000 : 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Slow down middleware for additional DDoS protection
 */
export const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: config.environment === 'development' ? 500 : 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable the warning
});

/**
 * Compression middleware
 */
export const compressionMiddleware = compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (1-9, where 9 is best compression)
  filter: (req, res) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression filter
    return compression.filter(req, res);
  },
});

/**
 * Morgan logging middleware with custom format
 */
export const loggingMiddleware = morgan(config.logging.format, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { component: 'http' });
    },
  },
  skip: (req) => {
    // Skip health check and static asset logs in production
    if (config.environment === 'production') {
      return req.url === '/health' || req.url.startsWith('/static/');
    }
    return false;
  },
});

/**
 * Request context middleware
 */
export const contextMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Add request ID for tracing
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add tenant context if available
  const tenantId = req.headers['x-tenant-id'] as string;
  if (tenantId) {
    res.setHeader('X-Tenant-ID', tenantId);
  }
  
  // Set response headers
  res.setHeader('X-Powered-By', 'W3Suite-Proxy');
  res.setHeader('X-Proxy-Version', '1.0.0');
  
  next();
};

/**
 * Error handling middleware
 */
export const errorMiddleware = (
  error: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  logger.error('Proxy error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });

  // Don't leak error details in production
  const isDevelopment = config.environment === 'development';
  const errorResponse = {
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack }),
  };

  res.status(500).json(errorResponse);
};

/**
 * 404 handler middleware
 */
export const notFoundMiddleware = (req: express.Request, res: express.Response) => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
  });
};