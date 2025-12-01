/**
 * EDGVoIP API v2 Client
 * 
 * HTTP client for EDGVoIP API v2 with per-tenant API key authentication.
 * 
 * Features:
 * - X-API-Key header authentication
 * - Per-tenant configuration from database
 * - Request/response logging
 * - Rate limit handling
 * - Automatic retry with exponential backoff
 * 
 * Base URL: https://edgvoip.it/api/v2/voip
 */

import crypto from 'crypto';
import { db, setTenantContext } from '../../core/db';
import { logger } from '../../core/logger';
import { eq } from 'drizzle-orm';
import { voipTenantConfig } from '../../db/schema/w3suite';
import { EncryptionKeyService } from '../../core/encryption-service';
import type {
  EdgvoipApiResponse,
  VoipTenantConfig,
  RateLimitInfo,
  EdgvoipTrunk,
  EdgvoipExtension,
  CreateTrunkRequest,
  UpdateTrunkRequest,
  TrunkSyncRequest,
  TrunkSyncResponse,
  CreateExtensionRequest,
  UpdateExtensionRequest,
  ExtensionSyncRequest,
  ExtensionSyncResponse,
  TrunkStatus,
  ExtensionStatus,
  ApiLog,
  ApiLogStats,
  WebhookConfig,
  CreateWebhookRequest,
  WebhookDelivery,
  EdgvoipStore,
  StoreSyncRequest,
  StoreSyncResponse
} from './types';

const DEFAULT_API_BASE_URL = 'https://edgvoip.it/api/v2/voip';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: Record<string, any>;
  queryParams?: Record<string, string>;
  timeout?: number;
}

interface ApiClientConfig {
  apiKey: string;
  apiBaseUrl: string;
  tenantExternalId: string;
  webhookSecret?: string;
}

export class EdgvoipApiClient {
  private config: ApiClientConfig;
  private encryptionService: EncryptionKeyService;
  private lastRateLimitInfo?: RateLimitInfo;

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.encryptionService = new EncryptionKeyService();
  }

  /**
   * Get tenant external ID for API requests
   */
  get tenantExternalId(): string {
    return this.config.tenantExternalId;
  }

  /**
   * Get webhook secret for signature verification
   */
  get webhookSecret(): string | undefined {
    return this.config.webhookSecret;
  }

  /**
   * Create client from tenant configuration stored in database
   */
  static async fromTenantId(tenantId: string): Promise<EdgvoipApiClient | null> {
    try {
      await setTenantContext(db, tenantId);

      const [config] = await db.select()
        .from(voipTenantConfig)
        .where(eq(voipTenantConfig.tenantId, tenantId))
        .limit(1);

      if (!config || !config.enabled) {
        logger.warn('EDGVoIP not configured or disabled for tenant', { tenantId });
        return null;
      }

      const encryptionService = new EncryptionKeyService();
      const decryptedApiKey = await encryptionService.decrypt(config.apiKey, tenantId);

      if (!decryptedApiKey) {
        logger.error('Failed to decrypt EDGVoIP API key', { tenantId });
        return null;
      }

      return new EdgvoipApiClient({
        apiKey: decryptedApiKey,
        apiBaseUrl: config.apiBaseUrl || DEFAULT_API_BASE_URL,
        tenantExternalId: config.tenantExternalId,
        webhookSecret: config.webhookSecret || undefined
      });
    } catch (error) {
      logger.error('Failed to create EDGVoIP client from tenant', { error, tenantId });
      return null;
    }
  }

  /**
   * Make authenticated request to EDGVoIP API
   */
  private async request<T>(options: RequestOptions): Promise<EdgvoipApiResponse<T>> {
    const { method, endpoint, body, queryParams, timeout = DEFAULT_TIMEOUT_MS } = options;

    let url = `${this.config.apiBaseUrl}${endpoint}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info('EDGVoIP API request', {
      requestId,
      method,
      endpoint,
      tenantExternalId: this.config.tenantExternalId
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Request-ID': requestId
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse rate limit headers
      this.lastRateLimitInfo = {
        limit: parseInt(response.headers.get('X-RateLimit-Limit') || '1000', 10),
        remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '999', 10),
        reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10)
      };

      const executionTimeMs = Date.now() - startTime;
      const responseData = await response.json();

      if (!response.ok) {
        logger.error('EDGVoIP API error', {
          requestId,
          status: response.status,
          endpoint,
          error: responseData,
          executionTimeMs
        });

        // Handle rate limiting
        if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded',
            error_code: 'RATE_LIMIT_EXCEEDED',
            request_id: requestId
          };
        }

        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}`,
          error_code: responseData.error_code || 'API_ERROR',
          request_id: requestId
        };
      }

      logger.info('EDGVoIP API success', {
        requestId,
        endpoint,
        executionTimeMs
      });
      
      // Debug: Log raw response for status endpoints
      if (endpoint.includes('/status/')) {
        logger.info('EDGVoIP STATUS RAW RESPONSE', {
          requestId,
          endpoint,
          rawData: JSON.stringify(responseData)
        });
      }

      return {
        success: true,
        data: responseData.data || responseData,
        meta: responseData.meta,
        request_id: requestId
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('EDGVoIP API timeout', { requestId, endpoint, timeout });
        return {
          success: false,
          error: 'Request timeout',
          error_code: 'TIMEOUT',
          request_id: requestId
        };
      }

      logger.error('EDGVoIP API request failed', {
        error,
        requestId,
        endpoint,
        executionTimeMs
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        error_code: 'NETWORK_ERROR',
        request_id: requestId
      };
    }
  }

  /**
   * Get rate limit info from last request
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.lastRateLimitInfo;
  }

  // ==================== STORES API ====================

  async getStores(): Promise<EdgvoipApiResponse<EdgvoipStore[]>> {
    return this.request<EdgvoipStore[]>({
      method: 'GET',
      endpoint: '/stores'
    });
  }

  async syncStores(request: StoreSyncRequest): Promise<EdgvoipApiResponse<StoreSyncResponse>> {
    return this.request<StoreSyncResponse>({
      method: 'POST',
      endpoint: '/stores/sync',
      body: request
    });
  }

  // ==================== TRUNKS API ====================

  async getTrunks(storeId?: string): Promise<EdgvoipApiResponse<EdgvoipTrunk[]>> {
    const queryParams = storeId ? { store_id: storeId } : undefined;
    return this.request<EdgvoipTrunk[]>({
      method: 'GET',
      endpoint: '/trunks',
      queryParams
    });
  }

  async getTrunk(externalId: string): Promise<EdgvoipApiResponse<EdgvoipTrunk>> {
    return this.request<EdgvoipTrunk>({
      method: 'GET',
      endpoint: `/trunks/${externalId}`
    });
  }

  async createTrunk(request: CreateTrunkRequest): Promise<EdgvoipApiResponse<EdgvoipTrunk>> {
    return this.request<EdgvoipTrunk>({
      method: 'POST',
      endpoint: '/trunks',
      body: request
    });
  }

  async updateTrunk(externalId: string, request: UpdateTrunkRequest): Promise<EdgvoipApiResponse<EdgvoipTrunk>> {
    return this.request<EdgvoipTrunk>({
      method: 'PUT',
      endpoint: `/trunks/${externalId}`,
      body: request
    });
  }

  async deleteTrunk(externalId: string): Promise<EdgvoipApiResponse<{ message: string }>> {
    return this.request<{ message: string }>({
      method: 'DELETE',
      endpoint: `/trunks/${externalId}`
    });
  }

  async syncTrunks(request: TrunkSyncRequest): Promise<EdgvoipApiResponse<TrunkSyncResponse>> {
    return this.request<TrunkSyncResponse>({
      method: 'POST',
      endpoint: '/trunks/sync',
      body: request
    });
  }

  // ==================== EXTENSIONS API ====================

  async getExtensions(storeId?: string): Promise<EdgvoipApiResponse<EdgvoipExtension[]>> {
    const queryParams = storeId ? { store_id: storeId } : undefined;
    return this.request<EdgvoipExtension[]>({
      method: 'GET',
      endpoint: '/extensions',
      queryParams
    });
  }

  async getExtension(externalId: string): Promise<EdgvoipApiResponse<EdgvoipExtension>> {
    return this.request<EdgvoipExtension>({
      method: 'GET',
      endpoint: `/extensions/${externalId}`
    });
  }

  async createExtension(request: CreateExtensionRequest): Promise<EdgvoipApiResponse<EdgvoipExtension>> {
    return this.request<EdgvoipExtension>({
      method: 'POST',
      endpoint: '/extensions',
      body: request
    });
  }

  async updateExtension(externalId: string, request: UpdateExtensionRequest): Promise<EdgvoipApiResponse<EdgvoipExtension>> {
    return this.request<EdgvoipExtension>({
      method: 'PUT',
      endpoint: `/extensions/${externalId}`,
      body: request
    });
  }

  async deleteExtension(externalId: string): Promise<EdgvoipApiResponse<{ message: string }>> {
    return this.request<{ message: string }>({
      method: 'DELETE',
      endpoint: `/extensions/${externalId}`
    });
  }

  async syncExtensions(request: ExtensionSyncRequest): Promise<EdgvoipApiResponse<ExtensionSyncResponse>> {
    return this.request<ExtensionSyncResponse>({
      method: 'POST',
      endpoint: '/extensions/sync',
      body: request
    });
  }

  // ==================== STATUS MONITORING ====================

  async getTrunkStatuses(): Promise<EdgvoipApiResponse<TrunkStatus[]>> {
    return this.request<TrunkStatus[]>({
      method: 'GET',
      endpoint: '/status/trunks'
    });
  }

  async getTrunkStatus(externalId: string): Promise<EdgvoipApiResponse<TrunkStatus>> {
    return this.request<TrunkStatus>({
      method: 'GET',
      endpoint: `/status/trunks/${externalId}`
    });
  }

  async getExtensionStatuses(): Promise<EdgvoipApiResponse<ExtensionStatus[]>> {
    return this.request<ExtensionStatus[]>({
      method: 'GET',
      endpoint: '/status/extensions'
    });
  }

  async getExtensionStatus(externalId: string): Promise<EdgvoipApiResponse<ExtensionStatus>> {
    return this.request<ExtensionStatus>({
      method: 'GET',
      endpoint: `/status/extensions/${externalId}`
    });
  }

  // ==================== API LOGS ====================

  async getLogs(options?: {
    status?: 'success' | 'error' | 'warning';
    start_date?: string;
    end_date?: string;
    endpoint?: string;
    limit?: number;
    offset?: number;
  }): Promise<EdgvoipApiResponse<ApiLog[]>> {
    const queryParams: Record<string, string> = {};
    if (options?.status) queryParams.status = options.status;
    if (options?.start_date) queryParams.start_date = options.start_date;
    if (options?.end_date) queryParams.end_date = options.end_date;
    if (options?.endpoint) queryParams.endpoint = options.endpoint;
    if (options?.limit) queryParams.limit = options.limit.toString();
    if (options?.offset) queryParams.offset = options.offset.toString();

    return this.request<ApiLog[]>({
      method: 'GET',
      endpoint: '/logs',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });
  }

  async getLog(requestId: string): Promise<EdgvoipApiResponse<ApiLog>> {
    return this.request<ApiLog>({
      method: 'GET',
      endpoint: `/logs/${requestId}`
    });
  }

  async getLogStats(options?: {
    start_date?: string;
    end_date?: string;
  }): Promise<EdgvoipApiResponse<ApiLogStats>> {
    const queryParams: Record<string, string> = {};
    if (options?.start_date) queryParams.start_date = options.start_date;
    if (options?.end_date) queryParams.end_date = options.end_date;

    return this.request<ApiLogStats>({
      method: 'GET',
      endpoint: '/logs/stats',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });
  }

  // ==================== WEBHOOKS ====================

  async getWebhooks(): Promise<EdgvoipApiResponse<WebhookConfig[]>> {
    return this.request<WebhookConfig[]>({
      method: 'GET',
      endpoint: '/webhooks'
    });
  }

  async createWebhook(request: CreateWebhookRequest): Promise<EdgvoipApiResponse<WebhookConfig>> {
    return this.request<WebhookConfig>({
      method: 'POST',
      endpoint: '/webhooks',
      body: request
    });
  }

  async updateWebhook(webhookId: string, request: Partial<CreateWebhookRequest>): Promise<EdgvoipApiResponse<WebhookConfig>> {
    return this.request<WebhookConfig>({
      method: 'PUT',
      endpoint: `/webhooks/${webhookId}`,
      body: request
    });
  }

  async deleteWebhook(webhookId: string): Promise<EdgvoipApiResponse<{ message: string }>> {
    return this.request<{ message: string }>({
      method: 'DELETE',
      endpoint: `/webhooks/${webhookId}`
    });
  }

  async getWebhookDeliveries(webhookId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<EdgvoipApiResponse<WebhookDelivery[]>> {
    const queryParams: Record<string, string> = {};
    if (options?.limit) queryParams.limit = options.limit.toString();
    if (options?.offset) queryParams.offset = options.offset.toString();

    return this.request<WebhookDelivery[]>({
      method: 'GET',
      endpoint: `/webhooks/${webhookId}/deliveries`,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });
  }

  // ==================== HEALTH CHECK (PUBLIC - NO AUTH) ====================

  /**
   * Health check endpoint - PUBLIC, no API key required
   * Used to verify API availability
   */
  async getHealth(): Promise<EdgvoipApiResponse<{ status: string; timestamp: string }>> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const url = `${this.config.apiBaseUrl}/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const executionTimeMs = Date.now() - startTime;
      const responseData = await response.json();

      logger.info('EDGVoIP health check', {
        requestId,
        status: response.status,
        executionTimeMs
      });

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}`,
          error_code: 'HEALTH_CHECK_FAILED',
          request_id: requestId
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        request_id: requestId
      };
    } catch (error) {
      logger.error('EDGVoIP health check failed', { error, requestId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        error_code: 'NETWORK_ERROR',
        request_id: requestId
      };
    }
  }

  // ==================== DID MANAGEMENT ====================

  /**
   * Get DIDs for tenant
   */
  async getDIDs(storeId?: string): Promise<EdgvoipApiResponse<any[]>> {
    const queryParams = storeId ? { store_id: storeId } : undefined;
    return this.request<any[]>({
      method: 'GET',
      endpoint: '/did',
      queryParams
    });
  }

  // ==================== CDR (Call Detail Records) ====================

  /**
   * Get CDR records with optional filters
   */
  async getCDR(options?: {
    start_date?: string;
    end_date?: string;
    store_id?: string;
    extension_id?: string;
    trunk_id?: string;
    direction?: 'inbound' | 'outbound';
    limit?: number;
    offset?: number;
  }): Promise<EdgvoipApiResponse<any[]>> {
    const queryParams: Record<string, string> = {};
    if (options?.start_date) queryParams.start_date = options.start_date;
    if (options?.end_date) queryParams.end_date = options.end_date;
    if (options?.store_id) queryParams.store_id = options.store_id;
    if (options?.extension_id) queryParams.extension_id = options.extension_id;
    if (options?.trunk_id) queryParams.trunk_id = options.trunk_id;
    if (options?.direction) queryParams.direction = options.direction;
    if (options?.limit) queryParams.limit = options.limit.toString();
    if (options?.offset) queryParams.offset = options.offset.toString();

    return this.request<any[]>({
      method: 'GET',
      endpoint: '/cdr',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined
    });
  }

  // ==================== CONNECTION TEST ====================

  /**
   * Test connection using public health endpoint first,
   * then verify authenticated access with trunks endpoint
   */
  async testConnection(): Promise<{
    connected: boolean;
    authenticated: boolean;
    latencyMs?: number;
    error?: string;
    rateLimitInfo?: RateLimitInfo;
    details?: {
      healthCheck: boolean;
      trunksAccess: boolean;
      extensionsAccess: boolean;
    };
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Test public health endpoint (no auth)
      const healthResponse = await this.getHealth();
      const healthCheckPassed = healthResponse.success;

      if (!healthCheckPassed) {
        return {
          connected: false,
          authenticated: false,
          latencyMs: Date.now() - startTime,
          error: healthResponse.error || 'Health check failed - API unreachable'
        };
      }

      // Step 2: Test authenticated access with trunks endpoint
      const trunksResponse = await this.getTrunks();
      const trunksAccessPassed = trunksResponse.success;

      // Step 3: Test extensions endpoint
      const extensionsResponse = await this.getExtensions();
      const extensionsAccessPassed = extensionsResponse.success;

      const latencyMs = Date.now() - startTime;

      // Determine overall status
      const authenticated = trunksAccessPassed || extensionsAccessPassed;

      return {
        connected: true,
        authenticated,
        latencyMs,
        rateLimitInfo: this.getRateLimitInfo(),
        details: {
          healthCheck: healthCheckPassed,
          trunksAccess: trunksAccessPassed,
          extensionsAccess: extensionsAccessPassed
        },
        error: !authenticated 
          ? `Authentication failed: ${trunksResponse.error || extensionsResponse.error}`
          : undefined
      };
    } catch (error) {
      return {
        connected: false,
        authenticated: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : payload.toString())
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check if EDGVoIP is configured for tenant
 */
export async function isEdgvoipConfigured(tenantId: string): Promise<boolean> {
  try {
    await setTenantContext(db, tenantId);

    const [config] = await db.select()
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId))
      .limit(1);

    return !!config && config.enabled && !!config.apiKey;
  } catch (error) {
    logger.error('Failed to check EDGVoIP configuration', { error, tenantId });
    return false;
  }
}

/**
 * Legacy compatibility: Check connection using global env vars
 * @deprecated Use EdgvoipApiClient.fromTenantId() instead
 */
export async function checkEdgvoipConnection(tenantId: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const client = await EdgvoipApiClient.fromTenantId(tenantId);
  
  if (!client) {
    return {
      available: false,
      error: 'EDGVoIP not configured for this tenant'
    };
  }

  const result = await client.testConnection();
  
  return {
    available: result.connected,
    error: result.error
  };
}
