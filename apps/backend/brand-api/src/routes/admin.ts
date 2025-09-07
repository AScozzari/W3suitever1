import { Router } from 'express';
import { requireWorkspace } from '../middleware/brandAuth.js';
import { db, switchTenantContext, resetToBrandContext } from '../core/database.js';
import { tenants, legalEntities, stores, users } from '@shared/db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// Apply admin workspace permission
router.use(requireWorkspace('admin'));

/**
 * GET /api/brand/admin/tenants
 * Get all tenant organizations (cross-tenant view)
 */
router.get('/tenants', async (req, res) => {
  try {
    // Reset to brand context for cross-tenant queries
    await resetToBrandContext();
    
    // TODO: Implement actual cross-tenant tenant query
    // For now, return mock data that matches the UI
    const tenantsData = [
      { 
        id: '11111111-1111-1111-1111-111111111111',
        name: 'ACME Corporation', 
        slug: 'acme', 
        status: 'Attivo', 
        users: 156, 
        stores: 45, 
        created: '2024-01-15',
        settings: { domain: 'acme.w3suite.com' }
      },
      { 
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Tech Solutions Ltd', 
        slug: 'tech-solutions', 
        status: 'Attivo', 
        users: 89, 
        stores: 23, 
        created: '2024-02-20',
        settings: { domain: 'tech-solutions.w3suite.com' }
      },
      { 
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo Organization', 
        slug: 'demo', 
        status: 'Demo', 
        users: 34, 
        stores: 12, 
        created: '2024-03-10',
        settings: { domain: 'demo.w3suite.com' }
      }
    ];

    res.json({ 
      tenants: tenantsData,
      total: tenantsData.length,
      user: req.brandUser 
    });

  } catch (error) {
    console.error('Admin tenants error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tenants',
      message: error.message 
    });
  }
});

/**
 * POST /api/brand/admin/tenants
 * Create new tenant organization
 */
router.post('/tenants', async (req, res) => {
  try {
    const { name, slug, settings, features } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'slug'] 
      });
    }

    // TODO: Implement actual tenant creation in database
    const newTenant = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      slug,
      status: 'Attivo',
      settings: settings || {},
      features: features || {},
      createdAt: new Date().toISOString(),
      createdBy: req.brandUser?.id
    };

    res.status(201).json({ 
      tenant: newTenant,
      message: 'Tenant created successfully',
      urls: {
        dashboard: `https://w3suite.com/${slug}/dashboard`,
        subdomain: `https://${slug}.w3suite.com`
      }
    });

  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ 
      error: 'Failed to create tenant',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/admin/brand-users
 * Get Brand Interface users
 */
router.get('/brand-users', async (req, res) => {
  try {
    // TODO: Implement actual brand_users table query
    const brandUsers = [
      { 
        id: 'brand-super-admin',
        name: 'Mario Rossi', 
        email: 'mario.rossi@w3suite.com', 
        role: 'Super Admin', 
        workspace: 'Tutte', 
        lastLogin: '2 min fa',
        permissions: ['*'],
        status: 'Attivo'
      },
      { 
        id: 'brand-marketing-001',
        name: 'Laura Bianchi', 
        email: 'laura.bianchi@w3suite.com', 
        role: 'Marketing Manager', 
        workspace: 'Marketing', 
        lastLogin: '1h fa',
        permissions: ['marketing.*'],
        status: 'Attivo'
      },
      { 
        id: 'brand-ops-001',
        name: 'Giuseppe Verdi', 
        email: 'giuseppe.verdi@w3suite.com', 
        role: 'Operations Lead', 
        workspace: 'Operations', 
        lastLogin: '3h fa',
        permissions: ['operations.*'],
        status: 'Attivo'
      }
    ];

    res.json({ 
      users: brandUsers,
      total: brandUsers.length 
    });

  } catch (error) {
    console.error('Brand users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brand users',
      message: error.message 
    });
  }
});

/**
 * POST /api/brand/admin/brand-users
 * Create new Brand Interface user
 */
router.post('/brand-users', async (req, res) => {
  try {
    const { name, email, role, workspace, permissions } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'role'] 
      });
    }

    // TODO: Implement actual brand user creation
    const newUser = {
      id: `brand-${Date.now()}`,
      name,
      email,
      role,
      workspace: workspace || 'marketing',
      permissions: permissions || [`${workspace}.*`],
      status: 'Attivo',
      createdAt: new Date().toISOString(),
      createdBy: req.brandUser?.id
    };

    res.status(201).json({ 
      user: newUser,
      message: 'Brand user created successfully' 
    });

  } catch (error) {
    console.error('Create brand user error:', error);
    res.status(500).json({ 
      error: 'Failed to create brand user',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/admin/system-config
 * Get system configuration
 */
router.get('/system-config', async (req, res) => {
  try {
    // TODO: Implement actual system configuration retrieval
    const systemConfig = [
      { 
        key: 'OAuth2 Provider', 
        value: 'Keycloak Enterprise', 
        status: 'Configurato',
        category: 'authentication'
      },
      { 
        key: 'Database Cluster', 
        value: 'PostgreSQL 15.x + RLS', 
        status: 'Operativo',
        category: 'database'
      },
      { 
        key: 'Email Service', 
        value: 'SendGrid Pro', 
        status: 'Attivo',
        category: 'communication'
      },
      { 
        key: 'File Storage', 
        value: 'AWS S3 Enterprise', 
        status: 'Attivo',
        category: 'storage'
      },
      {
        key: 'Brand Interface URL',
        value: 'https://w3suite.com/brandinterface',
        status: 'Configurato',
        category: 'routing'
      }
    ];

    const summary = {
      totalConfigs: systemConfig.length,
      activeConfigs: systemConfig.filter(c => c.status === 'Attivo' || c.status === 'Operativo').length,
      categories: [...new Set(systemConfig.map(c => c.category))]
    };

    res.json({ 
      config: systemConfig,
      summary 
    });

  } catch (error) {
    console.error('System config error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system configuration',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // TODO: Implement actual statistics aggregation
    const stats = {
      organizations: {
        total: 24,
        active: 22,
        demo: 2,
        growth: '+2 this month'
      },
      brandUsers: {
        total: 12,
        active: 11,
        byWorkspace: {
          marketing: 3,
          sales: 2,
          operations: 4,
          admin: 3
        }
      },
      database: {
        size: '2.4GB',
        tables: 45,
        connections: 8,
        avgResponseTime: '45ms'
      },
      security: {
        score: 'A+',
        lastAudit: '2025-01-10',
        activeTokens: 156,
        failedLogins: 3
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin statistics',
      message: error.message 
    });
  }
});

export { router as adminRoutes };