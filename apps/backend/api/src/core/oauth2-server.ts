/**
 * W3 Suite OAuth2 Authorization Server
 * Enterprise-grade OAuth2 implementation following RFC 6749 + PKCE
 */

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

// OAuth2 Configuration Enterprise
const OAUTH2_CONFIG = {
  issuer: process.env.OAUTH2_ISSUER || 'https://auth.w3suite.com',
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
    'admin'
  ],
  codeChallengeMethods: ['S256'], // PKCE required
  tokenEndpointAuthMethods: ['client_secret_basic', 'client_secret_post', 'none']
};

const JWT_SECRET = process.env.JWT_SECRET || 'w3suite-oauth2-secret';

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
      'http://localhost:5000/auth/callback',
      'https://*.w3suite.com/auth/callback'
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
  if (method !== 'S256') return false;
  
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}

function validateRedirectUri(clientId: string, redirectUri: string): boolean {
  const client = registeredClients.get(clientId);
  if (!client) return false;
  
  return client.redirectUris.some(uri => {
    if (uri.includes('*')) {
      const pattern = uri.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(redirectUri);
    }
    return uri === redirectUri;
  });
}

async function getUserByCredentials(username: string, password: string) {
  // For demo: admin/admin123
  if (username === 'admin' && password === 'admin123') {
    return {
      id: 'admin-user',
      email: 'admin@w3suite.com',
      tenantId: '00000000-0000-0000-0000-000000000001',
      roles: ['super_admin', 'tenant_admin'],
      firstName: 'Admin',
      lastName: 'User'
    };
  }
  return null;
}

export function setupOAuth2Server(app: express.Application) {
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
  app.get('/oauth2/authorize', (req: Request, res: Response) => {
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

    // Render login form (in produzione: redirect to login page)
    const loginFormHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>W3 Suite OAuth2 Login</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
          .form { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 30px; color: #FF6900; font-size: 24px; font-weight: bold; }
          input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
          button { width: 100%; padding: 12px; background: linear-gradient(135deg, #FF6900, #ff8533); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
          button:hover { background: linear-gradient(135deg, #e55a00, #ff7020); }
          .client-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="form">
          <div class="logo">🔐 W3 Suite</div>
          <div class="client-info">
            <strong>${client.name}</strong> wants to access your account
            <br><small>Scopes: ${scope || client.scopes.join(', ')}</small>
          </div>
          <form method="POST" action="/oauth2/authorize">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="response_type" value="${response_type}">
            <input type="hidden" name="scope" value="${scope || ''}">
            <input type="hidden" name="state" value="${state || ''}">
            <input type="hidden" name="code_challenge" value="${code_challenge || ''}">
            <input type="hidden" name="code_challenge_method" value="${code_challenge_method || ''}">
            
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Authorize</button>
          </form>
        </div>
      </body>
      </html>
    `;

    res.send(loginFormHtml);
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
      authorizationCodes.set(authCode, {
        code: authCode,
        clientId: client_id,
        redirectUri: redirect_uri,
        scopes: scope ? scope.split(' ') : ['openid'],
        userId: user.id,
        tenantId: user.tenantId,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // Redirect with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);

      res.redirect(redirectUrl.toString());
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
        const accessToken = jwt.sign(
          {
            sub: authCodeData.userId,
            aud: client_id,
            iss: OAUTH2_CONFIG.issuer,
            scope: authCodeData.scopes.join(' '),
            tenant_id: authCodeData.tenantId,
            client_id: client_id
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        const refreshTokenValue = generateSecureToken(64);
        
        // Store refresh token
        refreshTokens.set(refreshTokenValue, {
          refreshToken: refreshTokenValue,
          clientId: client_id,
          userId: authCodeData.userId,
          tenantId: authCodeData.tenantId,
          scopes: authCodeData.scopes,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        // Clean up authorization code
        authorizationCodes.delete(code);

        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
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
        const accessToken = jwt.sign(
          {
            sub: refreshData.userId,
            aud: refreshData.clientId,
            iss: OAUTH2_CONFIG.issuer,
            scope: refreshData.scopes.join(' '),
            tenant_id: refreshData.tenantId,
            client_id: refreshData.clientId
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );

        return res.json({
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
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
  app.get('/oauth2/userinfo', (req: Request, res: Response) => {
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

  console.log('✅ OAuth2 Authorization Server initialized');
  console.log('🔍 Discovery: /.well-known/oauth-authorization-server');
  console.log('🔐 Authorize: /oauth2/authorize');
  console.log('🎫 Token: /oauth2/token');
}