import { createContext, useContext } from 'react';

interface Tenant {
  id: string;
  name: string;
  logo?: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
}

export function TenantProvider({ children, tenant, setTenant }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}