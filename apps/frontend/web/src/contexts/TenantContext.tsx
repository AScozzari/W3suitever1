import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  code: string;
  plan: string;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenant: Tenant;
  roles: string[];
}

interface TenantContextType {
  currentTenant: Tenant | null;
  currentUser: User | null;
  isLoading: boolean;
  error: Error | null;
  switchTenant?: (tenantId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  currentUser: null,
  isLoading: true,
  error: null
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch user and tenant data from authenticated session
  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['/api/auth/session'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (sessionData) {
      // Session includes user with tenant info
      setCurrentUser(sessionData.user);
      setCurrentTenant(sessionData.user.tenant);
      
      // Set default tenant ID for all API calls
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('currentTenantId', sessionData.user.tenantId);
      }
    }
  }, [sessionData]);

  // Function to switch tenant (for users with access to multiple tenants)
  const switchTenant = async (tenantId: string) => {
    try {
      const response = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTenant(data.tenant);
        window.localStorage.setItem('currentTenantId', tenantId);
        // Reload to refresh all tenant-specific data
        window.location.reload();
      } else {
        throw new Error('Failed to switch tenant');
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
      throw error;
    }
  };

  return (
    <TenantContext.Provider 
      value={{
        currentTenant,
        currentUser,
        isLoading,
        error: error as Error | null,
        switchTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

// Hook to get current tenant ID for API calls
export const useCurrentTenantId = (): string => {
  const { currentTenant } = useTenant();
  
  if (!currentTenant) {
    // Fallback to localStorage or demo tenant during loading
    if (typeof window !== 'undefined') {
      const storedTenantId = window.localStorage.getItem('currentTenantId');
      if (storedTenantId) return storedTenantId;
    }
    // Demo tenant for development
    return '00000000-0000-0000-0000-000000000001';
  }
  
  return currentTenant.id;
};

// HOC to protect routes that require tenant context
export const withTenantContext = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { currentTenant, isLoading } = useTenant();
    
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ color: '#7B2CBF', marginBottom: '20px' }}>
              Caricamento W3 Suite...
            </h2>
            <div className="loading-spinner" />
          </div>
        </div>
      );
    }
    
    if (!currentTenant) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            padding: '40px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#FF6900', marginBottom: '20px' }}>
              Nessun Tenant Selezionato
            </h2>
            <p style={{ color: '#6b7280' }}>
              Contatta l'amministratore per l'assegnazione a un'organizzazione.
            </p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};