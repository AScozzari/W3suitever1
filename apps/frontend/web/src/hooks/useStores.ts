import { useQuery } from '@tanstack/react-query';

interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  region?: string;
  status: 'active' | 'inactive';
}

export function useStores() {
  const { data: stores, isLoading, error } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      const response = await fetch('/api/stores');
      if (!response.ok) {
        // Return mock data if stores endpoint doesn't exist yet
        return [
          {
            id: 'store-1',
            name: 'Milano Centro',
            code: 'MI001',
            city: 'Milano',
            region: 'Lombardia',
            status: 'active'
          },
          {
            id: 'store-2',
            name: 'Roma Termini',
            code: 'RM001',
            city: 'Roma',
            region: 'Lazio',
            status: 'active'
          },
          {
            id: 'store-3',
            name: 'Napoli Porto',
            code: 'NA001',
            city: 'Napoli',
            region: 'Campania',
            status: 'active'
          }
        ];
      }
      return response.json();
    }
  });
  
  return {
    stores: stores || [],
    isLoading,
    error
  };
}