/**
 * Session Keep-Alive Hook
 * 🔒 SECURITY POLICY: Maintains 15-minute idle timeout by auto-refreshing session
 * 
 * This hook prevents idle session expiry by making periodic keep-alive requests.
 * Works in conjunction with Express session rolling timeout (15 minutes).
 * 
 * Features:
 * - Auto-refresh every 12 minutes (before 15-min expiry)
 * - Visual warning at 13 minutes of inactivity
 * - Tracks last user activity (mouse, keyboard, touch)
 * - Only refreshes when user is active/focused
 */

import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';

const KEEP_ALIVE_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes
const IDLE_WARNING_MS = 13 * 60 * 1000;        // 13 minutes
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;     // 15 minutes

interface UseSessionKeepAliveOptions {
  enabled?: boolean;
  onSessionExpired?: () => void;
  onWarning?: () => void;
}

export function useSessionKeepAlive(options: UseSessionKeepAliveOptions = {}) {
  const {
    enabled = true,
    onSessionExpired,
    onWarning
  } = options;

  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const keepAliveTimerRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Update last activity timestamp on user interaction
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setIsActive(true);
  };

  // Make keep-alive request to server (ONLY if user is active)
  const sendKeepAlive = async () => {
    // 🔒 SECURITY CRITICAL: Only send keep-alive if user was recently active
    // This ensures idle timeout policy is respected
    const idleTime = Date.now() - lastActivityRef.current;
    
    // Don't send keep-alive if user has been idle for more than 10 minutes
    // This allows the 15-minute idle timeout to expire naturally
    if (idleTime > 10 * 60 * 1000) {
      console.log(`[SESSION-KEEPALIVE] ⏭️  Skipping keep-alive (user idle for ${Math.floor(idleTime / 60000)} minutes)`);
      return;
    }

    try {
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      
      // Simple ping to any authenticated endpoint to refresh session
      await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin-user'
        },
        credentials: 'include'
      });

      console.log('[SESSION-KEEPALIVE] ✅ Session refreshed (user active)');
    } catch (error) {
      console.error('[SESSION-KEEPALIVE] ❌ Failed to refresh session:', error);
      
      // If refresh fails, session might be expired
      if (onSessionExpired) {
        onSessionExpired();
      }
    }
  };

  // Check if user is idle and show warning/expire session
  const checkIdleStatus = () => {
    const idleTime = Date.now() - lastActivityRef.current;

    // Session expired (15 minutes idle)
    if (idleTime >= SESSION_TIMEOUT_MS) {
      console.warn('[SESSION-KEEPALIVE] ⏰ Session expired due to inactivity (15 min)');
      
      toast({
        title: 'Sessione scaduta',
        description: 'La tua sessione è scaduta per inattività. Effettua nuovamente il login.',
        variant: 'destructive'
      });

      if (onSessionExpired) {
        onSessionExpired();
      }
      
      setIsActive(false);
      return;
    }

    // Show warning at 13 minutes (2 minutes before expiry)
    if (idleTime >= IDLE_WARNING_MS && !warningShownRef.current) {
      console.warn('[SESSION-KEEPALIVE] ⚠️ Session expiring soon (13 minutes idle)');
      
      const remainingMinutes = Math.ceil((SESSION_TIMEOUT_MS - idleTime) / 60000);
      
      toast({
        title: 'Sessione in scadenza',
        description: `La tua sessione scadrà tra ${remainingMinutes} minuti. Muovi il mouse per mantenerla attiva.`,
        variant: 'default'
      });

      warningShownRef.current = true;

      if (onWarning) {
        onWarning();
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Register activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check idle status every minute
    const idleCheckInterval = setInterval(checkIdleStatus, 60 * 1000);

    // Initial keep-alive after 12 minutes
    keepAliveTimerRef.current = setTimeout(() => {
      sendKeepAlive();
      
      // Repeat every 12 minutes
      keepAliveTimerRef.current = setInterval(sendKeepAlive, KEEP_ALIVE_INTERVAL_MS);
    }, KEEP_ALIVE_INTERVAL_MS);

    console.log('[SESSION-KEEPALIVE] 🚀 Session keep-alive initialized (12-min interval)');

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      
      clearInterval(idleCheckInterval);
      
      if (keepAliveTimerRef.current) {
        clearTimeout(keepAliveTimerRef.current);
        clearInterval(keepAliveTimerRef.current as any);
      }

      console.log('[SESSION-KEEPALIVE] 🛑 Session keep-alive stopped');
    };
  }, [enabled, onSessionExpired, onWarning]);

  return {
    isActive,
    lastActivity: lastActivityRef.current,
    refreshSession: sendKeepAlive
  };
}
