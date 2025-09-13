/**
 * W3 Suite Enterprise Reverse Proxy - Configuration
 * Environment-aware configuration for development and production
 */

export interface ProxyConfig {
  port: number;
  environment: 'development' | 'production';
  upstream: {
    w3Frontend: { host: string; port: number; fallbackPorts?: number[] };
    w3Backend: { host: string; port: number; };
    brandFrontend: { host: string; port: number; fallbackPorts?: number[] };
    brandBackend: { host: string; port: number; };
  };
  security: {
    enableHelmet: boolean;
    enableRateLimit: boolean;
    corsOrigins: string[];
  };
  healthCheck: {
    interval: number;
    timeout: number;
    retries: number;
  };
  logging: {
    level: string;
    format: string;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const config: ProxyConfig = {
  port: parseInt(process.env.PROXY_PORT || '5000', 10),
  environment: isDevelopment ? 'development' : 'production',
  upstream: {
    w3Frontend: {
      host: process.env.W3_FRONTEND_HOST || 'localhost',
      port: parseInt(process.env.W3_FRONTEND_PORT || '3000', 10),
      fallbackPorts: [3000, 3001, 3003, 3005], // Try multiple ports
    },
    w3Backend: {
      host: process.env.W3_BACKEND_HOST || 'localhost',
      port: parseInt(process.env.W3_BACKEND_PORT || '3004', 10),
    },
    brandFrontend: {
      host: process.env.BRAND_FRONTEND_HOST || 'localhost',
      port: parseInt(process.env.BRAND_FRONTEND_PORT || '3001', 10),
      fallbackPorts: [3001, 3002, 3006, 3007], // Try multiple ports
    },
    brandBackend: {
      host: process.env.BRAND_BACKEND_HOST || 'localhost',
      port: parseInt(process.env.BRAND_BACKEND_PORT || '3002', 10),
    },
  },
  security: {
    enableHelmet: !isDevelopment,
    enableRateLimit: !isDevelopment,
    corsOrigins: isDevelopment 
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000']
      : process.env.CORS_ORIGINS?.split(',') || ['https://w3suite.com'],
  },
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: isDevelopment ? 'dev' : 'combined',
  },
};