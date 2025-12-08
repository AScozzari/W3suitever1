/**
 * 🔧 BRAND API CONFIGURATION
 * Centralized API endpoint configuration
 */

// Brand API base URL
export const BRAND_API_BASE = '/brand-api';

// API endpoints
export const BRAND_API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${BRAND_API_BASE}/auth/login`,
    ME: `${BRAND_API_BASE}/auth/me`,
  },
  
  // Organizations
  ORGANIZATIONS: `${BRAND_API_BASE}/organizations`,
  
  // Templates (JSON-based)
  TEMPLATES: {
    BASE: `${BRAND_API_BASE}/templates`,
    BY_TYPE: (type: string) => `${BRAND_API_BASE}/templates/${type}`,
    BY_ID: (type: string, id: string) => `${BRAND_API_BASE}/templates/${type}/${id}`,
    TOGGLE: (type: string, id: string) => `${BRAND_API_BASE}/templates/${type}/${id}/toggle`,
  },
  
  // Workflows (DB-based)
  WORKFLOWS: {
    BASE: `${BRAND_API_BASE}/workflows`,
    BY_ID: (id: string) => `${BRAND_API_BASE}/workflows/${id}`,
  },
  
  // WMS Master Catalog
  WMS: {
    CATEGORIES: `${BRAND_API_BASE}/wms/categories`,
    PRODUCT_TYPES: `${BRAND_API_BASE}/wms/product-types`,
    PRODUCTS: `${BRAND_API_BASE}/wms/products`,
    SUPPLIERS: `${BRAND_API_BASE}/wms/suppliers`,
  },
  
  // Reference Data
  REFERENCE: {
    ITALIAN_CITIES: `${BRAND_API_BASE}/reference/italian-cities`,
  },
} as const;
