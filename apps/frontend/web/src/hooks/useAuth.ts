import { useEffect, useState } from "react";
import { oauth2Client } from '../services/OAuth2Client';

// Unified Authentication Mode Control
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'development';
const DEFAULT_TENANT_ID = import.meta.env.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(AUTH_MODE === 'oauth2');
  const [isAuthenticated, setIsAuthenticated] = useState(AUTH_MODE === 'development');
  const [user, setUser] = useState(AUTH_MODE === 'development' ? {
    id: 'demo-user',
    name: 'Demo User', 
    email: 'demo@w3suite.com',
    role: 'admin',
    tenantId: DEFAULT_TENANT_ID
  } : null);

  useEffect(() => {
    if (AUTH_MODE === 'development') {
      // Development mode: Set demo tokens and always return authenticated
      localStorage.setItem('auth_token', 'demo-token-development');
      localStorage.setItem('currentTenantId', DEFAULT_TENANT_ID);
      localStorage.setItem('currentTenant', 'staging');
      localStorage.setItem('oauth2_tokens', JSON.stringify({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token'
      }));
      
      setIsAuthenticated(true);
      setIsLoading(false);
      setUser({
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@w3suite.com', 
        role: 'admin',
        tenantId: DEFAULT_TENANT_ID
      });
    } else if (AUTH_MODE === 'oauth2') {
      // OAuth2 mode: Check authentication status with OAuth2Client
      const checkAuth = async () => {
        try {
          setIsLoading(true);
          const authenticated = await oauth2Client.isAuthenticated();
          
          if (authenticated) {
            const userInfo = await oauth2Client.getUserInfo();
            setUser({
              id: userInfo?.sub || 'unknown',
              name: userInfo?.name || 'Unknown User', 
              email: userInfo?.email || 'unknown@example.com',
              role: 'user', // Default role, should be managed by backend
              tenantId: userInfo?.tenant_id || DEFAULT_TENANT_ID
            });
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('OAuth2 authentication check failed:', error);
          setUser(null);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };
      
      checkAuth();
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}