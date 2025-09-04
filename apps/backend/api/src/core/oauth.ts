import * as openid from 'openid-client';
import { SignJWT, jwtVerify } from 'jose';
import type { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';
import session from 'express-session';

// ==================== OAUTH2/OIDC CONFIGURATION ====================

interface OAuthConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface UserClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  tenant_id?: string;
  roles?: string[];
}

interface UserSession {
  userId: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
  scope: 'tenant' | 'rs' | 'store' | 'brand' | 'system';
  scopeId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  mfaVerified: boolean;
  lastMfaAt?: number;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

interface MeResponse {
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    profileImageUrl?: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  roles: string[];
  permissions: string[];
  scope: {
    type: 'tenant' | 'rs' | 'store' | 'brand' | 'system';
    id?: string;
    name?: string;
  };
  capabilities: string[];
  mfaRequired: boolean;
}

// ==================== OAUTH CLIENT SETUP ====================

let oauthClient: any;
let issuer: any;

const config: OAuthConfig = {
  issuerUrl: process.env.OAUTH_ISSUER_URL || 'http://localhost:8080/realms/w3suite',
  clientId: process.env.OAUTH_CLIENT_ID || 'w3suite-frontend',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
  scopes: ['openid', 'profile', 'email', 'roles', 'tenant_access']
};

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'w3suite-jwt-secret-key');

export async function initializeOAuth() {
  try {
    console.log('Attempting to initialize OAuth client...');
    // For development, just use a mock client to avoid network issues
    console.warn('Using mock OAuth client for development');
    issuer = {
      issuer: config.issuerUrl,
      authorization_endpoint: `${config.issuerUrl}/protocol/openid-connect/auth`,
      token_endpoint: `${config.issuerUrl}/protocol/openid-connect/token`,
      userinfo_endpoint: `${config.issuerUrl}/protocol/openid-connect/userinfo`,
      end_session_endpoint: `${config.issuerUrl}/protocol/openid-connect/logout`,
    };
    
    oauthClient = {
      authorizationUrl: () => `${config.issuerUrl}/auth`,
      callback: () => Promise.resolve({}),
      userinfo: () => Promise.resolve({}),
    };
    
    console.log('Mock OAuth client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OAuth client:', error);
    throw error;
  }
}

// ==================== SESSION MANAGEMENT ====================

async function createJWT(payload: UserSession): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(jwtSecret);
}

async function verifyJWT(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as UserSession;
  } catch {
    return null;
  }
}

// ==================== RLS HELPER ====================

export async function setTenantContext(tenantId?: string) {
  if (tenantId) {
    await db.execute(sql`SET app.tenant_id = ${tenantId}`);
  } else {
    await db.execute(sql`SET app.tenant_id = NULL`);
  }
}

// ==================== CAPABILITY CALCULATION ====================

function calculateCapabilities(roles: string[], permissions: string[], scope: string): string[] {
  const capabilities: string[] = [];
  
  // Base capabilities from roles
  const roleCapabilities: Record<string, string[]> = {
    'super_admin': ['*'],
    'tenant_admin': ['tenant.*', 'user.manage', 'store.manage', 'report.view'],
    'store_manager': ['store.manage', 'pos.operate', 'inventory.manage', 'customer.manage'],
    'cashier': ['pos.operate', 'customer.view'],
    'user': ['profile.view']
  };

  // Add role-based capabilities
  roles.forEach(role => {
    const roleCaps = roleCapabilities[role] || [];
    capabilities.push(...roleCaps);
  });

  // Add specific permissions
  capabilities.push(...permissions);

  // Remove duplicates
  return Array.from(new Set(capabilities));
}

// ==================== MFA HELPERS ====================

function requiresMFA(action: string): boolean {
  const mfaActions = [
    'billing.*',
    'brand.deploy',
    'data.export',
    'user.delete',
    'tenant.delete',
    'settings.security'
  ];
  
  return mfaActions.some(pattern => 
    pattern.endsWith('*') 
      ? action.startsWith(pattern.slice(0, -1))
      : action === pattern
  );
}

function isMFAValid(session: UserSession): boolean {
  if (!session.mfaVerified) return false;
  if (!session.lastMfaAt) return false;
  
  // MFA valid for 30 minutes
  const mfaValidityMs = 30 * 60 * 1000;
  return (Date.now() - session.lastMfaAt) < mfaValidityMs;
}

// ==================== MIDDLEWARE ====================

export function requireAuth(requireMFA = false) {
  return async (req: Request & { user?: UserSession }, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.w3_session || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          error: 'unauthorized',
          message: 'No authentication token provided',
          loginUrl: '/api/auth/login'
        });
      }

      const session = await verifyJWT(token);
      if (!session) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Invalid or expired token',
          loginUrl: '/api/auth/login'
        });
      }

      // Check token expiry
      if (Date.now() >= session.expiresAt * 1000) {
        return res.status(401).json({ 
          error: 'token_expired',
          message: 'Token has expired',
          loginUrl: '/api/auth/login'
        });
      }

      // Check MFA requirement
      if (requireMFA && !isMFAValid(session)) {
        return res.status(403).json({ 
          error: 'mfa_required',
          message: 'Multi-factor authentication required',
          mfaUrl: '/api/auth/mfa'
        });
      }

      // Set tenant context for RLS
      await setTenantContext(session.tenantId);
      
      req.user = session;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ 
        error: 'auth_error',
        message: 'Authentication error' 
      });
    }
  };
}

export function requirePermission(permission: string) {
  return (req: Request & { user?: UserSession }, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Authentication required' 
      });
    }

    const capabilities = calculateCapabilities(
      req.user.roles, 
      req.user.permissions, 
      req.user.scope
    );

    // Check if user has permission or wildcard
    const hasPermission = capabilities.includes('*') || 
                         capabilities.includes(permission) ||
                         capabilities.some(cap => cap.endsWith('*') && permission.startsWith(cap.slice(0, -1)));

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'insufficient_permissions',
        message: `Permission '${permission}' required` 
      });
    }

    // Check MFA for sensitive actions
    if (requiresMFA(permission) && !isMFAValid(req.user)) {
      return res.status(403).json({ 
        error: 'mfa_required',
        message: 'Multi-factor authentication required for this action',
        mfaUrl: '/api/auth/mfa'
      });
    }

    next();
  };
}

// ==================== ROUTES SETUP ====================

export function setupOAuthRoutes(app: Express) {
  app.use(cookieParser());

  // Login - redirect to OAuth provider
  app.get('/api/auth/login', async (req, res) => {
    try {
      if (!oauthClient) {
        await initializeOAuth();
      }

      const codeVerifier = openid.generators.codeVerifier();
      const codeChallenge = openid.generators.codeChallenge(codeVerifier);
      const state = openid.generators.state();

      // Store PKCE values in session
      (req as any).session = (req as any).session || {};
      (req as any).session.codeVerifier = codeVerifier;
      (req as any).session.state = state;

      const authUrl = oauthClient?.authorizationUrl({
        scope: config.scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      }) || `${config.issuerUrl}/protocol/openid-connect/auth?` +
        `client_id=${config.clientId}&` +
        `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256&` +
        `state=${state}`;

      res.redirect(authUrl);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'login_failed' });
    }
  });

  // OAuth callback
  app.get('/api/auth/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'invalid_callback' });
      }

      if (state !== (req as any).session?.state) {
        return res.status(400).json({ error: 'invalid_state' });
      }

      const codeVerifier = (req as any).session?.codeVerifier;
      if (!codeVerifier) {
        return res.status(400).json({ error: 'missing_code_verifier' });
      }

      // Exchange code for tokens
      let tokenSet: any;
      
      if (oauthClient) {
        tokenSet = await oauthClient.callback(config.redirectUri, { code, state }, { 
          code_verifier: codeVerifier 
        });
      } else {
        // Mock token exchange for development
        const mockClaims = {
          sub: 'mock_user_id',
          email: 'admin@w3suite.com',
          given_name: 'Admin',
          family_name: 'User',
          roles: ['super_admin'],
          tenant_id: 'default_tenant'
        };
        
        tokenSet = {
          access_token: 'mock_access_token',
          id_token: 'mock_id_token',
          refresh_token: 'mock_refresh_token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          claims: () => mockClaims
        } as any;
      }

      // Extract user claims
      const claims = tokenSet.claims() as UserClaims;
      
      // Upsert user in database
      const userData = {
        id: claims.sub,
        email: claims.email,
        firstName: claims.given_name,
        lastName: claims.family_name,
        profileImageUrl: claims.picture,
        lastLoginAt: new Date(),
      };

      const user = await storage.upsertUser(userData);

      // Get user roles and permissions
      const userRoles = await storage.getUserTenantRoles(user.id);
      const roles = userRoles.map(ur => ur.role);
      const permissions: string[] = []; // TODO: Calculate from roles

      // Create session
      const session: UserSession = {
        userId: user.id,
        tenantId: claims.tenant_id || userRoles[0]?.tenantId,
        roles,
        permissions,
        scope: 'tenant', // TODO: Calculate based on roles
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token,
        expiresAt: tokenSet.expires_at || Math.floor(Date.now() / 1000) + 3600,
        mfaVerified: false, // Require MFA verification
        lastMfaAt: undefined,
      };

      // Create JWT session token
      const sessionToken = await createJWT(session);

      // Set secure cookie
      res.cookie('w3_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: session.expiresAt * 1000 - Date.now(),
      });

      // Redirect to app
      res.redirect('/');
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ error: 'callback_failed' });
    }
  });

  // Get current user info (/me endpoint)
  app.get('/api/auth/me', requireAuth(), async (req: any, res: Response) => {
    try {
      const session = req.user!;
      
      // Get user details
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ error: 'user_not_found' });
      }

      // Get tenant details if applicable
      let tenant;
      if (session.tenantId) {
        tenant = await storage.getTenant(session.tenantId);
      }

      // Calculate capabilities
      const capabilities = calculateCapabilities(session.roles, session.permissions, session.scope);

      const response: MeResponse = {
        user: {
          id: user.id,
          email: user.email || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          profileImageUrl: user.profileImageUrl || undefined,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
        } : undefined,
        roles: session.roles,
        permissions: session.permissions,
        scope: {
          type: session.scope,
          id: session.scopeId,
          name: tenant?.name,
        },
        capabilities,
        mfaRequired: !session.mfaVerified,
      };

      res.json(response);
    } catch (error) {
      console.error('Me endpoint error:', error);
      res.status(500).json({ error: 'me_failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', async (req, res) => {
    try {
      // Clear session cookie
      res.clearCookie('w3_session');
      
      // TODO: Revoke tokens at OAuth provider
      
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'logout_failed' });
    }
  });

  // MFA endpoint (placeholder)
  app.get('/api/auth/mfa', requireAuth(), (req: any, res: Response) => {
    res.json({ 
      message: 'MFA implementation required',
      methods: ['totp', 'sms', 'email']
    });
  });
}

// Exports are already defined above