/**
 * EDGVoIP API v2 TypeScript Interfaces
 * 
 * Complete type definitions for all API v2 endpoints:
 * - Stores, Trunks, Extensions (Full CRUD + Sync)
 * - Status Monitoring, Webhooks, API Logs
 * 
 * Authentication: X-API-Key header with scoped permissions
 * Base URL: https://edgvoip.it/api/v2/voip
 */

// ==================== API RESPONSE TYPES ====================

export interface EdgvoipApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  request_id?: string;
  meta?: {
    total: number;
    limit?: number;
    offset?: number;
    timestamp: string;
  };
}

// ==================== TENANT CONFIG ====================

export interface VoipTenantConfig {
  id: string;
  tenantId: string;
  tenantExternalId: string;
  apiKey: string; // Encrypted: sk_live_...
  apiKeyLastFour?: string;
  webhookSecret: string; // For HMAC verification
  apiBaseUrl: string;
  scopes: string[]; // voip:read, voip:write, etc.
  enabled: boolean;
  lastConnectionTest?: Date;
  connectionStatus?: 'connected' | 'error' | 'unknown';
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SIP CONFIG (Trunk) ====================

export interface SipConfig {
  host: string;
  port: number;
  transport: 'udp' | 'tcp' | 'tls';
  username: string;
  password: string;
  realm?: string;
  from_user?: string;
  from_domain?: string;
  register: boolean;
  register_proxy?: string;
  register_transport?: 'udp' | 'tcp' | 'tls';
  retry_seconds: number;
  caller_id_in_from: boolean;
  contact_params?: string;
  ping: boolean;
  ping_time: number;
}

export interface DidConfig {
  number: string;
  country_code: string;
  area_code?: string;
  local_number: string;
  provider_did?: string;
  inbound_route?: string;
}

export interface TrunkSecurity {
  encryption?: 'none' | 'tls' | 'srtp';
  authentication?: 'none' | 'digest' | 'tls';
  acl?: string[];
  rate_limit?: {
    enabled?: boolean;
    calls_per_minute?: number;
    calls_per_hour?: number;
  };
}

export interface TrunkGdpr {
  data_retention_days?: number;
  recording_consent_required?: boolean;
  data_processing_purpose?: string;
  lawful_basis?: 'consent' | 'contract' | 'legitimate_interest';
  data_controller?: string;
  dpo_contact?: string;
}

// ==================== TRUNK ====================

export interface EdgvoipTrunk {
  id: string;
  external_id: string;
  tenant_external_id: string;
  store_id: string;
  name: string;
  provider?: string;
  status: 'active' | 'inactive' | 'testing' | 'error';
  sip_config: SipConfig;
  did_config: DidConfig;
  security?: TrunkSecurity;
  gdpr?: TrunkGdpr;
  codec_preferences?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTrunkRequest {
  tenant_external_id: string;
  external_id?: string; // Auto-generated if not provided
  store_id: string;
  name: string;
  provider?: string;
  sip_config: SipConfig;
  did_config: DidConfig;
  security?: TrunkSecurity;
  gdpr?: TrunkGdpr;
  codec_preferences?: string[];
}

export interface UpdateTrunkRequest {
  name?: string;
  provider?: string;
  sip_config?: Partial<SipConfig>;
  did_config?: Partial<DidConfig>;
  security?: Partial<TrunkSecurity>;
  gdpr?: Partial<TrunkGdpr>;
  codec_preferences?: string[];
}

export interface TrunkSyncRequest {
  tenant_external_id: string;
  force?: boolean;
  trunk_ids?: string[]; // Empty = all
}

export interface TrunkSyncResponse {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: Array<{ trunk_id: string; error: string }>;
  trunks: Array<{
    id: string;
    external_id: string;
    name: string;
    status: string;
  }>;
}

// ==================== EXTENSION ====================

export interface ExtensionSettings {
  voicemail_enabled?: boolean;
  call_forwarding?: {
    enabled: boolean;
    destination?: string;
  };
  recording?: {
    enabled: boolean;
    mode: 'always' | 'on_demand';
  };
}

export interface EdgvoipExtension {
  id: string;
  external_id: string;
  tenant_external_id: string;
  store_id?: string;
  extension: string; // e.g., '2000'
  display_name: string;
  status: 'active' | 'inactive';
  type: 'user' | 'queue' | 'conference';
  settings: ExtensionSettings;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExtensionRequest {
  tenant_external_id: string;
  external_id?: string;
  store_id?: string;
  extension: string;
  display_name: string;
  password: string; // SIP password
  type?: 'user' | 'queue' | 'conference';
  settings?: ExtensionSettings;
}

export interface UpdateExtensionRequest {
  display_name?: string;
  password?: string;
  type?: 'user' | 'queue' | 'conference';
  settings?: Partial<ExtensionSettings>;
}

export interface ExtensionSyncRequest {
  tenant_external_id: string;
  force?: boolean;
  extension_ids?: string[]; // Empty = all
}

export interface ExtensionSyncResponse {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: Array<{ extension_id: string; error: string }>;
  extensions: Array<{
    id: string;
    external_id: string;
    extension: string;
    display_name: string;
    status: string;
  }>;
}

// ==================== STATUS MONITORING ====================

export interface TrunkStatus {
  id: string;
  external_id: string;
  name: string;
  status: 'registered' | 'unregistered' | 'failed' | 'unknown';
  registration_status: string;
  health_status: 'active' | 'inactive' | 'degraded';
  current_calls: number;
  max_concurrent_calls: number;
  last_check: string;
  last_successful_registration?: string;
}

export interface ExtensionStatus {
  id: string;
  external_id: string;
  extension: string;
  display_name: string;
  status: 'registered' | 'unregistered';
  connection_type: 'sip' | 'wss' | 'webrtc';
  last_seen?: string;
  registration?: {
    ip: string;
    port: number;
    type: string;
  };
}

// ==================== API LOGS ====================

export interface ApiLog {
  id: string;
  tenant_id: string;
  api_key_id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  request_id: string;
  status_code: number;
  status: 'success' | 'error' | 'warning';
  request_body?: Record<string, any>;
  response_body?: Record<string, any>;
  error_message?: string;
  error_code?: string;
  execution_time_ms: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface ApiLogStats {
  total_requests: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  avg_execution_time_ms: number;
  success_rate: number;
}

// ==================== WEBHOOKS ====================

export interface WebhookConfig {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  enabled: boolean;
  retry_count: number;
  timeout_ms: number;
  headers?: Record<string, string>;
  failed_attempts_count: number;
  circuit_breaker_until?: string;
  created_at: string;
  updated_at: string;
}

export type WebhookEventType = 
  | 'call.start'
  | 'call.ringing'
  | 'call.answered'
  | 'call.hold'
  | 'call.unhold'
  | 'call.transfer'
  | 'call.ended'
  | 'trunk.status'
  | 'extension.status'
  | 'api.error';

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  retry_count?: number;
  timeout_ms?: number;
  headers?: Record<string, string>;
}

export interface WebhookDelivery {
  id: string;
  webhook_config_id: string;
  event_type: WebhookEventType;
  payload: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
  status_code?: number;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  delivered_at?: string;
  created_at: string;
}

// ==================== WEBHOOK EVENT PAYLOADS ====================

export interface WebhookEventBase {
  type: WebhookEventType;
  tenant_id: string;
  tenant_external_id: string;
  timestamp: string;
}

export interface CallStartEvent extends WebhookEventBase {
  type: 'call.start';
  data: {
    call_uuid: string;
    caller_id_number: string;
    caller_id_name: string;
    destination_number: string;
    call_direction: 'inbound' | 'outbound';
    context: string;
  };
}

export interface CallAnsweredEvent extends WebhookEventBase {
  type: 'call.answered';
  data: {
    call_uuid: string;
    caller_id_number: string;
    caller_id_name: string;
    destination_number: string;
    call_direction: 'inbound' | 'outbound';
  };
}

export interface CallEndedEvent extends WebhookEventBase {
  type: 'call.ended';
  data: {
    call_uuid: string;
    call_direction: 'inbound' | 'outbound';
    caller_id_number: string;
    destination_number: string;
    start_time: string;
    answer_time?: string;
    end_time: string;
    duration: number;
    bill_sec: number;
    hangup_cause: string;
    hangup_disposition: 'answered' | 'no_answer' | 'busy' | 'failed';
  };
}

export interface TrunkStatusEvent extends WebhookEventBase {
  type: 'trunk.status';
  data: {
    trunk_id: string;
    trunk_name: string;
    previous_status: string;
    current_status: string;
  };
}

export interface ExtensionStatusEvent extends WebhookEventBase {
  type: 'extension.status';
  data: {
    extension_id: string;
    extension: string;
    previous_status: string;
    current_status: string;
    connection_type: string;
    registration_ip?: string;
    registration_port?: number;
  };
}

export interface ApiErrorEvent extends WebhookEventBase {
  type: 'api.error';
  data: {
    request_id: string;
    endpoint: string;
    method: string;
    status_code: number;
    error_code: string;
    error_message: string;
    api_key_id: string;
  };
}

export type WebhookEvent = 
  | CallStartEvent
  | CallAnsweredEvent
  | CallEndedEvent
  | TrunkStatusEvent
  | ExtensionStatusEvent
  | ApiErrorEvent;

// ==================== STORES (Read-only) ====================

export interface EdgvoipStore {
  id: string;
  external_id: string;
  tenant_external_id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface StoreSyncRequest {
  tenant_external_id: string;
  force?: boolean;
}

export interface StoreSyncResponse {
  success: boolean;
  synced: number;
  stores: EdgvoipStore[];
}

// ==================== RATE LIMITING ====================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

// ==================== ERROR CODES ====================

export type EdgvoipErrorCode =
  | 'VALIDATION_ERROR'
  | 'STORE_NOT_FOUND'
  | 'TRUNK_NOT_FOUND'
  | 'EXTENSION_NOT_FOUND'
  | 'DUPLICATE_EXTERNAL_ID'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MISSING_API_KEY_CONTEXT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';
