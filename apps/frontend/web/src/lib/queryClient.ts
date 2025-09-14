import { QueryClient } from "@tanstack/react-query";
import { oauth2Client } from '../services/OAuth2Client';

// Helper per ottenere il tenant ID corrente
const getCurrentTenantId = () => {
  // Sempre usa l'UUID corretto per development
  return '00000000-0000-0000-0000-000000000001';
};

// Token validation helper function
function isValidToken(token: string | null): boolean {
  if (!token) return false;
  if (token === 'undefined' || token === 'null' || token === '') return false;
  // Basic JWT format validation: should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  // Each part should be base64-like (letters, numbers, -, _)
  const base64Pattern = /^[A-Za-z0-9\-_]+$/;
  return parts.every(part => part.length > 0 && base64Pattern.test(part));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        
        // Normalize URL to relative path to ensure it goes through nginx
        let finalUrl = url;
        if (url.startsWith('http')) {
          try {
            const u = new URL(url, window.location.origin);
            finalUrl = u.pathname + u.search;
            // Normalized absolute URL to relative
          } catch (e) {
            console.error('Failed to normalize URL:', e);
            finalUrl = url;
          }
        }
        
        // Making API request
        
        const tenantId = getCurrentTenantId();
        let headers: Record<string, string> = {
          'X-Tenant-ID': tenantId, // Header per il tenant ID
        };
        
        // Check if we're in development mode
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev');
        
        if (isDevelopment) {
          // In development, use the X-Auth-Session header which is already supported by backend
          // Development mode: Using X-Auth-Session header
          headers['X-Auth-Session'] = 'authenticated';
          headers['X-Demo-User'] = 'admin@w3suite.com';
        } else {
          // In production, use OAuth2 token
          const token = await oauth2Client.getAccessToken();
          
          // Validate token before using it
          if (!isValidToken(token)) {
            // Invalid or missing access token detected
            
            // If no valid token, try to refresh or redirect to login
            if (!token || token === 'undefined' || token === 'null' || token === '') {
              // Attempting token refresh or redirecting to login
              await oauth2Client.logout();
              await oauth2Client.startAuthorizationFlow();
              throw new Error('Authentication required');
            }
            
            // If token format is invalid, logout and redirect
            await oauth2Client.logout();
            await oauth2Client.startAuthorizationFlow();
            throw new Error('Invalid token format');
          }
          
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Request headers configured
        
        const res = await fetch(finalUrl, {
          credentials: "include",
          headers,
        });
        
        // Response received
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log('❌ 401 Unauthorized - redirecting to login');
            // Use OAuth2 logout instead of manual token clearing
            await oauth2Client.logout();
            await oauth2Client.startAuthorizationFlow();
            throw new Error(`401: Unauthorized`);
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        // API response processed
        return data;
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
    },
  },
});

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  // Normalize URL to relative path to ensure it goes through nginx
  let finalUrl = url;
  if (url.startsWith('http')) {
    try {
      const u = new URL(url, window.location.origin);
      finalUrl = u.pathname + u.search;
      // Normalized absolute URL to relative
    } catch (e) {
      console.error('Failed to normalize URL:', e);
      finalUrl = url;
    }
  }
  
  const tenantId = getCurrentTenantId();
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    'X-Tenant-ID': tenantId, // Header per il tenant ID
  };
  
  // Check if we're in development mode
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev');
  
  if (isDevelopment) {
    // In development, use the X-Auth-Session header which is already supported by backend
    // Development mode: Using X-Auth-Session header
    headers['X-Auth-Session'] = 'authenticated';
    headers['X-Demo-User'] = 'admin@w3suite.com';
  } else {
    // In production, use OAuth2 token
    const token = await oauth2Client.getAccessToken();
    
    // Validate token before using it
    if (!isValidToken(token)) {
      // Invalid or missing access token detected in apiRequest
      
      // If no valid token, try to refresh or redirect to login
      if (!token || token === 'undefined' || token === 'null' || token === '') {
        // Attempting token refresh or redirecting to login
        await oauth2Client.logout();
        await oauth2Client.startAuthorizationFlow();
        throw new Error('Authentication required');
      }
      
      // If token format is invalid, logout and redirect
      await oauth2Client.logout();
      await oauth2Client.startAuthorizationFlow();
      throw new Error('Invalid token format');
    }
    
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      // 401 Unauthorized - redirecting to login
      // Use OAuth2 logout instead of manual token clearing
      await oauth2Client.logout();
      await oauth2Client.startAuthorizationFlow();
      throw new Error(`401: Unauthorized`);
    }
    throw new Error(`${res.status}: ${res.statusText}`);
  }

  return res.json();
}