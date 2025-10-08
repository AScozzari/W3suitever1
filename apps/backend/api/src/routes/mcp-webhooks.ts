import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook-service.js';
import { logger } from '../core/logger.js';
import crypto from 'crypto';

const router = Router();

/**
 * 🔌 MCP Webhook Receiver Endpoints
 * POST /api/webhooks/mcp/:ecosystem/:tenantId
 * 
 * Receives webhooks from MCP integrated services (Google, AWS, Meta, Microsoft, Stripe, GTM)
 * Ecosystem-specific signature validation, event parsing, and workflow trigger mapping
 * 
 * Supported Ecosystems:
 * - google: Gmail, Calendar, Drive, Forms (Google Cloud Pub/Sub)
 * - aws: S3, Lambda, DynamoDB, SNS (AWS SNS signatures)
 * - meta: Instagram, Facebook, WhatsApp (Meta Graph API)
 * - microsoft: Teams, Outlook, OneDrive (Microsoft Graph webhooks)
 * - stripe: Payments, Subscriptions (Stripe webhook signatures)
 * - gtm: GA4, Conversions (GTM Measurement Protocol)
 */

/**
 * 🌐 Google Workspace Webhook Handler
 * POST /api/webhooks/mcp/google/:tenantId
 * 
 * Receives: Gmail, Calendar, Drive, Forms events via Cloud Pub/Sub
 * Signature: Google Cloud Pub/Sub message verification
 */
router.post('/google/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Google Cloud Pub/Sub format
    const message = req.body.message;
    if (!message) {
      return res.status(400).json({ error: 'Invalid Google Pub/Sub message format' });
    }

    // Decode base64 payload
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const payload = JSON.parse(decodedData);
    
    // Extract event metadata from attributes
    const eventType = message.attributes?.eventType || payload.type || 'google.notification';
    const resourceId = message.attributes?.resourceId || payload.resourceId;
    const eventId = message.messageId || `google-${Date.now()}`;

    logger.info('🌐 Google MCP webhook received', {
      tenantId,
      eventType,
      resourceId,
      messageId: message.messageId
    });

    // Map to standard webhook format
    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-google',
      eventId,
      eventType,
      payload: {
        ...payload,
        resourceId,
        channelId: message.attributes?.channelId,
        resourceState: message.attributes?.resourceState
      },
      rawBody: (req as any).rawBody, // 🔒 Pass raw body for signature validation
      headers: req.headers as Record<string, any>,
      priority: getGooglePriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ Google MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

/**
 * ☁️ AWS Services Webhook Handler
 * POST /api/webhooks/mcp/aws/:tenantId
 * 
 * Receives: S3, Lambda, DynamoDB, SNS events
 * Signature: AWS SNS message signature verification
 */
router.post('/aws/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // AWS SNS format
    const messageType = req.headers['x-amz-sns-message-type'] as string;
    const payload = req.body;

    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      logger.info('☁️ AWS SNS subscription confirmation', {
        tenantId,
        subscribeURL: payload.SubscribeURL
      });
      
      // 🔗 Auto-confirm subscription by calling SubscribeURL
      if (payload.SubscribeURL) {
        try {
          const response = await fetch(payload.SubscribeURL, { method: 'GET' });
          
          if (response.ok) {
            logger.info('✅ AWS SNS subscription confirmed', {
              tenantId,
              topicArn: payload.TopicArn,
              subscriptionArn: await response.text()
            });
            
            return res.status(200).json({ 
              message: 'Subscription confirmed successfully',
              topicArn: payload.TopicArn
            });
          } else {
            logger.error('❌ AWS SNS subscription confirmation failed', {
              tenantId,
              status: response.status,
              statusText: response.statusText
            });
            
            return res.status(500).json({ 
              error: 'Failed to confirm subscription',
              status: response.status
            });
          }
        } catch (error) {
          logger.error('❌ AWS SNS subscription confirmation error', {
            tenantId,
            error: error instanceof Error ? error.message : String(error)
          });
          
          return res.status(500).json({ 
            error: 'Failed to confirm subscription',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        logger.error('❌ AWS SNS SubscribeURL missing', { tenantId });
        return res.status(400).json({ error: 'SubscribeURL not provided' });
      }
    }

    // Extract event data
    const eventId = payload.MessageId || `aws-${Date.now()}`;
    let eventType = 'aws.notification';
    let eventData = {};

    if (payload.Message) {
      try {
        const messageData = JSON.parse(payload.Message);
        eventType = messageData.eventType || messageData['detail-type'] || 'aws.notification';
        eventData = messageData;
      } catch {
        eventData = { message: payload.Message };
      }
    }

    logger.info('☁️ AWS MCP webhook received', {
      tenantId,
      eventType,
      messageType,
      messageId: payload.MessageId
    });

    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-aws',
      eventId,
      eventType,
      payload: {
        ...eventData,
        topicArn: payload.TopicArn,
        subject: payload.Subject,
        timestamp: payload.Timestamp
      },
      rawBody: (req as any).rawBody, // 🔒 Pass raw body for SNS signature validation
      signature: payload.Signature,
      headers: req.headers as Record<string, any>,
      priority: getAWSPriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ AWS MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

/**
 * 📱 Meta/Instagram Webhook Handler
 * POST /api/webhooks/mcp/meta/:tenantId
 * 
 * Receives: Instagram, Facebook, WhatsApp events
 * Signature: Meta app secret HMAC SHA256
 */
router.post('/meta/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Handle Meta webhook verification challenge
    if (req.query['hub.mode'] === 'subscribe') {
      const challenge = req.query['hub.challenge'];
      const verifyToken = req.query['hub.verify_token'];
      
      logger.info('📱 Meta webhook verification', {
        tenantId,
        verifyToken
      });
      
      // 🔒 SECURITY: Validate verify_token against stored config
      const webhookConfig = await WebhookService.getWebhookSignatureConfig(tenantId, 'mcp-meta');
      
      if (!webhookConfig) {
        logger.error('❌ Meta webhook config not found', { tenantId });
        return res.status(403).json({ error: 'Webhook not configured' });
      }
      
      // Verify token stored in webhook signature metadata
      const expectedToken = webhookConfig.metadata?.verifyToken;
      if (!expectedToken || verifyToken !== expectedToken) {
        logger.error('❌ Meta verify_token mismatch', { 
          tenantId, 
          received: verifyToken,
          expected: expectedToken ? '[REDACTED]' : 'NOT_SET'
        });
        return res.status(403).json({ error: 'Invalid verify_token' });
      }
      
      logger.info('✅ Meta webhook verification successful', { tenantId });
      return res.status(200).send(challenge);
    }

    // Meta Graph API webhook format
    const payload = req.body;
    const rawSignature = req.headers['x-hub-signature-256'] as string;
    
    // 🔒 Normalize Meta signature: Remove 'sha256=' prefix
    const signature = rawSignature?.startsWith('sha256=') 
      ? rawSignature.substring(7) // Remove 'sha256=' prefix
      : rawSignature;
    
    // Extract events from entries
    const events = [];
    for (const entry of payload.entry || []) {
      const entryId = entry.id;
      for (const change of entry.changes || []) {
        events.push({
          entryId,
          field: change.field,
          value: change.value
        });
      }
    }

    const eventId = `meta-${payload.entry?.[0]?.id || Date.now()}`;
    const eventType = payload.object 
      ? `meta.${payload.object}.${events[0]?.field || 'update'}`
      : 'meta.notification';

    logger.info('📱 Meta MCP webhook received', {
      tenantId,
      eventType,
      eventsCount: events.length,
      object: payload.object
    });

    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-meta',
      eventId,
      eventType,
      payload: {
        object: payload.object,
        events,
        raw: payload
      },
      rawBody: (req as any).rawBody, // 🔒 Pass raw body for Meta HMAC validation
      signature,
      headers: req.headers as Record<string, any>,
      priority: getMetaPriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ Meta MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

/**
 * 🏢 Microsoft 365 Webhook Handler
 * POST /api/webhooks/mcp/microsoft/:tenantId
 * 
 * Receives: Teams, Outlook, OneDrive, SharePoint events
 * Signature: Microsoft Graph webhook validation token
 */
router.post('/microsoft/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Handle Microsoft webhook validation
    if (req.query.validationToken) {
      logger.info('🏢 Microsoft webhook validation', {
        tenantId,
        validationToken: req.query.validationToken
      });
      
      return res.status(200).send(req.query.validationToken);
    }

    // Microsoft Graph webhook format
    const payload = req.body;
    const notifications = payload.value || [];
    
    const eventId = notifications[0]?.clientState || `microsoft-${Date.now()}`;
    const eventType = notifications[0]?.resource 
      ? `microsoft.${notifications[0].resource.split('/')[0]}.${notifications[0].changeType}`
      : 'microsoft.notification';

    logger.info('🏢 Microsoft MCP webhook received', {
      tenantId,
      eventType,
      notificationsCount: notifications.length,
      changeType: notifications[0]?.changeType
    });

    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-microsoft',
      eventId,
      eventType,
      payload: {
        notifications,
        subscriptionId: notifications[0]?.subscriptionId,
        resource: notifications[0]?.resource,
        changeType: notifications[0]?.changeType
      },
      rawBody: (req as any).rawBody, // 🔒 Pass raw body for signature validation
      headers: req.headers as Record<string, any>,
      priority: getMicrosoftPriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ Microsoft MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

/**
 * 💳 Stripe Webhook Handler
 * POST /api/webhooks/mcp/stripe/:tenantId
 * 
 * Receives: Payment, Subscription, Invoice events
 * Signature: Stripe webhook signature verification (reuse existing logic)
 */
router.post('/stripe/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    const payload = req.body;
    const rawSignature = req.headers['stripe-signature'] as string;
    
    // 🔒 Normalize Stripe signature: Extract v1= value from "t=...,v1=..." format
    let signature = rawSignature;
    if (rawSignature?.includes(',v1=')) {
      const parts = rawSignature.split(',');
      const v1Part = parts.find(p => p.startsWith('v1='));
      if (v1Part) {
        signature = v1Part.substring(3); // Remove 'v1=' prefix
      }
    }
    
    const eventId = payload.id || `stripe-${Date.now()}`;
    const eventType = payload.type || 'stripe.event';

    logger.info('💳 Stripe MCP webhook received', {
      tenantId,
      eventType,
      eventId
    });

    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-stripe',
      eventId,
      eventType,
      payload: payload.data || payload,
      rawBody: (req as any).rawBody, // 🔒 CRITICAL: Pass raw body for Stripe signature validation
      signature,
      headers: req.headers as Record<string, any>,
      priority: getStripePriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ Stripe MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

/**
 * 📊 GTM/Analytics Webhook Handler
 * POST /api/webhooks/mcp/gtm/:tenantId
 * 
 * Receives: GA4 events, Conversion tracking
 * Signature: GTM webhook secret validation
 */
router.post('/gtm/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    const payload = req.body;
    const signature = req.headers['x-gtm-signature'] as string;
    
    const eventId = payload.event_id || payload.client_id || `gtm-${Date.now()}`;
    const eventType = payload.event_name 
      ? `gtm.${payload.event_name}`
      : 'gtm.event';

    logger.info('📊 GTM MCP webhook received', {
      tenantId,
      eventType,
      eventName: payload.event_name,
      eventId
    });

    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source: 'mcp-gtm',
      eventId,
      eventType,
      payload: {
        eventName: payload.event_name,
        eventParams: payload.event_params,
        userId: payload.user_id,
        clientId: payload.client_id,
        timestamp: payload.timestamp_micros
      },
      rawBody: (req as any).rawBody, // 🔒 Pass raw body for GTM signature validation
      signature,
      headers: req.headers as Record<string, any>,
      priority: getGTMPriority(eventType)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message
    });

  } catch (error) {
    logger.error('❌ GTM MCP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

// ==================== PRIORITY HELPERS ====================

function getGooglePriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('gmail') || eventType.includes('message')) return 'high';
  if (eventType.includes('calendar') || eventType.includes('event')) return 'medium';
  if (eventType.includes('drive') || eventType.includes('file')) return 'medium';
  return 'low';
}

function getAWSPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('lambda') || eventType.includes('error')) return 'critical';
  if (eventType.includes('s3.object_created') || eventType.includes('dynamodb')) return 'high';
  return 'medium';
}

function getMetaPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('comment') || eventType.includes('message')) return 'high';
  if (eventType.includes('lead') || eventType.includes('purchase')) return 'critical';
  if (eventType.includes('post') || eventType.includes('story')) return 'medium';
  return 'low';
}

function getMicrosoftPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('mail') || eventType.includes('message')) return 'high';
  if (eventType.includes('meeting') || eventType.includes('event')) return 'medium';
  return 'low';
}

function getStripePriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('failed') || eventType.includes('dispute')) return 'critical';
  if (eventType.includes('succeeded') || eventType.includes('payment')) return 'high';
  if (eventType.includes('customer') || eventType.includes('subscription')) return 'medium';
  return 'low';
}

function getGTMPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType.includes('conversion') || eventType.includes('purchase')) return 'high';
  if (eventType.includes('add_to_cart') || eventType.includes('begin_checkout')) return 'medium';
  return 'low';
}

export default router;
