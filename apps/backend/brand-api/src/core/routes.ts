import { Express } from 'express';
import { brandAuthMiddleware } from '../middleware/brandAuth.js';
import { campaignRoutes } from '../routes/campaigns.js';
import { pricelistRoutes } from '../routes/pricelists.js';
import { deploymentRoutes } from '../routes/deployments.js';
import { tenantRoutes } from '../routes/tenants.js';
import { userRoutes } from '../routes/users.js';
import { systemRoutes } from '../routes/system.js';
import { authRoutes } from '../routes/auth.js';

/**
 * Register all Brand Interface API routes
 * Organized by functionality with RBAC control
 */
export async function registerBrandRoutes(app: Express) {
  
  // Brand Authentication routes (no auth required)
  app.use('/api/brand/auth', authRoutes);
  
  // Apply Brand authentication middleware to all protected routes
  app.use('/api/brand', brandAuthMiddleware);
  
  // Functionality-based routes with RBAC
  app.use('/api/brand/campaigns', campaignRoutes);
  app.use('/api/brand/pricelists', pricelistRoutes);
  app.use('/api/brand/deployments', deploymentRoutes);
  app.use('/api/brand/tenants', tenantRoutes);
  app.use('/api/brand/users', userRoutes);
  app.use('/api/brand/system', systemRoutes);
  
  // Root Brand API info
  app.get('/api/brand', (req, res) => {
    res.json({
      service: 'W3 Suite Brand Interface API',
      version: '1.0.0',
      endpoints: {
        campaigns: '/api/brand/campaigns',
        pricelists: '/api/brand/pricelists', 
        deployments: '/api/brand/deployments',
        tenants: '/api/brand/tenants',
        users: '/api/brand/users',
        system: '/api/brand/system'
      },
      user: (req as any).brandUser || null
    });
  });
  
  console.log('✅ Brand API routes registered');
}