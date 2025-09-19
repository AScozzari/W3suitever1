// SECURITY IMPROVEMENT: Consolidated API utilities - eliminates duplication with queryClient.ts
// This file now reuses the unified apiRequest from queryClient.ts to prevent duplicate code and logic
import { apiRequest as unifiedApiRequest } from './queryClient';

export const API_BASE_URL = '/api';

// CONSOLIDATED: Reuse the unified apiRequest from queryClient.ts to eliminate code duplication
// This prevents inconsistencies between two different API client implementations
export async function apiRequest<T = any>(url: string, options?: RequestInit): Promise<T> {
  // Ensure URL has proper /api prefix
  const finalUrl = url.startsWith('/api') ? url : `${API_BASE_URL}${url}`;
  
  // SECURITY IMPROVEMENT: Use the unified, secure apiRequest from queryClient.ts
  // This ensures consistent tenant validation, auth headers, and security checks
  return unifiedApiRequest(finalUrl, options);
}

export async function apiGet<T = any>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' });
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' });
}

// Legacy alias for backward compatibility
export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete
};