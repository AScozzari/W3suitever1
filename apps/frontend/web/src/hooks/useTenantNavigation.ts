import { useLocation } from 'wouter';

export function useTenantNavigation() {
  const [location, setLocation] = useLocation();
  
  const getTenantSlug = (): string => {
    const storedTenant = localStorage.getItem('currentTenant');
    if (storedTenant) return storedTenant;
    
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts[0];
    }
    
    return 'staging';
  };

  const navigateTo = (path: string) => {
    const tenantSlug = getTenantSlug();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    setLocation(`/${tenantSlug}${cleanPath}`);
  };

  const buildPath = (path: string) => {
    const tenantSlug = getTenantSlug();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${tenantSlug}${cleanPath}`;
  };

  return { navigateTo, buildPath, tenantSlug: getTenantSlug() };
}
