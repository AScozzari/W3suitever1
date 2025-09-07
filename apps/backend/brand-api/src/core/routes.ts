import { Express } from 'express';
import { brandAuthMiddleware } from '../middleware/brandAuth.js';
import { marketingRoutes } from '../routes/marketing.js';
import { salesRoutes } from '../routes/sales.js';
import { operationsRoutes } from '../routes/operations.js';
import { adminRoutes } from '../routes/admin.js';
import { authRoutes } from '../routes/auth.js';

/**
 * Register all Brand Interface API routes
 */
export async function registerBrandRoutes(app: Express) {
  
  // Brand Authentication routes (no auth required)
  app.use('/api/brand/auth', authRoutes);
  
  // Apply Brand authentication middleware to all protected routes
  app.use('/api/brand', brandAuthMiddleware);
  
  // Workspace-specific routes
  app.use('/api/brand/marketing', marketingRoutes);
  app.use('/api/brand/sales', salesRoutes);
  app.use('/api/brand/operations', operationsRoutes);
  app.use('/api/brand/admin', adminRoutes);
  
  // Root Brand API info
  app.get('/api/brand', (req, res) => {
    res.json({
      service: 'W3 Suite Brand Interface API',
      version: '1.0.0',
      workspaces: {
        marketing: '/api/brand/marketing',
        sales: '/api/brand/sales', 
        operations: '/api/brand/operations',
        admin: '/api/brand/admin'
      },
      user: (req as any).brandUser || null
    });
  });
  
  console.log('✅ Brand API routes registered');
}