import { db } from '../core/db';
import { mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, or, lt, isNull, sql } from 'drizzle-orm';
import { GoogleOAuthService } from './google-oauth-service';
import { MicrosoftOAuthService } from './microsoft-oauth-service';
import { MetaOAuthService } from './meta-oauth-service';
import { decryptMCPCredentials, encryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Automatic Token Refresh Service
 * Monitors and refreshes expiring OAuth2 tokens for all providers
 */
export class TokenRefreshService {
  private static readonly REFRESH_BUFFER_MINUTES = 30; // Refresh tokens 30 minutes before expiry
  private static readonly BATCH_SIZE = 50; // Process 50 credentials at a time
  private static isRunning = false;

  /**
   * Start automatic token refresh monitoring
   * Runs periodically to check and refresh expiring tokens
   */
  static startMonitoring(intervalMinutes: number = 15): NodeJS.Timeout {
    logger.info('🔄 [Token Refresh] Starting automatic token refresh monitoring', {
      intervalMinutes,
      refreshBufferMinutes: this.REFRESH_BUFFER_MINUTES
    });

    // Run immediately on start
    this.runRefreshCycle().catch((error) => {
      logger.error('❌ [Token Refresh] Initial refresh cycle failed', { error });
    });

    // Then run periodically
    return setInterval(async () => {
      if (this.isRunning) {
        logger.warn('⏭️ [Token Refresh] Previous cycle still running, skipping');
        return;
      }

      await this.runRefreshCycle().catch((error) => {
        logger.error('❌ [Token Refresh] Refresh cycle failed', { error });
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Run a single refresh cycle
   * Finds expiring tokens and refreshes them
   */
  private static async runRefreshCycle(): Promise<void> {
    const startTime = Date.now();
    
    // Use try-finally to ALWAYS reset isRunning flag
    try {
      this.isRunning = true;
      
      logger.info('🔍 [Token Refresh] Starting refresh cycle');

      // Find credentials that need refresh (expiring soon or expired)
      const bufferDate = new Date(Date.now() + this.REFRESH_BUFFER_MINUTES * 60 * 1000);
      
      const expiringCredentials = await db
        .select()
        .from(mcpServerCredentials)
        .where(
          and(
            // Only OAuth2 credentials
            eq(mcpServerCredentials.credentialType, 'oauth2_user'),
            // Not revoked
            isNull(mcpServerCredentials.revokedAt),
            // Has expiration date
            or(
              // Expiring soon or expired
              lt(mcpServerCredentials.expiresAt, bufferDate),
              // Or no expiration date set (refresh anyway)
              isNull(mcpServerCredentials.expiresAt)
            )
          )
        )
        .limit(this.BATCH_SIZE);

      logger.info('📋 [Token Refresh] Found credentials to refresh', {
        count: expiringCredentials.length,
        bufferMinutes: this.REFRESH_BUFFER_MINUTES
      });

      if (expiringCredentials.length === 0) {
        logger.info('✅ [Token Refresh] No tokens need refresh');
        // Early return is safe now - finally block will reset isRunning
        return;
      }

      // Process each credential
      const results = {
        success: 0,
        failed: 0,
        revoked: 0,
        skipped: 0
      };

      for (const credential of expiringCredentials) {
        try {
          await this.refreshCredential(credential);
          results.success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if token was revoked or user needs to re-authorize
          if (errorMessage.includes('revoked') || errorMessage.includes('re-authorize')) {
            await this.markAsRevoked(credential.id, errorMessage);
            results.revoked++;
          } else {
            logger.error('❌ [Token Refresh] Failed to refresh credential', {
              credentialId: credential.id,
              provider: credential.oauthProvider,
              error: errorMessage
            });
            results.failed++;
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info('✅ [Token Refresh] Cycle completed', {
        duration: `${duration}ms`,
        ...results,
        total: expiringCredentials.length
      });

    } finally {
      // CRITICAL: Always reset isRunning flag, even on early return
      this.isRunning = false;
    }
  }

  /**
   * Refresh a single credential based on its provider
   */
  private static async refreshCredential(credential: any): Promise<void> {
    const { id, serverId, tenantId, userId, oauthProvider, encryptedCredentials, encryptionKeyId } = credential;

    logger.info('🔄 [Token Refresh] Refreshing credential', {
      credentialId: id,
      provider: oauthProvider,
      serverId,
      userId
    });

    // Decrypt current credentials
    const decryptedCreds = await decryptMCPCredentials(
      tenantId,
      encryptedCredentials,
      encryptionKeyId
    );

    // Refresh based on provider
    let refreshedCreds: any;

    switch (oauthProvider) {
      case 'google':
        refreshedCreds = await GoogleOAuthService.refreshAccessToken({
          serverId,
          tenantId,
          currentCredentials: decryptedCreds
        });
        break;

      case 'microsoft':
        refreshedCreds = await MicrosoftOAuthService.refreshAccessToken({
          serverId,
          tenantId,
          currentCredentials: decryptedCreds
        });
        break;

      case 'meta':
        refreshedCreds = await MetaOAuthService.refreshAccessToken({
          serverId,
          tenantId,
          currentCredentials: decryptedCreds
        });
        break;

      default:
        throw new Error(`Unknown OAuth provider: ${oauthProvider}`);
    }

    // Re-encrypt updated credentials
    const { encryptedData, keyId } = await encryptMCPCredentials(
      tenantId,
      refreshedCreds
    );

    // Update in database
    await db
      .update(mcpServerCredentials)
      .set({
        encryptedCredentials: encryptedData,
        encryptionKeyId: keyId,
        expiresAt: refreshedCreds.expiry_date ? new Date(refreshedCreds.expiry_date) : null,
        updatedAt: new Date()
      })
      .where(eq(mcpServerCredentials.id, id));

    logger.info('✅ [Token Refresh] Credential refreshed successfully', {
      credentialId: id,
      provider: oauthProvider,
      expiresAt: refreshedCreds.expiry_date ? new Date(refreshedCreds.expiry_date).toISOString() : 'unknown'
    });
  }

  /**
   * Mark a credential as revoked when refresh fails permanently
   */
  private static async markAsRevoked(credentialId: string, reason: string): Promise<void> {
    await db
      .update(mcpServerCredentials)
      .set({
        revokedAt: new Date(),
        lastError: reason,
        updatedAt: new Date()
      })
      .where(eq(mcpServerCredentials.id, credentialId));

    logger.warn('🔒 [Token Refresh] Credential marked as revoked', {
      credentialId,
      reason
    });
  }

  /**
   * Manually trigger refresh for a specific credential
   */
  static async refreshCredentialById(credentialId: string): Promise<void> {
    const [credential] = await db
      .select()
      .from(mcpServerCredentials)
      .where(eq(mcpServerCredentials.id, credentialId))
      .limit(1);

    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    if (credential.credentialType !== 'oauth2_user') {
      throw new Error('Only OAuth2 credentials can be refreshed');
    }

    if (credential.revokedAt) {
      throw new Error('Cannot refresh revoked credentials - user must re-authorize');
    }

    await this.refreshCredential(credential);
  }

  /**
   * Get refresh status for monitoring dashboard
   */
  static async getRefreshStatus(): Promise<{
    expiringWithin30Min: number;
    expiringWithin1Hour: number;
    expiringWithin24Hours: number;
    revoked: number;
    healthy: number;
  }> {
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Count expiring tokens
    const [expiringWithin30Min] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mcpServerCredentials)
      .where(
        and(
          eq(mcpServerCredentials.credentialType, 'oauth2_user'),
          isNull(mcpServerCredentials.revokedAt),
          lt(mcpServerCredentials.expiresAt, in30Min)
        )
      );

    const [expiringWithin1Hour] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mcpServerCredentials)
      .where(
        and(
          eq(mcpServerCredentials.credentialType, 'oauth2_user'),
          isNull(mcpServerCredentials.revokedAt),
          lt(mcpServerCredentials.expiresAt, in1Hour)
        )
      );

    const [expiringWithin24Hours] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mcpServerCredentials)
      .where(
        and(
          eq(mcpServerCredentials.credentialType, 'oauth2_user'),
          isNull(mcpServerCredentials.revokedAt),
          lt(mcpServerCredentials.expiresAt, in24Hours)
        )
      );

    const [revoked] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mcpServerCredentials)
      .where(
        and(
          eq(mcpServerCredentials.credentialType, 'oauth2_user'),
          sql`${mcpServerCredentials.revokedAt} IS NOT NULL`
        )
      );

    const [healthy] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mcpServerCredentials)
      .where(
        and(
          eq(mcpServerCredentials.credentialType, 'oauth2_user'),
          isNull(mcpServerCredentials.revokedAt),
          or(
            sql`${mcpServerCredentials.expiresAt} > ${in24Hours}`,
            isNull(mcpServerCredentials.expiresAt)
          )
        )
      );

    return {
      expiringWithin30Min: Number(expiringWithin30Min?.count || 0),
      expiringWithin1Hour: Number(expiringWithin1Hour?.count || 0),
      expiringWithin24Hours: Number(expiringWithin24Hours?.count || 0),
      revoked: Number(revoked?.count || 0),
      healthy: Number(healthy?.count || 0)
    };
  }
}
