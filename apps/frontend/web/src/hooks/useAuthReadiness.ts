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
      
      console.log('🔐 [HR-AUTH] Starting authentication readiness check...');
      
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
          
          console.log(`🔍 [HR-AUTH] Check ${currentAttempts + 1}: tenant=${!!tenantValid}, localStorage=${!!localStorageValid}, authMode=${!!authModeValid}`);
          
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
        
        // Log ogni secondo per debugging
        if (currentAttempts % 10 === 0) {
          console.log(`🕐 [HR-AUTH] Still waiting... attempt ${currentAttempts}/${maxAttempts}`);
        }
      }
      
      if (checkReady()) {
        const tenantId = getCurrentTenantId();
        console.log(`✅ [HR-AUTH] Authentication system ready! Tenant: ${tenantId}`);
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
 */
export const useHRQueryReadiness = () => {
  // ✅ FIX: In development mode, abilitiamo immediatamente le query
  // dato che l'autenticazione è già gestita dal sistema principale
  const isDevelopment = import.meta.env.MODE === 'development';
  const tenantId = getCurrentTenantId();
  const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
  
  // In development, se abbiamo un tenant ID valido, abilitiamo subito
  const enabled = isDevelopment ? hasValidTenant : false;
  
  console.log(`🔧 [HR-QUERY-READINESS] Mode: ${import.meta.env.MODE}, TenantID: ${tenantId}, Enabled: ${enabled}`);
  
  return {
    enabled: enabled, // Abilitato immediatamente in development
    loading: false,   // Non più in loading
    attempts: 0,
    debugInfo: {
      tenantId,
      localStorage: typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null,
      authMode: import.meta.env.VITE_AUTH_MODE,
      mode: import.meta.env.MODE
    }
  };
};