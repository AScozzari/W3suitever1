/**
 * 🌐 TRIGGER WEBHOOK ROUTES
 * 
 * Dynamic webhook inbound routes for workflow triggers
 * - Single Express route controller that handles all incoming webhook requests
 * - Verifies authentication (4 modes: none, basic, header, JWT)
 * - Rate limiting and CORS support
 * - Enqueues workflow instances via TriggerOrchestrator
 */

import express from 'express';
import { logger } from '../core/logger';
import { triggerRegistry, triggerOrchestrator } from '../services/trigger-orchestrator';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// ==================== RATE LIMITING ====================

/**
 * Rate limiter for webhook endpoints
 * Default: 100 requests per 15 minutes per IP
 */
const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Webhook authentication types
 */
interface WebhookAuthConfig {
  type: 'none' | 'basic' | 'header' | 'jwt';
  basicAuth?: {
    username: string;
    password: string;
  };
  headerAuth?: {
    headerName: string;
    expectedValue: string;
  };
  jwtAuth?: {
    jwtSecret: string;
    jwtAlgorithm: string;
    headerName: string;
  };
}

/**
 * Verify webhook authentication based on configured method
 */
async function verifyWebhookAuth(
  req: express.Request,
  authConfig: WebhookAuthConfig
): Promise<{ authorized: boolean; error?: string }> {
  try {
    switch (authConfig.type) {
      case 'none':
        return { authorized: true };

      case 'basic': {
        if (!authConfig.basicAuth) {
          return { authorized: false, error: 'Basic auth configuration missing' };
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return { authorized: false, error: 'Missing or invalid Authorization header' };
        }

        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (
          username !== authConfig.basicAuth.username ||
          password !== authConfig.basicAuth.password
        ) {
          return { authorized: false, error: 'Invalid credentials' };
        }

        return { authorized: true };
      }

      case 'header': {
        if (!authConfig.headerAuth) {
          return { authorized: false, error: 'Header auth configuration missing' };
        }

        const headerValue = req.headers[authConfig.headerAuth.headerName.toLowerCase()];
        if (headerValue !== authConfig.headerAuth.expectedValue) {
          return { authorized: false, error: 'Invalid header value' };
        }

        return { authorized: true };
      }

      case 'jwt': {
        if (!authConfig.jwtAuth) {
          return { authorized: false, error: 'JWT auth configuration missing' };
        }

        const authHeader = req.headers[authConfig.jwtAuth.headerName.toLowerCase()];
        if (!authHeader) {
          return { authorized: false, error: 'Missing JWT token' };
        }

        // Extract token (handle "Bearer <token>" format)
        let token = authHeader as string;
        if (token.startsWith('Bearer ')) {
          token = token.slice(7);
        }

        try {
          jwt.verify(token, authConfig.jwtAuth.jwtSecret, {
            algorithms: [authConfig.jwtAuth.jwtAlgorithm as any]
          });
          return { authorized: true };
        } catch (error) {
          return {
            authorized: false,
            error: `JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      default:
        return { authorized: false, error: 'Unknown authentication type' };
    }
  } catch (error) {
    logger.error('❌ [WEBHOOK-AUTH] Authentication verification failed', {
      error: error instanceof Error ? error.message : String(error),
      authType: authConfig.type
    });
    return {
      authorized: false,
      error: error instanceof Error ? error.message : 'Authentication error'
    };
  }
}

/**
 * Check IP whitelist if configured
 */
function checkIPWhitelist(
  clientIP: string,
  whitelist: string[] | undefined
): boolean {
  if (!whitelist || whitelist.length === 0) {
    return true; // No whitelist = all IPs allowed
  }

  return whitelist.some(allowedIP => {
    if (allowedIP.includes('/')) {
      // CIDR notation support could be added here
      // For now, just exact match
      return false;
    }
    return clientIP === allowedIP;
  });
}

// ==================== WEBHOOK HANDLER ====================

/**
 * Universal webhook inbound handler
 * Matches path/method to triggerId, verifies auth, fires trigger
 */
router.all('/inbound/*', webhookRateLimiter, async (req, res) => {
  try {
    const path = `/${req.params[0]}`; // Extract path after /inbound/
    const method = req.method;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      logger.warn('⚠️ [WEBHOOK-TRIGGER] Missing tenant context', { path, method });
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context (x-tenant-id header required)',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('🌐 [WEBHOOK-TRIGGER] Received webhook request', {
      tenantId,
      path,
      method,
      ip: req.ip,
      headers: Object.keys(req.headers)
    });

    // Lookup triggerId from registry (tenant-scoped for multi-tenant safety)
    const triggerId = triggerRegistry.getWebhookTriggerId(tenantId, path, method);
    if (!triggerId) {
      logger.warn('⚠️ [WEBHOOK-TRIGGER] No webhook trigger found for path/method', {
        path,
        method
      });
      return res.status(404).json({
        success: false,
        error: 'Webhook endpoint not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get trigger metadata from registry
    logger.debug('🔍 [WEBHOOK-TRIGGER] Looking up trigger config', { triggerId });

    const trigger = triggerRegistry.getTriggerById(triggerId);
    if (!trigger) {
      logger.warn('⚠️ [WEBHOOK-TRIGGER] Trigger not found in registry', {
        triggerId
      });
      return res.status(404).json({
        success: false,
        error: 'Trigger not found or inactive',
        timestamp: new Date().toISOString()
      });
    }

    // Verify IP whitelist
    const clientIP = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    if (!checkIPWhitelist(clientIP, trigger.config.security?.ipWhitelist)) {
      logger.warn('🚫 [WEBHOOK-TRIGGER] IP not whitelisted', {
        clientIP,
        whitelist: trigger.config.security?.ipWhitelist
      });
      return res.status(403).json({
        success: false,
        error: 'IP not whitelisted',
        timestamp: new Date().toISOString()
      });
    }

    // Verify authentication
    const authResult = await verifyWebhookAuth(req, trigger.config.authentication as WebhookAuthConfig);
    if (!authResult.authorized) {
      logger.warn('🚫 [WEBHOOK-TRIGGER] Authentication failed', {
        triggerId,
        error: authResult.error
      });
      return res.status(401).json({
        success: false,
        error: authResult.error || 'Authentication failed',
        timestamp: new Date().toISOString()
      });
    }

    // Build webhook payload
    const payload = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers,
      source: 'webhook',
      receivedAt: new Date().toISOString()
    };

    // Fire trigger via orchestrator
    const result = await triggerOrchestrator.fireTrigger(
      trigger.tenantId,
      trigger.templateId,
      triggerId,
      payload
    );

    if (!result.success) {
      logger.error('❌ [WEBHOOK-TRIGGER] Failed to fire trigger', {
        triggerId,
        error: result.message
      });
      return res.status(500).json({
        success: false,
        error: result.message,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('✅ [WEBHOOK-TRIGGER] Webhook processed successfully', {
      triggerId,
      instanceId: result.instanceId
    });

    // Respond based on configured respondMode
    // TODO: Support respondMode options (immediately, await_last_node, custom_node)
    return res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      instanceId: result.instanceId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [WEBHOOK-TRIGGER] Webhook handler error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== WEBHOOK MANAGEMENT ENDPOINTS ====================

/**
 * List all registered webhooks for a tenant
 * GET /api/triggers/webhooks
 */
router.get('/list', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      });
    }

    // TODO: Implement registry method to list webhooks by tenant
    logger.info('📋 [WEBHOOK-TRIGGER] Listing webhooks', { tenantId });

    return res.json({
      success: true,
      webhooks: [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [WEBHOOK-TRIGGER] List webhooks error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
