export interface UTMData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  landingPageUrl?: string;
  referrerUrl?: string;
  capturedAt?: string;
}

const UTM_STORAGE_KEY = 'w3suite_utm_params';
const UTM_EXPIRY_DAYS = 30;

export function captureUTMParams(): UTMData {
  const params = new URLSearchParams(window.location.search);
  
  const utmData: UTMData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    landingPageUrl: window.location.href,
    referrerUrl: document.referrer || 'direct',
    capturedAt: new Date().toISOString()
  };

  return utmData;
}

export function saveUTMToStorage(utmData: UTMData): void {
  if (!utmData.utm_source && !utmData.utm_medium && !utmData.utm_campaign) {
    return;
  }

  const dataToStore = {
    ...utmData,
    expiresAt: new Date(Date.now() + UTM_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  };

  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error('[UTM Tracker] Failed to save to localStorage:', error);
  }
}

export function getStoredUTM(): UTMData | null {
  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }

    const { expiresAt, ...utmData } = data;
    return utmData;
  } catch (error) {
    console.error('[UTM Tracker] Failed to retrieve from localStorage:', error);
    return null;
  }
}

export function clearStoredUTM(): void {
  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch (error) {
    console.error('[UTM Tracker] Failed to clear localStorage:', error);
  }
}

export function captureAndSaveUTM(): UTMData {
  const utmData = captureUTMParams();
  
  if (utmData.utm_source || utmData.utm_medium || utmData.utm_campaign) {
    saveUTMToStorage(utmData);
  }
  
  return utmData;
}
