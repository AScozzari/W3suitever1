import { useIdleDetection } from '@/contexts/IdleDetectionContext';

/**
 * Hook per gestire refetchInterval in base allo stato di inattività
 * Disabilita automaticamente il polling quando l'utente è inattivo
 */
export function useIdleAwareRefetch(intervalMs: number | false): number | false {
  const { isIdle } = useIdleDetection();
  
  if (intervalMs === false) return false;
  return isIdle ? false : intervalMs;
}
