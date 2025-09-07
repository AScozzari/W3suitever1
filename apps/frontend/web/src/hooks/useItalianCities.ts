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
      // Reference data doesn't need tenant context - it's shared across all tenants
      const response = await fetch('/api/reference/italian-cities', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch Italian cities');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });
};