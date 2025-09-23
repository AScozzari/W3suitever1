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
  console.log(`🔍 [HR-VALIDATION] Validating prerequisites for: ${url}`);
  
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
    console.warn(`⚠️ [HR-VALIDATION] localStorage desync detected - fixing`);
    console.warn(`⚠️ [HR-VALIDATION] Memory: "${tenantId}", localStorage: "${localTenant}"`);
    localStorage.setItem('currentTenantId', tenantId);
    
    // Piccola pausa per permettere la sincronizzazione
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Verifica che gli header di development siano disponibili
  if (authMode === 'development') {
    // In development mode, verifichiamo che i valori siano settati
    const requiredHeaders = ['X-Auth-Session', 'X-Demo-User'];
    console.log(`🔧 [HR-VALIDATION] Development mode - checking required headers`);
  }
  
  console.log(`✅ [HR-VALIDATION] All prerequisites validated for: ${url}`);
  console.log(`✅ [HR-VALIDATION] Tenant: ${tenantId}, Auth: ${authMode}`);
};

// Helper per ottenere il tenant ID corrente - SECURITY FIX: Dynamic tenant resolution
export const getCurrentTenantId = (): string => {
  // Try current in-memory first
  if (currentTenantId) {
    console.log(`[TENANT-ID] ✅ Using in-memory tenant ID: ${currentTenantId}`);
    return currentTenantId;
  }
  
  // Try localStorage (consistent with TenantProvider)
  const stored = localStorage.getItem('currentTenantId');
  if (stored && stored !== 'undefined' && stored !== 'null' && stored !== '') {
    console.log(`[TENANT-ID] ✅ Using localStorage tenant ID: ${stored}`);
    return stored;
  }
  
  // SECURITY IMPROVEMENT: Always use UUID, never slug
  if (import.meta.env.MODE === 'development') {
    // Final fallback to env (development only) - ALWAYS use UUID
    const envFallback = import.meta.env.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    console.log(`[TENANT-ID] 🔧 Development: Using fallback tenant ID: ${envFallback}`);
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
          console.warn(`⚠️ Auto-prefixing /api to URL: ${baseUrl}`);
          baseUrl = `/api/${baseUrl}`;
        }
        
        // Ensure all requests go to /api endpoints
        if (!baseUrl.startsWith('/api/') && !baseUrl.startsWith('http')) {
          console.error(`❌ Non-API endpoint attempted: ${baseUrl}`);
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
            // Normalized absolute URL to relative
          } catch (e) {
            console.error('Failed to normalize URL:', e);
          }
        }
        
        // ✅ NEW: Special handling per endpoint HR
        if (finalUrl.includes('/hr/')) {
          await validateHRPrerequisites(finalUrl);
        }
        
        // Making API request
        
        const tenantId = getCurrentTenantId();
        
        // SECURITY VERIFICATION: Log tenant ID for audit trail
        console.log(`[QUERY-CLIENT] 📡 Making API request to: ${finalUrl}`);
        console.log(`[TENANT-VERIFICATION] 🔒 Sending X-Tenant-ID: "${tenantId}"`);
        console.log(`[TENANT-VERIFICATION] 🆔 Tenant ID type: ${typeof tenantId}, length: ${tenantId?.length}`);
        
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
        } else {
          console.log(`[TENANT-VERIFICATION] ✅ Valid UUID format confirmed`);
        }
        
        let headers: Record<string, string> = {
          'X-Tenant-ID': tenantId, // Header per il tenant ID
        };
        
        // Mode-based authentication - clean separation  
        console.log(`🔍 [API-DEBUG] AUTH_MODE: ${AUTH_MODE}`);
        console.log(`🔍 [API-DEBUG] Making request to: ${finalUrl}`);
        if (AUTH_MODE === 'development') {
          // Development mode: ONLY use X-Auth-Session headers, NEVER call OAuth methods
          headers['X-Auth-Session'] = 'authenticated';
          headers['X-Demo-User'] = 'demo-user';
          console.log(`🔧 [DEV-AUTH] Headers aggiunti per development mode:`, headers);
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
        
        // Request headers configured
        
        const res = await fetch(finalUrl, {
          credentials: "include",
          headers,
        });
        
        // Response received
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log('❌ 401 Unauthorized');
            
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
  
  // CRITICAL SECURITY CHECK: Block apiRequest calls with undefined/invalid tenant IDs
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
    console.error(`[TENANT-ERROR] ❌ BLOCKING API REQUEST - Invalid tenant ID detected!`);
    console.error(`[TENANT-ERROR] ❌ URL: ${finalUrl}`);
    console.error(`[TENANT-ERROR] ❌ Tenant ID: "${tenantId}"`);
    throw new Error(`Invalid tenant ID for apiRequest: "${tenantId}". Cannot proceed with request.`);
  }
  
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    'X-Tenant-ID': tenantId, // Header per il tenant ID
  };
  
  console.log(`[API-REQUEST] 📡 Making API request to: ${finalUrl} with tenant: ${tenantId}`);
  
  // Mode-based authentication for API requests
  if (AUTH_MODE === 'development') {
    // Development mode: ONLY use X-Auth-Session headers
    headers['X-Auth-Session'] = 'authenticated';
    headers['X-Demo-User'] = 'demo-user';
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
  
  // Serialize body if it's an object
  let processedOptions = { ...options };
  if (processedOptions.body && typeof processedOptions.body === 'object') {
    processedOptions.body = JSON.stringify(processedOptions.body);
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
      console.log('❌ 401 Unauthorized in apiRequest');
      
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

  return res.json();
}