import { Router, Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth-service';
import { db } from '../core/db';
import { mcpServers } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { logger } from '../core/logger';

const router = Router();

/**
 * Start Google OAuth flow
 * GET /api/mcp/oauth/google/start/:serverId
 * 
 * Note: Uses req.user from auth middleware (not custom headers)
 * Browsers can redirect directly to this URL
 */
router.get('/google/start/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    
    // Get tenantId and userId from authenticated session
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Required</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Authentication Required</h1>
            <p>Please log in first before connecting Google Workspace.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (!userId) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Required</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ User Session Required</h1>
            <p>Unable to identify user. Please log in again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Verify server exists and is Google Workspace
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found'
      });
    }

    if (server.name !== 'google-workspace') {
      return res.status(400).json({
        success: false,
        error: 'Server is not Google Workspace - wrong OAuth provider'
      });
    }

    // Build callback URL
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackPath = '/api/mcp/oauth/google/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Generate state parameter for CSRF protection
    // Format: serverId|tenantId|userId (will be verified in callback)
    const state = Buffer.from(
      JSON.stringify({ serverId, tenantId, userId })
    ).toString('base64');

    // Generate auth URL
    const authUrl = GoogleOAuthService.generateAuthUrl({
      serverId,
      tenantId,
      redirectUri,
      state
    });

    logger.info('🚀 [OAuth] Starting Google OAuth flow', {
      serverId,
      tenantId,
      userId,
      redirectUri
    });

    // Redirect user to Google consent screen
    res.redirect(authUrl);

  } catch (error) {
    logger.error('❌ [OAuth] Start flow failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to start OAuth flow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Handle Google OAuth callback
 * GET /api/mcp/oauth/google/callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      logger.error('❌ [OAuth] Google returned error', { error: oauthError });
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
            h1 { color: #c33; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ OAuth Error</h1>
            <p>Authorization failed: ${oauthError}</p>
            <p>Please close this window and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Missing Parameters</h1>
            <p>Missing authorization code or state parameter.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Verify and decode state parameter
    let stateData: { serverId: string; tenantId: string; userId: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Invalid State</h1>
            <p>State parameter is invalid or corrupted.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Build callback URL (same as start flow)
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackPath = '/api/mcp/oauth/google/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Exchange code for tokens
    const result = await GoogleOAuthService.handleCallback({
      code: code as string,
      serverId: stateData.serverId,
      tenantId: stateData.tenantId,
      userId: stateData.userId,
      redirectUri
    });

    logger.info('✅ [OAuth] Callback successful', {
      serverId: stateData.serverId,
      credentialId: result.credentialId
    });

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
        <style>
          body { 
            font-family: system-ui; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            text-align: center;
          }
          .success { 
            background: #e8f5e9; 
            border: 1px solid #4caf50; 
            padding: 30px; 
            border-radius: 8px; 
          }
          h1 { color: #2e7d32; }
          .icon { font-size: 64px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="success">
          <div class="icon">✅</div>
          <h1>Google Workspace Connected!</h1>
          <p>${result.message}</p>
          <p style="margin-top: 20px; color: #666;">
            You can close this window and return to the application.
          </p>
        </div>
        <script>
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    logger.error('❌ [OAuth] Callback failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          h1 { color: #c33; }
          pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ OAuth Callback Failed</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
          </details>
          <p style="margin-top: 20px;">
            Please close this window and try again.
          </p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * Test Google OAuth connection
 * GET /api/mcp/oauth/google/test/:serverId
 */
router.get('/google/test/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    // Load server and credentials
    const { decryptMCPCredentials } = await import('../services/mcp-credential-encryption');
    const { mcpServerCredentials } = await import('../db/schema/w3suite');

    const [creds] = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);

    if (!creds) {
      return res.status(404).json({
        success: false,
        error: 'No credentials found - please authorize first'
      });
    }

    // Decrypt credentials
    const credentials = await decryptMCPCredentials(
      tenantId,
      creds.encryptedCredentials,
      creds.encryptionKeyId
    );

    // Get valid access token (auto-refresh if needed)
    const accessToken = await GoogleOAuthService.getValidAccessToken({
      serverId,
      tenantId,
      currentCredentials: credentials
    });

    res.json({
      success: true,
      message: 'Google OAuth connection is valid',
      hasRefreshToken: !!credentials.refresh_token,
      tokenExpiry: credentials.expiry_date 
        ? new Date(credentials.expiry_date).toISOString() 
        : null,
      scopes: credentials.scope?.split(' ') || []
    });

  } catch (error) {
    logger.error('❌ [OAuth] Test connection failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
