import { Router } from 'express';
import { requireWorkspace } from '../middleware/brandAuth.js';

const router = Router();

// Apply sales workspace permission
router.use(requireWorkspace('sales'));

/**
 * GET /api/brand/sales/pricelists
 * Get all price lists (cross-tenant)
 */
router.get('/pricelists', async (req, res) => {
  try {
    // TODO: Implement actual database queries to brand_pricelists table
    const priceLists = [
      { 
        id: 1, 
        name: 'Listino Fibra B2B', 
        validity: '2025-Q1', 
        status: 'Attivo', 
        tenants: 'Tutti',
        products: 45,
        lastModified: '2025-01-10'
      },
      { 
        id: 2, 
        name: 'Promo Very Mobile', 
        validity: '2025-Q1', 
        status: 'Attivo', 
        tenants: '12 selezionati',
        products: 23,
        lastModified: '2025-01-08'
      },
      { 
        id: 3, 
        name: 'Energia Casa Winter', 
        validity: '2024-Q4', 
        status: 'Scaduto', 
        tenants: 'Tutti',
        products: 18,
        lastModified: '2024-12-15'
      }
    ];

    res.json({ 
      priceLists,
      total: priceLists.length 
    });

  } catch (error) {
    console.error('Sales pricelists error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch price lists',
      message: error.message 
    });
  }
});

/**
 * POST /api/brand/sales/pricelists
 * Create new price list
 */
router.post('/pricelists', async (req, res) => {
  try {
    const { name, validity, targetTenants, products } = req.body;

    if (!name || !validity) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'validity'] 
      });
    }

    // TODO: Insert into brand_pricelists table
    const newPriceList = {
      id: Date.now(),
      name,
      validity,
      status: 'Bozza',
      targetTenants: targetTenants || 'all',
      products: products || [],
      createdAt: new Date().toISOString(),
      createdBy: req.brandUser?.id
    };

    res.status(201).json({ 
      priceList: newPriceList,
      message: 'Price list created successfully' 
    });

  } catch (error) {
    console.error('Create pricelist error:', error);
    res.status(500).json({ 
      error: 'Failed to create price list',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/sales/targets
 * Get sales targets (cross-tenant)
 */
router.get('/targets', async (req, res) => {
  try {
    const { period = 'Q1-2025' } = req.query;

    // TODO: Implement actual database queries to brand_sales_targets table
    const targets = [
      { 
        period: 'Gen 2025', 
        fibra: '€450K', 
        mobile: '€320K', 
        energia: '€180K', 
        status: 'In corso',
        achievement: 87
      },
      { 
        period: 'Feb 2025', 
        fibra: '€480K', 
        mobile: '€340K', 
        energia: '€200K', 
        status: 'Pianificato',
        achievement: 0
      },
      { 
        period: 'Mar 2025', 
        fibra: '€520K', 
        mobile: '€360K', 
        energia: '€220K', 
        status: 'Pianificato',
        achievement: 0
      }
    ];

    res.json({ 
      targets,
      period,
      total: targets.length 
    });

  } catch (error) {
    console.error('Sales targets error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales targets',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/sales/support-materials
 * Get sales support materials
 */
router.get('/support-materials', async (req, res) => {
  try {
    // TODO: Implement actual database queries to brand_sales_materials table
    const materials = [
      { 
        id: 1, 
        title: 'Guida Vendita Fibra Enterprise', 
        type: 'PDF', 
        downloads: 234,
        category: 'guide',
        lastUpdated: '2025-01-10'
      },
      { 
        id: 2, 
        title: 'Script Chiamate B2B', 
        type: 'Script', 
        downloads: 156,
        category: 'scripts',
        lastUpdated: '2025-01-08'
      },
      { 
        id: 3, 
        title: 'Presentazione Very Mobile', 
        type: 'PPT', 
        downloads: 89,
        category: 'presentations',
        lastUpdated: '2025-01-05'
      }
    ];

    res.json({ 
      materials,
      total: materials.length 
    });

  } catch (error) {
    console.error('Sales materials error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch support materials',
      message: error.message 
    });
  }
});

/**
 * GET /api/brand/sales/performance
 * Get sales performance analytics
 */
router.get('/performance', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // TODO: Implement actual performance analytics
    const performance = {
      period,
      revenue: {
        total: '€2.1M',
        fibra: '€1.2M',
        mobile: '€650K',
        energia: '€250K'
      },
      targets: {
        achievement: 87,
        remaining: '€300K'
      },
      trends: [
        { date: '2025-01-01', revenue: 65000 },
        { date: '2025-01-02', revenue: 72000 },
        { date: '2025-01-03', revenue: 68000 }
      ]
    };

    res.json(performance);

  } catch (error) {
    console.error('Sales performance error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch performance data',
      message: error.message 
    });
  }
});

export { router as salesRoutes };