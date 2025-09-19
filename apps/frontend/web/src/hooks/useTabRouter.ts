import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

/**
 * Props per la configurazione dell'hook useTabRouter
 */
export interface UseTabRouterProps {
  /** Tab predefinito da usare se non specificato nell'URL */
  defaultTab?: string;
  /** Sezione predefinita da usare se non specificata nell'URL */
  defaultSection?: string | null;
  /** Nome del parametro URL per il tab (default: 'tab') */
  tabParam?: string;
  /** Nome del parametro URL per la sezione (default: 'section') */
  sectionParam?: string;
}

/**
 * Valore di ritorno dell'hook useTabRouter
 */
export interface UseTabRouterReturn {
  /** Tab attualmente attivo */
  activeTab: string;
  /** Sezione attualmente attiva (può essere null) */
  activeSection: string | null;
  /** Funzione per cambiare il tab attivo e aggiornare l'URL */
  setTab: (tabId: string) => void;
  /** Funzione per cambiare la sezione attiva e aggiornare l'URL */
  setSection: (sectionId: string | null) => void;
  /** Funzione per generare l'URL per un tab/sezione specifici */
  getTabUrl: (tabId: string, sectionId?: string) => string;
}

/**
 * Hook personalizzato per gestire la navigazione tabs con sincronizzazione URL e deep linking.
 * 
 * Questo hook fornisce un'interfaccia semplice per gestire la navigazione tra tab e sezioni,
 * mantenendo sincronizzato lo stato con i query parameters dell'URL per supportare:
 * - Deep linking diretto
 * - Navigazione browser (back/forward)
 * - Condivisione di link specifici
 * 
 * @param config - Configurazione dell'hook
 * @returns Oggetto con stato attuale e funzioni di navigazione
 * 
 * @example
 * ```typescript
 * // Uso base
 * const { activeTab, activeSection, setTab, setSection } = useTabRouter({
 *   defaultTab: 'overview',
 *   defaultSection: 'dashboard'
 * });
 * 
 * // Cambio tab programmaticamente
 * setTab('employees'); // URL diventa: /hr?tab=employees
 * 
 * // Cambio sezione
 * setSection('directory'); // URL diventa: /hr?tab=employees&section=directory
 * 
 * // Genera URL per navigazione
 * const analyticsUrl = getTabUrl('analytics', 'reports');
 * ```
 * 
 * @example
 * ```typescript
 * // Configurazione personalizzata dei parametri
 * const router = useTabRouter({
 *   defaultTab: 'dashboard',
 *   tabParam: 'view',
 *   sectionParam: 'subview'
 * });
 * // URL risultante: /hr?view=dashboard&subview=main
 * ```
 */
export function useTabRouter({
  defaultTab = 'overview',
  defaultSection = null,
  tabParam = 'tab',
  sectionParam = 'section'
}: UseTabRouterProps = {}): UseTabRouterReturn {
  const [location, navigate] = useLocation();
  
  // Stati interni per tab e sezione
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [activeSection, setActiveSection] = useState<string | null>(defaultSection);

  /**
   * Estrae i query parameters dall'URL corrente
   */
  const getUrlParams = useCallback((): URLSearchParams => {
    return new URLSearchParams(window.location.search);
  }, []);

  /**
   * Aggiorna l'URL preservando altri query parameters esistenti
   */
  const updateUrl = useCallback((tab: string, section: string | null, options?: { replace?: boolean }) => {
    const currentParams = getUrlParams();
    
    // Aggiorna i parametri tab e section
    currentParams.set(tabParam, tab);
    
    if (section) {
      currentParams.set(sectionParam, section);
    } else {
      currentParams.delete(sectionParam);
    }
    
    // Costruisce la nuova URL mantenendo il path corrente
    const newSearch = currentParams.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
    
    // Naviga alla nuova URL usando wouter con opzione replace se specificata
    navigate(newUrl, { replace: options?.replace });
  }, [navigate, tabParam, sectionParam, getUrlParams]);

  /**
   * Sincronizza lo stato interno con i query parameters dell'URL
   */
  const syncFromUrl = useCallback(() => {
    try {
      const params = getUrlParams();
      
      const urlTab = params.get(tabParam);
      const urlSection = params.get(sectionParam);
      
      // Determina i nuovi valori con gestione più robusta
      // Per il tab: usa il valore URL se presente e non vuoto, altrimenti defaultTab
      const newTab = (urlTab && urlTab.trim() !== '') ? urlTab.trim() : defaultTab;
      
      // Per la sezione: più controlli per gestire correttamente null vs empty string
      let newSection: string | null;
      if (urlSection === null || urlSection.trim() === '') {
        newSection = defaultSection;
      } else {
        newSection = urlSection.trim();
      }
      
      // Aggiorna lo stato solo se i valori sono effettivamente cambiati per evitare loop infiniti
      // Usa strict equality per confronti più accurati
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
      
      if (newSection !== activeSection) {
        setActiveSection(newSection);
      }
    } catch (error) {
      // Fallback silenzioso in caso di errori nella lettura degli URL params
      console.warn('Error syncing from URL, falling back to defaults:', error);
      
      // In caso di errore, reimposta ai valori di default se differenti dallo stato corrente
      if (defaultTab !== activeTab) {
        setActiveTab(defaultTab);
      }
      if (defaultSection !== activeSection) {
        setActiveSection(defaultSection);
      }
    }
  }, [activeTab, activeSection, defaultTab, defaultSection, tabParam, sectionParam, getUrlParams]);

  /**
   * Cambia il tab attivo e aggiorna l'URL
   */
  const setTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    updateUrl(tabId, activeSection);
  }, [activeSection, updateUrl]);

  /**
   * Cambia la sezione attiva e aggiorna l'URL
   */
  const setSection = useCallback((sectionId: string | null) => {
    setActiveSection(sectionId);
    updateUrl(activeTab, sectionId);
  }, [activeTab, updateUrl]);

  /**
   * Genera un URL per una combinazione specifica di tab e sezione
   */
  const getTabUrl = useCallback((tabId: string, sectionId?: string): string => {
    const params = getUrlParams();
    
    // Crea una copia dei parametri attuali
    const newParams = new URLSearchParams(params);
    
    // Aggiorna con i nuovi valori
    newParams.set(tabParam, tabId);
    
    if (sectionId) {
      newParams.set(sectionParam, sectionId);
    } else {
      newParams.delete(sectionParam);
    }
    
    const search = newParams.toString();
    return window.location.pathname + (search ? '?' + search : '');
  }, [tabParam, sectionParam, getUrlParams]);

  /**
   * Gestisce i cambiamenti dell'URL (inclusi back/forward del browser)
   */
  useEffect(() => {
    syncFromUrl();
  }, [location, syncFromUrl]);

  /**
   * Gestisce l'evento popstate per la navigazione back/forward del browser
   */
  useEffect(() => {
    const handlePopState = () => {
      syncFromUrl();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [syncFromUrl]);

  /**
   * Inizializzazione: se l'URL non contiene parametri, usa i default e aggiorna l'URL
   */
  useEffect(() => {
    const params = getUrlParams();
    const hasTabParam = params.has(tabParam);
    const hasSectionParam = params.has(sectionParam);
    
    // Se l'URL non ha parametri, inizializza con i default usando replace per non inquinare la history
    if (!hasTabParam && !hasSectionParam) {
      updateUrl(defaultTab, defaultSection, { replace: true });
    } else {
      // Altrimenti sincronizza lo stato con l'URL esistente
      syncFromUrl();
    }
  }, []); // Solo al mount

  return {
    activeTab,
    activeSection,
    setTab,
    setSection,
    getTabUrl
  };
}