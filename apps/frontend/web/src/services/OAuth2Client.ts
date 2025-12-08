/**
 * W3 Suite OAuth2 Client Enterprise
 * RFC 6749 compliant OAuth2 client with PKCE support
 */

import { apiRequest } from '../lib/queryClient';

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
      // OAuth2 Client initialized
    } catch (error) {
      console.error('❌ OAuth2 discovery failed:', error);
      throw error;
    }
  }

  /**
   * Generate PKCE challenge for security
   * Supports both HTTPS (crypto.subtle) and HTTP (fallback SHA-256) environments
   */
  private async generatePKCEChallenge(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    let hashBuffer: ArrayBuffer;
    
    // Check if crypto.subtle is available (requires HTTPS or localhost)
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      // Use native Web Crypto API (preferred for HTTPS)
      hashBuffer = await crypto.subtle.digest('SHA-256', data);
    } else {
      // Fallback: Pure JavaScript SHA-256 for HTTP environments
      console.warn('⚠️ crypto.subtle not available (HTTP context), using fallback SHA-256');
      hashBuffer = this.sha256Fallback(data);
    }
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    const codeChallenge = hashBase64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Pure JavaScript SHA-256 fallback for HTTP environments
   * This is needed because crypto.subtle requires a secure context (HTTPS)
   */
  private sha256Fallback(data: Uint8Array): ArrayBuffer {
    // SHA-256 constants
    const K = new Uint32Array([
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);

    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z);
    const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z);
    const sigma0 = (x: number) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
    const sigma1 = (x: number) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
    const gamma0 = (x: number) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
    const gamma1 = (x: number) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);

    // Initial hash values
    let H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);

    // Pre-processing: adding padding bits
    const msgLen = data.length;
    const bitLen = msgLen * 8;
    const padLen = ((msgLen + 8) % 64 < 56) ? 56 - (msgLen + 8) % 64 : 120 - (msgLen + 8) % 64;
    const paddedMsg = new Uint8Array(msgLen + 1 + padLen + 8);
    paddedMsg.set(data);
    paddedMsg[msgLen] = 0x80;
    
    // Append length in bits as 64-bit big-endian
    const view = new DataView(paddedMsg.buffer);
    view.setUint32(paddedMsg.length - 4, bitLen, false);

    // Process message in 512-bit blocks
    const W = new Uint32Array(64);
    for (let i = 0; i < paddedMsg.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        W[t] = (paddedMsg[i + t * 4] << 24) | (paddedMsg[i + t * 4 + 1] << 16) |
               (paddedMsg[i + t * 4 + 2] << 8) | paddedMsg[i + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = H;

      for (let t = 0; t < 64; t++) {
        const T1 = (h + sigma1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
        const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + T1) >>> 0;
        d = c; c = b; b = a; a = (T1 + T2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    // Convert to ArrayBuffer
    const result = new ArrayBuffer(32);
    const resultView = new DataView(result);
    for (let i = 0; i < 8; i++) {
      resultView.setUint32(i * 4, H[i], false);
    }
    return result;
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
   * SECURITY: Clean expired tokens from localStorage
   */
  private cleanExpiredTokens(): void {
    try {
      const storedTokens = localStorage.getItem('oauth2_tokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        if (tokens.expires_at && Date.now() >= tokens.expires_at) {
          console.log('🧹 SECURITY: Removing expired tokens from localStorage');
          localStorage.removeItem('oauth2_tokens');
          localStorage.removeItem('currentTenantId'); // Also clear tenant context
          this.currentTokens = null;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error cleaning expired tokens:', error);
      // If there's any error, clear tokens for security
      localStorage.removeItem('oauth2_tokens');
      localStorage.removeItem('currentTenantId');
      this.currentTokens = null;
    }
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

      // Starting OAuth2 flow

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

      // OAuth2 tokens received

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
      // SECURITY: Clean expired tokens first
      this.cleanExpiredTokens();
      
      // Load tokens from storage
      if (!this.currentTokens) {
        const storedTokens = localStorage.getItem('oauth2_tokens');
        if (storedTokens) {
          this.currentTokens = JSON.parse(storedTokens);
        }
      }

      // Development fallback: Generate a development token if no OAuth2 token exists
      if (!this.currentTokens && (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev'))) {
        // Development mode: Creating temporary JWT token
        
        // Create a simple base64 encoded JWT-like token for development
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          id: 'admin-user',
          email: 'admin@w3suite.com',
          tenantId: '00000000-0000-0000-0000-000000000001',
          roles: ['admin'],
          scope: 'openid profile email tenant_access',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 7200 // 2 hours (SECURITY: Reduced from 24h)
        }));
        // Simple signature for development (not secure, only for dev!)
        const signature = btoa('dev-signature');
        const devToken = `${header}.${payload}.${signature}`;
        
        // Store development token
        const devTokens = {
          access_token: devToken,
          token_type: 'Bearer',
          expires_in: 7200, // 2 hours (SECURITY: Reduced from 24h)
          scope: 'openid profile email tenant_access',
          expires_at: Date.now() + (7200 * 1000) // 2 hours
        };
        
        this.currentTokens = devTokens;
        localStorage.setItem('oauth2_tokens', JSON.stringify(devTokens));
        // Development token created and stored
      }

      if (!this.currentTokens) {
        return null;
      }

      // Check if token is expired (with 2 minute buffer for strict security)
      if (this.currentTokens.expires_at) {
        const expiryTime = this.currentTokens.expires_at;
        const now = Date.now();
        const twoMinutesBuffer = 2 * 60 * 1000; // 2 minutes buffer (SECURITY: Reduced from 5 min)
        
        // SECURITY: Strict token expiration check
        console.log(`🔍 Token expiry check: Current time: ${new Date(now).toLocaleTimeString()}, Token expires: ${new Date(expiryTime).toLocaleTimeString()}`);
        
        if (now >= (expiryTime - twoMinutesBuffer)) {
          // Access token expired, attempting refresh
          const refreshedTokens = await this.refreshToken();
          if (!refreshedTokens) {
            // Refresh failed, user needs to re-login
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

      // OAuth2 tokens refreshed
      return refreshedTokensWithExpiry;
    } catch (error) {
      // Token refresh failed
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
        // Development mode authentication
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
      // UserInfo request failed
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
      // Token revocation failed (continuing logout)
    }

    // Clear local storage
    this.currentTokens = null;
    localStorage.removeItem('oauth2_tokens');
    localStorage.removeItem('auth_token'); // Clear legacy token
    sessionStorage.removeItem('oauth2_code_verifier');
    sessionStorage.removeItem('oauth2_state');

    // OAuth2 logout completed
  }

  /**
   * Debug function: Force expire current token for testing
   */
  async forceExpireToken(): Promise<void> {
    if (this.currentTokens && this.currentTokens.expires_at) {
      // Set expiry to 1 minute ago to force expiration
      this.currentTokens.expires_at = Date.now() - 60000;
      localStorage.setItem('oauth2_tokens', JSON.stringify(this.currentTokens));
      // DEBUG: Token force-expired for testing
    }
  }
}

// Singleton OAuth2 client
export const oauth2Client = new OAuth2Client();