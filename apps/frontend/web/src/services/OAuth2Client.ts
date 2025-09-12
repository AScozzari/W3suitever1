/**
 * W3 Suite OAuth2 Client Enterprise
 * RFC 6749 compliant OAuth2 client with PKCE support
 */

// Removed apiRequest import to eliminate circular dependency

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
  private gatewayOrigin: string;
  private codeVerifier: string | null = null;
  private currentTokens: TokenResponse | null = null;

  constructor() {
    this.gatewayOrigin = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000'
      : `${window.location.protocol}//${window.location.hostname}`;
    
    this.config = {
      clientId: 'w3suite-frontend',
      redirectUri: `${this.gatewayOrigin}/auth/callback`,
      scopes: ['openid', 'profile', 'email', 'tenant_access'],
      authorizationEndpoint: '/api/oauth2/authorize',
      tokenEndpoint: '/api/oauth2/token',
      userinfoEndpoint: '/api/oauth2/userinfo', 
      revocationEndpoint: '/api/oauth2/revoke'
    };
  }

  /**
   * Initialize OAuth2 flow discovery
   */
  async initialize(): Promise<void> {
    // OAuth2 configuration is static for this implementation
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
      const authUrl = new URL(this.config.authorizationEndpoint, this.gatewayOrigin);
      
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set('scope', this.config.scopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Redirect to authorization server
      window.location.href = authUrl.toString();
    } catch (error) {
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
      
      sessionStorage.removeItem('oauth2_code_verifier');
      sessionStorage.removeItem('oauth2_state');

      return tokenResponse;
    } catch (error) {
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

      if (!this.currentTokens) {
        return null;
      }

      // Check if token is expired (with 5 minute buffer for safety)
      if (this.currentTokens.expires_at) {
        const expiryTime = this.currentTokens.expires_at;
        const now = Date.now();
        const fiveMinutesBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (now >= (expiryTime - fiveMinutesBuffer)) {
          const refreshedTokens = await this.refreshToken();
          if (!refreshedTokens) {
            return null;
          }
          return refreshedTokens.access_token;
        }
      }

      return this.currentTokens.access_token;
    } catch (error) {
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

      return refreshedTokensWithExpiry;
    } catch (error) {
      await this.logout();
      return null;
    }
  }

  /**
   * Get user information from userinfo endpoint
   */
  async getUserInfo(): Promise<UserInfo | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await fetch(this.config.userinfoEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.getUserInfo(); // Retry with new token
          }
        }
        throw new Error(`UserInfo request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
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
      // Revocation errors are acceptable
    }

    // Clear local storage
    this.currentTokens = null;
    localStorage.removeItem('oauth2_tokens');
    localStorage.removeItem('auth_token'); // Clear legacy token
    sessionStorage.removeItem('oauth2_code_verifier');
    sessionStorage.removeItem('oauth2_state');
  }

}

// Singleton OAuth2 client
export const oauth2Client = new OAuth2Client();