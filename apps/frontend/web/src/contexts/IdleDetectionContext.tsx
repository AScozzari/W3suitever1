import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface IdleDetectionContextType {
  isIdle: boolean;
  lastActivity: number;
}

const IdleDetectionContext = createContext<IdleDetectionContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minuti
const CHECK_INTERVAL_MS = 10 * 1000; // Controlla ogni 10 secondi

export function IdleDetectionProvider({ children }: { children: ReactNode }) {
  const [isIdle, setIsIdle] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [, setLocation] = useLocation();
  const timerRef = useRef<NodeJS.Timeout>();
  const logoutTimerRef = useRef<NodeJS.Timeout>();

  // Aggiorna timestamp ultima attività
  const updateActivity = () => {
    setLastActivity(Date.now());
    setIsIdle(false);
    
    // Cancella timer di logout se esiste
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = undefined;
    }
  };

  // Monitora eventi utente
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Controlla inattività ogni 10 secondi
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
        console.log('[IDLE-DETECTION] 🔴 Utente inattivo da 15+ minuti, logout automatico');
        setIsIdle(true);
        
        // Logout automatico dopo 15 minuti di inattività
        if (!logoutTimerRef.current) {
          logoutTimerRef.current = setTimeout(async () => {
            try {
              await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            } catch (error) {
              console.error('[IDLE-DETECTION] Errore logout:', error);
            }
            
            // Redirect a login
            setLocation('/login');
            window.location.reload();
          }, 1000); // 1 secondo di delay per mostrare messaggio
        }
      } else if (timeSinceLastActivity >= IDLE_TIMEOUT_MS - 60000) {
        // Warning 1 minuto prima della scadenza
        console.log(`[IDLE-DETECTION] ⚠️ Sessione scadrà tra ${Math.floor((IDLE_TIMEOUT_MS - timeSinceLastActivity) / 1000)}s`);
      } else {
        setIsIdle(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, [lastActivity, setLocation]);

  return (
    <IdleDetectionContext.Provider value={{ isIdle, lastActivity }}>
      {children}
    </IdleDetectionContext.Provider>
  );
}

export function useIdleDetection() {
  const context = useContext(IdleDetectionContext);
  if (!context) {
    throw new Error('useIdleDetection deve essere usato dentro IdleDetectionProvider');
  }
  return context;
}
