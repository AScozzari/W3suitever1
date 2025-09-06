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
    queryKey: ['/api/italian-cities'],
    queryFn: async (): Promise<ItalianCity[]> => {
      const response = await fetch('/api/italian-cities');
      if (!response.ok) {
        throw new Error('Failed to fetch Italian cities');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    cacheTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });
};