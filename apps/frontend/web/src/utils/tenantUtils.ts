/**
 * Utility per gestire i sottodomini tenant in development e production
 */

// Mapping dei tenant disponibili
export const TENANT_CONFIG = {
  demo: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Demo Organization',
    subdomain: 'demo',
    primaryColor: '#FF6900',
    secondaryColor: '#7B2CBF'
  },
  acme: {
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'Acme Corporation',
    subdomain: 'acme',
    primaryColor: '#0066CC',
    secondaryColor: '#003366'
  },
  tech: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Tech Solutions Ltd',
    subdomain: 'tech',
    primaryColor: '#10B981',
    secondaryColor: '#059669'
  }
};

/**
 * Estrae il sottodominio dall'URL corrente
 */
export const getCurrentSubdomain = (): string => {
  const hostname = window.location.hostname;
  
  // In development (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Cerca nei parametri URL per testing
    const urlParams = new URLSearchParams(window.location.search);
    const testSubdomain = urlParams.get('tenant');
    
    // O usa localStorage per persistenza durante il testing
    if (testSubdomain) {
      localStorage.setItem('test_subdomain', testSubdomain);
      return testSubdomain;
    }
    
    return localStorage.getItem('test_subdomain') || 'demo';
  }
  
  // In produzione (es: acme.w3suite.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // Default
  return 'demo';
};

/**
 * Ottiene la configurazione del tenant corrente
 */
export const getCurrentTenantConfig = () => {
  const subdomain = getCurrentSubdomain();
  return TENANT_CONFIG[subdomain as keyof typeof TENANT_CONFIG] || TENANT_CONFIG.demo;
};

/**
 * Aggiunge l'header del sottodominio per testing in development
 */
export const addTenantHeaders = (headers: HeadersInit = {}): HeadersInit => {
  const subdomain = getCurrentSubdomain();
  
  // In development, aggiungi l'header di test
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return {
      ...headers,
      'X-Tenant-Subdomain': subdomain
    };
  }
  
  return headers;
};

/**
 * Genera l'URL con il sottodominio corretto
 */
export const getTenantUrl = (subdomain: string): string => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // In development - NEVER use :8000, always use gateway :5000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Usa parametro URL per cambiare tenant - SEMPRE porta 5000 (gateway)
    return `${protocol}//${hostname}:5000?tenant=${subdomain}`;
  }
  
  // In produzione - MAI includere porte
  const baseDomain = hostname.split('.').slice(1).join('.');
  return `${protocol}//${subdomain}.${baseDomain}`;
};

/**
 * Switcher per cambiare tenant (utile per super admin)
 */
export const switchTenant = (subdomain: string) => {
  const newUrl = getTenantUrl(subdomain);
  window.location.href = newUrl;
};