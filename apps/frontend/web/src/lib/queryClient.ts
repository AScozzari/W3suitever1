import { QueryClient } from "@tanstack/react-query";
import { authService } from '../services/AuthService';

// Helper per ottenere il tenant ID corrente
const getCurrentTenantId = () => {
  // Sempre usa l'UUID corretto per development
  return '00000000-0000-0000-0000-000000000001';
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = await authService.getAccessToken();
        const tenantId = getCurrentTenantId();
        
        const url = queryKey[0] as string;
        const fullUrl = url.startsWith('http') ? url : url;
        
        const res = await fetch(fullUrl, {
          credentials: "include",
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-Tenant-ID': tenantId, // Header per il tenant ID
          },
        });
        if (!res.ok) {
          if (res.status === 401) {
            // Use auth service logout
            await authService.logout();
            // Solo redirige se non siamo già sulla pagina di login
            if (!window.location.pathname.includes('/login')) {
              const pathSegments = window.location.pathname.split('/').filter(Boolean);
              const tenant = pathSegments[0] || 'staging';
              window.location.href = `/${tenant}/login`;
            }
            throw new Error(`401: Unauthorized`);
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: false, // Disabilita retry globalmente
      refetchOnWindowFocus: false, // Disabilita refetch su focus
      refetchOnMount: false, // Disabilita refetch su mount
    },
  },
});

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await authService.getAccessToken();
  const tenantId = getCurrentTenantId();
  
  const fullUrl = url.startsWith('http') ? url : url;
  
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-Tenant-ID': tenantId, // Header per il tenant ID
      ...options.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Use auth service logout
      await authService.logout();
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const tenant = pathSegments[0] || 'staging';
      window.location.href = `/${tenant}/login`;
      throw new Error(`401: Unauthorized`);
    }
    throw new Error(`${res.status}: ${res.statusText}`);
  }

  return res.json();
}