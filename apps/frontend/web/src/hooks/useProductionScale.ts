import { useEffect } from 'react';

/**
 * 🎯 Production Scale Hook
 * 
 * Applica font-size scaling basato su VITE_FONT_SCALE environment variable.
 * Questo permette di controllare lo "zoom" dell'app da configurazione
 * senza modificare CSS o file post-deploy.
 * 
 * Uso:
 * - Imposta VITE_FONT_SCALE=70 nel .env.production del VPS
 * - Lo hook applica html { font-size: 70% } al mount
 * - Tutto ciò che usa rem/em scala proporzionalmente (come browser zoom)
 * 
 * Valori comuni:
 * - 100 = dimensione normale (default)
 * - 90 = 10% più piccolo
 * - 80 = 20% più piccolo
 * - 70 = 30% più piccolo (attuale produzione VPS)
 */
export function useProductionScale() {
  useEffect(() => {
    const scale = import.meta.env.VITE_FONT_SCALE;
    
    if (scale) {
      const scaleValue = parseInt(scale, 10);
      
      if (!isNaN(scaleValue) && scaleValue > 0 && scaleValue <= 200) {
        // Use CSS variable to override the default in index.css
        // This ensures the scale is applied consistently regardless of CSS load order
        document.documentElement.style.setProperty('--font-scale', `${scaleValue}%`);
        console.log(`[PRODUCTION-SCALE] 📐 Applied --font-scale: ${scaleValue}%`);
      } else {
        console.warn(`[PRODUCTION-SCALE] ⚠️ Invalid VITE_FONT_SCALE value: ${scale}`);
      }
    }
    
    return () => {
      if (scale) {
        document.documentElement.style.removeProperty('--font-scale');
      }
    };
  }, []);
}
