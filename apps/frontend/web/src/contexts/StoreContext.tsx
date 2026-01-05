import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface UserStore {
  id: string;
  storeId: string;
  name: string;
  code: string;
  status: string;
  address: string;
  city: string;
  province: string;
  isPrimary: boolean;
}

interface StoreContextValue {
  stores: UserStore[];
  selectedStore: UserStore | null;
  setSelectedStore: (store: UserStore | null) => void;
  isLoading: boolean;
  error: Error | null;
  refreshStores: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const SELECTED_STORE_KEY = 'w3suite_selected_store_id';

interface StoreProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function StoreProvider({ children, enabled = true }: StoreProviderProps) {
  const [selectedStore, setSelectedStoreState] = useState<UserStore | null>(null);

  const { data: storesResponse, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: UserStore[];
  }>({
    queryKey: ['/api/me/stores'],
    enabled,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const stores = Array.isArray(storesResponse?.data) ? storesResponse.data : [];

  useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      const savedStoreId = localStorage.getItem(SELECTED_STORE_KEY);
      
      if (savedStoreId) {
        const savedStore = stores.find(s => s.id === savedStoreId);
        if (savedStore) {
          setSelectedStoreState(savedStore);
          return;
        }
      }
      
      const primaryStore = stores.find(s => s.isPrimary);
      setSelectedStoreState(primaryStore || stores[0]);
    }
  }, [stores, selectedStore]);

  const setSelectedStore = useCallback((store: UserStore | null) => {
    setSelectedStoreState(store);
    if (store) {
      localStorage.setItem(SELECTED_STORE_KEY, store.id);
    } else {
      localStorage.removeItem(SELECTED_STORE_KEY);
    }
    
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && (
          key.includes('/api/wms') ||
          key.includes('/api/hr') ||
          key.includes('/api/crm') ||
          key.includes('/api/inventory')
        );
      }
    });
  }, []);

  const refreshStores = useCallback(() => {
    refetch();
  }, [refetch]);

  const value: StoreContextValue = {
    stores,
    selectedStore,
    setSelectedStore,
    isLoading,
    error: error as Error | null,
    refreshStores,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (context === undefined) {
    return {
      stores: [],
      selectedStore: null,
      setSelectedStore: () => {},
      isLoading: false,
      error: null,
      refreshStores: () => {},
    };
  }
  return context;
}

export function useSelectedStoreId() {
  const { selectedStore } = useStore();
  return selectedStore?.id ?? null;
}
