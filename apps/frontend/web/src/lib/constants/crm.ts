export const LEAD_SOURCES = [
  'manual',
  'web_form',
  'powerful_api',
  'landing_page',
  'csv_import'
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: 'Manuale',
  web_form: 'Form Web',
  powerful_api: 'API',
  landing_page: 'Landing Page',
  csv_import: 'Import CSV'
};
