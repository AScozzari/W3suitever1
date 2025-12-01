/**
 * EDGVoIP Integration Module
 * 
 * Complete integration with EDGVoIP API v2 for VoIP management.
 * 
 * Features:
 * - Per-tenant API key authentication (X-API-Key)
 * - Full CRUD for Trunks and Extensions
 * - Bidirectional sync with EDGVoIP
 * - Real-time status monitoring
 * - Webhook event handling
 * - API logs and statistics
 * 
 * Usage:
 * ```typescript
 * import { EdgvoipApiClient, trunksService, extensionsService } from '@/integrations/edgvoip';
 * 
 * // Create client from tenant config
 * const client = await EdgvoipApiClient.fromTenantId(tenantId);
 * 
 * // Or use services directly
 * const result = await trunksService.createTrunk(tenantId, trunkData);
 * ```
 */

// API Client
export { 
  EdgvoipApiClient,
  verifyWebhookSignature,
  isEdgvoipConfigured,
  checkEdgvoipConnection
} from './api-client';

// Trunks Service
export * as trunksService from './trunks.service';
export {
  getLocalTrunks,
  createTrunk,
  updateTrunk,
  deleteTrunk,
  syncTrunksWithEdgvoip,
  pushLocalTrunksToEdgvoip,
  getTrunkRegistrationStatuses,
  getTrunkRegistrationStatus,
  type TrunkSyncResult,
  type LocalTrunk
} from './trunks.service';

// Extensions Service
export * as extensionsService from './extensions.service';
export {
  getLocalExtensions,
  createExtension,
  updateExtension,
  deleteExtension,
  resetExtensionPassword,
  syncExtensionsWithEdgvoip,
  pushLocalExtensionsToEdgvoip,
  getUserCredentials,
  generateSIPPassword,
  getExtensionRegistrationStatuses,
  getExtensionRegistrationStatus,
  type ExtensionSyncResult,
  type LocalExtension,
  type SIPCredentials
} from './extensions.service';

// Webhooks Handler
export {
  handleWebhookEvent,
  processWebhook,
  verifySignature,
  getWebhookSecret,
  type WebhookHandlerResult
} from './webhooks.handler';

// Types
export * from './types';
