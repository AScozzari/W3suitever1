import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { encryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Meta/Instagram OAuth Service
 * Gestisce OAuth2 flow per Meta Graph API (Facebook + Instagram)
 */
export class MetaOAuthService {
  private static readonly SCOPES = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'public_profile',
    'email'
  ];

  private static readonly BASE_URL = 'https://www.facebook.com/v18.0';
  private static readonly TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private static readonly LONG_LIVED_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';

  /**
   * Get App credentials from environment
   */
  private static getAppCredentials(): { appId: string; appSecret: string } {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('Meta OAuth credentials not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET');
    }

    return { appId, appSecret };
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
    const { appId } = this.getAppCredentials();

    const authUrl = new URL(`${this.BASE_URL}/dialog/oauth`);
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', this.SCOPES.join(','));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state || ''); // CSRF protection

    logger.info('🔐 [Meta OAuth] Generated auth URL', {
      serverId: params.serverId,
      tenantId: params.tenantId,
      scopes: this.SCOPES.length
    });

    return authUrl.toString();
  }

  /**
   * Exchange short-lived code for long-lived access token
   */
  private static async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const { appId, appSecret } = this.getAppCredentials();

    const tokenUrl = new URL(this.TOKEN_URL);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const response = await fetch(tokenUrl.toString());
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta token exchange failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Convert short-lived token to long-lived token (60 days)
   */
  private static async getLongLivedToken(shortLivedToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const { appId, appSecret } = this.getAppCredentials();

    const longLivedUrl = new URL(this.LONG_LIVED_URL);
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', appId);
    longLivedUrl.searchParams.set('client_secret', appSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const response = await fetch(longLivedUrl.toString());
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta long-lived token exchange failed: ${error}`);
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

      // Step 1: Exchange code for short-lived token
      const shortLivedResponse = await this.exchangeCodeForToken(code, redirectUri);

      // Step 2: Convert to long-lived token (60 days)
      const longLivedResponse = await this.getLongLivedToken(shortLivedResponse.access_token);

      const expiryDate = Date.now() + (longLivedResponse.expires_in * 1000);

      logger.info('✅ [Meta OAuth] Long-lived token received', {
        serverId,
        expiresIn: longLivedResponse.expires_in,
        expiryDate: new Date(expiryDate).toISOString()
      });

      // Prepare credentials object
      const credentials = {
        access_token: longLivedResponse.access_token,
        token_type: longLivedResponse.token_type || 'bearer',
        expiry_date: expiryDate,
        scope: this.SCOPES.join(',')
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
          eq(mcpServerCredentials.oauthProvider, 'meta')
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
            expiresAt: new Date(expiryDate),
            revokedAt: null
          })
          .where(eq(mcpServerCredentials.id, existingCreds[0].id));

        credentialId = existingCreds[0].id;

        logger.info('🔄 [Meta OAuth] Updated existing credentials', {
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
            oauthProvider: 'meta',
            credentialType: 'oauth2_user',
            encryptedCredentials: encryptedData,
            tokenType: credentials.token_type,
            scope: credentials.scope,
            createdBy: userId,
            expiresAt: new Date(expiryDate)
          })
          .returning({ id: mcpServerCredentials.id });

        credentialId = newCred.id;

        logger.info('✨ [Meta OAuth] Created new credentials', {
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
        message: 'Meta/Instagram OAuth successful - server configured',
        credentialId
      };

    } catch (error) {
      logger.error('❌ [Meta OAuth] Callback failed', {
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
   * Refresh Meta long-lived access token and persist to database
   * Note: Meta long-lived tokens last 60 days and can be refreshed before expiry
   */
  static async refreshAccessToken(params: {
    serverId: string;
    tenantId: string;
    currentCredentials: any;
  }): Promise<any> {
    const { serverId, tenantId, currentCredentials } = params;

    try {
      // Get new long-lived token using current token
      const longLivedResponse = await this.getLongLivedToken(currentCredentials.access_token);
      
      const expiryDate = Date.now() + (longLivedResponse.expires_in * 1000);

      // Prepare updated credentials
      const updatedCredentials = {
        access_token: longLivedResponse.access_token,
        token_type: longLivedResponse.token_type || 'bearer',
        expiry_date: expiryDate,
        scope: currentCredentials.scope
      };

      logger.info('🔄 [Meta OAuth] Token refreshed', {
        serverId,
        tenantId,
        expiresIn: longLivedResponse.expires_in,
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

      logger.info('💾 [Meta OAuth] Refreshed credentials persisted to database', {
        serverId,
        tenantId
      });

      // Return updated credentials
      return updatedCredentials;

    } catch (error) {
      logger.error('❌ [Meta OAuth] Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId
      });

      throw new Error('Token refresh failed - user must re-authorize');
    }
  }

  /**
   * Get valid access token (auto-refresh if needed)
   * Note: Refresh when token expires in < 7 days (Meta tokens last 60 days)
   */
  static async getValidAccessToken(params: {
    serverId: string;
    tenantId: string;
    currentCredentials: any;
  }): Promise<string> {
    const { currentCredentials } = params;

    // Check if token is expired or expiring soon (within 7 days)
    const now = Date.now();
    const expiryDate = currentCredentials.expiry_date || 0;
    const bufferTime = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (expiryDate - now < bufferTime) {
      logger.info('⏰ [Meta OAuth] Token expired or expiring soon, refreshing...', {
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
   * Revoke Meta OAuth access
   */
  static async revokeAccess(params: {
    userId: string;
    accessToken: string;
  }): Promise<void> {
    try {
      const { appId, appSecret } = this.getAppCredentials();

      const revokeUrl = `https://graph.facebook.com/v18.0/${params.userId}/permissions`;
      const url = new URL(revokeUrl);
      url.searchParams.set('access_token', params.accessToken);

      const response = await fetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(`Revoke failed: ${await response.text()}`);
      }

      logger.info('🔒 [Meta OAuth] Access revoked successfully', {
        userId: params.userId
      });
    } catch (error) {
      logger.error('❌ [Meta OAuth] Revoke failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate Meta access token and get user info
   */
  static async validateToken(accessToken: string): Promise<{
    valid: boolean;
    userId?: string;
    scopes?: string[];
    expiresAt?: number;
  }> {
    try {
      const { appId, appSecret } = this.getAppCredentials();

      const debugUrl = new URL('https://graph.facebook.com/debug_token');
      debugUrl.searchParams.set('input_token', accessToken);
      debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);

      const response = await fetch(debugUrl.toString());
      
      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();

      if (data.data?.is_valid) {
        return {
          valid: true,
          userId: data.data.user_id,
          scopes: data.data.scopes || [],
          expiresAt: data.data.expires_at ? data.data.expires_at * 1000 : undefined
        };
      }

      return { valid: false };

    } catch (error) {
      logger.error('❌ [Meta OAuth] Token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { valid: false };
    }
  }
}
