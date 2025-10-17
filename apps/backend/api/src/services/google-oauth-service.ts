import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { encryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Google OAuth Service
 * Gestisce OAuth2 flow per Google Workspace MCP server
 */
export class GoogleOAuthService {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.publish'
  ];

  /**
   * Get OAuth2 client for Google Workspace
   */
  private static async getOAuth2Client(redirectUri: string, tenantId: string): Promise<OAuth2Client> {
    // First try to get credentials from database
    const configServer = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'google-workspace-oauth-config'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (configServer.length > 0) {
      // Get credentials from database
      const [creds] = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, configServer[0].id),
          eq(mcpServerCredentials.tenantId, tenantId),
          sql`revoked_at IS NULL`
        ))
        .limit(1);

      if (creds) {
        // Decrypt credentials
        const { decryptMCPCredentials } = await import('./mcp-credential-encryption');
        const decrypted = await decryptMCPCredentials(
          tenantId,
          creds.encryptedCredentials,
          creds.encryptionKeyId
        );

        clientId = decrypted.client_id;
        clientSecret = decrypted.client_secret;
      }
    }

    // Fallback to environment variables if not in database
    if (!clientId || !clientSecret) {
      clientId = process.env.GOOGLE_CLIENT_ID;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    }

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured. Please configure Client ID and Secret in MCP Settings');
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate authorization URL to start OAuth flow
   */
  static async generateAuthUrl(params: {
    serverId: string;
    tenantId: string;
    redirectUri: string;
    state?: string;
  }): Promise<string> {
    const { redirectUri, state, tenantId } = params;

    const oauth2Client = await this.getOAuth2Client(redirectUri, tenantId);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: this.SCOPES,
      prompt: 'consent', // Force consent screen to always get refresh token
      state: state || '', // CSRF protection - pass serverId + tenantId
      include_granted_scopes: true // Incremental authorization
    });

    logger.info('🔐 [Google OAuth] Generated auth URL', {
      serverId: params.serverId,
      tenantId: params.tenantId,
      scopes: this.SCOPES.length
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens and store encrypted
   */
  static async handleCallback(params: {
    code: string;
    serverId: string;
    tenantId: string;
    userId: string;
    redirectUri: string;
  }): Promise<{
    success: boolean;
    message: string;
    credentialId?: string;
  }> {
    const { code, serverId, tenantId, userId, redirectUri } = params;

    try {
      // Verify server exists
      const [server] = await db
        .select()
        .from(mcpServers)
        .where(and(
          eq(mcpServers.id, serverId),
          eq(mcpServers.tenantId, tenantId)
        ))
        .limit(1);

      if (!server) {
        throw new Error(`MCP server ${serverId} not found for tenant ${tenantId}`);
      }

      // Exchange code for tokens
      const oauth2Client = await this.getOAuth2Client(redirectUri, tenantId);
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      logger.info('✅ [Google OAuth] Tokens received', {
        serverId,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'unknown'
      });

      // Prepare credentials object
      const credentials = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || null,
        scope: tokens.scope || this.SCOPES.join(' ')
      };

      // Encrypt credentials using two-level key derivation (FIXED parameter order)
      const { encryptedData, keyId } = await encryptMCPCredentials(
        credentials,  // First: data to encrypt
        tenantId      // Second: tenant ID for key derivation
      );

      // Check if credentials already exist for this user/server/provider
      const existingCreds = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId),
          eq(mcpServerCredentials.userId, userId),
          eq(mcpServerCredentials.oauthProvider, 'google')
        ))
        .limit(1);

      let credentialId: string;

      if (existingCreds.length > 0) {
        // Update existing credentials
        await db
          .update(mcpServerCredentials)
          .set({
            encryptedCredentials: encryptedData,
            encryptionKeyId: keyId,
            tokenType: credentials.token_type,
            scope: credentials.scope,
            updatedAt: new Date(),
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            revokedAt: null // Clear revoked status on re-auth
          })
          .where(eq(mcpServerCredentials.id, existingCreds[0].id));

        credentialId = existingCreds[0].id;

        logger.info('🔄 [Google OAuth] Updated existing credentials', {
          credentialId,
          serverId,
          userId
        });
      } else {
        // Insert new credentials with multi-user support
        const [newCred] = await db
          .insert(mcpServerCredentials)
          .values({
            tenantId,
            serverId,
            userId, // Multi-user OAuth support
            oauthProvider: 'google', // Provider identification
            credentialType: 'oauth2_user', // New credential type
            encryptedCredentials: encryptedData,
            encryptionKeyId: keyId,
            tokenType: credentials.token_type,
            scope: credentials.scope,
            createdBy: userId,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
          })
          .returning({ id: mcpServerCredentials.id });

        credentialId = newCred.id;

        logger.info('✨ [Google OAuth] Created new credentials', {
          credentialId,
          serverId,
          userId,
          provider: 'google'
        });
      }

      // Update server status to active
      await db
        .update(mcpServers)
        .set({
          status: 'active',
          lastHealthCheck: new Date(),
          errorCount: 0,
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(mcpServers.id, serverId));

      return {
        success: true,
        message: 'Google Workspace OAuth successful - server configured',
        credentialId
      };

    } catch (error) {
      logger.error('❌ [Google OAuth] Callback failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      // Update server status to error
      await db
        .update(mcpServers)
        .set({
          status: 'error',
          lastError: error instanceof Error ? error.message : 'OAuth callback failed',
          errorCount: sql`${mcpServers.errorCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(mcpServers.id, serverId))
        .catch(() => {
          // Ignore update errors during error handling
        });

      throw error;
    }
  }

  /**
   * Refresh access token using stored refresh token
   */
  static async refreshAccessToken(params: {
    serverId: string;
    tenantId: string;
    currentCredentials: any;
  }): Promise<any> {
    const { serverId, tenantId, currentCredentials } = params;

    if (!currentCredentials.refresh_token) {
      throw new Error('No refresh token available - user must re-authorize');
    }

    try {
      // Get fresh access token
      const oauth2Client = this.getOAuth2Client(''); // No redirect needed for refresh
      oauth2Client.setCredentials({
        refresh_token: currentCredentials.refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      logger.info('🔄 [Google OAuth] Token refreshed', {
        serverId,
        tenantId,
        expiresIn: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown'
      });

      // Return updated credentials (keep original refresh token)
      return {
        access_token: credentials.access_token,
        refresh_token: currentCredentials.refresh_token, // Keep original
        token_type: credentials.token_type || 'Bearer',
        expiry_date: credentials.expiry_date,
        scope: credentials.scope || currentCredentials.scope
      };

    } catch (error) {
      logger.error('❌ [Google OAuth] Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      throw new Error('Token refresh failed - user must re-authorize');
    }
  }

  /**
   * Get valid access token for a specific user (multi-user OAuth)
   * 
   * UNIFIED PATTERN: Uses UnifiedCredentialService for credential retrieval
   * Auto-refreshes if token is expired or expiring soon
   * 
   * @param params - Must include userId for multi-user support
   * @returns Valid access token (refreshed if needed)
   */
  static async getValidAccessToken(params: {
    serverId: string;
    tenantId: string;
    userId: string; // REQUIRED for multi-user OAuth
  }): Promise<string> {
    const { serverId, tenantId, userId } = params;

    // ENFORCE userId requirement
    if (!userId) {
      throw new Error('[Google OAuth] userId is REQUIRED for multi-user OAuth model');
    }

    try {
      // Use unified credential service
      const { UnifiedCredentialService } = await import('./unified-credential-service');
      
      const credentialPayload = await UnifiedCredentialService.getValidCredentials({
        tenantId,
        serverId,
        userId,
        oauthProvider: 'google',
        credentialType: 'oauth2_user'
      });

      const currentCredentials = credentialPayload.credentials;

      // Check if token needs refresh (within 5 minutes buffer)
      if (credentialPayload.needsRefresh || credentialPayload.isExpired) {
        logger.info('⏰ [Google OAuth] Token expired or expiring soon, refreshing...', {
          expiresAt: credentialPayload.expiresAt?.toISOString() || 'unknown',
          serverId,
          userId
        });

        // Refresh token
        const refreshedCredentials = await this.refreshAccessToken({
          serverId,
          tenantId,
          currentCredentials
        });

        // Update credentials in database
        await this.updateStoredCredentials({
          credentialId: credentialPayload.credentialId,
          tenantId,
          credentials: refreshedCredentials
        });

        return refreshedCredentials.access_token;
      }

      return currentCredentials.access_token;

    } catch (error) {
      logger.error('❌ [Google OAuth] Failed to get valid access token', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId,
        userId
      });

      throw error;
    }
  }

  /**
   * Update stored credentials after token refresh
   */
  private static async updateStoredCredentials(params: {
    credentialId: string;
    tenantId: string;
    credentials: any;
  }): Promise<void> {
    const { credentialId, tenantId, credentials } = params;

    try {
      const { encryptMCPCredentials } = await import('./mcp-credential-encryption');

      // Re-encrypt updated credentials (FIXED parameter order)
      const { encryptedData, keyId } = await encryptMCPCredentials(
        credentials,  // First: data to encrypt
        tenantId      // Second: tenant ID for key derivation
      );

      // Update database
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, credentialId));

      logger.info('✅ [Google OAuth] Updated stored credentials after refresh', {
        credentialId
      });

    } catch (error) {
      logger.error('❌ [Google OAuth] Failed to update stored credentials', {
        error: error instanceof Error ? error.message : String(error),
        credentialId
      });

      throw error;
    }
  }

  /**
   * Revoke Google OAuth access
   */
  static async revokeAccess(accessToken: string): Promise<void> {
    try {
      const oauth2Client = this.getOAuth2Client('');
      await oauth2Client.revokeToken(accessToken);

      logger.info('🔒 [Google OAuth] Access revoked successfully');
    } catch (error) {
      logger.error('❌ [Google OAuth] Revoke failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
