/**
 * Simple JWT Client for W3 Suite
 * Direct JWT authentication without OAuth2
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3004/api';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}

class JWTClient {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    // Load token from localStorage on initialization
    const stored = localStorage.getItem('w3_auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.accessToken = data.access_token;
        this.tokenExpiry = data.expires_at;
      } catch (e) {
        localStorage.removeItem('w3_auth');
      }
    }
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json() as LoginResponse;
    
    // Store token
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    localStorage.setItem('w3_auth', JSON.stringify({
      access_token: data.access_token,
      expires_at: this.tokenExpiry,
      user: data.user
    }));

    return data;
  }

  /**
   * Refresh the access token using refresh token cookie
   */
  async refreshToken(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      const stored = localStorage.getItem('w3_auth');
      if (stored) {
        const authData = JSON.parse(stored);
        authData.access_token = data.access_token;
        authData.expires_at = this.tokenExpiry;
        localStorage.setItem('w3_auth', JSON.stringify(authData));
      }

      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Get current access token, refreshing if needed
   */
  async getAccessToken(): Promise<string | null> {
    // Check if token exists and is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now() + 60000) {
      return this.accessToken;
    }

    // Try to refresh
    return await this.refreshToken();
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('w3_auth');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.tokenExpiry && this.tokenExpiry > Date.now();
  }

  /**
   * Get current user info
   */
  getCurrentUser(): any {
    const stored = localStorage.getItem('w3_auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        return data.user;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// Singleton instance
export const jwtClient = new JWTClient();