// Store Resolution Hook - GPS + Manual Store Selection
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  timeTrackingService,
  NearbyStore,
  NearbyStoresResponse,
  StoreResolutionResult
} from '@/services/timeTrackingService';
import { GeolocationManager, GeoPosition } from '@/utils/geolocationManager';

export interface StoreResolutionState {
  // Core state
  nearbyStores: NearbyStore[];
  selectedStore: NearbyStore | null;
  autoDetected: boolean;
  isResolving: boolean;
  
  // GPS state
  hasGpsPermission: boolean;
  gpsPosition: GeoPosition | null;
  gpsError: string | null;
  
  // Selection state
  requiresManualSelection: boolean;
  isOverriding: boolean;
  overrideReason: string;
  
  // Cache state
  hasCachedLocation: boolean;
  lastSuccessfulLocation: { lat: number; lng: number } | null;
}

export interface StoreResolutionActions {
  // Core actions
  resolveNearbyStores: (lat: number, lng: number, radius?: number) => Promise<NearbyStoresResponse>;
  autoSelectStore: () => Promise<void>;
  selectStoreManually: (store: NearbyStore) => void;
  
  // GPS actions
  requestGpsPermission: () => Promise<boolean>;
  getCurrentPosition: () => Promise<GeoPosition>;
  
  // Override actions
  enableOverride: (reason: string) => void;
  cancelOverride: () => void;
  
  // Cache actions
  loadCachedLocation: () => void;
  clearLocationCache: () => void;
  
  // Reset
  reset: () => void;
}

const QUERY_KEYS = {
  nearbyStores: (lat: number, lng: number, radius: number) => 
    ['stores', 'nearby', { lat, lng, radius }],
  storeResolution: (lat: number, lng: number, accuracy: number) =>
    ['stores', 'resolution', { lat, lng, accuracy }]
};

export function useStoreResolution(): StoreResolutionState & StoreResolutionActions {
  const queryClient = useQueryClient();
  const geolocationManagerRef = useRef<GeolocationManager | null>(null);
  
  // Initialize GeolocationManager
  useEffect(() => {
    if (!geolocationManagerRef.current) {
      geolocationManagerRef.current = new GeolocationManager();
      geolocationManagerRef.current.initialize();
    }
  }, []);

  // ==================== STATE ====================
  const [state, setState] = useState<StoreResolutionState>({
    nearbyStores: [],
    selectedStore: null,
    autoDetected: false,
    isResolving: false,
    hasGpsPermission: false,
    gpsPosition: null,
    gpsError: null,
    requiresManualSelection: false,
    isOverriding: false,
    overrideReason: '',
    hasCachedLocation: false,
    lastSuccessfulLocation: null
  });

  // DEMO STORES FALLBACK - Always available
  const getDemoStores = () => {
    const demoStores = [
      {
        id: 'demo-store-milano',
        name: 'Store Milano Centro',
        latitude: 45.4642,
        longitude: 9.1900,
        distance: 50,
        inGeofence: true,
        confidence: 95,
        address: 'Via del Corso 1, Milano',
        city: 'Milano',
        province: 'MI',
        radius: 200,
        rank: 1,
        isNearest: true,
        wifiNetworks: ['StoreWiFi_Milano']
      },
      {
        id: 'demo-store-roma',
        name: 'Store Roma Termini',
        latitude: 41.9028,
        longitude: 12.4964,
        distance: 150,
        inGeofence: false,
        confidence: 85,
        address: 'Via Nazionale 50, Roma',
        city: 'Roma',
        province: 'RM',
        radius: 250,
        rank: 2,
        isNearest: false,
        wifiNetworks: ['StoreWiFi_Roma']
      },
      {
        id: 'demo-store-napoli',
        name: 'Store Napoli Centro',
        latitude: 40.8518,
        longitude: 14.2681,
        distance: 300,
        inGeofence: false,
        confidence: 75,
        address: 'Via Toledo 100, Napoli',
        city: 'Napoli',
        province: 'NA',
        radius: 300,
        rank: 3,
        isNearest: false,
        wifiNetworks: ['StoreWiFi_Napoli']
      }
    ];
    
    // Cache demo stores for future use
    try {
      localStorage.setItem('demo_stores_cache', JSON.stringify({
        stores: demoStores,
        timestamp: Date.now(),
        isDemoMode: true
      }));
    } catch (error) {
      console.warn('Failed to cache demo stores:', error);
    }
    
    return demoStores;
  };

  // Load cached stores from localStorage
  const getCachedStores = () => {
    try {
      const cached = localStorage.getItem('demo_stores_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const ageMinutes = (Date.now() - parsedCache.timestamp) / (1000 * 60);
        
        // Use cached data if less than 30 minutes old
        if (ageMinutes < 30 && parsedCache.stores) {
          console.log('🗂️ [STORE-CACHE] Using cached stores');
          return parsedCache.stores;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached stores:', error);
    }
    return null;
  };

  // ==================== REACT QUERY HOOKS ====================
  const nearbyStoresQuery = useQuery({
    queryKey: ['nearbyStores', state.gpsPosition?.lat, state.gpsPosition?.lng],
    queryFn: async () => {
      if (!state.gpsPosition) throw new Error('No GPS position available');
      return timeTrackingService.getNearbyStores(
        state.gpsPosition.lat,
        state.gpsPosition.lng,
        200 // Default radius
      );
    },
    enabled: !!state.gpsPosition && !state.gpsError,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2
  });

  // Handle query states with useEffect
  useEffect(() => {
    if (nearbyStoresQuery.error) {
      console.error('🔴 [STORE-QUERY] Nearby stores API failed:', nearbyStoresQuery.error);
      setState(prev => ({
        ...prev,
        gpsError: 'Database non disponibile - modalità demo attiva',
        requiresManualSelection: true,
        nearbyStores: getDemoStores() // Fallback to demo stores
      }));
    }

    if (nearbyStoresQuery.data) {
      console.log('✅ [STORE-QUERY] Nearby stores loaded successfully:', nearbyStoresQuery.data);
      if (nearbyStoresQuery.data.isDemoMode) {
        setState(prev => ({
          ...prev,
          gpsError: 'Database offline - usando dati demo',
          requiresManualSelection: true
        }));
      }
    }
  }, [nearbyStoresQuery.error, nearbyStoresQuery.data]);

  const storeResolutionMutation = useMutation({
    mutationFn: async (params: { lat: number; lng: number; accuracy: number }) => {
      return timeTrackingService.resolveStoreSelection(
        params.lat,
        params.lng,
        params.accuracy,
        200 // Default radius
      );
    },
    onSuccess: (result: StoreResolutionResult) => {
      setState(prev => ({
        ...prev,
        nearbyStores: result.nearbyStores,
        selectedStore: result.selectedStore,
        autoDetected: result.autoDetected,
        requiresManualSelection: result.requiresManualSelection,
        isResolving: false,
        gpsError: result.error || null
      }));
    },
    onError: (error) => {
      console.error('Store resolution error:', error);
      setState(prev => ({
        ...prev,
        isResolving: false,
        gpsError: error instanceof Error ? error.message : 'Store resolution failed'
      }));
    }
  });

  // ==================== CORE ACTIONS ====================
  const resolveNearbyStores = useCallback(async (
    lat: number, 
    lng: number, 
    radius: number = 200
  ): Promise<NearbyStoresResponse> => {
    const queryKey = QUERY_KEYS.nearbyStores(lat, lng, radius);
    
    try {
      // Check cache first
      const cachedData = queryClient.getQueryData<NearbyStoresResponse>(queryKey);
      if (cachedData) {
        setState(prev => ({
          ...prev,
          nearbyStores: cachedData.stores,
          lastSuccessfulLocation: { lat, lng },
          gpsError: cachedData.isDemoMode ? 'Usando dati cache (demo)' : null
        }));
        return cachedData;
      }

      console.log('🔍 [STORE-RESOLVE] Fetching nearby stores...');
      
      // Fetch fresh data with error handling
      const response = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => timeTrackingService.getNearbyStores(lat, lng, radius),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000 // 30 minutes
      });

      console.log('✅ [STORE-RESOLVE] Stores resolved:', response);
      
      setState(prev => ({
        ...prev,
        nearbyStores: response.stores || [],
        lastSuccessfulLocation: { lat, lng },
        gpsError: response.isDemoMode ? 'Database offline - usando dati demo' : null,
        requiresManualSelection: response.isDemoMode || (response.stores && response.stores.length === 0)
      }));

      return response;
      
    } catch (error) {
      console.error('🔴 [STORE-RESOLVE] Failed to resolve stores:', error);
      
      // Try cached stores first
      const cachedStores = getCachedStores();
      if (cachedStores) {
        console.log('📦 [STORE-FALLBACK] Using cached stores');
        const fallbackResponse = {
          stores: cachedStores,
          searchCenter: { lat, lng, radius },
          totalFound: cachedStores.length,
          inGeofenceCount: cachedStores.filter((s: NearbyStore) => s.inGeofence).length,
          message: 'Database non raggiungibile - usando cache locale',
          isDemoMode: true,
          fallbackReason: 'api_error_with_cache'
        };
        
        setState(prev => ({
          ...prev,
          nearbyStores: cachedStores,
          lastSuccessfulLocation: { lat, lng },
          gpsError: 'Database offline - usando cache locale',
          requiresManualSelection: true
        }));
        
        return fallbackResponse;
      }
      
      // Final fallback to demo stores
      console.log('🎭 [STORE-FALLBACK] Using demo stores as final fallback');
      const demoStores = getDemoStores();
      const fallbackResponse = {
        stores: demoStores,
        searchCenter: { lat, lng, radius },
        totalFound: demoStores.length,
        inGeofenceCount: demoStores.filter((s: NearbyStore) => s.inGeofence).length,
        message: 'Sistema offline - modalità demo attiva',
        isDemoMode: true,
        fallbackReason: 'api_error_demo_fallback'
      };
      
      setState(prev => ({
        ...prev,
        nearbyStores: demoStores,
        lastSuccessfulLocation: { lat, lng },
        gpsError: 'Sistema offline - modalità demo attiva',
        requiresManualSelection: true
      }));
      
      return fallbackResponse;
    }
  }, [queryClient]);

  const autoSelectStore = useCallback(async (): Promise<void> => {
    if (!state.gpsPosition) {
      throw new Error('GPS position required for auto-selection');
    }

    setState(prev => ({ ...prev, isResolving: true }));
    const position = state.gpsPosition; // Type narrowing

    try {
      await storeResolutionMutation.mutateAsync({
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy
      });
    } catch (error) {
      console.error('Auto-selection failed:', error);
      setState(prev => ({
        ...prev,
        isResolving: false,
        requiresManualSelection: true,
        gpsError: 'Auto-selection failed. Please select manually.'
      }));
    }
  }, [state.gpsPosition, storeResolutionMutation]);

  const selectStoreManually = useCallback((store: NearbyStore): void => {
    setState(prev => ({
      ...prev,
      selectedStore: store,
      autoDetected: false,
      requiresManualSelection: false,
      isOverriding: store.distance > store.radius
    }));
  }, []);

  // ==================== GPS ACTIONS ====================
  const requestGpsPermission = useCallback(async (): Promise<boolean> => {
    const geoManager = geolocationManagerRef.current;
    if (!geoManager) return false;

    try {
      const hasPermission = await geoManager.initialize();
      setState(prev => ({ ...prev, hasGpsPermission: hasPermission }));
      return hasPermission;
    } catch (error) {
      console.error('GPS permission error:', error);
      setState(prev => ({
        ...prev,
        hasGpsPermission: false,
        gpsError: 'GPS permission denied'
      }));
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<GeoPosition> => {
    const geoManager = geolocationManagerRef.current;
    if (!geoManager) {
      throw new Error('Geolocation manager not initialized');
    }

    setState(prev => ({ ...prev, isResolving: true, gpsError: null }));

    try {
      const position = await geoManager.getCurrentPosition();
      if (!position) {
        throw new Error('GPS positioning failed - no position returned');
      }
      setState(prev => ({
        ...prev,
        gpsPosition: position,
        isResolving: false,
        gpsError: null
      }));
      return position;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'GPS positioning failed';
      setState(prev => ({
        ...prev,
        isResolving: false,
        gpsError: errorMessage,
        requiresManualSelection: true
      }));
      throw error;
    }
  }, []);

  // ==================== OVERRIDE ACTIONS ====================
  const enableOverride = useCallback((reason: string): void => {
    setState(prev => ({
      ...prev,
      isOverriding: true,
      overrideReason: reason
    }));
  }, []);

  const cancelOverride = useCallback((): void => {
    setState(prev => ({
      ...prev,
      isOverriding: false,
      overrideReason: '',
      selectedStore: null
    }));
  }, []);

  // ==================== CACHE ACTIONS ====================
  const loadCachedLocation = useCallback((): void => {
    const cached = timeTrackingService.getCachedLastLocation();
    if (cached) {
      setState(prev => ({
        ...prev,
        hasCachedLocation: true,
        lastSuccessfulLocation: { lat: cached.lat, lng: cached.lng },
        nearbyStores: cached.stores
      }));
    }
  }, []);

  const clearLocationCache = useCallback((): void => {
    timeTrackingService.clearLocationCache();
    queryClient.removeQueries({ queryKey: ['stores'] });
    setState(prev => ({
      ...prev,
      hasCachedLocation: false,
      lastSuccessfulLocation: null,
      nearbyStores: []
    }));
  }, [queryClient]);

  // ==================== RESET ====================
  const reset = useCallback((): void => {
    setState({
      nearbyStores: [],
      selectedStore: null,
      autoDetected: false,
      isResolving: false,
      hasGpsPermission: false,
      gpsPosition: null,
      gpsError: null,
      requiresManualSelection: false,
      isOverriding: false,
      overrideReason: '',
      hasCachedLocation: false,
      lastSuccessfulLocation: null
    });
    
    // Clear related queries
    queryClient.removeQueries({ queryKey: ['stores'] });
  }, [queryClient]);

  // ==================== EFFECTS ====================
  // Load cached location on mount
  useEffect(() => {
    loadCachedLocation();
  }, [loadCachedLocation]);

  // Auto-resolve when GPS position is available
  useEffect(() => {
    if (state.gpsPosition && !state.selectedStore && !state.isResolving) {
      autoSelectStore().catch(console.error);
    }
  }, [state.gpsPosition, state.selectedStore, state.isResolving, autoSelectStore]);

  // ==================== RETURN ====================
  return {
    // State
    ...state,
    
    // Actions
    resolveNearbyStores,
    autoSelectStore,
    selectStoreManually,
    requestGpsPermission,
    getCurrentPosition,
    enableOverride,
    cancelOverride,
    loadCachedLocation,
    clearLocationCache,
    reset
  };
}

export default useStoreResolution;