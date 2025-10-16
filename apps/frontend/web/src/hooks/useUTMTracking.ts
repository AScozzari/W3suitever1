import { useEffect } from 'react';
import { captureAndSaveUTM, getStoredUTM, type UTMData } from '@/lib/utm-tracker';

export function useUTMTracking() {
  useEffect(() => {
    captureAndSaveUTM();
  }, []);

  return {
    getStoredUTM,
    captureAndSaveUTM
  };
}

export function useUTMData(): UTMData | null {
  useEffect(() => {
    captureAndSaveUTM();
  }, []);

  return getStoredUTM();
}
