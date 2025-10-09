/**
 * AI Enforcement Middleware
 * 
 * Verifies that AI features are enabled at tenant and agent levels before
 * allowing access to AI endpoints. Provides hierarchical enforcement:
 * 1. Tenant-level: isActive must be true
 * 2. Agent-level: specific agent must be enabled (for agent-specific routes)
 */

import { Request, Response, NextFunction } from 'express';
import { db, setTenantContext } from '../core/db';
import { eq, and } from 'drizzle-orm';
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

    await setTenantContext(tenantId);

    // Check if AI is enabled for this tenant
    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (!settings || !settings.isActive) {
      logger.warn('AI access denied - AI disabled for tenant', { 
        tenantId, 
        path: req.path,
        isActive: settings?.isActive ?? null
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
 * Middleware to enforce agent-level enablement
 * Blocks request with 403 if specific agent is disabled
 * Use this AFTER enforceAIEnabled for agent-specific routes
 */
export async function enforceAgentEnabled(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || (req as any).user?.tenantId;
    const agentId = req.params.agentId || req.body?.agentId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      });
    }

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing agent ID',
        message: 'Agent ID is required for this operation',
        timestamp: new Date().toISOString()
      });
    }

    await setTenantContext(tenantId);

    // Check if this specific agent is enabled for the tenant
    const [agentSettings] = await db
      .select()
      .from(aiAgentTenantSettings)
      .where(
        and(
          eq(aiAgentTenantSettings.tenantId, tenantId),
          eq(aiAgentTenantSettings.agentId, agentId)
        )
      )
      .limit(1);

    // If no settings exist, agent is disabled by default (as per backend default logic)
    const isEnabled = agentSettings?.isEnabled ?? false;

    if (!isEnabled) {
      logger.warn('AI access denied - Agent disabled for tenant', { 
        tenantId, 
        agentId,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Agent disabled',
        message: `The AI agent "${agentId}" is currently disabled. Please enable it in Settings > AI Assistant.`,
        timestamp: new Date().toISOString()
      });
    }

    // Agent is enabled, continue
    next();
  } catch (error: any) {
    logger.error('Agent enforcement middleware error', { 
      error: error.message, 
      path: req.path,
      agentId: req.params.agentId 
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify agent settings',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Combined middleware for routes that need both tenant and agent checks
 * Use this for agent-specific endpoints
 */
export const enforceAIWithAgent = [enforceAIEnabled, enforceAgentEnabled];
