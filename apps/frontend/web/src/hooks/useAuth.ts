import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { oauth2Client } from '../services/OAuth2Client';

// Unified Authentication Mode Control
const AUTH_MODE = (import.meta as any).env?.VITE_AUTH_MODE || 'development';
const DEFAULT_TENANT_ID = (import.meta as any).env?.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

// Development mode permissions for demo purposes
const DEMO_PERMISSIONS = [
  'hr:manage',
  'hr:view',
  'employee:view',
  'employee:manage',
  'documents:view',
  'documents:upload',
  'time:track',
  'leave:request',
  'leave:approve',
  'training:access',
  'analytics:view'
];

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
  
  // Query for session data in production
  const { data: session } = useQuery({
    queryKey: ['/api/auth/session'],
    enabled: AUTH_MODE === 'oauth2' && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Development permissions stub to avoid 401 API noise
  const getDevelopmentPermissions = () => ({ 
    permissions: DEMO_PERMISSIONS // Use existing demo permissions array
  });

  // Query for user permissions - DISABLE in development, ENABLE in OAuth2 production
  const { data: permissionsData } = useQuery({
    queryKey: ['/api/auth/permissions'],
    enabled: AUTH_MODE === 'oauth2' && !!session?.user, // ONLY enabled in OAuth2 production mode
    staleTime: 5 * 60 * 1000,
    // Use mock data in development to prevent API calls - this provides data without enabling the query
    initialData: AUTH_MODE === 'development' ? getDevelopmentPermissions() : undefined,
  });

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

  // Helper function to check permissions
  const hasPermission = (permission: string): boolean => {
    if (AUTH_MODE === 'development') {
      // In development mode, provide full permissions for demo user
      return DEMO_PERMISSIONS.includes(permission);
    }
    
    const permissions = permissionsData?.permissions || [];
    return permissions.includes(permission);
  };
  
  // Helper function to check if user has HR access
  const hasHRAccess = (): boolean => {
    if (AUTH_MODE === 'development') {
      return user?.role === 'admin' || user?.role === 'hr_manager';
    }
    
    return hasPermission('hr:manage') || user?.role === 'hr_manager';
  };
  
  // Get effective permissions
  const getPermissions = (): string[] => {
    if (AUTH_MODE === 'development') {
      return DEMO_PERMISSIONS;
    }
    
    return permissionsData?.permissions || [];
  };

  return {
    user: AUTH_MODE === 'oauth2' ? session?.user : user,
    permissions: getPermissions(),
    isLoading,
    isAuthenticated,
    hasPermission,
    hasHRAccess,
  };
}