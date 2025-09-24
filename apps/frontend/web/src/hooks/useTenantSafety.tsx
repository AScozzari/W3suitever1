import { useContext } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { getCurrentTenantId } from '../lib/queryClient';

/**
 * 🛡️ TENANT SAFETY HOOKS
 * 
 * Questi hook garantiscono che ogni component abbia automaticamente
 * accesso sicuro al tenant context, prevenendo cross-tenant data leakage.
 * 
 * VANTAGGI:
 * ✅ Impossibile accedere a dati senza tenant context
 * ✅ Errori chiari se tenant non è disponibile  
 * ✅ TypeScript enforcement automatico
 * ✅ Development warnings se manca tenant
 */

/**
 * 🔒 useRequiredTenant - MANDATORY tenant context
 * 
 * Questo hook DEVE essere usato in ogni component che lavora con dati tenant.
 * Lancia errore se tenant context non è disponibile.
 * 
 * @throws Error se tenant context non è disponibile
 * @returns Tenant context garantito non-null
 */
export const useRequiredTenant = () => {
  const context = useTenant();
  
  if (!context.currentTenant) {
    const error = new Error(
      '🚨 TENANT REQUIRED: Component tentativo di accesso senza tenant context!' +
      '\n\nQuesto component deve essere utilizzato all\'interno di un tenant valido.' +
      '\n\nVerifica che:' +
      '\n1. Il component sia dentro <TenantShell>' +
      '\n2. Il tenant slug nella URL sia valido' +
      '\n3. L\'utente abbia accesso al tenant'
    );
    
    // Log per debugging
    console.error('🚨 [TENANT-SAFETY] Component accessed without tenant context!');
    console.error('🚨 [TENANT-SAFETY] Current URL:', window.location.pathname);
    console.error('🚨 [TENANT-SAFETY] Available context:', context);
    
    throw error;
  }
  
  if (!context.currentTenant.id) {
    throw new Error('🚨 TENANT ID MISSING: Tenant context exists but ID is null!');
  }
  
  // Validation aggiuntiva: verifica che l'ID sia un UUID valido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(context.currentTenant.id)) {
    console.error('🚨 [TENANT-SAFETY] Invalid tenant ID format:', context.currentTenant.id);
    throw new Error(`🚨 INVALID TENANT ID: Expected UUID, got "${context.currentTenant.id}"`);
  }
  
  return {
    tenant: context.currentTenant,
    user: context.currentUser,
    tenantId: context.currentTenant.id,
    isLoading: context.isLoading,
    error: context.error,
    switchTenant: context.switchTenant
  };
};

/**
 * 🆔 useRequiredTenantId - Solo l'ID tenant (più performante)
 * 
 * Hook ottimizzato per component che hanno bisogno solo dell'ID tenant
 * senza tutto il context completo.
 * 
 * @returns string - Tenant ID garantito non-null e formato UUID
 */
export const useRequiredTenantId = (): string => {
  try {
    const tenantId = getCurrentTenantId();
    
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null' || tenantId === '') {
      throw new Error(`🚨 TENANT ID REQUIRED: Invalid tenant ID "${tenantId}"`);
    }
    
    // Validation UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new Error(`🚨 INVALID TENANT ID FORMAT: Expected UUID, got "${tenantId}"`);
    }
    
    return tenantId;
  } catch (error) {
    console.error('🚨 [TENANT-SAFETY] Tenant ID access failed:', error);
    console.error('🚨 [TENANT-SAFETY] Current URL:', window.location.pathname);
    
    // Re-throw con messaggio più chiaro
    throw new Error(
      '🚨 TENANT ID REQUIRED: Component cannot access tenant ID!' +
      '\n\nUsa questo hook solo all\'interno di component che sono dentro <TenantShell>.' +
      '\n\nOriginal error: ' + (error as Error).message
    );
  }
};

/**
 * 🔍 useTenantInfo - Informazioni tenant complete
 * 
 * Hook per ottenere informazioni complete sul tenant corrente
 * in modo sicuro e tipizzato.
 * 
 * @returns TenantInfo object con dati completi
 */
export const useTenantInfo = () => {
  const { tenant, user, tenantId } = useRequiredTenant();
  
  return {
    id: tenantId,
    name: tenant.name,
    code: tenant.code || 'unknown',
    plan: tenant.plan || 'basic',
    isActive: tenant.isActive,
    user: {
      id: user?.id,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      roles: user?.roles || []
    }
  };
};

/**
 * 🎯 useCurrentTenantSlug - Slug tenant dalla URL
 * 
 * Hook per ottenere il tenant slug dall'URL corrente.
 * Utile per navigation e link building.
 * 
 * @returns string - Tenant slug dalla URL
 */
export const useCurrentTenantSlug = (): string => {
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    throw new Error('🚨 NO TENANT SLUG: URL does not contain tenant slug');
  }
  
  const tenantSlug = segments[0];
  
  if (!tenantSlug || tenantSlug === '') {
    throw new Error('🚨 EMPTY TENANT SLUG: Tenant slug is empty in URL');
  }
  
  return tenantSlug;
};

/**
 * 🚀 useTenantNavigation - Navigation sicura con tenant
 * 
 * Hook per navigazione che mantiene automaticamente il tenant context.
 * Previene navigazione verso URL senza tenant.
 * 
 * @returns Funzioni di navigazione tenant-aware
 */
export const useTenantNavigation = () => {
  const tenantSlug = useCurrentTenantSlug();
  
  /**
   * Naviga verso una pagina mantenendo il tenant context
   */
  const navigate = (path: string) => {
    // Assicurati che il path inizi con /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = `/${tenantSlug}/${cleanPath}`;
    
    console.log(`[TENANT-NAV] Navigating to: ${fullPath}`);
    window.location.href = fullPath;
  };
  
  /**
   * Costruisce un URL completo con tenant
   */
  const buildUrl = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${tenantSlug}/${cleanPath}`;
  };
  
  /**
   * Redirect sicuro verso dashboard
   */
  const goToDashboard = () => navigate('dashboard');
  
  /**
   * Redirect sicuro verso settings
   */
  const goToSettings = () => navigate('settings');
  
  /**
   * Redirect sicuro verso HR
   */
  const goToHR = () => navigate('hr-management');
  
  return {
    navigate,
    buildUrl,
    goToDashboard,
    goToSettings,
    goToHR,
    tenantSlug
  };
};

/**
 * 🎨 DEVELOPMENT HELPERS
 * 
 * Hook per debugging e development che mostrano informazioni
 * tenant context durante lo sviluppo.
 */
export const useTenantDebug = () => {
  if (import.meta.env.PROD) {
    return {
      logTenantInfo: () => {},
      validateTenantConsistency: () => true
    };
  }
  
  const logTenantInfo = () => {
    try {
      const tenantId = getCurrentTenantId();
      const context = useTenant();
      const slug = useCurrentTenantSlug();
      
      console.group('🔍 [TENANT-DEBUG] Current Tenant State');
      console.log('📍 URL Slug:', slug);
      console.log('🆔 Tenant ID (queryClient):', tenantId);
      console.log('📋 Context Tenant:', context.currentTenant);
      console.log('👤 Current User:', context.currentUser);
      console.log('⏳ Loading:', context.isLoading);
      console.log('❌ Error:', context.error);
      console.groupEnd();
    } catch (error) {
      console.error('🚨 [TENANT-DEBUG] Failed to log tenant info:', error);
    }
  };
  
  const validateTenantConsistency = (): boolean => {
    try {
      const tenantId = getCurrentTenantId();
      const context = useTenant();
      const stored = localStorage.getItem('currentTenantId');
      
      const isConsistent = 
        tenantId === context.currentTenant?.id &&
        tenantId === stored;
        
      if (!isConsistent) {
        console.warn('⚠️ [TENANT-DEBUG] Tenant ID inconsistency detected!');
        console.warn('QueryClient:', tenantId);
        console.warn('Context:', context.currentTenant?.id);
        console.warn('LocalStorage:', stored);
      }
      
      return isConsistent;
    } catch (error) {
      console.error('🚨 [TENANT-DEBUG] Failed to validate consistency:', error);
      return false;
    }
  };
  
  return {
    logTenantInfo,
    validateTenantConsistency
  };
};