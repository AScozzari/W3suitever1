import { GoogleOAuthService } from '../services/google-oauth-service.js';
import { logger } from '../core/logger.js';
import crypto from 'crypto';

/**
 * Google Tag Manager (GTM) MCP Executors
 * 
 * 6 action executors for GTM/Analytics integration:
 * - Track Event, Track Page View, Track Conversion
 * - Setup Tag, Update Tag, Delete Tag
 * 
 * Enhanced Conversions support for better attribution
 */

const GTM_API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

// Enhanced Conversions Helper - SHA256 hashing for user data
function hashUserData(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

interface EnhancedConversionUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

function buildEnhancedUserData(userData?: EnhancedConversionUserData) {
  if (!userData) return undefined;
  
  const enhanced: Record<string, any> = {};
  
  if (userData.email) enhanced.sha256_email_address = hashUserData(userData.email);
  if (userData.phone) enhanced.sha256_phone_number = hashUserData(userData.phone);
  if (userData.firstName) enhanced.sha256_first_name = hashUserData(userData.firstName);
  if (userData.lastName) enhanced.sha256_last_name = hashUserData(userData.lastName);
  
  const address: Record<string, any> = {};
  if (userData.street) address.sha256_street = hashUserData(userData.street);
  if (userData.city) address.city = userData.city;
  if (userData.region) address.region = userData.region;
  if (userData.postalCode) address.postal_code = userData.postalCode;
  if (userData.country) address.country = userData.country;
  
  if (Object.keys(address).length > 0) {
    enhanced.address = address;
  }
  
  return Object.keys(enhanced).length > 0 ? enhanced : undefined;
}

// ==================== GTM TRACKING EXECUTORS ====================

export async function executeGTMTrackEvent(params: {
  serverId: string;
  tenantId: string;
  config: {
    eventName: string;
    eventCategory?: string;
    eventLabel?: string;
    eventValue?: number;
    parameters?: Record<string, any>;
  };
}): Promise<{ success: boolean; eventId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    // Use Measurement Protocol for event tracking
    const measurementId = config.parameters?.measurementId || 'G-XXXXXXXXXX';
    const apiSecret = config.parameters?.apiSecret || '';

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: config.parameters?.clientId || 'default_client',
          events: [{
            name: config.eventName,
            params: {
              event_category: config.eventCategory,
              event_label: config.eventLabel,
              value: config.eventValue,
              ...config.parameters
            }
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Track Event failed: ${error}`);
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('✅ [GTM Track Event] Event tracked successfully', {
      eventName: config.eventName,
      eventId
    });

    return {
      success: true,
      eventId
    };

  } catch (error) {
    logger.error('❌ [GTM Track Event] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGTMTrackPageView(params: {
  serverId: string;
  tenantId: string;
  config: {
    pageUrl: string;
    pageTitle?: string;
    referrer?: string;
    parameters?: Record<string, any>;
  };
}): Promise<{ success: boolean; pageViewId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const measurementId = config.parameters?.measurementId || 'G-XXXXXXXXXX';
    const apiSecret = config.parameters?.apiSecret || '';

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: config.parameters?.clientId || 'default_client',
          events: [{
            name: 'page_view',
            params: {
              page_location: config.pageUrl,
              page_title: config.pageTitle,
              page_referrer: config.referrer,
              ...config.parameters
            }
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Track Page View failed: ${error}`);
    }

    const pageViewId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('✅ [GTM Track Page View] Page view tracked successfully', {
      pageUrl: config.pageUrl,
      pageViewId
    });

    return {
      success: true,
      pageViewId
    };

  } catch (error) {
    logger.error('❌ [GTM Track Page View] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGTMTrackConversion(params: {
  serverId: string;
  tenantId: string;
  config: {
    conversionLabel: string;
    conversionValue?: number;
    currency?: string;
    transactionId?: string;
    userData?: EnhancedConversionUserData;
    parameters?: Record<string, any>;
  };
}): Promise<{ success: boolean; conversionId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const measurementId = config.parameters?.measurementId || 'G-XXXXXXXXXX';
    const apiSecret = config.parameters?.apiSecret || '';

    const enhancedUserData = buildEnhancedUserData(config.userData);

    const requestBody: any = {
      client_id: config.parameters?.clientId || 'default_client',
      events: [{
        name: 'conversion',
        params: {
          conversion_label: config.conversionLabel,
          value: config.conversionValue,
          currency: config.currency || 'EUR',
          transaction_id: config.transactionId,
          ...config.parameters
        }
      }]
    };

    if (enhancedUserData) {
      requestBody.user_data = enhancedUserData;
    }

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Track Conversion failed: ${error}`);
    }

    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('✅ [GTM Track Conversion] Conversion tracked successfully', {
      conversionLabel: config.conversionLabel,
      conversionId,
      enhancedConversions: !!enhancedUserData
    });

    return {
      success: true,
      conversionId
    };

  } catch (error) {
    logger.error('❌ [GTM Track Conversion] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

// ==================== GTM TAG MANAGEMENT EXECUTORS ====================

export async function executeGTMSetupTag(params: {
  serverId: string;
  tenantId: string;
  config: {
    accountId: string;
    containerId: string;
    workspaceId: string;
    tagName: string;
    tagType: string;
    tagConfiguration?: Record<string, any>;
  };
}): Promise<{ tagId: string; tagPath: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const tagPath = `accounts/${config.accountId}/containers/${config.containerId}/workspaces/${config.workspaceId}/tags`;

    const response = await fetch(`${GTM_API_BASE}/${tagPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.tagName,
        type: config.tagType,
        parameter: config.tagConfiguration ? Object.entries(config.tagConfiguration).map(([key, value]) => ({
          type: typeof value === 'string' ? 'template' : 'boolean',
          key,
          value: String(value)
        })) : []
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Setup Tag failed: ${error}`);
    }

    const data = await response.json();

    logger.info('✅ [GTM Setup Tag] Tag created successfully', {
      tagId: data.tagId,
      tagName: config.tagName
    });

    return {
      tagId: data.tagId,
      tagPath: data.path
    };

  } catch (error) {
    logger.error('❌ [GTM Setup Tag] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGTMUpdateTag(params: {
  serverId: string;
  tenantId: string;
  config: {
    accountId: string;
    containerId: string;
    workspaceId: string;
    tagId: string;
    tagName?: string;
    tagConfiguration?: Record<string, any>;
  };
}): Promise<{ success: boolean; tagId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const tagPath = `accounts/${config.accountId}/containers/${config.containerId}/workspaces/${config.workspaceId}/tags/${config.tagId}`;

    const response = await fetch(`${GTM_API_BASE}/${tagPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...(config.tagName ? { name: config.tagName } : {}),
        ...(config.tagConfiguration ? {
          parameter: Object.entries(config.tagConfiguration).map(([key, value]) => ({
            type: typeof value === 'string' ? 'template' : 'boolean',
            key,
            value: String(value)
          }))
        } : {})
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Update Tag failed: ${error}`);
    }

    logger.info('✅ [GTM Update Tag] Tag updated successfully', {
      tagId: config.tagId
    });

    return {
      success: true,
      tagId: config.tagId
    };

  } catch (error) {
    logger.error('❌ [GTM Update Tag] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executeGTMDeleteTag(params: {
  serverId: string;
  tenantId: string;
  config: {
    accountId: string;
    containerId: string;
    workspaceId: string;
    tagId: string;
  };
}): Promise<{ success: boolean }> {
  const { serverId, tenantId, config } = params;

  try {
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId
    });

    const tagPath = `accounts/${config.accountId}/containers/${config.containerId}/workspaces/${config.workspaceId}/tags/${config.tagId}`;

    const response = await fetch(`${GTM_API_BASE}/${tagPath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GTM Delete Tag failed: ${error}`);
    }

    logger.info('✅ [GTM Delete Tag] Tag deleted successfully', {
      tagId: config.tagId
    });

    return {
      success: true
    };

  } catch (error) {
    logger.error('❌ [GTM Delete Tag] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}
