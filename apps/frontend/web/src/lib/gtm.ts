import type { UTMData } from './utm-tracker';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

let gtmInitialized = false;
let cachedContainerId: string | null = null;

interface GTMConfigResponse {
  success: boolean;
  data?: {
    containerId: string | null;
    configured: boolean;
    isActive?: boolean;
  };
}

async function fetchGTMContainerId(): Promise<string | null> {
  if (cachedContainerId) {
    return cachedContainerId;
  }

  try {
    const response = await fetch('/api/gtm/config', {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn('[GTM] Failed to fetch config, using fallback');
      return null;
    }

    const data: GTMConfigResponse = await response.json();
    
    if (data.success && data.data?.containerId && data.data.configured) {
      cachedContainerId = data.data.containerId;
      console.log('[GTM] Container ID fetched from API:', cachedContainerId);
      return cachedContainerId;
    }

    return null;
  } catch (error) {
    console.warn('[GTM] Error fetching config:', error);
    return null;
  }
}

export async function initializeGTMAsync(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  if (gtmInitialized) {
    console.log('[GTM] Already initialized, skipping reinit');
    return;
  }

  const dynamicContainerId = await fetchGTMContainerId();
  const containerId = dynamicContainerId || import.meta.env.VITE_GTM_CONTAINER_ID || 'GTM-XXXXXXX';
  
  console.log('[GTM] Initializing with container ID:', containerId, dynamicContainerId ? '(from API)' : '(from env/fallback)');

  window.dataLayer = window.dataLayer || [];
  gtmInitialized = true;
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    platform: 'w3suite',
    environment: import.meta.env.MODE || 'production',
    app_version: '1.0.0'
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}&l=dataLayer`;
  
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);

  console.log('[GTM] Initialized successfully');
}

export function initializeGTM(): void {
  if (typeof window === 'undefined') return;
  
  if (gtmInitialized) {
    console.log('[GTM] Already initialized, skipping reinit');
    return;
  }

  const containerId = import.meta.env.VITE_GTM_CONTAINER_ID || 'GTM-XXXXXXX';
  
  console.log('[GTM] Initializing with container ID:', containerId);

  window.dataLayer = window.dataLayer || [];
  gtmInitialized = true;
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    platform: 'w3suite',
    environment: import.meta.env.MODE || 'production',
    app_version: '1.0.0'
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}&l=dataLayer`;
  
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);

  console.log('[GTM] Initialized successfully');
}

export interface GTMLeadEventData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  page_url?: string;
  referrer?: string;
  form_id?: string;
  campaign_id?: string;
  store_id?: string;
}

export interface GTMPageViewData {
  page_title?: string;
  page_path: string;
  page_location: string;
  tenant_id?: string;
  store_id?: string;
}

export interface GTMConversionData {
  transaction_id?: string;
  value?: number;
  currency?: string;
  email?: string;
  phone?: string;
}

export interface GTMPurchaseData {
  transaction_id: string;
  value: number;
  currency?: string;
  items?: Array<{
    item_id?: string;
    item_name: string;
    price?: number;
    quantity?: number;
    item_category?: string;
  }>;
  coupon?: string;
  shipping?: number;
  tax?: number;
  email?: string;
  phone?: string;
  store_id?: string;
}

export function pushToDataLayer(eventName: string, eventData: any = {}): void {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...eventData,
    timestamp: new Date().toISOString()
  });

  console.log('[GTM] Event pushed:', eventName, eventData);
}

export function pushLeadEvent(leadData: GTMLeadEventData, utmData?: UTMData | null): void {
  const eventData = {
    ...leadData,
    utm_source: leadData.utm_source || utmData?.utm_source,
    utm_medium: leadData.utm_medium || utmData?.utm_medium,
    utm_campaign: leadData.utm_campaign || utmData?.utm_campaign,
    utm_content: leadData.utm_content || utmData?.utm_content,
    utm_term: leadData.utm_term || utmData?.utm_term,
    page_url: leadData.page_url || window.location.href,
    referrer: leadData.referrer || document.referrer || 'direct'
  };

  pushToDataLayer('generate_lead', eventData);
}

export function pushPageView(pageData?: Partial<GTMPageViewData>): void {
  const eventData: GTMPageViewData = {
    page_title: document.title,
    page_path: window.location.pathname,
    page_location: window.location.href,
    ...pageData
  };

  pushToDataLayer('page_view', eventData);
}

export function pushConversionEvent(conversionData: GTMConversionData): void {
  pushToDataLayer('conversion', conversionData);
}

export function pushPurchaseEvent(purchaseData: GTMPurchaseData): void {
  const eventData = {
    transaction_id: purchaseData.transaction_id,
    value: purchaseData.value,
    currency: purchaseData.currency || 'EUR',
    items: purchaseData.items || [],
    coupon: purchaseData.coupon,
    shipping: purchaseData.shipping,
    tax: purchaseData.tax,
    store_id: purchaseData.store_id,
    ecommerce: {
      transaction_id: purchaseData.transaction_id,
      value: purchaseData.value,
      currency: purchaseData.currency || 'EUR',
      items: purchaseData.items || []
    }
  };

  pushToDataLayer('purchase', eventData);
}

export function pushCustomEvent(eventName: string, eventData: any = {}): void {
  pushToDataLayer(eventName, eventData);
}

export function updateDataLayerUser(userData: {
  tenant_id?: string;
  store_id?: string;
  user_id?: string;
  user_role?: string;
}): void {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ...userData
  });
}
