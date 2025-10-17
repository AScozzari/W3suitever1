/**
 * GTM (Google Tag Manager) API Routes
 * 
 * Provides REST endpoints for server-side tracking events to GTM, GA4, and Google Ads
 * with Enhanced Conversions support.
 */

import express from 'express';
import { z } from 'zod';
import { correlationMiddleware, logger } from '../core/logger';
import { gtmEventsService } from '../services/gtm-events.service';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// Validation schema for GTM event request
const gtmEventSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  eventType: z.enum(['lead_created', 'lead_updated', 'lead_converted', 'form_submit', 'custom']),
  eventName: z.string().min(1),
  eventData: z.record(z.any()),
  userData: z.object({
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    street: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional(),
  conversionValue: z.number().optional(),
  currency: z.string().optional(),
});

/**
 * POST /api/gtm/events
 * Send a custom event to GTM/GA4/Google Ads
 * 
 * Request body:
 * - storeId?: string - Store ID for tracking config lookup
 * - leadId?: string - Lead ID to associate with event
 * - eventType: 'lead_created' | 'lead_updated' | 'lead_converted' | 'form_submit' | 'custom'
 * - eventName: string - GA4 event name (e.g., 'lead_created', 'purchase', 'form_submit')
 * - eventData: object - Custom event parameters
 * - userData?: object - User data for Enhanced Conversions (email, phone, etc.)
 * - conversionValue?: number - Conversion value (for conversions)
 * - currency?: string - Currency code (ISO 4217, default: EUR)
 */
router.post('/events', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    const validation = gtmEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const data = validation.data;

    // Extract client info from request
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    // Track event
    await gtmEventsService.trackEvent({
      tenantId,
      storeId: data.storeId,
      leadId: data.leadId,
      eventType: data.eventType,
      eventName: data.eventName,
      eventData: data.eventData,
      userData: data.userData,
      conversionValue: data.conversionValue,
      currency: data.currency,
      clientIp,
      userAgent
    });

    logger.info('GTM event tracked successfully', {
      tenantId,
      eventType: data.eventType,
      eventName: data.eventName
    });

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error tracking GTM event', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to track event',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/gtm/events/lead-created
 * Convenience endpoint for tracking lead creation
 * 
 * Request body:
 * - leadId: string (required)
 * - storeId?: string
 * - userData: object (email, phone, etc.)
 * - leadData: object (source, score, etc.)
 */
router.post('/events/lead-created', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { leadId, storeId, userData, leadData } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Missing leadId',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Extract client info
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    // Track lead created event
    await gtmEventsService.trackLeadCreated(
      tenantId,
      leadId,
      storeId || null,
      userData || {},
      leadData || {},
      clientIp,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Lead created event tracked successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error tracking lead created event', {
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to track lead created event',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/gtm/events/lead-converted
 * Convenience endpoint for tracking lead conversion
 * 
 * Request body:
 * - leadId: string (required)
 * - storeId?: string
 * - userData: object (email, phone, etc.)
 * - conversionValue?: number
 * - currency?: string (default: EUR)
 */
router.post('/events/lead-converted', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { leadId, storeId, userData, conversionValue, currency } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'Missing leadId',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Extract client info
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                     req.socket.remoteAddress || 
                     undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    // Track lead conversion event
    await gtmEventsService.trackLeadConverted(
      tenantId,
      leadId,
      storeId || null,
      userData || {},
      conversionValue,
      currency || 'EUR',
      clientIp,
      userAgent
    );

    res.status(200).json({
      success: true,
      message: 'Lead conversion event tracked successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error tracking lead conversion event', {
      errorMessage: error?.message,
      tenantId: req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to track lead conversion event',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;
