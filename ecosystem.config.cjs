/**
 * PM2 Ecosystem Configuration for W3 Suite VPS Production
 * 
 * This file configures all services for production deployment on VPS.
 * Use: pm2 start ecosystem.config.cjs
 * 
 * Services:
 * - w3-api: Main W3 Suite backend API (port 3004)
 * - brand-api: Brand Interface backend (port 3002)
 * - w3-frontend: W3 Suite Vite frontend (port 3000)
 * - brand-frontend: Brand Interface Vite frontend (port 3001)
 * - voice-gateway: AI Voice Gateway (ports 3005/3105)
 * 
 * Note: Nginx runs as system service on VPS, not managed by PM2
 */

module.exports = {
  apps: [
    {
      name: 'w3-api',
      cwd: './apps/backend/api',
      script: 'src/index.ts',
      interpreter: 'tsx',
      interpreter_args: '',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: '3004',
        AUTH_MODE: 'oauth2',
        DISABLE_EMBEDDED_NGINX: 'true'
      }
    },
    {
      name: 'brand-api',
      cwd: './apps/backend/brand-api',
      script: 'src/index.ts',
      interpreter: 'tsx',
      interpreter_args: '',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: {
        NODE_ENV: 'production',
        BRAND_BACKEND_PORT: '3002'
      }
    },
    {
      name: 'w3-frontend',
      cwd: './apps/frontend/web',
      script: 'npm',
      args: 'run preview',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '3000'
      }
    },
    {
      name: 'brand-frontend',
      cwd: './apps/frontend/brand-web',
      script: 'npm',
      args: 'run preview',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '3001'
      }
    },
    {
      name: 'voice-gateway',
      cwd: './apps/voice-gateway',
      script: 'src/index.ts',
      interpreter: 'tsx',
      interpreter_args: '',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: {
        NODE_ENV: 'production',
        WS_PORT: '3005',
        HTTP_PORT: '3105'
      }
    }
  ]
};
