/**
 * W3 Suite Enterprise API Service
 * Centralizza tutte le chiamate API con gestione OAuth2, retry automatico e error handling
 */

import { apiRequest } from '@/lib/queryClient';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  needsAuth?: boolean;
}

class ApiService {
  private baseUrl = '';
  private readonly REQUEST_TIMEOUT = 8000; // 8 seconds timeout
  private readonly BASE_RETRY_DELAY = 500; // Reduced to 500ms

  /**
   * Optimized API request handling with timeout and reduced retry logic
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method?.toUpperCase() || 'GET';
    const isReadOperation = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    
    // Reduce retries: 1 for GET requests, 2 for mutations
    const maxRetries = isReadOperation ? 1 : 2;
    
    let lastError: Error | null = null;
    const abortController = new AbortController();

    // Set request timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.REQUEST_TIMEOUT);

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const requestOptions = {
            ...options,
            signal: abortController.signal
          };

          const response = await apiRequest(endpoint, requestOptions);
          clearTimeout(timeoutId);
          return {
            success: true,
            data: response
          };
        } catch (error: any) {
          lastError = error;
          
          // Handle aborted requests
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            clearTimeout(timeoutId);
            return {
              success: false,
              error: 'Request timeout',
              needsAuth: false
            };
          }
          
          // Authentication errors - no retry needed
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            clearTimeout(timeoutId);
            return {
              success: false,
              error: 'Authentication required',
              needsAuth: true
            };
          }

          // Server errors that shouldn't be retried
          if (error.message?.includes('404') || error.message?.includes('400')) {
            clearTimeout(timeoutId);
            return {
              success: false,
              error: error.message || 'Client error',
              needsAuth: false
            };
          }

          // If this is the last attempt, don't wait
          if (attempt === maxRetries) break;

          // Small jitter backoff (500ms + random 0-200ms)
          const jitter = Math.random() * 200;
          await new Promise(resolve => 
            setTimeout(resolve, this.BASE_RETRY_DELAY + jitter)
          );
        }
      }
    } catch (error: any) {
      lastError = error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Log only final errors for debugging
    if (lastError) {
      console.warn(`⚠️ ApiService: Failed request to ${endpoint}:`, lastError.message);
    }

    return {
      success: false,
      error: lastError?.message || 'Network error',
      needsAuth: false
    };
  }

  /**
   * API Endpoints per Settings Page
   */
  async getLegalEntities() {
    return this.makeRequest<any[]>('/api/legal-entities');
  }

  async createLegalEntity(legalEntityData: any) {
    return this.makeRequest<any>('/api/legal-entities', {
      method: 'POST',
      body: JSON.stringify(legalEntityData)
    });
  }

  async updateLegalEntity(id: string, legalEntityData: any) {
    return this.makeRequest<any>(`/api/legal-entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(legalEntityData)
    });
  }

  async deleteLegalEntity(id: string) {
    return this.makeRequest<void>(`/api/legal-entities/${id}`, {
      method: 'DELETE'
    });
  }

  async getUsers() {
    return this.makeRequest<any[]>('/api/users');
  }

  async getStores() {
    return this.makeRequest<any[]>('/api/stores');
  }

  async createStore(storeData: any) {
    return this.makeRequest<any>('/api/stores', {
      method: 'POST',
      body: JSON.stringify(storeData)
    });
  }

  async updateStore(id: string, storeData: any) {
    return this.makeRequest<any>(`/api/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(storeData)
    });
  }

  async deleteStore(id: string) {
    return this.makeRequest<void>(`/api/stores/${id}`, {
      method: 'DELETE'
    });
  }

  async getCommercialAreas() {
    return this.makeRequest<any[]>('/api/commercial-areas');
  }

  /**
   * BRAND INTERFACE - Tenant Management APIs
   */
  async createTenant(tenantData: any) {
    return this.makeRequest<any>('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData)
    });
  }

  async getTenant(id: string) {
    return this.makeRequest<any>(`/api/tenants/${id}`);
  }

  async updateTenant(id: string, tenantData: any) {
    return this.makeRequest<any>(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData)
    });
  }

  async getRoles() {
    return this.makeRequest<any[]>('/api/roles');
  }

  /**
   * Loads all settings data in parallel with optimized error handling
   */
  async loadSettingsData() {
    // Optimized parallel loading with graceful degradation
    const apiCalls = await Promise.allSettled([
      this.getLegalEntities(),
      this.getUsers(), 
      this.getStores()
    ]);

    const [legalEntitiesResult, usersResult, storesResult] = apiCalls;

    // Extract successful results, fallback to empty arrays for failures
    const legalEntities = legalEntitiesResult.status === 'fulfilled' && legalEntitiesResult.value.success 
      ? legalEntitiesResult.value.data : [];
    
    const users = usersResult.status === 'fulfilled' && usersResult.value.success 
      ? usersResult.value.data : [];
    
    const stores = storesResult.status === 'fulfilled' && storesResult.value.success 
      ? storesResult.value.data : [];

    // Check for authentication requirements
    const authRequired = [legalEntitiesResult, usersResult, storesResult].some(
      result => result.status === 'fulfilled' && result.value.needsAuth
    );
    if (authRequired) {
      return {
        success: false,
        error: 'Authentication required',
        needsAuth: true
      };
    }

    // Return available data even if some APIs failed (graceful degradation)
    const data = {
      legalEntities: legalEntities || [],
      users: users || [],
      stores: stores || []
    };

    const hasAnyData = data.legalEntities.length > 0 || data.users.length > 0 || data.stores.length > 0;

    return {
      success: hasAnyData,
      data,
      warnings: [
        legalEntitiesResult.status === 'rejected' || (legalEntitiesResult.status === 'fulfilled' && !legalEntitiesResult.value.success) ? 'Legal entities service unavailable' : null,
        usersResult.status === 'rejected' || (usersResult.status === 'fulfilled' && !usersResult.value.success) ? 'Users service unavailable' : null,
        storesResult.status === 'rejected' || (storesResult.status === 'fulfilled' && !storesResult.value.success) ? 'Stores service unavailable' : null
      ].filter(Boolean)
    };
  }
}

// Singleton pattern per service enterprise
export const apiService = new ApiService();