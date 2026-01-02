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
import { users, tenants } from '../db/schema/w3suite';
import { eq, and, sql } from 'drizzle-orm';
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

// Load dynamic clients from database on startup
async function loadDynamicClientsFromDB(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT client_id, client_name, redirect_uris, grant_types, response_types, scopes, client_type
      FROM w3suite.oauth2_dynamic_clients
    `);
    
    const rows = result.rows as any[];
    for (const row of rows) {
      const dynamicClient: OAuth2Client = {
        clientId: row.client_id,
        clientSecret: undefined,
        redirectUris: row.redirect_uris || [],
        grantTypes: row.grant_types || ['authorization_code', 'refresh_token'],
        responseTypes: row.response_types || ['code'],
        scopes: row.scopes || ['mcp_read', 'mcp_write', 'tenant_access'],
        clientType: row.client_type || 'public',
        name: row.client_name || 'Dynamic MCP Client'
      };
      registeredClients.set(row.client_id, dynamicClient);
    }
    console.log(`✅ [OAuth2] Loaded ${rows.length} dynamic clients from database`);
  } catch (error) {
    console.error('❌ [OAuth2] Failed to load dynamic clients from DB:', error);
  }
}

// Save dynamic client to database
async function saveDynamicClientToDB(client: OAuth2Client): Promise<void> {
  try {
    // Convert arrays to PostgreSQL array literal format
    const redirectUrisArr = `{${client.redirectUris.map(u => `"${u.replace(/"/g, '\\"')}"`).join(',')}}`;
    const grantTypesArr = `{${client.grantTypes.map(g => `"${g}"`).join(',')}}`;
    const responseTypesArr = `{${client.responseTypes.map(r => `"${r}"`).join(',')}}`;
    const scopesArr = `{${client.scopes.map(s => `"${s}"`).join(',')}}`;
    
    await db.execute(sql`
      INSERT INTO w3suite.oauth2_dynamic_clients 
      (client_id, client_name, redirect_uris, grant_types, response_types, scopes, client_type)
      VALUES (
        ${client.clientId}, 
        ${client.name}, 
        ${redirectUrisArr}::text[], 
        ${grantTypesArr}::text[], 
        ${responseTypesArr}::text[], 
        ${scopesArr}::text[], 
        ${client.clientType}
      )
      ON CONFLICT (client_id) DO UPDATE SET
        client_name = EXCLUDED.client_name,
        redirect_uris = EXCLUDED.redirect_uris,
        grant_types = EXCLUDED.grant_types,
        response_types = EXCLUDED.response_types,
        scopes = EXCLUDED.scopes,
        client_type = EXCLUDED.client_type
    `);
    console.log(`✅ [OAuth2] Saved dynamic client ${client.clientId} to database`);
  } catch (error) {
    console.error('❌ [OAuth2] Failed to save dynamic client to DB:', error);
    throw error;
  }
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

async function getUserByCredentialsWithTenant(tenantSlug: string, username: string, password: string) {
  try {
    // First, resolve tenant by slug
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug.toLowerCase()))
      .limit(1);
    
    if (!tenant) {
      console.log('❌ Tenant not found:', tenantSlug);
      return null;
    }
    
    // Query user by email AND tenant
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, username),
        eq(users.tenantId, tenant.id)
      ))
      .limit(1);
    
    if (!user) {
      console.log('❌ User not found in tenant:', username, tenantSlug);
      return null;
    }
    
    // Verify password
    if (!user.passwordHash) {
      console.log('❌ No password hash for user:', username);
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      return null;
    }
    
    // Check user status
    if (user.status === 'sospeso') {
      throw new Error('Il tuo account è stato sospeso.');
    }
    if (user.status === 'off-boarding') {
      throw new Error('Il tuo account è in fase di off-boarding.');
    }
    if (user.status !== 'attivo') {
      throw new Error('Il tuo account non è attivo.');
    }
    
    console.log('✅ User authenticated with tenant:', username, tenantSlug);
    return {
      id: user.id,
      email: user.email || username,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      roles: user.role ? [user.role] : ['user'],
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      status: user.status
    };
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    if (error.message) throw error;
    return null;
  }
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

    // No valid session - differentiate between internal (frontend) and external (ChatGPT) flows
    console.log('🔐 [OAuth2] No valid session, checking client type');
    
    // INTERNAL FLOW: w3suite-frontend should redirect to tenant-specific login
    if (client_id === 'w3suite-frontend') {
      // Extract tenant from: tenant_hint query param, cookie, or Referer header
      const tenantHint = req.query.tenant_hint as string;
      const referer = req.get('Referer') || '';
      const tenantFromReferer = referer.match(/\/([a-zA-Z0-9_-]+)\//)?.[1];
      const tenantFromCookie = req.cookies?.tenant_slug;
      
      // Candidate tenant slug (will be validated)
      const candidateTenant = tenantHint || tenantFromCookie || tenantFromReferer;
      
      console.log('🔐 [OAuth2] Internal client detected, validating tenant');
      console.log(`🔐 [OAuth2] Candidate tenant: ${candidateTenant} (hint: ${tenantHint}, cookie: ${tenantFromCookie}, referer: ${tenantFromReferer})`);
      
      // SECURITY: Validate tenant slug format (alphanumeric, hyphen, underscore only)
      const validSlugPattern = /^[a-zA-Z0-9_-]{1,50}$/;
      if (!candidateTenant || !validSlugPattern.test(candidateTenant)) {
        console.log('❌ [OAuth2] Invalid tenant slug format, returning error');
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid or missing tenant identifier'
        });
      }
      
      // SECURITY: Validate tenant exists in database
      try {
        const [validTenant] = await db
          .select({ slug: tenants.slug })
          .from(tenants)
          .where(eq(tenants.slug, candidateTenant.toLowerCase()))
          .limit(1);
        
        if (!validTenant) {
          console.log('❌ [OAuth2] Tenant not found in database:', candidateTenant);
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Unknown organization'
          });
        }
        
        const tenantSlug = validTenant.slug;
        console.log('✅ [OAuth2] Tenant validated, redirecting to tenant login:', tenantSlug);
        
        // Build returnTo with all OAuth2 params
        const returnToUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
        const encodedReturnTo = encodeURIComponent(returnToUrl.toString());
        
        // Redirect to tenant-specific login page (using validated slug from DB)
        return res.redirect(`/${tenantSlug}/login?returnTo=${encodedReturnTo}`);
      } catch (err) {
        console.error('❌ [OAuth2] Error validating tenant:', err);
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to validate organization'
        });
      }
    }
    
    // EXTERNAL FLOW: Show OAuth2 login page with Organization field
    console.log('🔐 [OAuth2] External client, showing OAuth2 login page');
    
    // Build the returnTo URL with all OAuth2 parameters
    const currentUrl = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    
    // Serve HTML login page for OAuth2 flow
    const loginPageHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>W3 Suite - Autorizzazione OAuth</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 16px;
      padding: 48px 40px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
    }
    .logo-icon svg { width: 32px; height: 32px; fill: white; }
    .logo h1 { font-size: 24px; color: #0f172a; font-weight: 700; letter-spacing: -0.5px; }
    .logo p { color: #64748b; font-size: 15px; margin-top: 6px; font-weight: 500; }
    .client-info {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .client-icon {
      width: 48px;
      height: 48px;
      background: #0ea5e9;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .client-icon svg { width: 24px; height: 24px; fill: white; }
    .client-text { flex: 1; }
    .client-text strong { color: #0c4a6e; font-size: 15px; display: block; }
    .client-text .scopes {
      font-size: 13px;
      color: #0369a1;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .scope-badge {
      background: #0ea5e9;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .form-group { margin-bottom: 24px; }
    .form-group.org-group { margin-bottom: 28px; }
    .label-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    label {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }
    .info-icon {
      width: 18px;
      height: 18px;
      background: #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: help;
      position: relative;
    }
    .info-icon svg { width: 12px; height: 12px; fill: #64748b; }
    .info-icon:hover .tooltip { display: block; }
    .tooltip {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 400;
      width: 200px;
      text-align: center;
      margin-bottom: 8px;
      z-index: 10;
    }
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #1e293b;
    }
    .input-wrapper {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      fill: #94a3b8;
      pointer-events: none;
    }
    input {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 16px;
      transition: all 0.2s ease;
      background: #f8fafc;
    }
    input::placeholder { color: #94a3b8; }
    input:hover { border-color: #cbd5e1; background: #ffffff; }
    input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    .org-input {
      font-size: 18px;
      font-weight: 500;
      padding: 16px 16px 16px 52px;
    }
    button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    button:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      box-shadow: 0 8px 20px -8px rgba(37, 99, 235, 0.5);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }
    button svg { width: 20px; height: 20px; fill: currentColor; }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 14px 16px;
      border-radius: 10px;
      margin-bottom: 24px;
      font-size: 14px;
      display: none;
      align-items: center;
      gap: 10px;
    }
    .error svg { width: 20px; height: 20px; fill: #dc2626; flex-shrink: 0; }
    .footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { font-size: 13px; color: #64748b; line-height: 1.5; }
    .footer a { color: #3b82f6; text-decoration: none; font-weight: 500; }
    .footer a:hover { text-decoration: underline; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
    .divider span { color: #94a3b8; font-size: 13px; white-space: nowrap; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <h1>W3 Suite</h1>
      <p>Autorizzazione OAuth Client</p>
    </div>
    
    <div class="client-info">
      <div class="client-icon">
        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/></svg>
      </div>
      <div class="client-text">
        <strong>Applicazione esterna richiede accesso</strong>
        <div class="scopes">
          Permessi richiesti: 
          <span class="scope-badge">lettura</span>
          <span class="scope-badge">scrittura</span>
        </div>
      </div>
    </div>
    
    <div class="error" id="error">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <span id="errorText"></span>
    </div>
    
    <form id="loginForm">
      <div class="form-group org-group">
        <div class="label-row">
          <label for="tenant">Organizzazione</label>
          <div class="info-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-6h2v6zm0-8h-2V7h2v4z"/></svg>
            <div class="tooltip">Inserisci il codice della tua organizzazione (es. staging, windtre)</div>
          </div>
        </div>
        <div class="input-wrapper">
          <svg class="input-icon" viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
          <input type="text" id="tenant" name="tenant" class="org-input" required autocomplete="organization" placeholder="Codice organizzazione">
        </div>
      </div>
      
      <div class="divider"><span>Credenziali di accesso</span></div>
      
      <div class="form-group">
        <div class="label-row">
          <label for="email">Email</label>
        </div>
        <div class="input-wrapper">
          <svg class="input-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="nome@azienda.it">
        </div>
      </div>
      
      <div class="form-group">
        <div class="label-row">
          <label for="password">Password</label>
        </div>
        <div class="input-wrapper">
          <svg class="input-icon" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
          <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="Password">
        </div>
      </div>
      
      <button type="submit" id="submitBtn">
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        Autorizza e Accedi
      </button>
    </form>
    
    <div class="footer">
      <p>Accedendo autorizzi l'applicazione ad accedere ai tuoi dati W3 Suite.<br>
      <a href="https://w3suite.it/privacy">Informativa Privacy</a></p>
    </div>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('submitBtn');
      const errorDiv = document.getElementById('error');
      const errorText = document.getElementById('errorText');
      
      btn.disabled = true;
      btn.innerHTML = '<svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg> Autenticazione...';
      errorDiv.style.display = 'none';
      
      const tenant = document.getElementById('tenant').value.trim().toLowerCase();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/oauth2/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_slug: tenant,
            username: email,
            password: password,
            client_id: '${client_id}',
            redirect_uri: '${redirect_uri}',
            response_type: '${response_type}',
            scope: '${scope || ''}',
            state: '${state || ''}',
            code_challenge: '${code_challenge || ''}',
            code_challenge_method: '${code_challenge_method || ''}'
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.code) {
          // Success! Redirect to callback with authorization code
          const redirectUrl = new URL(data.redirect_uri);
          redirectUrl.searchParams.set('code', data.code);
          if (data.state) redirectUrl.searchParams.set('state', data.state);
          window.location.href = redirectUrl.toString();
        } else {
          errorText.textContent = data.message || 'Credenziali non valide';
          errorDiv.style.display = 'flex';
          btn.disabled = false;
          btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Autorizza e Accedi';
        }
      } catch (err) {
        errorText.textContent = 'Errore di connessione. Riprova.';
        errorDiv.style.display = 'flex';
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Autorizza e Accedi';
      }
    });
  </script>
  <style>
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(loginPageHtml);
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
      tenant_slug,
      username,
      password
    } = req.body;

    try {
      // Authenticate user with tenant context
      let user;
      if (tenant_slug) {
        // OAuth2 external flow: requires tenant_slug
        user = await getUserByCredentialsWithTenant(tenant_slug, username, password);
      } else {
        // Legacy fallback (internal use only)
        user = await getUserByCredentials(username, password);
      }
      
      if (!user) {
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Credenziali non valide o organizzazione errata'
        });
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
  app.post('/oauth2/register', async (req: Request, res: Response) => {
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
    
    // Store the dynamic client with database persistence
    const dynamicClient: OAuth2Client = {
      clientId,
      clientSecret: undefined, // Public client for PKCE
      redirectUris: redirect_uris,
      grantTypes: grant_types,
      responseTypes: response_types,
      scopes: scope ? scope.split(' ') : ['mcp_read', 'mcp_write', 'tenant_access'],
      clientType: 'public',
      name: client_name || 'Dynamic MCP Client'
    };

    try {
      // Persist to database for survival across restarts
      await saveDynamicClientToDB(dynamicClient);
      
      // Add to clients map
      registeredClients.set(clientId, dynamicClient);

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
    } catch (error) {
      console.error('❌ [OAuth2] DCR failed:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to register client'
      });
    }
  });

  // Load dynamic clients from database on startup
  loadDynamicClientsFromDB().catch(err => {
    console.error('❌ [OAuth2] Initial client load failed:', err);
  });

  // OAuth2 Authorization Server initialized
}