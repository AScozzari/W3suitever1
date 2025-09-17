import { useEffect } from "react";

// DEVELOPMENT MODE - Always authenticated
export function useAuth() {
  useEffect(() => {
    // Set demo tokens for development
    localStorage.setItem('auth_token', 'demo-token-development');
    localStorage.setItem('currentTenantId', '00000000-0000-0000-0000-000000000001');
    localStorage.setItem('currentTenant', 'staging');
    localStorage.setItem('oauth2_tokens', JSON.stringify({
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token'
    }));
  }, []);

  // Always return authenticated in development
  return {
    user: {
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@w3suite.com',
      role: 'admin',
      tenantId: '00000000-0000-0000-0000-000000000001'
    },
    isLoading: false,
    isAuthenticated: true,
  };
}