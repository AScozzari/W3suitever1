import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../core/logger';
import { encryptMCPCredentials } from './mcp-credential-encryption';

/**
 * OAuth Provider Configurations
 * Supports: Google, Microsoft, Meta
 */
interface OAuthProviderConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  requiresClientSecret: boolean;
}

const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    requiresClientSecret: true
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/Files.ReadWrite.All',
      'https://graph.microsoft.com/User.Read'
    ],
    requiresClientSecret: true
  },
  meta: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish'
    ],
    requiresClientSecret: true
  }
};

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string;
  tokenType: string;
}

export class OAuthService {
  /**
   * Generate OAuth authorization URL
   */
  static async getAuthorizationUrl(params: {
    provider: 'google' | 'microsoft' | 'meta';
    tenantId: string;
    userId: string;
    serverId?: string;
    redirectUri: string;
    state: string;
  }): Promise<{ authUrl: string; serverId: string }> {
    const { provider, tenantId, userId, serverId: existingServerId, redirectUri, state } = params;

    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Get or create MCP server for this provider
    const serverId = existingServerId || await this.getOrCreateServer({
      provider,
      tenantId,
      userId
    });

    // Get client credentials from environment (later: from database)
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    
    if (!clientId) {
      throw new Error(`OAuth client not configured for ${provider}. Missing ${provider.toUpperCase()}_CLIENT_ID`);
    }

    // Build authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

    logger.info(`🔐 [OAuth] Authorization URL generated`, {
      provider,
      serverId,
      tenantId,
      userId
    });

    return {
      authUrl: authUrl.toString(),
      serverId
    };
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(params: {
    provider: 'google' | 'microsoft' | 'meta';
    code: string;
    redirectUri: string;
  }): Promise<OAuthCredentials> {
    const { provider, code, redirectUri } = params;

    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth client not configured for ${provider}`);
    }

    // Exchange code for token
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`❌ [OAuth] Token exchange failed`, {
        provider,
        status: response.status,
        error
      });
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    const tokenData = await response.json();

    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    logger.info(`✅ [OAuth] Token exchange successful`, {
      provider,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresAt
    });

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope || config.scopes.join(' '),
      tokenType: tokenData.token_type || 'Bearer'
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(params: {
    provider: 'google' | 'microsoft' | 'meta';
    refreshToken: string;
  }): Promise<OAuthCredentials> {
    const { provider, refreshToken } = params;

    const config = OAUTH_PROVIDERS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth client not configured for ${provider}`);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`❌ [OAuth] Token refresh failed`, {
        provider,
        status: response.status,
        error
      });
      throw new Error(`OAuth token refresh failed: ${error}`);
    }

    const tokenData = await response.json();

    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    logger.info(`✅ [OAuth] Token refreshed successfully`, {
      provider,
      expiresAt
    });

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if not provided
      expiresAt,
      scope: tokenData.scope || config.scopes.join(' '),
      tokenType: tokenData.token_type || 'Bearer'
    };
  }

  /**
   * Store OAuth credentials in database
   */
  static async storeCredentials(params: {
    serverId: string;
    tenantId: string;
    userId: string;
    provider: 'google' | 'microsoft' | 'meta';
    credentials: OAuthCredentials;
  }): Promise<{ credentialId: string }> {
    const { serverId, tenantId, userId, provider, credentials } = params;

    // Encrypt credentials
    const { encryptedData, keyId } = await encryptMCPCredentials(tenantId, {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenType: credentials.tokenType,
      scope: credentials.scope
    });

    // Check if credentials exist for this user/server/provider
    const existingCreds = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId),
        eq(mcpServerCredentials.userId, userId),
        eq(mcpServerCredentials.oauthProvider, provider)
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
          tokenType: credentials.tokenType,
          scope: credentials.scope,
          expiresAt: credentials.expiresAt,
          updatedAt: new Date(),
          revokedAt: null // Clear revoked status
        })
        .where(eq(mcpServerCredentials.id, existingCreds[0].id));

      credentialId = existingCreds[0].id;

      logger.info(`✅ [OAuth] Credentials updated`, {
        credentialId,
        provider,
        userId
      });
    } else {
      // Insert new credentials
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          userId,
          oauthProvider: provider,
          credentialType: 'oauth2_user',
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          tokenType: credentials.tokenType,
          scope: credentials.scope,
          expiresAt: credentials.expiresAt,
          createdBy: userId
        })
        .returning({ id: mcpServerCredentials.id });

      credentialId = newCred.id;

      logger.info(`✅ [OAuth] Credentials stored`, {
        credentialId,
        provider,
        userId
      });
    }

    // Update server status
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mcpServers.id, serverId));

    return { credentialId };
  }

  /**
   * Get or create MCP server for provider
   */
  private static async getOrCreateServer(params: {
    provider: 'google' | 'microsoft' | 'meta';
    tenantId: string;
    userId: string;
  }): Promise<string> {
    const { provider, tenantId, userId } = params;

    const serverName = `${provider}-oauth`;
    const displayNames: Record<string, string> = {
      google: 'Google Workspace',
      microsoft: 'Microsoft 365',
      meta: 'Meta/Instagram'
    };

    // Find existing server
    const existingServer = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, serverName),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (existingServer.length > 0) {
      return existingServer[0].id;
    }

    // Create new server
    const [newServer] = await db
      .insert(mcpServers)
      .values({
        tenantId,
        name: serverName,
        displayName: displayNames[provider],
        description: `OAuth2 integration for ${displayNames[provider]}`,
        transport: 'http-sse',
        status: 'configuring',
        category: provider === 'google' || provider === 'microsoft' ? 'productivity' : 'social_media',
        createdBy: userId
      })
      .returning({ id: mcpServers.id });

    logger.info(`✅ [OAuth] MCP server created`, {
      serverId: newServer.id,
      provider,
      tenantId
    });

    return newServer.id;
  }
}
