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
      
      // Store access token in memory
      this.accessToken = data.accessToken;
      this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));
      
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
      
      // Update access token
      this.accessToken = data.accessToken;
      this.tokenExpiry = new Date(Date.now() + (data.expiresIn * 1000));
      
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
      // Clear local token regardless
      this.accessToken = null;
      this.tokenExpiry = null;
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
    // Try to refresh token on startup
    await this.refresh();
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for compatibility with existing code
export default authService;