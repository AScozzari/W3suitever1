/**
 * 🎯 ACTION DEFINITIONS API
 * 
 * API per il catalogo unificato action_definitions.
 * Supporta mixed RLS: tenant_id NULL = globale, UUID = tenant-specific.
 * 
 * ARCHITETTURA (Jan 2026):
 * - action_definitions è la FONTE UNICA per MCP Gateway
 * - Contiene sia operative (WMS workflows) che query (MCP tools)
 * - exposed_via_mcp controlla visibilità via MCP Gateway
 * - source_table + source_id traccia origine dati
 */

import { Router } from 'express';
import { db } from '../core/db';
import { eq, and, asc, or, isNull, sql } from 'drizzle-orm';
import { actionDefinitions } from '../db/schema/w3suite';
import { logger } from '../core/logger';

const router = Router();

// ==================== GET ALL ACTION DEFINITIONS ====================
router.get('/', async (req, res) => {
  try {
    const { department, activeOnly, category, includeMcp, exposedViaMcp } = req.query;
    
    // SECURITY: Get tenant ONLY from authenticated session, never from headers/query
    // This prevents cross-tenant data leakage via header spoofing
    const authTenantId = (req as any).user?.tenantId;
    
    // If no authenticated tenant, only return global definitions
    // This is safe because global definitions (tenant_id IS NULL) are public templates

    let query = db
      .select()
      .from(actionDefinitions)
      .orderBy(asc(actionDefinitions.displayOrder));

    const allActions = await query;

    // SECURITY: Filter by authenticated tenant only
    // - Global definitions (tenant_id IS NULL) are always visible
    // - Tenant-specific definitions require matching tenant
    let filteredActions = allActions.filter(a => 
      a.tenantId === null || (authTenantId && a.tenantId === authTenantId)
    );

    // Filter by department if specified
    if (department && department !== 'all') {
      filteredActions = filteredActions.filter(a => a.department === department);
    }

    // Filter by exposed_via_mcp (for MCP Gateway views)
    if (exposedViaMcp === 'true') {
      filteredActions = filteredActions.filter(a => a.exposedViaMcp === true);
    }

    // Filter by action category (operative, query, etc.)
    // - category=operative → solo azioni operative (per Action Management)
    // - category=query → solo MCP query tools (per Action Builder)
    // - category=all or includeMcp=true → tutte le azioni (per MCP Catalog)
    // - Default: solo operative per retrocompatibilità
    if (category && category !== 'all') {
      filteredActions = filteredActions.filter(a => a.actionCategory === category);
    } else if (includeMcp !== 'true' && !category) {
      // Default: solo operative per retrocompatibilità con Action Management
      filteredActions = filteredActions.filter(a => a.actionCategory === 'operative');
    }
    // Se includeMcp=true o category=all, mostra tutte

    // Filter by active status if specified
    if (activeOnly === 'true') {
      filteredActions = filteredActions.filter(a => a.isActive);
    }

    // Group by department
    const grouped = filteredActions.reduce((acc, action) => {
      if (!acc[action.department]) {
        acc[action.department] = [];
      }
      acc[action.department].push(action);
      return acc;
    }, {} as Record<string, typeof filteredActions>);

    // Group by direction for WMS
    const byDirection = filteredActions.reduce((acc, action) => {
      const dir = action.direction || 'other';
      if (!acc[dir]) {
        acc[dir] = [];
      }
      acc[dir].push(action);
      return acc;
    }, {} as Record<string, typeof filteredActions>);

    res.json({
      actions: filteredActions,
      grouped,
      byDirection,
      total: filteredActions.length
    });

  } catch (error) {
    logger.error('❌ [ACTION-DEFINITIONS] Error fetching action definitions', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch action definitions' });
  }
});

// ==================== GET SINGLE ACTION DEFINITION ====================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [action] = await db
      .select()
      .from(actionDefinitions)
      .where(eq(actionDefinitions.id, id))
      .limit(1);

    if (!action) {
      return res.status(404).json({ error: 'Action definition not found' });
    }

    res.json(action);

  } catch (error) {
    logger.error('❌ [ACTION-DEFINITIONS] Error fetching action definition', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch action definition' });
  }
});

// ==================== GET DEPARTMENTS WITH ACTIONS ====================
router.get('/meta/departments', async (req, res) => {
  try {
    const allActions = await db
      .select()
      .from(actionDefinitions)
      .where(eq(actionDefinitions.isActive, true));

    // Count actions per department
    const departmentStats = allActions.reduce((acc, action) => {
      if (!acc[action.department]) {
        acc[action.department] = {
          department: action.department,
          totalActions: 0,
          byDirection: {} as Record<string, number>
        };
      }
      acc[action.department].totalActions++;
      
      if (action.direction) {
        acc[action.department].byDirection[action.direction] = 
          (acc[action.department].byDirection[action.direction] || 0) + 1;
      }
      
      return acc;
    }, {} as Record<string, { department: string; totalActions: number; byDirection: Record<string, number> }>);

    res.json({
      departments: Object.values(departmentStats),
      totalDepartments: Object.keys(departmentStats).length,
      totalActions: allActions.length
    });

  } catch (error) {
    logger.error('❌ [ACTION-DEFINITIONS] Error fetching department stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch department stats' });
  }
});

export default router;
