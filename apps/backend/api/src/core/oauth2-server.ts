/**
 * W3 Suite OAuth2 Authorization Server
 * Enterprise-grade OAuth2 implementation following RFC 6749 + PKCE
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { db } from './db';
import { users } from '../db/schema/w3suite';
import { eq } from 'drizzle-orm';
import { JWT_SECRET, config } from './config';

// OAuth2 Configuration Enterprise
const OAUTH2_CONFIG = {
  issuer: config.OAUTH2_ISSUER,
  authorizationEndpoint: '/oauth2/authorize',
  tokenEndpoint: '/oauth2/token',
  jwksUri: '/oauth2/jwks',
  userinfoEndpoint: '/oauth2/userinfo',
  revocationEndpoint: '/oauth2/revoke',
  introspectionEndpoint: '/oauth2/introspect',
  supportedGrantTypes: [
    'authorization_code',
    'refresh_token',
    'client_credentials'
  ],
  supportedResponseTypes: ['code'],
  supportedScopes: [
    'openid',
    'profile', 
    'email',
    'tenant_access',
    'admin',
    'mcp_read',   // MCP Gateway: read-only access to query templates
    'mcp_write'   // MCP Gateway: write access (actions, mutations)
  ],
  codeChallengeMethods: ['S256', 'plain'], // PKCE with S256 preferred, plain for HTTP fallback
  tokenEndpointAuthMethods: ['client_secret_basic', 'client_secret_post', 'none']
};

// OAuth2 Client Registry (In produzione: database)
interface OAuth2Client {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scopes: string[];
  clientType: 'public' | 'confidential';
  name: string;
}

const registeredClients: Map<string, OAuth2Client> = new Map([
  ['w3suite-frontend', {
    clientId: 'w3suite-frontend',
    clientSecret: undefined, // Public client (SPA)
    redirectUris: [
      'http://localhost:3004/auth/callback',
      'http://localhost:5000/auth/callback',
      'http://82.165.16.223/auth/callback',
      'https://w3suite.it/auth/callback',
      'https://*.w3suite.it/auth/callback',
      'https://*.w3suite.com/auth/callback',
      'https://*.replit.dev/auth/callback',
      'https://w3suite.online/auth/callback',
      'https://*.w3suite.online/auth/callback'
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scopes: ['openid', 'profile', 'email', 'tenant_access'],
    clientType: 'public',
    name: 'W3 Suite Frontend'
  }],
  ['w3suite-admin', {
    clientId: 'w3suite-admin',
    clientSecret: process.env.ADMIN_CLIENT_SECRET || 'admin-secret-key',
    redirectUris: [
      'http://localhost:3000/auth/callback',
      'https://admin.w3suite.com/auth/callback'
    ],
    grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],
    responseTypes: ['code'],
    scopes: ['openid', 'profile', 'email', 'tenant_access', 'admin'],
    clientType: 'confidential',
    name: 'W3 Suite Admin Panel'
  }],
  // MCP Gateway OAuth Clients for external AI platforms
  ['chatgpt-mcp-client', {
    clientId: 'chatgpt-mcp-client',
    clientSecret: undefined, // Public client (ChatGPT uses PKCE)
    redirectUris: [
      'https://chatgpt.com/aip/g-*/oauth/callback',
      'https://chat.openai.com/aip/g-*/oauth/callback',
      'https://platform.openai.com/oauth/callback'
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scopes: ['openid', 'profile', 'tenant_access', 'mcp_read', 'mcp_write'],
    clientType: 'public',
    name: 'ChatGPT MCP Integration'
  }],
  ['claude-mcp-client', {
    clientId: 'claude-mcp-client',
    clientSecret: undefined, // Public client (Claude Desktop uses PKCE)
    redirectUris: [
      'http://localhost:*/callback',
      'http://127.0.0.1:*/callback',
      'https://claude.ai/oauth/callback'
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scopes: ['openid', 'profile', 'tenant_access', 'mcp_read', 'mcp_write'],
    clientType: 'public',
    name: 'Claude Desktop MCP Integration'
  }],
  ['n8n-mcp-client', {
    clientId: 'n8n-mcp-client',
    clientSecret: process.env.N8N_MCP_CLIENT_SECRET || 'n8n-mcp-secret-key',
    redirectUris: [
      'https://*.app.n8n.cloud/oauth2/callback',
      'http://localhost:5678/oauth2/callback'
    ],
    grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],
    responseTypes: ['code'],
    scopes: ['openid', 'tenant_access', 'mcp_read', 'mcp_write'],
    clientType: 'confidential',
    name: 'n8n Workflow Automation'
  }],
  ['zapier-mcp-client', {
    clientId: 'zapier-mcp-client',
    clientSecret: process.env.ZAPIER_MCP_CLIENT_SECRET || 'zapier-mcp-secret-key',
    redirectUris: [
      'https://zapier.com/dashboard/auth/oauth/return/*'
    ],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    scopes: ['openid', 'tenant_access', 'mcp_read', 'mcp_write'],
    clientType: 'confidential',
    name: 'Zapier Automation'
  }]
]);

// OAuth2 Authorization Codes Storage (In produzione: Redis/Database)
interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  userId: string;
  tenantId: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
}

const authorizationCodes: Map<string, AuthorizationCode> = new Map();

// OAuth2 Refresh Tokens Storage (In produzione: Database)
interface RefreshTokenData {
  refreshToken: string;
  clientId: string;
  userId: string;
  tenantId: string;
  scopes: string[];
  expiresAt: Date;
}

const refreshTokens: Map<string, RefreshTokenData> = new Map();

// Utility Functions
function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

function validatePKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  console.log(`🔐 [PKCE] Validating - Method: ${method}`);
  console.log(`🔐 [PKCE] Code Verifier (first 20 chars): ${codeVerifier?.substring(0, 20)}...`);
  console.log(`🔐 [PKCE] Code Challenge: ${codeChallenge}`);
  
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    console.log(`🔐 [PKCE] Computed Hash: ${hash}`);
    console.log(`🔐 [PKCE] Match: ${hash === codeChallenge}`);
    return hash === codeChallenge;
  } else if (method === 'plain') {
    // Plain method: verifier === challenge (for HTTP fallback)
    return codeVerifier === codeChallenge;
  }
  return false;
}

function validateRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = registeredClients.get(clientId);
  console.log(`🔐 [REDIRECT] Validating redirect_uri for client: ${clientId}`);
  console.log(`🔐 [REDIRECT] Requested URI: ${redirectUri}`);
  console.log(`🔐 [REDIRECT] Client found: ${!!client}`);
  if (!client) return false;
  
  console.log(`🔐 [REDIRECT] Registered URIs: ${JSON.stringify(client.redirectUris)}`);
  
  const isValid = client.redirectUris.some(uri => {
    if (uri.includes('*')) {
      const pattern = uri.replace(/\*/g, '.*');
      const matches = new RegExp(`^${pattern}$`).test(redirectUri);
      console.log(`🔐 [REDIRECT] Pattern match: ${uri} -> ${matches}`);
      return matches;
    }
    const matches = uri === redirectUri;
    console.log(`🔐 [REDIRECT] Exact match: ${uri} === ${redirectUri} -> ${matches}`);
    return matches;
  });
  
  console.log(`🔐 [REDIRECT] Final result: ${isValid}`);
  return isValid;
}

async function getUserByCredentials(username: string, password: string) {
  try {
    // SECURITY: Fail-closed authentication - Query database for user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, username))
      .limit(1);
    
    if (!user) {
      console.log('❌ User not found:', username);
      return null; // FAIL-CLOSED: No fallback credentials allowed
    }
    
    // PRODUCTION: Verify password using bcrypt hash from database
    if (!user.passwordHash) {
      console.log('❌ No password hash for user:', username);
      return null; // FAIL-CLOSED: Users must have password hash
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      return null; // FAIL-CLOSED: Invalid password
    }
    
    // Check user status before allowing login
    if (user.status === 'sospeso') {
      throw new Error('Il tuo account è stato sospeso. Contatta l\'amministratore per assistenza.');
    }
    
    if (user.status === 'off-boarding') {
      throw new Error('Il tuo account è in fase di off-boarding. Accesso non autorizzato.');
    }
    
    if (user.status !== 'attivo') {
      throw new Error('Il tuo account non è attivo. Contatta l\'amministratore.');
    }
    
    console.log('✅ User authenticated successfully:', username);
    return {
      id: user.id,
      email: user.email || username,
      tenantId: user.tenantId || '00000000-0000-0000-0000-000000000001',
      roles: user.role ? [user.role] : ['user'],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      status: user.status
    };
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return null; // FAIL-CLOSED: Return null on any errors
  }
}

export function setupOAuth2Server(app: express.Application) {
  // Middleware for form parsing (required for OAuth2 flows)
  app.use(express.urlencoded({ extended: true }));
  // ==================== DISCOVERY ENDPOINT ====================
  app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      issuer: OAUTH2_CONFIG.issuer,
      authorization_endpoint: `${baseUrl}${OAUTH2_CONFIG.authorizationEndpoint}`,
      token_endpoint: `${baseUrl}${OAUTH2_CONFIG.tokenEndpoint}`,
      jwks_uri: `${baseUrl}${OAUTH2_CONFIG.jwksUri}`,
      userinfo_endpoint: `${baseUrl}${OAUTH2_CONFIG.userinfoEndpoint}`,
      revocation_endpoint: `${baseUrl}${OAUTH2_CONFIG.revocationEndpoint}`,
      introspection_endpoint: `${baseUrl}${OAUTH2_CONFIG.introspectionEndpoint}`,
      response_types_supported: OAUTH2_CONFIG.supportedResponseTypes,
      grant_types_supported: OAUTH2_CONFIG.supportedGrantTypes,
      scopes_supported: OAUTH2_CONFIG.supportedScopes,
      code_challenge_methods_supported: OAUTH2_CONFIG.codeChallengeMethods,
      token_endpoint_auth_methods_supported: OAUTH2_CONFIG.tokenEndpointAuthMethods
    });
  });

  // ==================== AUTHORIZATION ENDPOINT ====================
  app.get('/oauth2/authorize', async (req: Request, res: Response) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method
    } = req.query;

    // Validate required parameters
    if (!client_id || !redirect_uri || !response_type) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    // Validate client
    const client = registeredClients.get(client_id as string);
    if (!client) {
      return res.status(400).json({
        error: 'invalid_client',
        error_description: 'Unknown client'
      });
    }

    // Validate redirect URI
    if (!validateRedirectUri(client_id as string, redirect_uri as string)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid redirect URI'
      });
    }

    // Validate response type
    if (!client.responseTypes.includes(response_type as string)) {
      return res.status(400).json({
        error: 'unsupported_response_type',
        error_description: 'Client not authorized for this response type'
      });
    }

    // PKCE validation for public clients
    if (client.clientType === 'public' && !code_challenge) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'PKCE required for public clients'
      });
    }

    // Check if user has valid session - if so, auto-generate auth code
    const session = req.session as any;
    if (session?.userId && session?.tenantId) {
      console.log('🔐 [OAuth2] User has valid session, auto-generating auth code');
      
      // Fetch user data for the auth code
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        
        if (user) {
          // Generate authorization code automatically
          const authCode = generateSecureToken(32);
          
          authorizationCodes.set(authCode, {
            code: authCode,
            clientId: client_id as string,
            redirectUri: redirect_uri as string,
            scopes: scope ? (scope as string).split(' ') : ['openid'],
            userId: user.id,
            tenantId: session.tenantId,
            roles: user.roles,
            email: user.email,
            codeChallenge: code_challenge as string,
            codeChallengeMethod: code_challenge_method as string,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
          });

          // Redirect back to callback with auth code
          const callbackUrl = new URL(redirect_uri as string);
          callbackUrl.searchParams.set('code', authCode);
          if (state) callbackUrl.searchParams.set('state', state as string);
          
          console.log('✅ [OAuth2] Auto-authorized, redirecting to callback');
          return res.redirect(callbackUrl.toString());
        }
      } catch (err) {
        console.error('❌ [OAuth2] Error fetching user from session:', err);
      }
    }

    // No valid session - redirect to frontend /login page with OAuth2 parameters
    console.log('🔐 [OAuth2] No valid session, redirecting to /login');
    
    // Build the returnTo URL with all OAuth2 parameters
    const currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    const returnTo = encodeURIComponent(currentUrl.toString());
    
    // Redirect to frontend login page
    const loginUrl = `/login?returnTo=${returnTo}`;
    console.log('🔐 [OAuth2] Redirecting to:', loginUrl);
    
    return res.redirect(loginUrl);
  });

  // ==================== SIMPLE SESSION LOGIN (for external OAuth2 clients) ====================
  // This endpoint creates a session without doing the full OAuth2 flow
  // Used when external OAuth2 clients (ChatGPT, Claude) need to authenticate users
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    console.log('🔐 [Session Login] Attempting login for:', username);
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Username and password are required'
      });
    }
    
    try {
      const user = await getUserByCredentials(username, password);
      
      if (!user) {
        console.log('❌ [Session Login] Invalid credentials for:', username);
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Credenziali non valide'
        });
      }
      
      // Create session
      const session = req.session as any;
      session.userId = user.id;
      session.tenantId = user.tenantId;
      session.email = user.email;
      session.roles = user.roles;
      
      // Force session save
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log('✅ [Session Login] Session created for user:', user.id);
      console.log('✅ [Session Login] Session ID:', req.sessionID);
      
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId
        }
      });
    } catch (error) {
      console.error('❌ [Session Login] Error:', error);
      return res.status(500).json({
        error: 'server_error',
        message: 'Errore interno del server'
      });
    }
  });

  // ==================== AUTHORIZATION PROCESSING ====================
  app.post('/oauth2/authorize', async (req: Request, res: Response) => {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      username,
      password
    } = req.body;

    try {
      // Authenticate user
      const user = await getUserByCredentials(username, password);
      
      if (!user) {
        return res.status(401).send('Invalid credentials');
      }

      // Generate authorization code
      const authCode = generateSecureToken(32);
      
      // Store authorization code
      console.log(`🔐 [PKCE-SAVE] Storing code_challenge: ${code_challenge}`);
      console.log(`🔐 [PKCE-SAVE] Storing code_challenge_method: ${code_challenge_method}`);
      
      authorizationCodes.set(authCode, {
        code: authCode,
        clientId: client_id,
        redirectUri: redirect_uri,
        scopes: scope ? scope.split(' ') : ['openid'],
        userId: user.id,
        tenantId: user.tenantId,
        roles: user.roles, // 🔒 Include user roles for JWT generation
        email: user.email, // 🔒 Include email for userinfo
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // Return JSON with authorization code for fetch-based requests
      // Frontend expects JSON response, not redirect (fetch follows redirects and gets HTML)
      console.log('✅ User authenticated successfully:', username);
      console.log('🔑 Authorization code generated for client:', client_id);
      
      res.json({
        code: authCode,
        state: state || undefined,
        redirect_uri: redirect_uri
      });
    } catch (error) {
      console.error('OAuth2 authorization error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  });

  // ==================== TOKEN ENDPOINT ====================
  app.post('/oauth2/token', async (req: Request, res: Response) => {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
      refresh_token,
      scope
    } = req.body;

    try {
      if (grant_type === 'authorization_code') {
        // Validate authorization code
        const authCodeData = authorizationCodes.get(code);
        if (!authCodeData || authCodeData.expiresAt < new Date()) {
          authorizationCodes.delete(code);
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code expired or invalid'
          });
        }

        // Validate client and redirect URI
        if (authCodeData.clientId !== client_id || authCodeData.redirectUri !== redirect_uri) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid client or redirect URI'
          });
        }

        // PKCE validation
        if (authCodeData.codeChallenge) {
          if (!code_verifier || !validatePKCE(code_verifier, authCodeData.codeChallenge, authCodeData.codeChallengeMethod || 'S256')) {
            return res.status(400).json({
              error: 'invalid_grant',
              error_description: 'PKCE validation failed'
            });
          }
        }

        // Generate tokens
        // 🔒 SECURITY POLICY: 15-minute access token expiry (from config)
        const accessToken = jwt.sign(
          {
            sub: authCodeData.userId,
            aud: client_id,
            iss: OAUTH2_CONFIG.issuer,
            scope: authCodeData.scopes.join(' '),
            tenant_id: authCodeData.tenantId,
            client_id: client_id,
            roles: authCodeData.roles || ['user'], // 🔒 Include roles for RBAC
            email: authCodeData.email // 🔒 Include email for user context
          },
          JWT_SECRET,
          { expiresIn: `${config.ACCESS_TOKEN_EXPIRY_SEC}s` }
        );

        const refreshTokenValue = generateSecureToken(64);
        
        // Store refresh token
        // 🔒 SECURITY POLICY: 7-day refresh token expiry (from config)
        refreshTokens.set(refreshTokenValue, {
          refreshToken: refreshTokenValue,
          clientId: client_id,
          userId: authCodeData.userId,
          tenantId: authCodeData.tenantId,
          scopes: authCodeData.scopes,
          roles: authCodeData.roles || ['user'], // 🔒 Persist roles for token refresh
          email: authCodeData.email, // 🔒 Persist email for token refresh
          expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_EXPIRY_SEC * 1000)
        });

        // Clean up authorization code
        authorizationCodes.delete(code);

        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: config.ACCESS_TOKEN_EXPIRY_SEC,
          refresh_token: refreshTokenValue,
          scope: authCodeData.scopes.join(' ')
        });

      } else if (grant_type === 'refresh_token') {
        // Handle refresh token
        const refreshData = refreshTokens.get(refresh_token);
        if (!refreshData || refreshData.expiresAt < new Date()) {
          refreshTokens.delete(refresh_token);
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Refresh token expired or invalid'
          });
        }

        // Generate new access token
        // 🔒 SECURITY POLICY: 15-minute access token expiry (from config)
        const accessToken = jwt.sign(
          {
            sub: refreshData.userId,
            aud: refreshData.clientId,
            iss: OAUTH2_CONFIG.issuer,
            scope: refreshData.scopes.join(' '),
            tenant_id: refreshData.tenantId,
            client_id: refreshData.clientId,
            roles: (refreshData as any).roles || ['user'], // 🔒 Include roles for RBAC
            email: (refreshData as any).email // 🔒 Include email for user context
          },
          JWT_SECRET,
          { expiresIn: `${config.ACCESS_TOKEN_EXPIRY_SEC}s` }
        );

        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: config.ACCESS_TOKEN_EXPIRY_SEC,
          scope: refreshData.scopes.join(' ')
        });

      } else {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Grant type not supported'
        });
      }
    } catch (error) {
      console.error('OAuth2 token error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  });

  // ==================== USERINFO ENDPOINT ====================
  app.get('/oauth2/userinfo', async (req: Request, res: Response) => {
    // Development mode support (similar to /api/auth/session)
    if (process.env.NODE_ENV === 'development') {
      const sessionAuth = req.headers['x-auth-session'];
      const demoUser = req.headers['x-demo-user'];
      
      if (sessionAuth === 'authenticated') {
        const tenantId = req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
        
        // Return development user info matching OAuth2 standard
        const userInfo = {
          sub: 'admin-user',
          email: demoUser || 'admin@w3suite.com',
          email_verified: true,
          name: 'Admin User',
          given_name: 'Admin',
          family_name: 'User',
          tenant_id: tenantId,
          preferred_username: demoUser || 'admin@w3suite.com',
          updated_at: Math.floor(Date.now() / 1000)
        };
        
        return res.json(userInfo);
      }
    }
    
    // Production mode - require Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Bearer token required'
      });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Return user info based on scope
      const userInfo: any = {
        sub: decoded.sub,
        tenant_id: decoded.tenant_id
      };

      const scopes = decoded.scope?.split(' ') || [];
      
      if (scopes.includes('email')) {
        userInfo.email = 'admin@w3suite.com';
        userInfo.email_verified = true;
      }
      
      if (scopes.includes('profile')) {
        userInfo.name = 'Admin User';
        userInfo.given_name = 'Admin';
        userInfo.family_name = 'User';
      }

      res.json(userInfo);
    } catch (error) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token verification failed'
      });
    }
  });

  // ==================== TOKEN REVOCATION ====================
  app.post('/oauth2/revoke', (req: Request, res: Response) => {
    const { token, token_type_hint } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Token required'
      });
    }

    // Revoke refresh token
    if (refreshTokens.has(token)) {
      refreshTokens.delete(token);
    }

    // Always return 200 per OAuth2 spec
    res.status(200).json({});
  });

  // ==================== DYNAMIC CLIENT REGISTRATION (DCR) ====================
  // Required by ChatGPT for MCP OAuth2 flow per RFC 7591
  app.post('/oauth2/register', (req: Request, res: Response) => {
    const { 
      redirect_uris, 
      client_name, 
      grant_types = ['authorization_code', 'refresh_token'],
      response_types = ['code'],
      scope,
      token_endpoint_auth_method = 'none'
    } = req.body;

    // Validate required fields
    if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'redirect_uris is required and must be a non-empty array'
      });
    }

    // Generate a unique client_id for this dynamic registration
    const clientId = `dyn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Store the dynamic client (in production: persist to database)
    const dynamicClient: OAuthClient = {
      clientId,
      clientSecret: undefined, // Public client for PKCE
      redirectUris: redirect_uris,
      grantTypes: grant_types,
      responseTypes: response_types,
      scopes: scope ? scope.split(' ') : ['mcp_read', 'mcp_write', 'tenant_access'],
      clientType: 'public',
      name: client_name || 'Dynamic MCP Client'
    };

    // Add to clients map
    oauthClients.set(clientId, dynamicClient);

    // Return client information per RFC 7591
    res.status(201).json({
      client_id: clientId,
      client_name: dynamicClient.name,
      redirect_uris: dynamicClient.redirectUris,
      grant_types: dynamicClient.grantTypes,
      response_types: dynamicClient.responseTypes,
      scope: dynamicClient.scopes?.join(' '),
      token_endpoint_auth_method: 'none',
      client_id_issued_at: Math.floor(Date.now() / 1000),
    });
  });

  // OAuth2 Authorization Server initialized
}