import { QueryClient } from "@tanstack/react-query";
import { oauth2Client } from '../services/OAuth2Client';

// Unified Authentication Mode Control - Fail-safe security
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'development';
// TODO: Remove default once VITE_AUTH_MODE is properly configured
if (!AUTH_MODE) {
  throw new Error('VITE_AUTH_MODE must be set in environment variables');
}

// Module-scoped currentTenantId for dynamic tenant resolution
let currentTenantId: string | null = null;

// Export setter for external tenant updates
export const setCurrentTenantId = (tenantId: string) => {
  currentTenantId = tenantId;
};

// ==================== HR VALIDATION FUNCTIONS ====================

/**
 * Valida i prerequisiti per le chiamate API HR
 * Previene race conditions nell'inizializzazione
 */
const validateHRPrerequisites = async (url: string): Promise<void> => {
  // Verifica tenant ID
  let tenantId: string;
  try {
    tenantId = getCurrentTenantId();
  } catch (error) {
    console.error(`🚨 [HR-VALIDATION] Tenant ID error for ${url}:`, error);
    throw new Error(`HR_AUTH_NOT_READY: Tenant ID not available - ${error}`);
  }
  
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
    console.error(`🚨 [HR-VALIDATION] Blocking HR call - Invalid tenant ID: "${tenantId}" for ${url}`);
    throw new Error(`HR_AUTH_NOT_READY: Invalid tenant ID "${tenantId}"`);
  }
  
  // Verifica auth mode
  const authMode = import.meta.env.VITE_AUTH_MODE;
  if (!authMode) {
    console.error(`🚨 [HR-VALIDATION] Blocking HR call - No auth mode configured for ${url}`);
    throw new Error('HR_AUTH_NOT_READY: Auth mode not configured');
  }
  
  // Verifica che localStorage sia sincronizzato
  const localTenant = localStorage.getItem('currentTenantId');
  if (!localTenant || localTenant !== tenantId) {
    localStorage.setItem('currentTenantId', tenantId);
    // Piccola pausa per permettere la sincronizzazione
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

// Helper per ottenere il tenant ID corrente - SECURITY FIX: Dynamic tenant resolution
export const getCurrentTenantId = (): string => {
  // Try current in-memory first
  if (currentTenantId) {
    return currentTenantId;
  }
  
  // Try localStorage (consistent with TenantProvider)
  const stored = localStorage.getItem('currentTenantId');
  if (stored && stored !== 'undefined' && stored !== 'null' && stored !== '') {
    return stored;
  }
  
  // SECURITY IMPROVEMENT: Always use UUID, never slug
  if (import.meta.env.MODE === 'development') {
    // Final fallback to env (development only) - ALWAYS use UUID
    const envFallback = import.meta.env.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    return envFallback;
  }
  
  // SECURITY: In production, throw error if tenantId cannot be resolved
  console.error(`[TENANT-ID] 🚨 PRODUCTION SECURITY ERROR: Cannot resolve tenant ID!`);
  console.error(`[TENANT-ID] ❌ No tenant in memory, localStorage, or URL path`);
  console.error(`[TENANT-ID] 🔒 Production does not allow tenant fallbacks for security`);
  throw new Error('SECURITY: Tenant ID resolution failed in production. Application cannot proceed without valid tenant context.');
};

// Global redirect guard to prevent infinite OAuth redirects
declare global {
  interface Window {
    __authRedirectInProgress?: boolean;
  }
}

// Simplified token validation - let server handle JWT format validation
function isValidToken(token: string | null): boolean {
  return token !== null && token !== undefined && token !== 'undefined' && token !== 'null' && token !== '';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        let baseUrl = queryKey[0] as string;
        const params = queryKey[1] as Record<string, any> | undefined;
        
        // Auto-prefix /api if string starts with 'notifications' but doesn't start with '/api'
        if (baseUrl.startsWith('notifications') && !baseUrl.startsWith('/api')) {
          baseUrl = `/api/${baseUrl}`;
        }
        
        // Ensure all requests go to /api endpoints
        if (!baseUrl.startsWith('/api/') && !baseUrl.startsWith('http')) {
          throw new Error(`All API calls must use /api/* endpoints. Got: ${baseUrl}`);
        }
        
        // Build URL with query parameters
        let finalUrl = baseUrl;
        if (params && Object.keys(params).length > 0) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              searchParams.append(key, String(value));
            }
          });
          const queryString = searchParams.toString();
          if (queryString) {
            finalUrl = `${baseUrl}?${queryString}`;
          }
        }
        
        // Normalize URL to relative path to ensure it goes through nginx
        if (finalUrl.startsWith('http')) {
          try {
            const u = new URL(finalUrl, window.location.origin);
            finalUrl = u.pathname + u.search;
          } catch (e) {
            // Silently fallback to original URL
          }
        }
        
        // ✅ Special handling per endpoint HR
        if (finalUrl.includes('/hr/')) {
          await validateHRPrerequisites(finalUrl);
        }
        
        const tenantId = getCurrentTenantId();
        
        // CRITICAL SECURITY CHECK: Block API calls with undefined/invalid tenant IDs  
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
          console.error(`[TENANT-ERROR] ❌ BLOCKING API CALL - Invalid tenant ID detected!`);
          console.error(`[TENANT-ERROR] ❌ URL: ${finalUrl}`);
          console.error(`[TENANT-ERROR] ❌ Tenant ID: "${tenantId}"`);
          throw new Error(`Invalid tenant ID for API call: "${tenantId}". Cannot proceed with request.`);
        }
        
        // Validate tenant ID format (should be UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(tenantId)) {
          console.error(`[TENANT-ERROR] ❌ Invalid tenant ID format! Expected UUID, got: "${tenantId}"`);
          console.error(`[TENANT-ERROR] ❌ This could cause cross-tenant data leakage!`);
        }
        
        let headers: Record<string, string> = {
          'X-Tenant-ID': tenantId, // Header per il tenant ID
        };
        
        // Mode-based authentication - clean separation  
        if (AUTH_MODE === 'development') {
          // Development mode: ONLY use X-Auth-Session headers, NEVER call OAuth methods
          headers['X-Auth-Session'] = 'authenticated';
          const demoUserId = localStorage.getItem('demo_user_id') || 'admin-user';
          headers['X-Demo-User'] = demoUserId;
        } else if (AUTH_MODE === 'oauth2') {
          // OAuth2 mode: Use Bearer tokens with proper error handling
          const token = await oauth2Client.getAccessToken();
          
          if (!isValidToken(token)) {
            // Prevent infinite redirects
            if (window.__authRedirectInProgress) {
              throw new Error('Authentication in progress');
            }
            
            window.__authRedirectInProgress = true;
            try {
              await oauth2Client.logout();
              await oauth2Client.startAuthorizationFlow();
            } finally {
              window.__authRedirectInProgress = false;
            }
            throw new Error('Authentication required');
          }
          
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error(`Unknown AUTH_MODE: ${AUTH_MODE}. Must be 'development' or 'oauth2'`);
        }
        
        const res = await fetch(finalUrl, {
          credentials: "include",
          headers,
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            
            // Only trigger OAuth flow in oauth2 mode
            if (AUTH_MODE === 'oauth2' && !window.__authRedirectInProgress) {
              window.__authRedirectInProgress = true;
              try {
                await oauth2Client.logout();
                await oauth2Client.startAuthorizationFlow();
              } finally {
                window.__authRedirectInProgress = false;
              }
            }
            
            throw new Error(`401: Unauthorized`);
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        // API response processed - handle both wrapped {data: ...} and raw responses
        return data?.data ?? data;
      },
      // 🚀 PERFORMANCE: Optimized cache strategy for better navigation
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh longer
      gcTime: 1000 * 60 * 15, // 15 minutes - keep in memory longer
      refetchOnWindowFocus: false, // Don't refetch when returning to tab
      refetchOnMount: false, // Use cached data on component mount
      refetchOnReconnect: false, // Don't refetch on network reconnect
      retry: 1, // Retry failed requests only once (faster failures)
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
    } catch (e) {
      finalUrl = url;
    }
  }
  
  const tenantId = getCurrentTenantId();
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
    console.error(`[TENANT-ERROR] ❌ BLOCKING API REQUEST - Invalid tenant ID detected!`);
    console.error(`[TENANT-ERROR] ❌ URL: ${finalUrl}`);
    console.error(`[TENANT-ERROR] ❌ Tenant ID: "${tenantId}"`);
    throw new Error(`Invalid tenant ID for apiRequest: "${tenantId}". Cannot proceed with request.`);
  }
  
  let headers: Record<string, string> = {
    'X-Tenant-ID': tenantId,
  };
  
  // Mode-based authentication for API requests
  if (AUTH_MODE === 'development') {
    // Development mode: ONLY use X-Auth-Session headers
    headers['X-Auth-Session'] = 'authenticated';
    const demoUserId = localStorage.getItem('demo_user_id') || 'admin-user';
    headers['X-Demo-User'] = demoUserId;
  } else if (AUTH_MODE === 'oauth2') {
    // OAuth2 mode: Use Bearer tokens
    const token = await oauth2Client.getAccessToken();
    
    if (!isValidToken(token)) {
      // Prevent infinite redirects
      if (window.__authRedirectInProgress) {
        throw new Error('Authentication in progress');
      }
      
      window.__authRedirectInProgress = true;
      try {
        await oauth2Client.logout();
        await oauth2Client.startAuthorizationFlow();
      } finally {
        window.__authRedirectInProgress = false;
      }
      throw new Error('Authentication required');
    }
    
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    throw new Error(`Unknown AUTH_MODE: ${AUTH_MODE}. Must be 'development' or 'oauth2'`);
  }
  
  // Process body and set appropriate Content-Type
  let processedOptions = { ...options };
  
  // Check if body exists and needs processing
  if (processedOptions.body !== undefined && processedOptions.body !== null) {
    // Check if body is FormData, Blob, ArrayBuffer, or URLSearchParams (don't serialize these)
    const isSpecialBody = processedOptions.body instanceof FormData ||
                         processedOptions.body instanceof Blob ||
                         processedOptions.body instanceof ArrayBuffer ||
                         processedOptions.body instanceof URLSearchParams;
    
    if (!isSpecialBody) {
      // If body is an object (including arrays), serialize it
      if (typeof processedOptions.body === 'object') {
        processedOptions.body = JSON.stringify(processedOptions.body);
        // Set Content-Type for JSON if not already set
        const existingHeaders = options?.headers as Record<string, string> | undefined;
        if (!headers['Content-Type'] && !existingHeaders?.['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (typeof processedOptions.body !== 'string') {
        // Guard against non-string, non-object bodies that would become "[object Object]"
        console.error('[API-REQUEST] ❌ Invalid body type:', typeof processedOptions.body);
        throw new Error(`Invalid body type for API request: ${typeof processedOptions.body}. Body must be string, object, FormData, Blob, or ArrayBuffer.`);
      } else {
        // Body is already a string (probably pre-serialized JSON)
        // Set Content-Type if it looks like JSON and header not set
        const existingHeaders = options?.headers as Record<string, string> | undefined;
        if (!headers['Content-Type'] && !existingHeaders?.['Content-Type']) {
          try {
            JSON.parse(processedOptions.body);
            headers['Content-Type'] = 'application/json';
          } catch {
            // Not JSON, don't set Content-Type
          }
        }
      }
    }
  }

  const res = await fetch(finalUrl, {
    ...processedOptions,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      
      // Only trigger OAuth flow in oauth2 mode
      if (AUTH_MODE === 'oauth2' && !window.__authRedirectInProgress) {
        window.__authRedirectInProgress = true;
        try {
          await oauth2Client.logout();
          await oauth2Client.startAuthorizationFlow();
        } finally {
          window.__authRedirectInProgress = false;
        }
      }
      
      throw new Error(`401: Unauthorized`);
    }
    
    // Try to extract error message from response body
    let errorMessage = `${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Failed to parse JSON, use default error message
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
}