/**
 * W3 Suite OAuth2 Client Enterprise
 * RFC 6749 compliant OAuth2 client with PKCE support
 */

import { apiRequest } from '@/lib/queryClient';

interface OAuth2Config {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  revocationEndpoint: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  expires_at?: number; // Timestamp when token expires (added by client)
}

interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  tenant_id?: string;
}

class OAuth2Client {
  private config: OAuth2Config;
  private codeVerifier: string | null = null;
  private currentTokens: TokenResponse | null = null;

  constructor() {
    this.config = {
      clientId: 'w3suite-frontend',
      redirectUri: `${window.location.origin}/auth/callback`,
      scopes: ['openid', 'profile', 'email', 'tenant_access'],
      authorizationEndpoint: '/oauth2/authorize',
      tokenEndpoint: '/oauth2/token',
      userinfoEndpoint: '/oauth2/userinfo', 
      revocationEndpoint: '/oauth2/revoke'
    };
  }

  /**
   * Initialize OAuth2 flow discovery
   */
  async initialize(): Promise<void> {
    try {
      // In a full implementation, we'd fetch /.well-known/oauth-authorization-server
      // For now, we use static config
      console.log('✅ OAuth2 Client initialized');
      console.log('🔧 Client ID:', this.config.clientId);
      console.log('📍 Redirect URI:', this.config.redirectUri);
    } catch (error) {
      console.error('❌ OAuth2 discovery failed:', error);
      throw error;
    }
  }

  /**
   * Generate PKCE challenge for security
   */
  private async generatePKCEChallenge(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    const codeChallenge = hashBase64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  }

  private generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => String.fromCharCode(byte))
      .join('')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, length);
  }

  /**
   * Start OAuth2 Authorization Code Flow with PKCE
   */
  async startAuthorizationFlow(): Promise<void> {
    try {
      // Generate PKCE challenge
      const { codeVerifier, codeChallenge } = await this.generatePKCEChallenge();
      this.codeVerifier = codeVerifier;
      
      // Store PKCE verifier for callback
      sessionStorage.setItem('oauth2_code_verifier', codeVerifier);
      
      // Generate state for CSRF protection
      const state = this.generateRandomString(32);
      sessionStorage.setItem('oauth2_state', state);

      // Build authorization URL
      const authUrl = new URL(this.config.authorizationEndpoint, window.location.origin);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set('scope', this.config.scopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      console.log('🔐 Starting OAuth2 flow...');
      console.log('📍 Authorization URL:', authUrl.toString());

      // Redirect to authorization server
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('❌ OAuth2 flow start failed:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth2 callback and exchange code for tokens
   */
  async handleCallback(): Promise<TokenResponse> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Check for authorization errors
      if (error) {
        throw new Error(`OAuth2 authorization failed: ${error} - ${urlParams.get('error_description')}`);
      }

      // Validate state parameter (CSRF protection)
      const storedState = sessionStorage.getItem('oauth2_state');
      if (!state || state !== storedState) {
        throw new Error('OAuth2 state mismatch - possible CSRF attack');
      }

      // Validate authorization code
      if (!code) {
        throw new Error('OAuth2 authorization code missing');
      }

      // Get PKCE verifier
      const codeVerifier = sessionStorage.getItem('oauth2_code_verifier');
      if (!codeVerifier) {
        throw new Error('OAuth2 PKCE verifier missing');
      }

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code, codeVerifier);
      
      // Add expiry timestamp to tokens for proper expiration checking
      const tokensWithExpiry = {
        ...tokenResponse,
        expires_at: Date.now() + (tokenResponse.expires_in * 1000) // Convert seconds to milliseconds
      };
      
      // Store tokens securely
      this.currentTokens = tokensWithExpiry;
      localStorage.setItem('oauth2_tokens', JSON.stringify(tokensWithExpiry));
      
      // Clear temporary storage
      sessionStorage.removeItem('oauth2_code_verifier');
      sessionStorage.removeItem('oauth2_state');

      console.log('✅ OAuth2 tokens received');
      console.log('⏰ Expires in:', tokenResponse.expires_in, 'seconds');

      return tokenResponse;
    } catch (error) {
      console.error('❌ OAuth2 callback failed:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    const tokenRequest = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier
    };

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${errorData.error} - ${errorData.error_description}`);
    }

    return await response.json();
  }

  /**
   * Get current access token (refresh if needed)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      // Load tokens from storage
      if (!this.currentTokens) {
        const storedTokens = localStorage.getItem('oauth2_tokens');
        if (storedTokens) {
          this.currentTokens = JSON.parse(storedTokens);
        }
      }

      // Development fallback: Generate a development token if no OAuth2 token exists
      if (!this.currentTokens && (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev'))) {
        console.log('🔧 Development mode: Creating temporary JWT token...');
        
        // Create a simple base64 encoded JWT-like token for development
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          id: 'admin-user',
          email: 'admin@w3suite.com',
          tenantId: '00000000-0000-0000-0000-000000000001',
          roles: ['admin'],
          scope: 'openid profile email tenant_access',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        }));
        // Simple signature for development (not secure, only for dev!)
        const signature = btoa('dev-signature');
        const devToken = `${header}.${payload}.${signature}`;
        
        // Store development token
        const devTokens = {
          access_token: devToken,
          token_type: 'Bearer',
          expires_in: 86400,
          scope: 'openid profile email tenant_access',
          expires_at: Date.now() + (86400 * 1000)
        };
        
        this.currentTokens = devTokens;
        localStorage.setItem('oauth2_tokens', JSON.stringify(devTokens));
        console.log('✅ Development token created and stored');
      }

      if (!this.currentTokens) {
        return null;
      }

      // Check if token is expired (with 5 minute buffer for safety)
      if (this.currentTokens.expires_at) {
        const expiryTime = this.currentTokens.expires_at;
        const now = Date.now();
        const fiveMinutesBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        console.log(`🔍 Token expiry check: Current time: ${new Date(now).toLocaleTimeString()}, Token expires: ${new Date(expiryTime).toLocaleTimeString()}`);
        
        if (now >= (expiryTime - fiveMinutesBuffer)) {
          console.log('🔄 Access token expired, attempting refresh...');
          const refreshedTokens = await this.refreshToken();
          if (!refreshedTokens) {
            console.log('🚫 Refresh failed, user needs to re-login');
            return null;
          }
          return refreshedTokens.access_token;
        }
      }

      return this.currentTokens.access_token;
    } catch (error) {
      console.error('❌ Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<TokenResponse | null> {
    try {
      if (!this.currentTokens?.refresh_token) {
        throw new Error('No refresh token available');
      }

      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: this.currentTokens.refresh_token,
        client_id: this.config.clientId
      };

      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(refreshRequest)
      });

      if (!response.ok) {
        // Refresh failed, user needs to re-authenticate
        await this.logout();
        return null;
      }

      const newTokens = await response.json();
      
      // Keep refresh token if not provided in response
      if (!newTokens.refresh_token && this.currentTokens.refresh_token) {
        newTokens.refresh_token = this.currentTokens.refresh_token;
      }

      // Add expiry timestamp to refreshed tokens
      const refreshedTokensWithExpiry = {
        ...newTokens,
        expires_at: Date.now() + (newTokens.expires_in * 1000) // Convert seconds to milliseconds
      };

      this.currentTokens = refreshedTokensWithExpiry;
      localStorage.setItem('oauth2_tokens', JSON.stringify(refreshedTokensWithExpiry));

      console.log('✅ OAuth2 tokens refreshed');
      return refreshedTokensWithExpiry;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.logout();
      return null;
    }
  }

  /**
   * Get user information from userinfo endpoint
   */
  async getUserInfo(): Promise<UserInfo | null> {
    try {
      // In development mode with Replit, use X-Auth-Session headers
      const isDevMode = window.location.hostname === 'localhost' || 
                        window.location.hostname.includes('replit.dev');
      
      let headers: HeadersInit;
      
      if (isDevMode) {
        // Development mode - use session headers
        console.log('🔐 Using development mode authentication for userinfo');
        headers = {
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin@w3suite.com',
          'X-Tenant-Id': '00000000-0000-0000-0000-000000000001'
        };
      } else {
        // Production mode - use Bearer token
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
          return null;
        }
        headers = {
          'Authorization': `Bearer ${accessToken}`
        };
      }

      const response = await fetch(this.config.userinfoEndpoint, {
        headers
      });

      if (!response.ok) {
        if (response.status === 401 && !isDevMode) {
          // Try to refresh token (only in production mode)
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.getUserInfo(); // Retry with new token
          }
        }
        throw new Error(`UserInfo request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ UserInfo request failed:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return false;
    }

    // Verify token is valid by trying userinfo endpoint
    const userInfo = await this.getUserInfo();
    return userInfo !== null;
  }

  /**
   * Logout and revoke tokens
   */
  async logout(): Promise<void> {
    try {
      // Revoke tokens on server
      if (this.currentTokens?.access_token) {
        await fetch(this.config.revocationEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: this.currentTokens.access_token,
            token_type_hint: 'access_token'
          })
        });
      }

      if (this.currentTokens?.refresh_token) {
        await fetch(this.config.revocationEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: this.currentTokens.refresh_token,
            token_type_hint: 'refresh_token'
          })
        });
      }
    } catch (error) {
      console.warn('⚠️ Token revocation failed (continuing logout):', error);
    }

    // Clear local storage
    this.currentTokens = null;
    localStorage.removeItem('oauth2_tokens');
    localStorage.removeItem('auth_token'); // Clear legacy token
    sessionStorage.removeItem('oauth2_code_verifier');
    sessionStorage.removeItem('oauth2_state');

    console.log('✅ OAuth2 logout completed');
  }

  /**
   * Debug function: Force expire current token for testing
   */
  async forceExpireToken(): Promise<void> {
    if (this.currentTokens && this.currentTokens.expires_at) {
      // Set expiry to 1 minute ago to force expiration
      this.currentTokens.expires_at = Date.now() - 60000;
      localStorage.setItem('oauth2_tokens', JSON.stringify(this.currentTokens));
      console.log('⚠️ DEBUG: Token force-expired for testing');
    }
  }
}

// Singleton OAuth2 client
export const oauth2Client = new OAuth2Client();