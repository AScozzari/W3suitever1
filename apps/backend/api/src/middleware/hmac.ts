/**
 * HMAC Signature Verification Middleware
 * 
 * Verifies webhook signatures from edgvoip PBX using HMAC-SHA256
 * Provides replay attack protection via timestamp validation
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../core/logger';

const HMAC_SECRET = process.env.EDGVOIP_WEBHOOK_SECRET || '';
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

if (!HMAC_SECRET) {
  logger.warn('EDGVOIP_WEBHOOK_SECRET not configured - webhook security disabled');
}

export interface HMACRequest extends Request {
  rawBody?: string;
}

/**
 * Verify HMAC signature for edgvoip webhooks
 * 
 * Expected headers:
 * - X-edgvoip-Signature: HMAC-SHA256 signature
 * - X-edgvoip-Timestamp: Unix timestamp (milliseconds)
 * - X-edgvoip-Event: Event type (trunk.created, trunk.updated, etc.)
 */
export const verifyEdgvoipSignature = (req: HMACRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-edgvoip-signature'] as string;
    const timestamp = req.headers['x-edgvoip-timestamp'] as string;
    const event = req.headers['x-edgvoip-event'] as string;

    // Skip verification if secret not configured (dev mode)
    if (!HMAC_SECRET) {
      logger.warn('Webhook signature verification skipped (no secret configured)', {
        event,
        path: req.path
      });
      return next();
    }

    if (!signature || !timestamp || !event) {
      logger.error('Missing webhook headers', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasEvent: !!event,
        path: req.path
      });
      return res.status(401).json({
        error: 'Missing required webhook headers (X-edgvoip-Signature, X-edgvoip-Timestamp, X-edgvoip-Event)'
      });
    }

    // Replay attack protection: check timestamp
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > TIMESTAMP_TOLERANCE_MS) {
      logger.error('Webhook timestamp outside tolerance window', {
        requestTime,
        now,
        diffMs: timeDiff,
        toleranceMs: TIMESTAMP_TOLERANCE_MS,
        event
      });
      return res.status(401).json({
        error: 'Request timestamp too old or too far in future (replay attack protection)'
      });
    }

    // Compute expected signature using raw body
    // CRITICAL: Must use raw body (pre-JSON-parsing) to match provider's signature
    const rawBody = (req as HMACRequest).rawBody;
    if (!rawBody) {
      logger.error('Raw body not available for signature verification', {
        event,
        path: req.path,
        hint: 'Ensure rawBodyMiddleware is applied before this middleware'
      });
      return res.status(500).json({
        error: 'Server configuration error: raw body capture not enabled'
      });
    }

    const method = req.method;
    // CRITICAL: Use originalUrl to match what the webhook provider signs
    // req.path is scoped to router ("/trunk"), but provider signs full path ("/api/webhooks/voip/trunk")
    const path = req.originalUrl || req.url;
    const bodyString = rawBody.toString('utf8');
    
    const payload = `${timestamp}.${method}.${path}.${bodyString}`;
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    // Convert hex strings to buffers for comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      logger.error('Invalid webhook signature', {
        event,
        path,
        providedSignature: signature.substring(0, 16) + '...',
        expectedSignature: expectedSignature.substring(0, 16) + '...'
      });
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    logger.info('Webhook signature verified successfully', {
      event,
      path,
      timeDiff: `${timeDiff}ms`
    });

    next();
  } catch (error) {
    logger.error('Error verifying webhook signature', { error, path: req.path });
    return res.status(500).json({
      error: 'Internal error during signature verification'
    });
  }
};

/**
 * Helper function to generate HMAC signature for outgoing webhooks (W3 → external services)
 */
export const generateHMACSignature = (
  timestamp: number,
  method: string,
  path: string,
  body: any,
  secret: string
): string => {
  const payload = `${timestamp}.${method}.${path}.${JSON.stringify(body)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};
