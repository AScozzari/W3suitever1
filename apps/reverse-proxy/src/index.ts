#!/usr/bin/env node
/**
 * W3 Suite Enterprise Reverse Proxy
 * Production-ready proxy server unifying access to W3 Suite and Brand Interface services
 * 
 * @version 1.0.0
 * @author W3 Suite Team
 * @description Enterprise-grade reverse proxy with intelligent routing, health monitoring,
 *              security middleware, and comprehensive logging for microservices architecture
 */

import express from 'express';
import { config } from './config.js';
import logger from './logger.js';
import { HealthChecker } from './health.js';
import {
  corsMiddleware,
  securityMiddleware,
  rateLimitMiddleware,
  slowDownMiddleware,
  compressionMiddleware,
  loggingMiddleware,
  contextMiddleware,
  errorMiddleware,
  notFoundMiddleware,
} from './middleware.js';
import {
  oauthProxy,
  brandApiProxy,
  w3ApiProxy,
  brandFrontendProxy,
  w3FrontendProxy,
  logRoutingRules,
} from './routes.js';

/**
 * W3 Suite Enterprise Reverse Proxy Server
 */
class W3SuiteProxyServer {
  private app: express.Application;
  private healthChecker: HealthChecker;
  private server: any;

  constructor() {
    this.app = express();
    
    // Configure trust proxy for X-Forwarded-* headers
    this.app.set('trust proxy', true);
    
    this.healthChecker = new HealthChecker();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure enterprise middleware stack
   */
  private setupMiddleware(): void {
    logger.info('Setting up enterprise middleware stack...');

    // Request timing middleware
    this.app.use((req, res, next) => {
      (req as any).startTime = Date.now();
      next();
    });

    // Security and performance middleware
    this.app.use(corsMiddleware);
    if (config.security.enableHelmet) {
      this.app.use(securityMiddleware);
    }
    this.app.use(compressionMiddleware);
    this.app.use(contextMiddleware);
    this.app.use(loggingMiddleware);

    // Rate limiting (production only)
    if (config.security.enableRateLimit) {
      this.app.use(rateLimitMiddleware);
      this.app.use(slowDownMiddleware);
    }

    // REMOVED: Body parsing middleware interferes with proxy forwarding
    // Proxies should forward raw request bodies to upstream services
    // this.app.use(express.json({ limit: '10mb' }));
    // this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    logger.info('✅ Middleware stack configured');
  }

  /**
   * Configure intelligent routing rules
   */
  private setupRoutes(): void {
    logger.info('Setting up intelligent routing rules...');

    // Health check endpoints (highest priority)
    this.app.get('/health', (req, res) => {
      this.healthChecker.handleHealthEndpoint(req, res);
    });

    this.app.get('/health/detailed', (req, res) => {
      const health = this.healthChecker.getOverallHealth();
      res.json({
        ...health,
        proxy: {
          status: 'healthy',
          port: config.port,
          environment: config.environment,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0',
        },
        routing: {
          rules: [
            { pattern: '/brand-api/*', target: 'Brand Interface Backend', port: config.upstream.brandBackend.port },
            { pattern: '/api/*', target: 'W3 Suite Backend', port: config.upstream.w3Backend.port },
            { pattern: '/brandinterface/*', target: 'Brand Interface Frontend', port: config.upstream.brandFrontend.port },
            { pattern: '/*', target: 'W3 Suite Frontend', port: config.upstream.w3Frontend.port },
          ],
        },
      });
    });

    // API routes (higher priority than frontend)
    // 1. OAuth2 Authorization Server (/oauth2/*, /.well-known/*)
    this.app.use(oauthProxy);

    // 2. Brand Interface Backend API (/brand-api/*)
    this.app.use(brandApiProxy);

    // 3. W3 Suite Backend API (/api/*)
    this.app.use(w3ApiProxy);

    // Frontend routes
    // 4. Brand Interface Frontend (/brandinterface/*)
    this.app.use(brandFrontendProxy);

    // 5. W3 Suite Frontend (/* - catch-all, lowest priority)
    this.app.use(w3FrontendProxy);

    logger.info('✅ Routing rules configured');
    logRoutingRules();
  }

  /**
   * Configure error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundMiddleware);

    // Global error handler
    this.app.use(errorMiddleware);

    // Process error handlers
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    logger.info('✅ Error handling configured');
  }

  /**
   * Start the proxy server
   */
  public async start(): Promise<void> {
    try {
      this.server = this.app.listen(config.port, '0.0.0.0', () => {
        logger.info('🚀 W3 Suite Enterprise Reverse Proxy STARTED');
        logger.info('='.repeat(60));
        logger.info(`🌐 Proxy Server: http://0.0.0.0:${config.port}`);
        logger.info(`📊 Health Check: http://0.0.0.0:${config.port}/health`);
        logger.info(`🔍 Detailed Health: http://0.0.0.0:${config.port}/health/detailed`);
        logger.info(`🏃 Environment: ${config.environment.toUpperCase()}`);
        logger.info('='.repeat(60));
        logger.info('UPSTREAM SERVICES:');
        logger.info(`  📱 W3 Suite Frontend:     http://${config.upstream.w3Frontend.host}:${config.upstream.w3Frontend.port}`);
        logger.info(`  🔧 W3 Suite Backend:      http://${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}`);
        logger.info(`  🏢 Brand Interface FE:    http://${config.upstream.brandFrontend.host}:${config.upstream.brandFrontend.port}`);
        logger.info(`  ⚡ Brand Interface BE:    http://${config.upstream.brandBackend.host}:${config.upstream.brandBackend.port}`);
        logger.info('='.repeat(60));
        logger.info('Ready to serve requests! 🎉');
      });

      this.server.keepAliveTimeout = 61000;
      this.server.headersTimeout = 62000;

      // Enable WebSocket upgrade handling for HMR and real-time features
      this.server.on('upgrade', (request: any, socket: any, head: any) => {
        logger.debug('WebSocket upgrade request', {
          url: request.url,
          headers: request.headers,
        });
        
        // Let the proxy middleware handle WebSocket upgrades
        // The proxy middlewares are configured with ws: true
      });

    } catch (error) {
      logger.error('Failed to start proxy server', { error });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private gracefulShutdown(signal: string): void {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    if (this.server) {
      this.server.close((error?: Error) => {
        if (error) {
          logger.error('Error during server shutdown', { error });
        } else {
          logger.info('HTTP server closed');
        }

        // Clean up health checker
        this.healthChecker.destroy();

        // Exit process
        logger.info('Graceful shutdown completed');
        process.exit(error ? 1 : 0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    } else {
      process.exit(0);
    }
  }
}

/**
 * Start the server if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const proxyServer = new W3SuiteProxyServer();
  proxyServer.start().catch((error) => {
    logger.error('Failed to start W3 Suite Proxy Server', { error });
    process.exit(1);
  });
}

export default W3SuiteProxyServer;