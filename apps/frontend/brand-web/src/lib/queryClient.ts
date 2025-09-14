import { QueryClient } from "@tanstack/react-query";

// API client function per Brand Interface
export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = window.brandAuthToken || localStorage.getItem('brand-token');
  
  // Normalize URL to relative path to ensure it goes through nginx
  let finalUrl = url;
  if (url.startsWith('http')) {
    try {
      const u = new URL(url, window.location.origin);
      finalUrl = u.pathname + u.search;
      console.log('📡 Normalized absolute URL to relative:', url, '->', finalUrl);
    } catch (e) {
      console.error('Failed to normalize URL:', e);
      finalUrl = url;
    }
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    }
  };

  const response = await fetch(finalUrl, config);
  
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
        
        // Normalize URL to relative path to ensure it goes through nginx
        let finalUrl = url;
        if (url.startsWith('http')) {
          try {
            const u = new URL(url, window.location.origin);
            finalUrl = u.pathname + u.search;
            console.log('📡 Normalized absolute URL to relative:', url, '->', finalUrl);
          } catch (e) {
            console.error('Failed to normalize URL:', e);
            finalUrl = url;
          }
        }
        
        return apiRequest(finalUrl);
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