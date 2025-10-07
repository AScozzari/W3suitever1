import { useState, useEffect } from 'react';
import { getCurrentTenantId } from '@/lib/queryClient';

/**
 * Hook per verificare che il sistema di autenticazione sia completamente inizializzato
 * Prima che vengano fatte chiamate API HR
 */
export const useAuthReadiness = () => {
  const [isReady, setIsReady] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  useEffect(() => {
    const waitForAuth = async () => {
      let currentAttempts = 0;
      const maxAttempts = 50; // 5 secondi max (50 * 100ms)
      
      const checkReady = () => {
        try {
          // Verifica tenant ID
          const tenantId = getCurrentTenantId();
          
          // Verifica auth mode
          const authMode = import.meta.env.VITE_AUTH_MODE || 'development';
          
          // Verifica localStorage sia popolato
          const hasLocalTenant = localStorage.getItem('currentTenantId');
          
          // Verifica che tutto sia valido
          const tenantValid = tenantId && 
                             tenantId !== 'undefined' && 
                             tenantId !== 'null' && 
                             tenantId !== '';
          
          const localStorageValid = hasLocalTenant && 
                                   hasLocalTenant !== 'undefined' && 
                                   hasLocalTenant !== 'null';
          
          const authModeValid = authMode && authMode !== '';
          
          return tenantValid && localStorageValid && authModeValid;
        } catch (error) {
          console.warn(`⚠️ [HR-AUTH] Error during readiness check:`, error);
          return false;
        }
      };
      
      // Loop di attesa per l'inizializzazione
      while (!checkReady() && currentAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        currentAttempts++;
        setAttempts(currentAttempts);
      }
      
      if (checkReady()) {
        setIsReady(true);
      } else {
        console.error(`❌ [HR-AUTH] Timeout waiting for auth initialization after ${maxAttempts} attempts`);
        console.error(`❌ [HR-AUTH] HR functionality may not work correctly`);
        
        // In development, permettiamo di procedere con warning
        if (import.meta.env.MODE === 'development') {
          console.warn(`⚠️ [HR-AUTH] Proceeding anyway in development mode`);
          setIsReady(true);
        }
      }
    };
    
    waitForAuth();
  }, []);
  
  return { 
    isReady, 
    attempts,
    // Helper per debugging
    debugInfo: {
      tenantId: typeof window !== 'undefined' ? getCurrentTenantId() : null,
      localStorage: typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null,
      authMode: import.meta.env.VITE_AUTH_MODE
    }
  };
};

/**
 * Hook specializzato per query HR - SEMPLIFICATO per evitare blocchi
 * In development mode, abilita immediatamente le query dato che l'autenticazione è già gestita
 */
export const useHRQueryReadiness = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  // In development, abilita sempre immediatamente
  const enabled = isDevelopment ? true : false;
  
  return {
    enabled,
    loading: false,
    attempts: 0,
    debugInfo: {
      tenantId: typeof window !== 'undefined' ? getCurrentTenantId() : null,
      localStorage: typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null,
      authMode: import.meta.env.VITE_AUTH_MODE,
      mode: import.meta.env.MODE
    }
  };
};