import { QueryClient } from "@tanstack/react-query";
import { oauth2Client } from '../services/OAuth2Client';

// Helper per ottenere il tenant ID corrente
const getCurrentTenantId = () => {
  // Sempre usa l'UUID corretto per development
  return '00000000-0000-0000-0000-000000000001';
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = await oauth2Client.getAccessToken();
        const tenantId = getCurrentTenantId();

        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-Tenant-ID': tenantId, // Header per il tenant ID
          },
        });
        if (!res.ok) {
          if (res.status === 401) {
            console.log('❌ 401 Unauthorized - redirecting to login');
            // Use OAuth2 logout instead of manual token clearing
            await oauth2Client.logout();
            window.location.href = '/brandinterface/login';
            throw new Error(`401: Unauthorized`);
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
    },
  },
});

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const accessToken = await oauth2Client.getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add OAuth2 Bearer token if available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    console.log('🔑 Using OAuth2 token for request to:', endpoint);
  } else {
    console.log('🚨 No auth token found - using demo mode for:', endpoint);
    // Use demo headers when no token is available
    headers['x-demo-user'] = 'admin@w3suite.com';
    headers['x-tenant-id'] = '00000000-0000-0000-0000-000000000001';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.log('🔄 401 Unauthorized - attempting token refresh...');
    // Try to refresh token
    const refreshed = await oauth2Client.refreshToken();
    if (refreshed) {
      console.log('✅ Token refreshed, retrying request...');
      // Retry request with new token
      headers['Authorization'] = `Bearer ${refreshed.access_token}`;
      const retryResponse = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        throw new Error(`API request failed after refresh: ${retryResponse.status}`);
      }

      return await retryResponse.json();
    } else {
      console.log('❌ Token refresh failed, falling back to demo mode');
      // Refresh failed, try demo mode
      delete headers['Authorization'];
      headers['x-demo-user'] = 'admin@w3suite.com';
      headers['x-tenant-id'] = '00000000-0000-0000-0000-000000000001';

      const demoResponse = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (!demoResponse.ok) {
        throw new Error(`Authentication required - demo mode failed: ${demoResponse.status}`);
      }

      return await demoResponse.json();
    }
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};