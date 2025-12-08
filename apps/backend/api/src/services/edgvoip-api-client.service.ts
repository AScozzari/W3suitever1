/**
 * edgvoip API Client Service
 * 
 * HTTP client for fetching trunk and extension data from edgvoip PBX
 * Supports bidirectional sync: W3 Suite can pull fresh data from edgvoip
 */

import { logger } from '../core/logger';
import crypto from 'crypto';

export interface EdgvoipTrunkData {
  edgvoipTrunkId: string;
  name: string;
  provider?: string;
  host?: string;
  port?: number;
  protocol?: string;
  didRange?: string;
  maxChannels?: number;
  currentChannels?: number;
  status: string;
  storeId: string;
  tenantId: string;
}

export interface EdgvoipExtensionData {
  edgvoipExtensionId: string;
  extension: string;
  sipUsername: string;
  sipPassword: string;
  displayName?: string;
  email?: string;
  sipDomain: string;
  callerIdName?: string;
  callerIdNumber?: string;
  voicemailEnabled?: boolean;
  status: string;
  domainId: string;
  registrationStatus?: string;
  lastRegistration?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface EdgvoipAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Generate HMAC-SHA256 signature for API authentication
 */
const generateHMAC = (payload: string, secret: string): string => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Get edgvoip API configuration from environment
 */
const getEdgvoipConfig = () => {
  const apiUrl = process.env.EDGVOIP_API_URL;
  const webhookSecret = process.env.EDGVOIP_WEBHOOK_SECRET;
  const accessToken = process.env.EDGVOIP_ACCESS_TOKEN;

  if (!apiUrl || !webhookSecret || !accessToken) {
    const missing = [];
    if (!apiUrl) missing.push('EDGVOIP_API_URL');
    if (!webhookSecret) missing.push('EDGVOIP_WEBHOOK_SECRET');
    if (!accessToken) missing.push('EDGVOIP_ACCESS_TOKEN');
    
    logger.warn('Missing edgvoip configuration - sync disabled', { 
      missingVars: missing 
    });
    return null;
  }

  return { apiUrl, webhookSecret, accessToken };
};

/**
 * Make authenticated request to edgvoip API
 */
async function edgvoipAPIRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  tenantId: string,
  body?: any
): Promise<EdgvoipAPIResponse<T>> {
  const config = getEdgvoipConfig();
  
  if (!config) {
    return {
      success: false,
      error: 'edgvoip API not configured',
      code: 'EDGVOIP_NOT_CONFIGURED'
    };
  }

  const { apiUrl, webhookSecret, accessToken } = config;

  try {
    // Prepare request
    const url = `${apiUrl}${endpoint}`;
    const timestamp = new Date().toISOString();
    const payloadString = body ? JSON.stringify(body) : '';
    const signaturePayload = `${method}:${endpoint}:${timestamp}:${payloadString}`;
    const signature = generateHMAC(signaturePayload, webhookSecret);

    logger.info('edgvoip API request', {
      method,
      endpoint,
      tenantId,
      url
    });

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-W3-Signature': signature,
        'X-W3-Tenant-ID': tenantId,
        'X-W3-Timestamp': timestamp
      },
      body: payloadString || undefined
    });

    const responseData = await response.json();

    if (!response.ok) {
      logger.error('edgvoip API error', {
        status: response.status,
        endpoint,
        error: responseData
      });

      return {
        success: false,
        error: responseData.error || `HTTP ${response.status}`,
        code: responseData.code || 'EDGVOIP_API_ERROR'
      };
    }

    logger.info('edgvoip API success', {
      endpoint,
      tenantId
    });

    return {
      success: true,
      data: responseData.data || responseData
    };
  } catch (error) {
    logger.error('edgvoip API request failed', {
      error,
      endpoint,
      tenantId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'NETWORK_ERROR'
    };
  }
}

/**
 * Fetch all trunks for a tenant from edgvoip
 */
export async function fetchTrunksFromEdgvoip(
  tenantId: string
): Promise<EdgvoipAPIResponse<EdgvoipTrunkData[]>> {
  return edgvoipAPIRequest<EdgvoipTrunkData[]>(
    `/api/w3-integration/trunks?tenantId=${tenantId}`,
    'GET',
    tenantId
  );
}

/**
 * Fetch single trunk from edgvoip
 */
export async function fetchTrunkFromEdgvoip(
  edgvoipTrunkId: string,
  tenantId: string
): Promise<EdgvoipAPIResponse<EdgvoipTrunkData>> {
  return edgvoipAPIRequest<EdgvoipTrunkData>(
    `/api/w3-integration/trunks/${edgvoipTrunkId}`,
    'GET',
    tenantId
  );
}

/**
 * Fetch all extensions for a tenant from edgvoip
 */
export async function fetchExtensionsFromEdgvoip(
  tenantId: string,
  domainId?: string
): Promise<EdgvoipAPIResponse<EdgvoipExtensionData[]>> {
  const queryParams = domainId ? `?tenantId=${tenantId}&domainId=${domainId}` : `?tenantId=${tenantId}`;
  return edgvoipAPIRequest<EdgvoipExtensionData[]>(
    `/api/w3-integration/extensions${queryParams}`,
    'GET',
    tenantId
  );
}

/**
 * Fetch single extension from edgvoip
 */
export async function fetchExtensionFromEdgvoip(
  edgvoipExtensionId: string,
  tenantId: string
): Promise<EdgvoipAPIResponse<EdgvoipExtensionData>> {
  return edgvoipAPIRequest<EdgvoipExtensionData>(
    `/api/w3-integration/extensions/${edgvoipExtensionId}`,
    'GET',
    tenantId
  );
}

/**
 * Check if edgvoip API is configured and reachable
 */
export async function checkEdgvoipConnection(
  tenantId: string
): Promise<{ available: boolean; error?: string }> {
  // Check configuration first
  const apiUrl = process.env.EDGVOIP_API_URL;
  const webhookSecret = process.env.EDGVOIP_WEBHOOK_SECRET;
  const accessToken = process.env.EDGVOIP_ACCESS_TOKEN;

  if (!apiUrl || !webhookSecret || !accessToken) {
    const missing = [];
    if (!apiUrl) missing.push('EDGVOIP_API_URL');
    if (!webhookSecret) missing.push('EDGVOIP_WEBHOOK_SECRET');
    if (!accessToken) missing.push('EDGVOIP_ACCESS_TOKEN');
    
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.warn('edgvoip connection check failed - missing configuration', { 
      missingVars: missing 
    });
    
    return { 
      available: false, 
      error: errorMsg
    };
  }

  // Configuration OK, try health check
  try {
    const response = await edgvoipAPIRequest<{ status: string }>(
      '/api/w3-integration/health',
      'GET',
      tenantId
    );

    return { 
      available: response.success,
      error: response.success ? undefined : response.error
    };
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}
