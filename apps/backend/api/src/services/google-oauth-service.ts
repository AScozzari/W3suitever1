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
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  /**
   * Get OAuth2 client for Google Workspace
   */
  private static getOAuth2Client(redirectUri: string): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
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
  static generateAuthUrl(params: {
    serverId: string;
    tenantId: string;
    redirectUri: string;
    state?: string;
  }): string {
    const { redirectUri, state } = params;

    const oauth2Client = this.getOAuth2Client(redirectUri);

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
      const oauth2Client = this.getOAuth2Client(redirectUri);
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
   * Get valid access token (auto-refresh if needed)
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
      logger.info('⏰ [Google OAuth] Token expired or expiring soon, refreshing...', {
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
