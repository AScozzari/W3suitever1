import type { UTMData } from './utm-tracker';

declare global {
  interface Window {
    dataLayer: any[];
  }
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
