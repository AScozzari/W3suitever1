import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../core/logger.js';

/**
 * Webhook Signature Validators
 * Provider-specific HMAC signature validation middleware
 */

export interface WebhookValidationConfig {
  signingSecret: string;
  toleranceSeconds?: number;
}

/**
 * 🔵 Stripe Webhook Signature Validator
 * Validates Stripe webhook signatures using their specific format
 * 
 * Expected header: stripe-signature
 * Format: t=timestamp,v1=signature
 */
export function validateStripeSignature(config: WebhookValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        logger.warn('🔵 Stripe webhook: Missing signature header');
        return res.status(401).json({ error: 'Missing Stripe signature' });
      }

      // Parse Stripe signature format: t=timestamp,v1=signature
      const elements = signature.split(',');
      const timestampElement = elements.find(el => el.startsWith('t='));
      const signatureElement = elements.find(el => el.startsWith('v1='));

      if (!timestampElement || !signatureElement) {
        logger.warn('🔵 Stripe webhook: Invalid signature format');
        return res.status(401).json({ error: 'Invalid Stripe signature format' });
      }

      const timestamp = parseInt(timestampElement.split('=')[1], 10);
      const receivedSignature = signatureElement.split('=')[1];

      // Timestamp validation (replay protection)
      const currentTime = Math.floor(Date.now() / 1000);
      const tolerance = config.toleranceSeconds || 300; // 5 minutes default

      if (Math.abs(currentTime - timestamp) > tolerance) {
        logger.warn('🔵 Stripe webhook: Timestamp outside tolerance', {
          timestamp,
          currentTime,
          tolerance
        });
        return res.status(401).json({ error: 'Stripe webhook timestamp too old' });
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${req.body}`;
      const expectedSignature = crypto
        .createHmac('sha256', config.signingSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Timing-safe comparison
      if (!crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
        logger.warn('🔵 Stripe webhook: Signature mismatch');
        return res.status(401).json({ error: 'Invalid Stripe signature' });
      }

      logger.debug('🔵 Stripe webhook: Signature validated successfully');
      next();
    } catch (error) {
      logger.error('🔵 Stripe webhook validation error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({ error: 'Stripe webhook validation failed' });
    }
  };
}

/**
 * 📱 Twilio Webhook Signature Validator
 * Validates Twilio webhook signatures using X-Twilio-Signature header
 * 
 * Expected header: x-twilio-signature
 * Format: Base64-encoded SHA1 HMAC
 */
export function validateTwilioSignature(config: WebhookValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-twilio-signature'] as string;
      
      if (!signature) {
        logger.warn('📱 Twilio webhook: Missing signature header');
        return res.status(401).json({ error: 'Missing Twilio signature' });
      }

      // Twilio signs the full URL + all POST parameters sorted alphabetically
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // For Twilio, we need to reconstruct the signed payload
      // URL + sorted query params
      const params = new URLSearchParams();
      
      // Add all POST body params
      if (typeof req.body === 'object' && !Array.isArray(req.body)) {
        Object.keys(req.body)
          .sort()
          .forEach(key => {
            params.append(key, req.body[key]);
          });
      }

      const signedPayload = url + params.toString();

      // Compute expected signature (SHA1)
      const expectedSignature = crypto
        .createHmac('sha1', config.signingSecret)
        .update(signedPayload, 'utf8')
        .digest('base64');

      // Timing-safe comparison
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        logger.warn('📱 Twilio webhook: Signature mismatch', {
          url,
          receivedSignature: signature.substring(0, 10) + '...',
          expectedSignature: expectedSignature.substring(0, 10) + '...'
        });
        return res.status(401).json({ error: 'Invalid Twilio signature' });
      }

      logger.debug('📱 Twilio webhook: Signature validated successfully');
      next();
    } catch (error) {
      logger.error('📱 Twilio webhook validation error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({ error: 'Twilio webhook validation failed' });
    }
  };
}

/**
 * 🐙 GitHub Webhook Signature Validator
 * Validates GitHub webhook signatures using X-Hub-Signature-256 header
 * 
 * Expected header: x-hub-signature-256
 * Format: sha256=<signature>
 */
export function validateGitHubSignature(config: WebhookValidationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      
      if (!signature) {
        logger.warn('🐙 GitHub webhook: Missing signature header');
        return res.status(401).json({ error: 'Missing GitHub signature' });
      }

      // GitHub format: sha256=<hex_signature>
      if (!signature.startsWith('sha256=')) {
        logger.warn('🐙 GitHub webhook: Invalid signature format');
        return res.status(401).json({ error: 'Invalid GitHub signature format' });
      }

      const receivedSignature = signature.substring(7); // Remove 'sha256=' prefix

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', config.signingSecret)
        .update(req.body, 'utf8')
        .digest('hex');

      // Timing-safe comparison
      if (!crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
        logger.warn('🐙 GitHub webhook: Signature mismatch');
        return res.status(401).json({ error: 'Invalid GitHub signature' });
      }

      logger.debug('🐙 GitHub webhook: Signature validated successfully');
      next();
    } catch (error) {
      logger.error('🐙 GitHub webhook validation error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({ error: 'GitHub webhook validation failed' });
    }
  };
}

/**
 * 🔑 Generic HMAC Webhook Signature Validator
 * Validates webhooks using configurable HMAC algorithm and header
 * 
 * Supports: SHA256, SHA512, SHA1
 */
export function validateGenericHmacSignature(config: WebhookValidationConfig & {
  algorithm?: 'sha256' | 'sha512' | 'sha1';
  headerName?: string;
  headerPrefix?: string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const algorithm = config.algorithm || 'sha256';
      const headerName = config.headerName || 'x-webhook-signature';
      const headerPrefix = config.headerPrefix || '';

      const signatureHeader = req.headers[headerName.toLowerCase()] as string;
      
      if (!signatureHeader) {
        logger.warn('🔑 Generic webhook: Missing signature header', { headerName });
        return res.status(401).json({ error: `Missing ${headerName} header` });
      }

      // Remove prefix if configured
      const receivedSignature = headerPrefix 
        ? signatureHeader.substring(headerPrefix.length)
        : signatureHeader;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac(algorithm, config.signingSecret)
        .update(req.body, 'utf8')
        .digest('hex');

      // Timing-safe comparison
      if (!crypto.timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
        logger.warn('🔑 Generic webhook: Signature mismatch', {
          algorithm,
          headerName
        });
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      logger.debug('🔑 Generic webhook: Signature validated successfully', {
        algorithm,
        headerName
      });
      next();
    } catch (error) {
      logger.error('🔑 Generic webhook validation error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({ error: 'Generic webhook validation failed' });
    }
  };
}

/**
 * 🛡️ Raw Body Parser Middleware
 * Preserves raw body for signature validation
 * Must be used BEFORE express.json() middleware
 */
export function preserveRawBody(req: Request, res: Response, next: NextFunction) {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });

  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
}

/**
 * 🔒 Webhook Rate Limiter
 * Rate limiting middleware for webhook endpoints
 */
export function webhookRateLimit(options: {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (req: Request) => string;
}) {
  const requests = new Map<string, { count: number; resetAt: number }>();
  const maxRequests = options.maxRequests || 100;
  const windowMs = options.windowMs || 60000; // 1 minute default

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : req.ip || 'unknown';

    const now = Date.now();
    const record = requests.get(key);

    // Clean up expired entries
    if (record && now > record.resetAt) {
      requests.delete(key);
    }

    const current = requests.get(key);

    if (current) {
      if (current.count >= maxRequests) {
        logger.warn('🔒 Webhook rate limit exceeded', {
          key,
          count: current.count,
          maxRequests
        });
        return res.status(429).json({
          error: 'Too many webhook requests',
          retryAfter: Math.ceil((current.resetAt - now) / 1000)
        });
      }

      current.count++;
    } else {
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
    }

    next();
  };
}
