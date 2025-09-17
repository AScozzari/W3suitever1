// Centralized API utilities
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function apiGet(url: string) {
  return apiRequest(url, { method: 'GET' });
}

export async function apiPost(url: string, data?: any) {
  return apiRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiPut(url: string, data?: any) {
  return apiRequest(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete(url: string) {
  return apiRequest(url, { method: 'DELETE' });
}

// Legacy alias for backward compatibility
export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete
};