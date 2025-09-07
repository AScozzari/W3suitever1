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
  private maxRetries = 3;
  private retryDelay = 1000; // 1 secondo

  /**
   * Gestione enterprise per chiamate API con retry automatico
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await apiRequest(endpoint, options);
        return {
          success: true,
          data: response
        };
      } catch (error: any) {
        lastError = error;
        
        // Se è un errore 401, non fare retry - serve nuova autenticazione
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return {
            success: false,
            error: 'Authentication required',
            needsAuth: true
          };
        }

        // Se è l'ultimo tentativo, non aspettare
        if (attempt === this.maxRetries) break;

        // Aspetta prima del prossimo tentativo (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
        );
      }
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
   * Carica tutti i dati per Settings Page in parallelo
   * Con gestione enterprise robusta
   */
  async loadSettingsData() {
    // Enterprise pattern: Graceful degradation with individual error handling
    const apiCalls = await Promise.allSettled([
      this.getLegalEntities(),
      this.getUsers(), 
      this.getStores()
    ]);

    const [legalEntitiesResult, usersResult, storesResult] = apiCalls;

    // Extract successful results, fallback to empty arrays for failures
    const legalEntities = legalEntitiesResult.status === 'fulfilled' && legalEntitiesResult.value.success 
      ? legalEntitiesResult.value : { success: false, data: [], error: 'API unavailable' };
    
    const users = usersResult.status === 'fulfilled' && usersResult.value.success 
      ? usersResult.value : { success: false, data: [], error: 'API unavailable' };
    
    const stores = storesResult.status === 'fulfilled' && storesResult.value.success 
      ? storesResult.value : { success: false, data: [], error: 'API unavailable' };

    // Check for authentication requirements
    const authRequired = [legalEntities, users, stores].some(result => result.needsAuth);
    if (authRequired) {
      return {
        success: false,
        error: 'Authentication required',
        needsAuth: true
      };
    }

    // Return available data even if some APIs failed (graceful degradation)
    const data = {
      legalEntities: legalEntities.data || [],
      users: users.data || [],
      stores: stores.data || []
    };

    const hasAnyData = data.legalEntities.length > 0 || data.users.length > 0 || data.stores.length > 0;

    return {
      success: hasAnyData,
      data,
      warnings: [
        !legalEntities.success ? 'Legal entities service unavailable' : null,
        !users.success ? 'Users service unavailable' : null,
        !stores.success ? 'Stores service unavailable' : null
      ].filter(Boolean)
    };
  }
}

// Singleton pattern per service enterprise
export const apiService = new ApiService();