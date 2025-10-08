import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { encryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Microsoft 365 OAuth Service
 * Gestisce OAuth2 flow per Microsoft Graph API (Teams, Outlook, OneDrive)
 */
export class MicrosoftOAuthService {
  private static readonly SCOPES = [
    'offline_access', // Required for refresh tokens
    'User.Read',
    'Mail.Read',
    'Mail.Send',
    'Mail.ReadWrite',
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Files.Read.All',
    'Files.ReadWrite.All',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'ChannelMessage.Read.All',
    'Chat.Read',
    'Chat.ReadWrite'
  ];

  private static readonly AUTHORITY = 'https://login.microsoftonline.com/common';
  private static readonly TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  private static readonly AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

  /**
   * Get App credentials from environment
   */
  private static getAppCredentials(): { clientId: string; clientSecret: string } {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET');
    }

    return { clientId, clientSecret };
  }

  /**
   * Generate authorization URL to start OAuth flow
   */
  static generateAuthUrl(params: {
    serverId: string;
    tenantId: string;
    redirectUri: string;
    state?: string;
  }): string {
    const { redirectUri, state } = params;
    const { clientId } = this.getAppCredentials();

    const authUrl = new URL(this.AUTHORIZE_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.SCOPES.join(' '));
    authUrl.searchParams.set('state', state || ''); // CSRF protection
    authUrl.searchParams.set('response_mode', 'query');

    logger.info('🔐 [Microsoft OAuth] Generated auth URL', {
      serverId: params.serverId,
      tenantId: params.tenantId,
      scopes: this.SCOPES.length
    });

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  private static async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }> {
    const { clientId, clientSecret } = this.getAppCredentials();

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token exchange failed: ${error}`);
    }

    return await response.json();
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
      const tokenResponse = await this.exchangeCodeForToken(code, redirectUri);

      const expiryDate = Date.now() + (tokenResponse.expires_in * 1000);

      logger.info('✅ [Microsoft OAuth] Tokens received', {
        serverId,
        hasRefreshToken: !!tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        expiryDate: new Date(expiryDate).toISOString()
      });

      // Prepare credentials object
      const credentials = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        token_type: tokenResponse.token_type || 'Bearer',
        expiry_date: expiryDate,
        scope: tokenResponse.scope || this.SCOPES.join(' ')
      };

      // Encrypt credentials using two-level key derivation
      const { encryptedData, keyId } = await encryptMCPCredentials(
        tenantId,
        credentials
      );

      // Check if credentials already exist for this user/server/provider
      const existingCreds = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId),
          eq(mcpServerCredentials.userId, userId),
          eq(mcpServerCredentials.oauthProvider, 'microsoft')
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
            expiresAt: new Date(expiryDate),
            revokedAt: null
          })
          .where(eq(mcpServerCredentials.id, existingCreds[0].id));

        credentialId = existingCreds[0].id;

        logger.info('🔄 [Microsoft OAuth] Updated existing credentials', {
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
            userId,
            oauthProvider: 'microsoft',
            credentialType: 'oauth2_user',
            encryptedCredentials: encryptedData,
            encryptionKeyId: keyId,
            tokenType: credentials.token_type,
            scope: credentials.scope,
            createdBy: userId,
            expiresAt: new Date(expiryDate)
          })
          .returning({ id: mcpServerCredentials.id });

        credentialId = newCred.id;

        logger.info('✨ [Microsoft OAuth] Created new credentials', {
          credentialId,
          serverId
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
        message: 'Microsoft 365 OAuth successful - server configured',
        credentialId
      };

    } catch (error) {
      logger.error('❌ [Microsoft OAuth] Callback failed', {
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
   * Refresh access token using stored refresh token and persist to database
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
      const { clientId, clientSecret } = this.getAppCredentials();

      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: currentCredentials.refresh_token,
        grant_type: 'refresh_token'
      });

      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${await response.text()}`);
      }

      const tokenResponse = await response.json();
      const expiryDate = Date.now() + (tokenResponse.expires_in * 1000);

      // Prepare updated credentials (keep original refresh token if not provided)
      const updatedCredentials = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || currentCredentials.refresh_token,
        token_type: tokenResponse.token_type || 'Bearer',
        expiry_date: expiryDate,
        scope: tokenResponse.scope || currentCredentials.scope
      };

      logger.info('🔄 [Microsoft OAuth] Token refreshed', {
        serverId,
        tenantId,
        expiresIn: tokenResponse.expires_in,
        expiryDate: new Date(expiryDate).toISOString()
      });

      // Encrypt updated credentials
      const { encryptedData, keyId } = await encryptMCPCredentials(
        tenantId,
        updatedCredentials
      );

      // Persist refreshed credentials to database
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          updatedAt: new Date(),
          expiresAt: new Date(expiryDate)
        })
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId)
        ));

      logger.info('💾 [Microsoft OAuth] Refreshed credentials persisted to database', {
        serverId,
        tenantId
      });

      // Return updated credentials
      return updatedCredentials;

    } catch (error) {
      logger.error('❌ [Microsoft OAuth] Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      throw new Error('Token refresh failed - user must re-authorize');
    }
  }

  /**
   * Get valid access token (auto-refresh if needed)
   * Microsoft tokens typically expire in 1 hour, refresh if expiring within 5 minutes
   */
  static async getValidAccessToken(params: {
    serverId: string;
    tenantId: string;
    currentCredentials: any;
  }): Promise<string> {
    const { currentCredentials } = params;

    // Check if token is expired or about to expire (within 5 minutes)
    const now = Date.now();
    const expiryDate = currentCredentials.expiry_date || 0;
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiryDate - now < bufferTime) {
      logger.info('⏰ [Microsoft OAuth] Token expired or expiring soon, refreshing...', {
        expiryDate: new Date(expiryDate).toISOString(),
        serverId: params.serverId
      });

      // Refresh token
      const refreshedCredentials = await this.refreshAccessToken(params);
      return refreshedCredentials.access_token;
    }

    return currentCredentials.access_token;
  }

  /**
   * Revoke Microsoft OAuth access
   */
  static async revokeAccess(accessToken: string): Promise<void> {
    try {
      // Microsoft doesn't have a standard revoke endpoint
      // Access is revoked by deleting credentials from our database
      logger.info('🔒 [Microsoft OAuth] Access revoked (credentials deleted from database)');
    } catch (error) {
      logger.error('❌ [Microsoft OAuth] Revoke failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate Microsoft access token
   */
  static async validateToken(accessToken: string): Promise<{
    valid: boolean;
    userId?: string;
    displayName?: string;
    userPrincipalName?: string;
  }> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        return { valid: false };
      }

      const userData = await response.json();

      return {
        valid: true,
        userId: userData.id,
        displayName: userData.displayName,
        userPrincipalName: userData.userPrincipalName
      };

    } catch (error) {
      logger.error('❌ [Microsoft OAuth] Token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { valid: false };
    }
  }
}
