// W3 Suite - OAuth2/OIDC Enterprise Authentication System
// Architettura: OAuth2 + OpenID Connect + MFA + Row Level Security (RLS)
// Documento: replit.md - Sezione "ARCHITETTURA SICUREZZA ENTERPRISE"

import { Request, Response, NextFunction, Express } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'crypto';
import cookieParser from 'cookie-parser';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { storage } from './storage';

// ==================== INTERFACES ENTERPRISE ====================

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

// ==================== CONFIGURAZIONE OAUTH2/OIDC ====================

let oauthClient: any;
let issuer: any;

const config: OAuthConfig = {
  issuerUrl: process.env.OAUTH_ISSUER_URL || 'http://localhost:8080/realms/w3suite',
  clientId: process.env.OAUTH_CLIENT_ID || 'w3suite-frontend',
  clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
  scopes: ['openid', 'profile', 'email', 'roles', 'tenant_access']
};

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'w3suite-secret-key-2025');

export async function initializeOAuth() {
  try {
    console.log('🔐 Initializing W3 Suite OAuth2/OIDC Enterprise Authentication...');
    
    // Per development, mock client per evitare dipendenze esterne
    console.warn('⚠️  Using mock OAuth2 client for development');
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
    
    console.log('✅ OAuth2/OIDC Enterprise client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OAuth2/OIDC client:', error);
    throw error;
  }
}

// ==================== SESSION MANAGEMENT ENTERPRISE ====================

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

// ==================== ROW LEVEL SECURITY (RLS) HELPER ====================

export async function setTenantContext(tenantId?: string) {
  if (tenantId) {
    await db.execute(sql`SET app.tenant_id = ${tenantId}`);
  } else {
    await db.execute(sql`SET app.tenant_id = NULL`);
  }
}

// ==================== CAPABILITY CALCULATION ENTERPRISE ====================

function calculateCapabilities(roles: string[], permissions: string[], scope: string): string[] {
  const capabilities: string[] = [];
  
  // Base capabilities from roles - Enterprise hierarchy
  const roleCapabilities: Record<string, string[]> = {
    // Super Admin - Sistema completo
    'super_admin': ['*'],
    
    // Brand Level - Cross-tenant operations  
    'brand_admin': ['brand.*', 'tenant.manage', 'campaign.deploy', 'pricing.manage'],
    'brand_analyst': ['brand.analytics.*', 'tenant.view', 'report.export'],
    
    // Tenant Level - Organizzazione
    'tenant_admin': ['tenant.*', 'user.manage', 'store.manage', 'report.view'],
    'tenant_manager': ['tenant.operate', 'store.view', 'user.view', 'report.view'],
    
    // Store Level - Punto vendita
    'store_manager': ['store.manage', 'pos.operate', 'inventory.manage', 'customer.manage'],
    'cashier': ['pos.operate', 'customer.view', 'inventory.view'],
    'sales_rep': ['customer.manage', 'contract.create', 'lead.manage'],
    
    // Base user
    'user': ['profile.view', 'profile.edit']
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

// ==================== MFA ENTERPRISE HELPERS ====================

function requiresMFA(action: string): boolean {
  // Azioni che richiedono MFA obbligatorio
  const mfaActions = [
    'billing.*',
    'brand.deploy',
    'data.export',
    'user.delete',
    'tenant.delete',
    'settings.security',
    'payment.process',
    'contract.cancel'
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
  
  // MFA valid for 30 minutes per security policy
  const mfaValidityMs = 30 * 60 * 1000;
  return (Date.now() - session.lastMfaAt) < mfaValidityMs;
}

// ==================== MIDDLEWARE ENTERPRISE ====================

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

      // Set tenant context for RLS - Critical for multitenant
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

    // Super admin wildcard
    if (capabilities.includes('*')) {
      return next();
    }

    // Check exact permission or wildcard patterns
    const hasPermission = capabilities.some(cap => {
      if (cap === permission) return true;
      if (cap.endsWith('*') && permission.startsWith(cap.slice(0, -1))) return true;
      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'insufficient_permissions',
        message: `Permission '${permission}' required`,
        required: permission,
        available: capabilities
      });
    }

    next();
  };
}

// ==================== OAUTH2/OIDC ROUTES ENTERPRISE ====================

export function setupOAuthRoutes(app: Express) {
  app.use(cookieParser());

  // OAuth2 Login - Authorization Code + PKCE flow
  app.get('/api/auth/login', async (req, res) => {
    try {
      if (!oauthClient) {
        await initializeOAuth();
      }

      const codeVerifier = randomBytes(32).toString('base64url');
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      const state = randomBytes(32).toString('base64url');

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

  // OAuth2 Callback - Authorization Code processing
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
          sub: 'dev_user_' + Date.now(),
          email: 'admin@w3suite.com',
          given_name: 'Admin',
          family_name: 'User',
          roles: ['super_admin'],
          tenant_id: '00000000-0000-0000-0000-000000000001'
        };
        
        tokenSet = {
          claims: () => mockClaims,
          access_token: 'mock_access_token_' + Date.now(),
          refresh_token: 'mock_refresh_token_' + Date.now()
        };
      }

      const claims = tokenSet.claims();
      
      // Create user session with enterprise roles/permissions
      const tenantRoles = claims.roles || ['user'];
      const permissions: string[] = []; // Load from database based on roles
      
      const session: UserSession = {
        userId: claims.sub,
        tenantId: claims.tenant_id,
        roles: tenantRoles,
        permissions,
        scope: 'tenant', // Default scope
        scopeId: claims.tenant_id,
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        mfaVerified: false, // Requires MFA verification
        lastMfaAt: undefined
      };

      const jwt = await createJWT(session);

      // Set secure HTTP-only cookie
      res.cookie('w3_session', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.redirect('/');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/login?error=callback_failed');
    }
  });

  // Get current user info - Enterprise endpoint
  app.get('/api/auth/me', requireAuth(), async (req, res) => {
    try {
      const session = (req as any).user as UserSession;
      
      // Fetch user details from database
      const user = await storage.getUser(session.userId);
      const tenant = session.tenantId ? await storage.getTenant(session.tenantId) : undefined;
      
      const capabilities = calculateCapabilities(
        session.roles, 
        session.permissions, 
        session.scope
      );
      
      const response: MeResponse = {
        user: {
          id: session.userId,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email,
          profileImageUrl: user?.profileImageUrl
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug || '', // Handle null slug
          type: tenant.type
        } : undefined,
        roles: session.roles,
        permissions: session.permissions,
        scope: {
          type: session.scope,
          id: session.scopeId,
          name: tenant?.name
        },
        capabilities,
        mfaRequired: !session.mfaVerified
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ error: 'user_info_failed' });
    }
  });

  // Logout - Clear session and redirect to OIDC logout
  app.post('/api/auth/logout', requireAuth(), async (req, res) => {
    try {
      const session = (req as any).user as UserSession;
      
      // Clear session cookie
      res.clearCookie('w3_session');
      
      // Optional: Redirect to OIDC logout for complete cleanup
      const logoutUrl = `${config.issuerUrl}/protocol/openid-connect/logout?` +
        `client_id=${config.clientId}&` +
        `post_logout_redirect_uri=${encodeURIComponent(req.headers.origin || 'http://localhost:5000')}`;
      
      res.json({ 
        message: 'Logged out successfully',
        logoutUrl: logoutUrl
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'logout_failed' });
    }
  });

  // MFA endpoint placeholder - Ready for OTP integration
  app.get('/api/auth/mfa', requireAuth(), (req: Request, res: Response) => {
    res.json({ 
      message: 'MFA implementation ready for OTP integration',
      methods: ['totp', 'sms', 'email'],
      required: true
    });
  });
}