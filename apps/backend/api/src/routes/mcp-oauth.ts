import { Router, Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth-service';
import { MetaOAuthService } from '../services/meta-oauth-service';
import { MicrosoftOAuthService } from '../services/microsoft-oauth-service';
import { db } from '../core/db';
import { mcpServers, users } from '../db/schema/w3suite';
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
    
    // 🔧 FIX: Get tenantId from query parameter (browser redirects can't send custom headers)
    // Note: Treat empty strings as missing values
    const tenantId = (req.query.tenantId as string)?.trim() || (req as any).user?.tenantId;
    const currentUserId = (req.query.userId as string)?.trim() || (req as any).user?.id;
    const assignToParam = (req.query.assignTo as string)?.trim();

    // 🎯 RBAC Assignment Logic
    // - If assignTo is not provided, auto-assign to current user
    // - If assignTo is provided and different from currentUser, check admin permission
    const assignedUserId = assignToParam || currentUserId;
    const isAdminAssignment = assignToParam && assignToParam !== currentUserId;

    logger.info('🚀 [OAuth] Start endpoint called', {
      serverId,
      tenantId,
      currentUserId,
      assignedUserId,
      isAdminAssignment,
      hasQueryTenant: !!req.query.tenantId,
      hasUserTenant: !!(req as any).user?.tenantId
    });

    if (!tenantId || tenantId === '') {
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
            <h1>❌ Tenant Missing</h1>
            <p>Tenant context required. Please refresh and try again.</p>
            <p><small>Debug: Query params missing tenantId and userId</small></p>
          </div>
        </body>
        </html>
      `);
    }

    if (!currentUserId || currentUserId === '') {
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

    // 🔒 SECURITY: Validate that currentUserId belongs to tenantId to prevent cross-tenant tampering
    const [userValidation] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, currentUserId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (!userValidation) {
      logger.error('🚨 [OAuth] Security: currentUserId does not belong to tenantId', {
        currentUserId,
        tenantId
      });
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Forbidden</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Access Denied</h1>
            <p>Invalid user/tenant combination. Please refresh and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // 🔐 RBAC: Check if admin assignment is allowed
    if (isAdminAssignment) {
      // Fetch all roles for current user (avoid limit(1) bug with multiple roles)
      const { userAssignments, roles } = await import('../db/schema/w3suite');
      const userRoles = await db
        .select({ roleName: roles.name })
        .from(userAssignments)
        .innerJoin(roles, eq(roles.id, userAssignments.roleId))
        .where(and(
          eq(userAssignments.userId, currentUserId),
          eq(userAssignments.tenantId, tenantId)
        ));

      const roleNames = userRoles.map(r => r.roleName);
      const isAdmin = roleNames.some(role => ['admin', 'super_admin', 'tenant_admin'].includes(role));
      
      if (!isAdmin) {
        logger.warn('🚨 [OAuth] Unauthorized admin assignment attempt', {
          currentUserId,
          assignedUserId,
          tenantId
        });
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Permission Denied</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Permission Denied</h1>
              <p>Only administrators can assign OAuth accounts to other users.</p>
              <p>Please remove the <code>assignTo</code> parameter or contact your administrator.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Validate that assignedUserId exists and belongs to same tenant
      const [assignedUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.id, assignedUserId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);

      if (!assignedUser) {
        logger.error('🚨 [OAuth] Invalid assignTo userId', {
          currentUserId,
          assignedUserId,
          tenantId
        });
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid User</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Invalid Assignment Target</h1>
              <p>The specified user does not exist or does not belong to this tenant.</p>
            </div>
          </body>
          </html>
        `);
      }

      logger.info('✅ [OAuth] Admin assignment validated', {
        admin: currentUserId,
        targetUser: assignedUserId,
        tenantId
      });
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
    // Format: serverId|tenantId|assignedUserId (will be verified in callback)
    // Note: assignedUserId is the user who will own the credentials (not necessarily currentUser)
    const state = Buffer.from(
      JSON.stringify({ serverId, tenantId, userId: assignedUserId })
    ).toString('base64');

    // Generate auth URL
    const authUrl = await GoogleOAuthService.generateAuthUrl({
      serverId,
      tenantId,
      redirectUri,
      state
    });

    logger.info('🚀 [OAuth] Starting Google OAuth flow', {
      serverId,
      tenantId,
      currentUserId,
      assignedUserId,
      isAdminAssignment,
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
      creds.encryptedCredentials,
      tenantId
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

/**
 * Start Meta/Instagram OAuth flow
 * GET /api/mcp/oauth/meta/start/:serverId
 */
router.get('/meta/start/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    
    // 🔧 FIX: Get tenantId from query parameter (browser redirects can't send custom headers)
    // Note: Treat empty strings as missing values
    const tenantId = (req.query.tenantId as string)?.trim() || (req as any).user?.tenantId;
    const currentUserId = (req.query.userId as string)?.trim() || (req as any).user?.id;
    const assignToParam = (req.query.assignTo as string)?.trim();

    // 🎯 RBAC Assignment Logic
    // - If assignTo is not provided, auto-assign to current user
    // - If assignTo is provided and different from currentUser, check admin permission
    const assignedUserId = assignToParam || currentUserId;
    const isAdminAssignment = assignToParam && assignToParam !== currentUserId;

    logger.info('🚀 [OAuth] Meta start endpoint called', {
      serverId,
      tenantId,
      currentUserId,
      assignedUserId,
      isAdminAssignment,
      hasQueryTenant: !!req.query.tenantId,
      hasUserTenant: !!(req as any).user?.tenantId
    });

    if (!tenantId || tenantId === '') {
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
            <h1>❌ Tenant Missing</h1>
            <p>Tenant context required. Please refresh and try again.</p>
            <p><small>Debug: Query params missing tenantId and userId</small></p>
          </div>
        </body>
        </html>
      `);
    }

    if (!currentUserId || currentUserId === '') {
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

    // 🔒 SECURITY: Validate that currentUserId belongs to tenantId (ALWAYS - prevents cross-tenant OAuth)
    const [currentUserValidation] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, currentUserId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (!currentUserValidation) {
      logger.error('🚨 [OAuth] Security: currentUserId does not belong to tenantId', {
        currentUserId,
        tenantId,
        provider: 'meta'
      });
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Forbidden</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Access Denied</h1>
            <p>Invalid user/tenant combination. Please refresh and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // 🔐 RBAC: Check if admin assignment is allowed
    if (isAdminAssignment) {
      // Fetch all roles for current user (avoid limit(1) bug with multiple roles)
      const { userAssignments, roles } = await import('../db/schema/w3suite');
      const userRoles = await db
        .select({ roleName: roles.name })
        .from(userAssignments)
        .innerJoin(roles, eq(roles.id, userAssignments.roleId))
        .where(and(
          eq(userAssignments.userId, currentUserId),
          eq(userAssignments.tenantId, tenantId)
        ));

      const isAdmin = userRoles.some(r => 
        ['admin', 'super_admin', 'tenant_admin'].includes(r.roleName.toLowerCase())
      );

      if (!isAdmin) {
        logger.error('🚨 [OAuth] Non-admin attempted RBAC assignment', {
          currentUserId,
          assignedUserId,
          tenantId,
          userRoles: userRoles.map(r => r.roleName)
        });

        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Permission Denied</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Permission Denied</h1>
              <p>Only administrators can assign OAuth accounts to other users.</p>
              <p>Please remove the <code>assignTo</code> parameter or contact your administrator.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Validate assignedUserId belongs to same tenant
      const [assignedUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.id, assignedUserId),
          eq(users.tenantId, tenantId)
        ))
        .limit(1);

      if (!assignedUser) {
        logger.error('🚨 [OAuth] Invalid assignTo userId', {
          currentUserId,
          assignedUserId,
          tenantId
        });
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invalid User</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Invalid User Assignment</h1>
              <p>The user you're trying to assign to does not exist in this tenant.</p>
              <p><small>assignTo userId: ${assignedUserId}</small></p>
            </div>
          </body>
          </html>
        `);
      }
    }

    // Verify server exists and is Meta
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

    if (server.name !== 'meta-instagram') {
      return res.status(400).json({
        success: false,
        error: 'Server is not Meta/Instagram - wrong OAuth provider'
      });
    }

    // Build callback URL
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackPath = '/api/mcp/oauth/meta/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Generate state parameter for CSRF protection
    // Note: assignedUserId is the user who will own the credentials (not necessarily currentUser)
    const state = Buffer.from(
      JSON.stringify({ serverId, tenantId, userId: assignedUserId })
    ).toString('base64');

    // Generate auth URL
    const authUrl = await MetaOAuthService.generateAuthUrl({
      serverId,
      tenantId,
      redirectUri,
      state
    });

    logger.info('🚀 [OAuth] Starting Meta OAuth flow', {
      serverId,
      tenantId,
      currentUserId,
      assignedUserId,
      isAdminAssignment,
      redirectUri
    });

    // Redirect user to Meta consent screen
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
 * Handle Meta OAuth callback
 * GET /api/mcp/oauth/meta/callback
 */
router.get('/meta/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      logger.error('❌ [OAuth] Meta returned error', { error: oauthError });
      
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
    const callbackPath = '/api/mcp/oauth/meta/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Exchange code for tokens
    const result = await MetaOAuthService.handleCallback({
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
          <h1>Meta/Instagram Connected!</h1>
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
 * Test Meta OAuth connection
 * GET /api/mcp/oauth/meta/test/:serverId
 */
router.get('/meta/test/:serverId', async (req: Request, res: Response) => {
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
      creds.encryptedCredentials,
      tenantId
    );

    // Get valid access token (auto-refresh if needed)
    const accessToken = await MetaOAuthService.getValidAccessToken({
      serverId,
      tenantId,
      currentCredentials: credentials
    });

    // Validate token with Meta
    const validation = await MetaOAuthService.validateToken(accessToken);

    res.json({
      success: true,
      message: 'Meta OAuth connection is valid',
      valid: validation.valid,
      userId: validation.userId,
      tokenExpiry: credentials.expiry_date 
        ? new Date(credentials.expiry_date).toISOString() 
        : null,
      scopes: credentials.scope?.split(',') || []
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

/**
 * Start Microsoft 365 OAuth flow
 * GET /api/mcp/oauth/microsoft/start/:serverId
 */
router.get('/microsoft/start/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    
    // 🔧 FIX: Get tenantId from query parameter (browser redirects can't send custom headers)
    // Note: Treat empty strings as missing values
    const tenantId = (req.query.tenantId as string)?.trim() || (req as any).user?.tenantId;
    const userId = (req.query.userId as string)?.trim() || (req as any).user?.id;

    logger.info('🚀 [OAuth] Microsoft start endpoint called', {
      serverId,
      tenantId,
      userId,
      hasQueryTenant: !!req.query.tenantId,
      hasUserTenant: !!(req as any).user?.tenantId
    });

    if (!tenantId || tenantId === '') {
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
            <h1>❌ Tenant Missing</h1>
            <p>Tenant context required. Please refresh and try again.</p>
            <p><small>Debug: Query params missing tenantId and userId</small></p>
          </div>
        </body>
        </html>
      `);
    }

    if (!userId || userId === '') {
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

    // 🔒 SECURITY: Validate that userId belongs to tenantId to prevent cross-tenant tampering
    const [userValidation] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (!userValidation) {
      logger.error('🚨 [OAuth] Security: userId does not belong to tenantId', {
        userId,
        tenantId,
        provider: 'microsoft'
      });
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Forbidden</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #c33; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Access Denied</h1>
            <p>Invalid user/tenant combination. Please refresh and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Verify server exists and is Microsoft 365
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

    if (server.name !== 'microsoft-365') {
      return res.status(400).json({
        success: false,
        error: 'Server is not Microsoft 365 - wrong OAuth provider'
      });
    }

    // Build callback URL
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackPath = '/api/mcp/oauth/microsoft/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ serverId, tenantId, userId })
    ).toString('base64');

    // Generate auth URL
    const authUrl = MicrosoftOAuthService.generateAuthUrl({
      serverId,
      tenantId,
      redirectUri,
      state
    });

    logger.info('🚀 [OAuth] Starting Microsoft OAuth flow', {
      serverId,
      tenantId,
      userId,
      redirectUri
    });

    // Redirect user to Microsoft consent screen
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
 * Handle Microsoft OAuth callback
 * GET /api/mcp/oauth/microsoft/callback
 */
router.get('/microsoft/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      logger.error('❌ [OAuth] Microsoft returned error', { error: oauthError });
      
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
    const callbackPath = '/api/mcp/oauth/microsoft/callback';
    const redirectUri = `${protocol}://${host}${callbackPath}`;

    // Exchange code for tokens
    const result = await MicrosoftOAuthService.handleCallback({
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
          <h1>Microsoft 365 Connected!</h1>
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
 * Test Microsoft OAuth connection
 * GET /api/mcp/oauth/microsoft/test/:serverId
 */
router.get('/microsoft/test/:serverId', async (req: Request, res: Response) => {
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
      creds.encryptedCredentials,
      tenantId
    );

    // Get valid access token (auto-refresh if needed)
    const accessToken = await MicrosoftOAuthService.getValidAccessToken({
      serverId,
      tenantId,
      currentCredentials: credentials
    });

    // Validate token with Microsoft
    const validation = await MicrosoftOAuthService.validateToken(accessToken);

    res.json({
      success: true,
      message: 'Microsoft 365 OAuth connection is valid',
      valid: validation.valid,
      userId: validation.userId,
      displayName: validation.displayName,
      userPrincipalName: validation.userPrincipalName,
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
