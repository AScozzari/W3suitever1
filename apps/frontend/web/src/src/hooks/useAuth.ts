import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profileImageUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface UserScope {
  type: 'tenant' | 'rs' | 'store' | 'brand' | 'system';
  id?: string;
  name?: string;
}

interface AuthData {
  user: User;
  tenant?: Tenant;
  roles: string[];
  permissions: string[];
  scope: UserScope;
  capabilities: string[];
  mfaRequired: boolean;
}

export function useAuth() {
  const { data: authData, isLoading, error } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: authData?.user,
    tenant: authData?.tenant,
    roles: authData?.roles || [],
    permissions: authData?.permissions || [],
    scope: authData?.scope,
    capabilities: authData?.capabilities || [],
    mfaRequired: authData?.mfaRequired || false,
    isLoading,
    isAuthenticated: !!authData?.user,
    hasCapability: (capability: string) => {
      if (!authData?.capabilities) return false;
      return authData.capabilities.includes('*') || 
             authData.capabilities.includes(capability) ||
             authData.capabilities.some(cap => 
               cap.endsWith('*') && capability.startsWith(cap.slice(0, -1))
             );
    }
  };
}
