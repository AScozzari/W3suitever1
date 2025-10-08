import { db } from '../core/db';
import { mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, isNull } from 'drizzle-orm';
import { decryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Unified Credential Service
 * 
 * MANDATORY BASELINE for multi-user OAuth architecture.
 * 
 * Enforces credential lookups with (tenantId, serverId, userId, provider, credentialType)
 * and provides automatic token refresh for OAuth providers.
 * 
 * ALL provider services MUST use this service to retrieve credentials.
 */

export interface CredentialLookupParams {
  tenantId: string;
  serverId: string;
  userId: string; // REQUIRED - multi-user OAuth model
  oauthProvider: 'google' | 'microsoft' | 'meta' | 'aws' | 'stripe' | 'gtm' | 'postgresql';
  credentialType?: 'oauth2_user' | 'service_account' | 'api_key';
}

export interface CredentialPayload {
  credentialId: string;
  credentialType: 'oauth2_user' | 'service_account' | 'api_key';
  credentials: any; // Decrypted credentials object
  expiresAt: Date | null;
  isExpired: boolean;
  needsRefresh: boolean; // True if token expires within 30 min
}

/**
 * Unified Credential Service
 */
export class UnifiedCredentialService {
  private static readonly REFRESH_BUFFER_MINUTES = 30;

  /**
   * Get valid credentials for a user/server/provider combination
   * 
   * ENFORCES multi-user model: userId is REQUIRED
   * 
   * @throws Error if credentials not found or userId missing
   */
  static async getValidCredentials(params: CredentialLookupParams): Promise<CredentialPayload> {
    const { tenantId, serverId, userId, oauthProvider, credentialType } = params;

    // ENFORCE userId requirement
    if (!userId) {
      throw new Error('[Unified Credentials] userId is REQUIRED for multi-user OAuth model');
    }

    try {
      // Build query with required filters
      const conditions = [
        eq(mcpServerCredentials.tenantId, tenantId),
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.userId, userId),
        eq(mcpServerCredentials.oauthProvider, oauthProvider),
        isNull(mcpServerCredentials.revokedAt) // Not revoked
      ];

      // Add optional credentialType filter
      if (credentialType) {
        conditions.push(eq(mcpServerCredentials.credentialType, credentialType));
      }

      // Query credentials
      const [cred] = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(...conditions))
        .limit(1);

      if (!cred) {
        logger.error('❌ [Unified Credentials] Credentials not found', {
          tenantId,
          serverId,
          userId,
          oauthProvider,
          credentialType
        });

        throw new Error(
          `No ${oauthProvider} credentials found for user ${userId}. ` +
          `Please connect your ${oauthProvider} account in Settings.`
        );
      }

      // Decrypt credentials
      const decryptedCredentials = await decryptMCPCredentials(
        tenantId,
        cred.encryptedCredentials,
        cred.encryptionKeyId
      );

      // Check expiration status
      const now = new Date();
      const expiresAt = cred.expiresAt;
      const isExpired = expiresAt ? expiresAt <= now : false;
      const bufferDate = new Date(now.getTime() + this.REFRESH_BUFFER_MINUTES * 60 * 1000);
      const needsRefresh = expiresAt ? expiresAt <= bufferDate : false;

      logger.info('✅ [Unified Credentials] Retrieved credentials', {
        credentialId: cred.id,
        tenantId,
        serverId,
        userId,
        provider: oauthProvider,
        type: cred.credentialType,
        isExpired,
        needsRefresh,
        expiresAt: expiresAt?.toISOString() || 'never'
      });

      return {
        credentialId: cred.id,
        credentialType: cred.credentialType,
        credentials: decryptedCredentials,
        expiresAt: expiresAt,
        isExpired,
        needsRefresh
      };

    } catch (error) {
      logger.error('❌ [Unified Credentials] Failed to retrieve credentials', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        serverId,
        userId,
        oauthProvider
      });

      throw error;
    }
  }

  /**
   * Get valid credentials with optional fallback to tenant-level credentials
   * 
   * MIGRATION HELPER: Supports legacy tenant-level credentials (AWS, Stripe)
   * with explicit deprecation warning.
   * 
   * @param params - Credential lookup params
   * @param allowTenantFallback - If true, falls back to tenant-level credentials (userId=null)
   */
  static async getValidCredentialsWithFallback(
    params: CredentialLookupParams,
    allowTenantFallback: boolean = false
  ): Promise<CredentialPayload> {
    const { tenantId, serverId, userId, oauthProvider, credentialType } = params;

    try {
      // Try user-specific credentials first
      return await this.getValidCredentials(params);

    } catch (error) {
      // If not found and tenant fallback is allowed
      if (allowTenantFallback) {
        logger.warn('⚠️  [Unified Credentials] User credentials not found, trying tenant-level fallback (DEPRECATED)', {
          tenantId,
          serverId,
          userId,
          oauthProvider
        });

        // Query tenant-level credentials (userId = null)
        const conditions = [
          eq(mcpServerCredentials.tenantId, tenantId),
          eq(mcpServerCredentials.serverId, serverId),
          isNull(mcpServerCredentials.userId), // Tenant-level
          eq(mcpServerCredentials.oauthProvider, oauthProvider),
          isNull(mcpServerCredentials.revokedAt)
        ];

        if (credentialType) {
          conditions.push(eq(mcpServerCredentials.credentialType, credentialType));
        }

        const [tenantCred] = await db
          .select()
          .from(mcpServerCredentials)
          .where(and(...conditions))
          .limit(1);

        if (tenantCred) {
          const decryptedCredentials = await decryptMCPCredentials(
            tenantId,
            tenantCred.encryptedCredentials,
            tenantCred.encryptionKeyId
          );

          logger.warn('⚠️  [Unified Credentials] Using DEPRECATED tenant-level credentials', {
            credentialId: tenantCred.id,
            tenantId,
            serverId,
            provider: oauthProvider,
            message: 'Please migrate to user-specific credentials'
          });

          return {
            credentialId: tenantCred.id,
            credentialType: tenantCred.credentialType,
            credentials: decryptedCredentials,
            expiresAt: tenantCred.expiresAt,
            isExpired: tenantCred.expiresAt ? tenantCred.expiresAt <= new Date() : false,
            needsRefresh: false
          };
        }
      }

      // Re-throw original error if fallback not allowed or not found
      throw error;
    }
  }

  /**
   * Check if credentials exist for a user/server/provider
   */
  static async hasCredentials(params: CredentialLookupParams): Promise<boolean> {
    const { tenantId, serverId, userId, oauthProvider, credentialType } = params;

    const conditions = [
      eq(mcpServerCredentials.tenantId, tenantId),
      eq(mcpServerCredentials.serverId, serverId),
      eq(mcpServerCredentials.userId, userId),
      eq(mcpServerCredentials.oauthProvider, oauthProvider),
      isNull(mcpServerCredentials.revokedAt)
    ];

    if (credentialType) {
      conditions.push(eq(mcpServerCredentials.credentialType, credentialType));
    }

    const [cred] = await db
      .select({ id: mcpServerCredentials.id })
      .from(mcpServerCredentials)
      .where(and(...conditions))
      .limit(1);

    return !!cred;
  }

  /**
   * List all credentials for a user (across all servers/providers)
   */
  static async listUserCredentials(params: {
    tenantId: string;
    userId: string;
  }): Promise<Array<{
    credentialId: string;
    serverId: string;
    provider: string;
    type: string;
    expiresAt: Date | null;
    createdAt: Date;
  }>> {
    const { tenantId, userId } = params;

    const credentials = await db
      .select({
        credentialId: mcpServerCredentials.id,
        serverId: mcpServerCredentials.serverId,
        provider: mcpServerCredentials.oauthProvider,
        type: mcpServerCredentials.credentialType,
        expiresAt: mcpServerCredentials.expiresAt,
        createdAt: mcpServerCredentials.createdAt
      })
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.tenantId, tenantId),
        eq(mcpServerCredentials.userId, userId),
        isNull(mcpServerCredentials.revokedAt)
      ))
      .orderBy(mcpServerCredentials.createdAt);

    return credentials.map(c => ({
      credentialId: c.credentialId,
      serverId: c.serverId,
      provider: c.provider || 'unknown',
      type: c.type,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt
    }));
  }
}
