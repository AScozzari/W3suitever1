import { useQuery } from '@tanstack/react-query';

export interface ItalianCity {
  id: string;
  name: string;
  province: string;
  provinceName: string;
  region: string;
  postalCode: string;
  active: boolean;
}

export const useItalianCities = () => {
  return useQuery({
    queryKey: ['/api/reference/italian-cities'],
    queryFn: async (): Promise<ItalianCity[]> => {
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      const response = await fetch('/api/reference/italian-cities', {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch Italian cities');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    cacheTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });
};