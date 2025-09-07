import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BrandTenantContextType {
  currentTenant: string | null;
  currentTenantId: string | null;
  isCrossTenant: boolean;
  switchTenant: (tenant: string | null) => void;
}

const BrandTenantContext = createContext<BrandTenantContextType | undefined>(undefined);

// Mapping dei tenant per Brand Interface - stesso mapping di W3 Suite
const BRAND_TENANT_MAPPING: Record<string, string> = {
  'staging': '00000000-0000-0000-0000-000000000001',
  'demo': '99999999-9999-9999-9999-999999999999',
  'acme': '11111111-1111-1111-1111-111111111111',
  'tech': '22222222-2222-2222-2222-222222222222'
};

export function BrandTenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  const isCrossTenant = currentTenant === null;

  const switchTenant = (tenant: string | null) => {
    if (tenant) {
      // Naviga a tenant specifico
      window.location.href = `/brandinterface/${tenant}`;
    } else {
      // Naviga a modalità cross-tenant
      window.location.href = '/brandinterface';
    }
  };

  const updateTenant = (tenant: string | null) => {
    setCurrentTenant(tenant);
    
    if (tenant) {
      const tenantId = BRAND_TENANT_MAPPING[tenant] || BRAND_TENANT_MAPPING['staging'];
      setCurrentTenantId(tenantId);
      
      // Salva per persistenza
      localStorage.setItem('brandCurrentTenant', tenant);
      localStorage.setItem('brandCurrentTenantId', tenantId);
      
      console.log(`🎯 Brand Interface - Tenant: ${tenant} (${tenantId})`);
    } else {
      setCurrentTenantId(null);
      
      // Rimuovi dalla persistenza
      localStorage.removeItem('brandCurrentTenant');
      localStorage.removeItem('brandCurrentTenantId');
      
      console.log('🌍 Brand Interface - Cross-tenant mode');
    }
  };

  return (
    <BrandTenantContext.Provider value={{
      currentTenant,
      currentTenantId,
      isCrossTenant,
      switchTenant
    }}>
      {children}
    </BrandTenantContext.Provider>
  );
}

// Hook per usare il tenant context
export function useBrandTenant() {
  const context = useContext(BrandTenantContext);
  if (context === undefined) {
    throw new Error('useBrandTenant must be used within a BrandTenantProvider');
  }
  return context;
}

// Component wrapper per gestire tenant dal path URL
export function BrandTenantWrapper({ params, children }: { params: any, children: ReactNode }) {
  const tenant = params?.tenant || null;

  useEffect(() => {
    // Extract tenant from URL path and update context
    if (tenant) {
      const tenantId = BRAND_TENANT_MAPPING[tenant] || BRAND_TENANT_MAPPING['staging'];
      
      localStorage.setItem('brandCurrentTenant', tenant);
      localStorage.setItem('brandCurrentTenantId', tenantId);
      
      console.log(`🎯 Brand Interface - Tenant context: ${tenant} (${tenantId})`);
    } else {
      // Cross-tenant mode
      localStorage.removeItem('brandCurrentTenant'); 
      localStorage.removeItem('brandCurrentTenantId');
      
      console.log('🌍 Brand Interface - Cross-tenant mode active');
    }
  }, [tenant]);

  return <>{children}</>;
}