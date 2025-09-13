import { QueryClient } from "@tanstack/react-query";

// Brand API base URL - use proxy via port 5000
const BRAND_API_BASE_URL = "http://localhost:5000";

// API client function per Brand Interface
export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = window.brandAuthToken || localStorage.getItem('brand-token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    }
  };

  const fullUrl = url.startsWith('http') ? url : `${BRAND_API_BASE_URL}${url}`;
  const response = await fetch(fullUrl, config);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime è deprecato in v5)
      refetchOnWindowFocus: false,
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey.join('') : String(queryKey);
        return apiRequest(url);
      },
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});