/**
 * Simple JWT Authentication Service for W3 Suite
 * Replaces OAuth2Client with direct JWT token management
 */

interface LoginResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
    firstName?: string;
    lastName?: string;
  };
  expiresIn: number;
}

interface RefreshResponse {
  success: boolean;
  accessToken: string;
  expiresIn: number;
}

interface UserInfo {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
}

class AuthService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private baseUrl: string;
  
  constructor() {
    // Direct backend communication (no gateway)
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? `${window.location.protocol}//${window.location.hostname}:3004`
      : 'http://localhost:3004';
    
    // Restore token from localStorage on initialization
    this.restoreTokenFromStorage();
  }
  
  /**
   * Restore token from localStorage
   */
  private restoreTokenFromStorage(): void {
    try {
      const storedAuth = localStorage.getItem('w3_auth');
      if (storedAuth) {
        const data = JSON.parse(storedAuth);
        if (data.accessToken && data.tokenExpiry) {
          const expiry = new Date(data.tokenExpiry);
          if (expiry > new Date()) {
            this.accessToken = data.accessToken;
            this.tokenExpiry = expiry;
          } else {
            // Token expired, clear it
            localStorage.removeItem('w3_auth');
          }
        }
      }
    } catch (error) {
      console.error('Error restoring auth token:', error);
      localStorage.removeItem('w3_auth');
    }
  }
  
  /**
   * Save token to localStorage
   */
  private saveTokenToStorage(token: string, expiresIn: number, user?: any): void {
    const expiry = new Date(Date.now() + (expiresIn * 1000));
    const authData = {
      accessToken: token,
      tokenExpiry: expiry.toISOString(),
      user: user || null
    };
    localStorage.setItem('w3_auth', JSON.stringify(authData));
  }
  
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data: LoginResponse = await response.json();
      
      // Store access token in memory and localStorage
      this.accessToken = data.accessToken;
      this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));
      
      // Persist to localStorage
      this.saveTokenToStorage(data.accessToken, data.expiresIn, data.user);
      
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token using refresh cookie
   */
  async refresh(): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this._doRefresh();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async _doRefresh(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
      });
      
      if (!response.ok) {
        // Refresh failed, clear token
        this.accessToken = null;
        this.tokenExpiry = null;
        return null;
      }
      
      const data: RefreshResponse = await response.json();
      
      // Update access token in memory and localStorage
      this.accessToken = data.accessToken;
      this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));
      
      // Update token in localStorage (preserve user info)
      const storedAuth = localStorage.getItem('w3_auth');
      const user = storedAuth ? JSON.parse(storedAuth).user : null;
      this.saveTokenToStorage(data.accessToken, data.expiresIn, user);
      
      return data.accessToken;
    } catch (error: any) {
      console.error('Refresh error:', error);
      this.accessToken = null;
      this.tokenExpiry = null;
      return null;
    }
  }
  
  /**
   * Get current user information
   */
  async getMe(): Promise<UserInfo | null> {
    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        return null;
      }
      
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh and retry
          const newToken = await this.refresh();
          if (newToken) {
            const retryResponse = await fetch(`${this.baseUrl}/api/auth/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${newToken}`,
              },
              credentials: 'include',
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        }
        return null;
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('GetMe error:', error);
      return null;
    }
  }
  
  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      // Clear local token and localStorage
      this.accessToken = null;
      this.tokenExpiry = null;
      localStorage.removeItem('w3_auth');
      localStorage.removeItem('user_info');
    }
  }
  
  /**
   * Get current access token (refresh if needed)
   */
  async getAccessToken(): Promise<string | null> {
    // Check if token exists and is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }
    
    // Token expired or missing, try to refresh
    return await this.refresh();
  }
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
  
  /**
   * Make an authenticated API request
   */
  async apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    // Add auth header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    
    // Make request
    let response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    
    // If 401, try to refresh and retry
    if (response.status === 401) {
      const newToken = await this.refresh();
      
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }
    
    return response;
  }
  
  /**
   * Initialize auth service (check for existing session)
   */
  async initialize(): Promise<void> {
    // Check if we have a valid token already
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      // Token is still valid, no need to refresh immediately
      return;
    }
    
    // Try to refresh token on startup only if we have a refresh cookie
    // This prevents unnecessary 401 errors on fresh loads
    const hasCookie = document.cookie.includes('refresh_token');
    if (hasCookie) {
      await this.refresh();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for compatibility with existing code
export default authService;