/**
 * GTM Events Service
 * 
 * Handles server-side tracking of CRM events to Google Tag Manager, Google Analytics 4,
 * and Google Ads via Measurement Protocol with Enhanced Conversions support.
 * 
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 * @see https://developers.google.com/google-ads/api/docs/conversions/upload-conversions
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { db, setTenantContext } from '../core/db';
import { logger } from '../core/logger';
import { storeTrackingConfig, gtmEventLog } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { enhancedConversionsService, EnhancedConversionData } from './enhanced-conversions.service';

export interface GTMEventParams {
  tenantId: string;
  storeId?: string | null;
  leadId?: string | null;
  eventType: 'lead_created' | 'lead_updated' | 'lead_converted' | 'form_submit' | 'custom';
  eventName: string;
  eventData: Record<string, any>;
  userData?: EnhancedConversionData;
  conversionValue?: number;
  currency?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface TrackingConfig {
  ga4MeasurementId?: string | null;
  googleAdsConversionId?: string | null;
  googleAdsConversionLabel?: string | null;
  facebookPixelId?: string | null;
}

class GTMEventsService {
  /**
   * Get tracking configuration for a store
   */
  private async getTrackingConfig(tenantId: string, storeId?: string | null): Promise<TrackingConfig> {
    if (!storeId) {
      return {};
    }

    await setTenantContext(tenantId);

    const [config] = await db
      .select()
      .from(storeTrackingConfig)
      .where(and(
        eq(storeTrackingConfig.storeId, storeId),
        eq(storeTrackingConfig.tenantId, tenantId)
      ))
      .limit(1);

    if (!config) {
      logger.debug('No tracking config found for store', { storeId, tenantId });
      return {};
    }

    return {
      ga4MeasurementId: config.ga4MeasurementId,
      googleAdsConversionId: config.googleAdsConversionId,
      googleAdsConversionLabel: config.googleAdsConversionLabel,
      facebookPixelId: config.facebookPixelId,
    };
  }

  /**
   * Send event to Google Analytics 4 via Measurement Protocol
   * 
   * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
   */
  private async sendToGA4(
    measurementId: string,
    eventName: string,
    eventParams: Record<string, any>,
    userData?: EnhancedConversionData,
    clientId?: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      // GA4 Measurement Protocol endpoint
      const apiSecret = process.env.GA4_API_SECRET || 'development-secret';
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

      // Generate client_id (use hashed email or random UUID)
      const effectiveClientId = clientId || 
        (userData?.email ? enhancedConversionsService.hashEmailForGA4(userData.email) : null) ||
        crypto.randomUUID();

      // Build GA4 payload
      const payload: any = {
        client_id: effectiveClientId,
        events: [
          {
            name: eventName,
            params: {
              ...eventParams,
              engagement_time_msec: 100, // Required for GA4
            }
          }
        ]
      };

      // Add user properties if userData provided
      if (userData) {
        const hashedUserData = enhancedConversionsService.hashUserData(userData);
        if (hashedUserData.sha256_email_address) {
          payload.user_properties = {
            email_sha256: {
              value: hashedUserData.sha256_email_address[0]
            }
          };
        }
      }

      // Add IP override if provided
      if (clientIp) {
        payload.ip_override = clientIp;
      }

      // Add user agent if provided
      if (userAgent) {
        payload.user_agent = userAgent;
      }

      logger.debug('Sending event to GA4', {
        measurementId,
        eventName,
        clientId: effectiveClientId
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('GA4 Measurement Protocol error', {
          statusCode: response.status,
          error: errorText
        });
        return {
          success: false,
          statusCode: response.status,
          error: errorText
        };
      }

      logger.info('Event sent to GA4 successfully', {
        measurementId,
        eventName
      });

      return { success: true, statusCode: response.status };

    } catch (error: any) {
      logger.error('Error sending event to GA4', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send conversion to Google Ads via Conversion Tracking API
   * 
   * Note: This is a simplified implementation. In production, you should use
   * Google Ads API with proper OAuth2 authentication.
   * 
   * @see https://developers.google.com/google-ads/api/docs/conversions/upload-conversions
   */
  private async sendToGoogleAds(
    conversionId: string,
    conversionLabel: string,
    conversionValue?: number,
    currency?: string,
    userData?: EnhancedConversionData
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      // Google Ads Conversion Tracking endpoint
      const url = `https://www.googleadservices.com/pagead/conversion/${conversionId}/?label=${conversionLabel}`;

      // Build conversion payload with Enhanced Conversions
      const payload: any = {
        conversion_label: conversionLabel,
        conversion_value: conversionValue || 0,
        currency: currency || 'EUR',
        conversion_time: new Date().toISOString(),
      };

      // Add Enhanced Conversions data
      if (userData) {
        const hashedData = enhancedConversionsService.hashUserData(userData);
        if (enhancedConversionsService.validateEnhancedConversionData(hashedData)) {
          payload.enhanced_conversion_data = hashedData;
        }
      }

      logger.debug('Sending conversion to Google Ads', {
        conversionId,
        conversionLabel,
        conversionValue
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Google Ads Conversion Tracking error', {
          statusCode: response.status,
          error: errorText
        });
        return {
          success: false,
          statusCode: response.status,
          error: errorText
        };
      }

      logger.info('Conversion sent to Google Ads successfully', {
        conversionId,
        conversionLabel
      });

      return { success: true, statusCode: response.status };

    } catch (error: any) {
      logger.error('Error sending conversion to Google Ads', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log GTM event to database for audit trail
   */
  private async logEvent(
    params: GTMEventParams,
    trackingConfig: TrackingConfig,
    enhancedConversionData?: any,
    result?: {
      ga4?: { success: boolean; statusCode?: number; error?: string };
      googleAds?: { success: boolean; statusCode?: number; error?: string };
    }
  ): Promise<void> {
    try {
      await setTenantContext(params.tenantId);

      const overallSuccess = (result?.ga4?.success || !trackingConfig.ga4MeasurementId) &&
                             (result?.googleAds?.success || !trackingConfig.googleAdsConversionId);

      await db.insert(gtmEventLog).values({
        tenantId: params.tenantId,
        leadId: params.leadId,
        storeId: params.storeId,
        eventType: params.eventType,
        eventName: params.eventName,
        eventData: params.eventData,
        ga4MeasurementId: trackingConfig.ga4MeasurementId,
        googleAdsConversionId: trackingConfig.googleAdsConversionId,
        googleAdsConversionLabel: trackingConfig.googleAdsConversionLabel,
        facebookPixelId: trackingConfig.facebookPixelId,
        enhancedConversionData,
        userAgent: params.userAgent,
        clientIpAddress: params.clientIp,
        success: overallSuccess,
        httpStatusCode: result?.ga4?.statusCode || result?.googleAds?.statusCode,
        responseBody: result,
        errorMessage: result?.ga4?.error || result?.googleAds?.error,
      });

      logger.debug('GTM event logged to database', {
        tenantId: params.tenantId,
        eventType: params.eventType,
        success: overallSuccess
      });

    } catch (error: any) {
      logger.error('Error logging GTM event to database', {
        error: error.message,
        tenantId: params.tenantId
      });
    }
  }

  /**
   * Track a CRM event and send to GTM/GA4/Google Ads
   * 
   * Main entry point for tracking CRM events with automatic Enhanced Conversions
   */
  async trackEvent(params: GTMEventParams): Promise<void> {
    try {
      logger.info('Tracking GTM event', {
        tenantId: params.tenantId,
        eventType: params.eventType,
        eventName: params.eventName
      });

      // Get tracking configuration
      const trackingConfig = await this.getTrackingConfig(params.tenantId, params.storeId);

      if (!trackingConfig.ga4MeasurementId && !trackingConfig.googleAdsConversionId) {
        logger.warn('No tracking configuration found, skipping event tracking', {
          tenantId: params.tenantId,
          storeId: params.storeId
        });
        return;
      }

      // Prepare Enhanced Conversions data
      let enhancedConversionData: any = undefined;
      if (params.userData) {
        enhancedConversionData = enhancedConversionsService.hashUserData(params.userData);
      }

      const results: any = {};

      // Send to GA4 if configured
      if (trackingConfig.ga4MeasurementId) {
        results.ga4 = await this.sendToGA4(
          trackingConfig.ga4MeasurementId,
          params.eventName,
          params.eventData,
          params.userData,
          undefined, // clientId (auto-generated from email hash or UUID)
          params.clientIp,
          params.userAgent
        );
      }

      // Send to Google Ads if configured (only for conversion events)
      if (trackingConfig.googleAdsConversionId && 
          trackingConfig.googleAdsConversionLabel &&
          params.eventType === 'lead_converted') {
        results.googleAds = await this.sendToGoogleAds(
          trackingConfig.googleAdsConversionId,
          trackingConfig.googleAdsConversionLabel,
          params.conversionValue,
          params.currency,
          params.userData
        );
      }

      // Log event to database
      await this.logEvent(params, trackingConfig, enhancedConversionData, results);

      logger.info('GTM event tracking completed', {
        tenantId: params.tenantId,
        eventType: params.eventType,
        ga4Success: results.ga4?.success,
        googleAdsSuccess: results.googleAds?.success
      });

    } catch (error: any) {
      logger.error('Error tracking GTM event', {
        error: error.message,
        stack: error.stack,
        tenantId: params.tenantId
      });
      throw error;
    }
  }

  /**
   * Track lead creation event
   */
  async trackLeadCreated(
    tenantId: string,
    leadId: string,
    storeId: string | null,
    userData: EnhancedConversionData,
    leadData: Record<string, any>,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.trackEvent({
      tenantId,
      leadId,
      storeId,
      eventType: 'lead_created',
      eventName: 'lead_created',
      eventData: {
        lead_id: leadId,
        lead_source: leadData.source || 'unknown',
        lead_score: leadData.leadScore || 0,
        ...leadData
      },
      userData,
      clientIp,
      userAgent
    });
  }

  /**
   * Track lead conversion event
   */
  async trackLeadConverted(
    tenantId: string,
    leadId: string,
    storeId: string | null,
    userData: EnhancedConversionData,
    conversionValue?: number,
    currency?: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.trackEvent({
      tenantId,
      leadId,
      storeId,
      eventType: 'lead_converted',
      eventName: 'purchase',
      eventData: {
        lead_id: leadId,
        value: conversionValue || 0,
        currency: currency || 'EUR'
      },
      userData,
      conversionValue,
      currency,
      clientIp,
      userAgent
    });
  }
}

export const gtmEventsService = new GTMEventsService();
