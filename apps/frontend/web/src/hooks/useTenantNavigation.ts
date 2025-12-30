import { useLocation } from 'wouter';
import { useTenant } from '@/contexts/TenantContext';

export function useTenantNavigation() {
  const [, setLocation] = useLocation();
  const { tenantSlug } = useTenant();

  const navigateTo = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    setLocation(`/${tenantSlug}${cleanPath}`);
  };

  const buildPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${tenantSlug}${cleanPath}`;
  };

  return { navigateTo, buildPath };
}
