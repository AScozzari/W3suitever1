/**
 * AI Enforcement Middleware
 * 
 * Verifies that AI features are enabled at tenant and agent levels before
 * allowing access to AI endpoints. Provides hierarchical enforcement:
 * 1. Tenant-level: isActive must be true
 * 2. Agent-level: specific agent must be enabled (for agent-specific routes)
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../core/db';
import { eq, and, sql } from 'drizzle-orm';
import { aiSettings, aiAgentTenantSettings } from '../db/schema/w3suite';
import { logger } from '../core/logger';

/**
 * Middleware to enforce tenant-level AI activation
 * Blocks request with 403 if AI is disabled at tenant level
 */
export async function enforceAIEnabled(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || (req as any).user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        message: 'Tenant ID is required to verify AI settings',
        timestamp: new Date().toISOString()
      });
    }

    // Check if AI is enabled for this tenant (bypass RLS to read settings)
    const result = await db.execute(
      sql`SELECT is_active FROM w3suite.ai_settings WHERE tenant_id = ${tenantId} LIMIT 1`
    );
    
    const settings = result.rows[0];
    const isActive = settings?.is_active;

    if (!isActive) {
      logger.warn('AI access denied - AI disabled for tenant', { 
        tenantId, 
        path: req.path,
        isActive: isActive ?? null
      });

      return res.status(403).json({
        success: false,
        error: 'AI features disabled',
        message: 'AI assistant is currently disabled for your organization. Please enable it in Settings > AI Assistant.',
        timestamp: new Date().toISOString()
      });
    }

    // AI is enabled, continue
    next();
  } catch (error: any) {
    logger.error('AI enforcement middleware error', { error: error.message, path: req.path });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify AI settings',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware factory to enforce agent-level enablement
 * Blocks request with 403 if specific agent is disabled
 * Use this AFTER enforceAIEnabled for agent-specific routes
 * 
 * @param agentId - The agent ID to check (optional, will use req.params/body if not provided)
 */
export function enforceAgentEnabled(agentId?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || (req as any).user?.tenantId;
      const effectiveAgentId = agentId || req.params.agentId || req.body?.agentId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      });
    }

    if (!effectiveAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing agent ID',
        message: 'Agent ID is required for this operation',
        timestamp: new Date().toISOString()
      });
    }

    // Check if this specific agent is enabled for the tenant (bypass RLS to read settings)
    const result = await db.execute(
      sql`SELECT is_enabled FROM w3suite.ai_agent_tenant_settings 
          WHERE tenant_id = ${tenantId} AND agent_id = ${effectiveAgentId} LIMIT 1`
    );
    
    // If no settings exist, agent is disabled by default (as per backend default logic)
    const agentSettings = result.rows[0];
    const isEnabled = agentSettings?.is_enabled ?? false;

    if (!isEnabled) {
      logger.warn('AI access denied - Agent disabled for tenant', { 
        tenantId, 
        agentId: effectiveAgentId,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Agent disabled',
        message: `The AI agent "${effectiveAgentId}" is currently disabled. Please enable it in Settings > AI Assistant.`,
        timestamp: new Date().toISOString()
      });
    }

    // Agent is enabled, continue
    next();
  } catch (error: any) {
    logger.error('Agent enforcement middleware error', { 
      error: error.message, 
      path: req.path,
      agentId: effectiveAgentId 
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify agent settings',
      timestamp: new Date().toISOString()
    });
  }
  };
}

/**
 * Combined middleware for routes that need both tenant and agent checks
 * Use this for agent-specific endpoints
 */
export const enforceAIWithAgent = [enforceAIEnabled, enforceAgentEnabled];
