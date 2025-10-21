import { db } from '../core/db';
import { mcpServers, mcpServerCredentials, mcpConnectedAccounts } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
import { encryptMCPCredentials } from './mcp-credential-encryption';
import { logger } from '../core/logger';

/**
 * Meta OAuth Service
 * Gestisce OAuth2 flow per Meta/Facebook/Instagram MCP server
 * Supporta multiple Facebook Pages e Instagram Business accounts per tenant
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
    'business_management',
    'public_profile',
    'email'
  ];

  private static readonly GRAPH_API_VERSION = 'v19.0';
  private static readonly META_OAUTH_BASE = 'https://www.facebook.com';
  private static readonly GRAPH_API_BASE = 'https://graph.facebook.com';

  /**
   * Get Meta App credentials (Client ID/Secret) from database or env
   */
  private static async getMetaAppCredentials(tenantId: string): Promise<{
    clientId: string;
    clientSecret: string;
  }> {
    // First try to get credentials from database
    const configServer = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'meta-oauth-config'),
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
      clientId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      clientSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    }

    if (!clientId || !clientSecret) {
      throw new Error('Meta OAuth credentials not configured. Please configure App ID and Secret in MCP Settings');
    }

    return { clientId, clientSecret };
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

    const { clientId } = await this.getMetaAppCredentials(tenantId);

    const authUrl = `${this.META_OAUTH_BASE}/${this.GRAPH_API_VERSION}/dialog/oauth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${this.SCOPES.join(',')}&` +
      `state=${state || ''}&` +
      `response_type=code`;

    logger.info('🔐 [Meta OAuth] Generated auth URL', {
      serverId: params.serverId,
      tenantId: params.tenantId,
      scopes: this.SCOPES.length
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  private static async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    tenantId: string
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in?: number;
  }> {
    const { clientId, clientSecret } = await this.getMetaAppCredentials(tenantId);

    const tokenUrl = `${this.GRAPH_API_BASE}/${this.GRAPH_API_VERSION}/oauth/access_token?` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`;

    const response = await fetch(tokenUrl);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get long-lived user access token (60 days)
   */
  private static async getLongLivedToken(
    shortLivedToken: string,
    tenantId: string
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    const { clientId, clientSecret } = await this.getMetaAppCredentials(tenantId);

    const tokenUrl = `${this.GRAPH_API_BASE}/${this.GRAPH_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${shortLivedToken}`;

    const response = await fetch(tokenUrl);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta long-lived token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch user's Facebook Pages with Instagram Business accounts
   */
  private static async fetchUserPages(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
      id: string;
      username?: string;
    };
  }>> {
    const pagesUrl = `${this.GRAPH_API_BASE}/${this.GRAPH_API_VERSION}/me/accounts?` +
      `fields=id,name,access_token,instagram_business_account{id,username}&` +
      `access_token=${accessToken}`;

    const response = await fetch(pagesUrl);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meta pages fetch failed: ${error}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get Instagram account details
   */
  private static async fetchInstagramDetails(
    instagramAccountId: string,
    pageAccessToken: string
  ): Promise<{
    id: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  } | null> {
    try {
      const igUrl = `${this.GRAPH_API_BASE}/${this.GRAPH_API_VERSION}/${instagramAccountId}?` +
        `fields=id,username,profile_picture_url,followers_count,media_count&` +
        `access_token=${pageAccessToken}`;

      const response = await fetch(igUrl);
      
      if (!response.ok) {
        logger.warn('⚠️ [Meta OAuth] Instagram details fetch failed', { instagramAccountId });
        return null;
      }

      return response.json();
    } catch (error) {
      logger.error('❌ [Meta OAuth] Instagram details error', { error, instagramAccountId });
      return null;
    }
  }

  /**
   * Handle OAuth callback - Exchange code for tokens and discover pages/accounts
   */
  static async handleCallback(params: {
    code: string;
    serverId: string;
    tenantId: string;
    userId: string;
    redirectUri: string;
  }): Promise<{
    success: boolean;
    credentialId?: string;
    connectedAccounts?: Array<{
      id: string;
      accountType: string;
      accountName: string;
      platformAccountId: string;
    }>;
    error?: string;
  }> {
    const { code, serverId, tenantId, userId, redirectUri } = params;

    try {
      logger.info('🔐 [Meta OAuth] Starting callback flow', { serverId, tenantId });

      // Step 1: Exchange code for short-lived token
      const tokenData = await this.exchangeCodeForToken(code, redirectUri, tenantId);
      
      // Step 2: Exchange for long-lived token (60 days)
      const longLivedToken = await this.getLongLivedToken(tokenData.access_token, tenantId);

      logger.info('✅ [Meta OAuth] Got long-lived user access token', { 
        expiresIn: longLivedToken.expires_in 
      });

      // Step 3: Fetch user's Facebook Pages
      const pages = await this.fetchUserPages(longLivedToken.access_token);
      
      logger.info(`📄 [Meta OAuth] Found ${pages.length} Facebook pages`, { 
        pageNames: pages.map(p => p.name)
      });

      // Step 4: Store user-level credential (for future re-auth)
      const encryptedCreds = await encryptMCPCredentials(tenantId, {
        access_token: longLivedToken.access_token,
        token_type: longLivedToken.token_type,
        expires_in: longLivedToken.expires_in
      });

      const expiresAt = new Date(Date.now() + (longLivedToken.expires_in * 1000));

      const [credential] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: 'oauth2_user',
          encryptedCredentials: encryptedCreds.encrypted,
          encryptionKeyId: encryptedCreds.keyId,
          userId,
          oauthProvider: 'meta',
          tokenType: longLivedToken.token_type,
          scope: this.SCOPES.join(' '),
          expiresAt,
          createdBy: userId
        })
        .returning();

      logger.info('💾 [Meta OAuth] Stored user credential', { credentialId: credential.id });

      // Step 5: Store each Facebook Page as connected account with Page Access Token
      const connectedAccounts = [];

      for (const page of pages) {
        // Encrypt Page Access Token (never expires!)
        const encryptedPageToken = await encryptMCPCredentials(tenantId, {
          page_access_token: page.access_token
        });

        // Store Facebook Page
        const [fbAccount] = await db
          .insert(mcpConnectedAccounts)
          .values({
            tenantId,
            credentialId: credential.id,
            accountType: 'facebook_page',
            platformAccountId: page.id,
            accountName: page.name,
            encryptedAccessToken: encryptedPageToken.encrypted,
            tokenExpiresAt: null, // Page tokens never expire!
            accountMetadata: {},
            linkedAccounts: page.instagram_business_account ? [{
              type: 'instagram_business',
              id: page.instagram_business_account.id,
              username: page.instagram_business_account.username
            }] : [],
            isActive: true,
            isPrimary: connectedAccounts.length === 0, // First page is primary
            createdBy: userId
          })
          .returning();

        connectedAccounts.push({
          id: fbAccount.id,
          accountType: 'facebook_page',
          accountName: page.name,
          platformAccountId: page.id
        });

        logger.info('📘 [Meta OAuth] Stored Facebook Page', { 
          pageName: page.name, 
          pageId: page.id 
        });

        // Store Instagram Business account if linked
        if (page.instagram_business_account) {
          const igDetails = await this.fetchInstagramDetails(
            page.instagram_business_account.id,
            page.access_token
          );

          const [igAccount] = await db
            .insert(mcpConnectedAccounts)
            .values({
              tenantId,
              credentialId: credential.id,
              accountType: 'instagram_business',
              platformAccountId: page.instagram_business_account.id,
              accountName: igDetails?.username || page.instagram_business_account.username || page.name,
              accountUsername: igDetails?.username || page.instagram_business_account.username,
              encryptedAccessToken: encryptedPageToken.encrypted, // Same token as parent page
              tokenExpiresAt: null,
              accountMetadata: {
                linkedFacebookPageId: page.id,
                linkedFacebookPageName: page.name,
                profilePictureUrl: igDetails?.profile_picture_url,
                followersCount: igDetails?.followers_count,
                mediaCount: igDetails?.media_count
              },
              linkedAccounts: [{
                type: 'facebook_page',
                id: page.id,
                name: page.name
              }],
              isActive: true,
              isPrimary: false,
              createdBy: userId
            })
            .returning();

          connectedAccounts.push({
            id: igAccount.id,
            accountType: 'instagram_business',
            accountName: igAccount.accountName,
            platformAccountId: page.instagram_business_account.id
          });

          logger.info('📸 [Meta OAuth] Stored Instagram Business account', { 
            username: igAccount.accountUsername,
            igId: page.instagram_business_account.id
          });
        }
      }

      logger.info('✅ [Meta OAuth] Callback complete', {
        credentialId: credential.id,
        connectedAccounts: connectedAccounts.length
      });

      return {
        success: true,
        credentialId: credential.id,
        connectedAccounts
      };

    } catch (error) {
      logger.error('❌ [Meta OAuth] Callback failed', { error, serverId, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disconnect Meta account - soft delete credential and all connected accounts
   */
  static async disconnect(params: {
    serverId: string;
    tenantId: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { serverId, tenantId, userId } = params;

    try {
      logger.info('🔌 [Meta OAuth] Disconnecting Meta account', { serverId, tenantId });

      // Find credential
      const [credential] = await db
        .select()
        .from(mcpServerCredentials)
        .where(and(
          eq(mcpServerCredentials.serverId, serverId),
          eq(mcpServerCredentials.tenantId, tenantId),
          eq(mcpServerCredentials.oauthProvider, 'meta'),
          sql`revoked_at IS NULL`
        ))
        .limit(1);

      if (!credential) {
        return { success: false, error: 'Credential not found' };
      }

      // Soft delete all connected accounts
      await db
        .update(mcpConnectedAccounts)
        .set({
          removedAt: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(mcpConnectedAccounts.credentialId, credential.id));

      // Revoke credential
      await db
        .update(mcpServerCredentials)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, credential.id));

      logger.info('✅ [Meta OAuth] Disconnected successfully', { credentialId: credential.id });

      return { success: true };

    } catch (error) {
      logger.error('❌ [Meta OAuth] Disconnect failed', { error, serverId, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get connected Meta accounts for tenant
   */
  static async getConnectedAccounts(params: {
    tenantId: string;
    serverId: string;
  }): Promise<Array<{
    id: string;
    accountType: string;
    platformAccountId: string;
    accountName: string;
    accountUsername: string | null;
    accountMetadata: any;
    linkedAccounts: any;
    isActive: boolean;
    isPrimary: boolean;
    createdAt: Date;
    lastSyncedAt: Date | null;
  }>> {
    const { tenantId, serverId } = params;

    // Find credential
    const [credential] = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId),
        eq(mcpServerCredentials.oauthProvider, 'meta'),
        sql`revoked_at IS NULL`
      ))
      .limit(1);

    if (!credential) {
      return [];
    }

    // Get all active connected accounts
    const accounts = await db
      .select()
      .from(mcpConnectedAccounts)
      .where(and(
        eq(mcpConnectedAccounts.credentialId, credential.id),
        eq(mcpConnectedAccounts.isActive, true),
        sql`removed_at IS NULL`
      ))
      .orderBy(sql`is_primary DESC, created_at ASC`);

    return accounts;
  }

  /**
   * 🎯 Get valid access token with multi-user OAuth support
   * 
   * REQUIRES userId for per-user credential isolation
   * Handles token refresh automatically if expired
   * 
   * @throws Error if no credentials found or userId missing
   */
  static async getValidAccessToken(params: {
    serverId: string;
    tenantId: string;
    userId: string; // REQUIRED for multi-user OAuth
  }): Promise<string> {
    const { serverId, tenantId, userId } = params;

    // ENFORCE userId requirement
    if (!userId) {
      throw new Error('[Meta OAuth] userId is REQUIRED for multi-user OAuth model');
    }

    try {
      // Use unified credential service
      const { UnifiedCredentialService } = await import('./unified-credential-service');
      
      const credentialPayload = await UnifiedCredentialService.getValidCredentials({
        tenantId,
        serverId,
        userId,
        oauthProvider: 'meta',
        credentialType: 'oauth2_user'
      });

      const currentCredentials = credentialPayload.credentials;

      // Meta tokens are long-lived (60 days), check expiry
      if (credentialPayload.needsRefresh || credentialPayload.isExpired) {
        logger.info('⏰ [Meta OAuth] Token expired or expiring soon, requesting re-auth...', {
          expiresAt: credentialPayload.expiresAt?.toISOString() || 'unknown',
          serverId,
          userId
        });

        // Meta doesn't support refresh tokens - user must re-authenticate
        throw new Error('Meta access token expired. Please re-authenticate in MCP Settings.');
      }

      // Token is valid
      logger.info('✅ [Meta OAuth] Access token is valid', {
        serverId,
        userId,
        expiresAt: credentialPayload.expiresAt?.toISOString() || 'unknown'
      });

      return currentCredentials.access_token;

    } catch (error) {
      logger.error('❌ [Meta OAuth] Failed to get valid access token', {
        error: error instanceof Error ? error.message : String(error),
        serverId,
        tenantId,
        userId
      });
      throw error;
    }
  }
}
