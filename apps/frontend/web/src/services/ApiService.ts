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
        const response = await apiRequest<T>(endpoint, options);
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

  async getUsers() {
    return this.makeRequest<any[]>('/api/users');
  }

  async getStores() {
    return this.makeRequest<any[]>('/api/stores');
  }

  async getCommercialAreas() {
    return this.makeRequest<any[]>('/api/commercial-areas');
  }

  async getRoles() {
    return this.makeRequest<any[]>('/api/roles');
  }

  /**
   * Carica tutti i dati per Settings Page in parallelo
   * Con gestione enterprise robusta
   */
  async loadSettingsData() {
    console.log('🔄 ApiService: Starting loadSettingsData...');
    
    const [legalEntities, users, stores] = await Promise.all([
      this.getLegalEntities(),
      this.getUsers(),
      this.getStores()
    ]);

    console.log('📊 ApiService: API responses received:', {
      legalEntities: { success: legalEntities.success, count: legalEntities.data?.length || 0, error: legalEntities.error },
      users: { success: users.success, count: users.data?.length || 0, error: users.error },
      stores: { success: stores.success, count: stores.data?.length || 0, error: stores.error }
    });

    // Controlla se qualche chiamata ha fallito per problemi di auth
    const authRequired = [legalEntities, users, stores].some(result => result.needsAuth);
    if (authRequired) {
      console.error('❌ ApiService: Authentication required');
      return {
        success: false,
        error: 'Authentication required',
        needsAuth: true
      };
    }

    // Controlla se tutte le chiamate sono riuscite
    const allSuccess = [legalEntities, users, stores].every(result => result.success);
    if (!allSuccess) {
      const errors = [legalEntities, users, stores]
        .filter(result => !result.success)
        .map(result => result.error)
        .join(', ');
      
      console.error('❌ ApiService: Some API calls failed:', errors);
      return {
        success: false,
        error: `Failed to load data: ${errors}`
      };
    }

    const result = {
      success: true,
      data: {
        legalEntities: legalEntities.data || [],
        users: users.data || [],
        stores: stores.data || []
      }
    };
    
    console.log('✅ ApiService: loadSettingsData completed successfully:', {
      legalEntitiesCount: result.data.legalEntities.length,
      usersCount: result.data.users.length,
      storesCount: result.data.stores.length
    });
    
    return result;
  }
}

// Singleton pattern per service enterprise
export const apiService = new ApiService();