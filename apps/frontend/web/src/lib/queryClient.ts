import { QueryClient } from "@tanstack/react-query";

// Helper per ottenere il tenant ID corrente
const getCurrentTenantId = () => {
  // Sempre usa l'UUID corretto per development
  return '00000000-0000-0000-0000-000000000001';
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = localStorage.getItem('auth_token');
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
            // Clear invalid token
            localStorage.removeItem('auth_token');
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

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem('auth_token');
  const tenantId = getCurrentTenantId();
  
  const res = await fetch(url, {
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
      throw new Error(`401: Unauthorized`);
    }
    throw new Error(`${res.status}: ${res.statusText}`);
  }

  return res.json();
}