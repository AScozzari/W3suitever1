/**
 * AI Enforcement Middleware
 * 
 * Verifies that AI features are enabled at tenant and agent levels before
 * allowing access to AI endpoints. Provides hierarchical enforcement:
 * 1. Tenant-level: isActive must be true AND openaiApiKey must exist
 * 2. Agent-level: specific agent must be enabled (for agent-specific routes)
 * 
 * GRACEFUL DEGRADATION:
 * - No settings = AI disabled (no error, just disabled state)
 * - No API key = AI disabled (no error, user must configure)
 * - isActive=false = AI disabled (user choice)
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../core/db';
import { eq, and, sql } from 'drizzle-orm';
import { aiSettings, aiAgentTenantSettings } from '../db/schema/w3suite';
import { logger } from '../core/logger';

export interface AIStatus {
  enabled: boolean;
  reason: 'active' | 'no_settings' | 'disabled' | 'no_api_key' | 'connection_error';
  message: string;
  hasApiKey: boolean;
  isActive: boolean;
}

/**
 * Get AI status for a tenant (no errors, just status)
 * Returns enabled/disabled state with reason
 */
export async function getTenantAIStatus(tenantId: string): Promise<AIStatus> {
  try {
    const result = await db.execute(
      sql`SELECT is_active, openai_api_key, api_connection_status 
          FROM w3suite.ai_settings 
          WHERE tenant_id = ${tenantId} LIMIT 1`
    );
    
    const settings = result.rows[0] as any;
    
    // No settings = AI not configured (disabled by default)
    if (!settings) {
      return {
        enabled: false,
        reason: 'no_settings',
        message: 'AI non configurato. Vai su Impostazioni > AI Assistant per attivare.',
        hasApiKey: false,
        isActive: false
      };
    }

    // Settings exist but isActive = false (user disabled)
    if (!settings.is_active) {
      return {
        enabled: false,
        reason: 'disabled',
        message: 'AI disabilitato. Attiva lo switch "Abilita AI" nelle impostazioni.',
        hasApiKey: !!settings.openai_api_key,
        isActive: false
      };
    }

    // Settings exist, isActive = true, but no API key
    if (!settings.openai_api_key) {
      return {
        enabled: false,
        reason: 'no_api_key',
        message: 'API Key OpenAI mancante. Inserisci la chiave nelle impostazioni AI.',
        hasApiKey: false,
        isActive: true
      };
    }

    // AI is fully enabled
    return {
      enabled: true,
      reason: 'active',
      message: 'AI attivo e funzionante.',
      hasApiKey: true,
      isActive: true
    };

  } catch (error: any) {
    logger.error('Error getting AI status', { error: error.message, tenantId });
    return {
      enabled: false,
      reason: 'connection_error',
      message: 'Errore nel verificare lo stato AI.',
      hasApiKey: false,
      isActive: false
    };
  }
}

/**
 * Middleware to enforce tenant-level AI activation
 * Returns 403 with clear reason if AI is not fully enabled
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

    const status = await getTenantAIStatus(tenantId);

    if (!status.enabled) {
      logger.info('AI access denied - graceful disable', { 
        tenantId, 
        path: req.path,
        reason: status.reason
      });

      return res.status(403).json({
        success: false,
        error: 'ai_disabled',
        reason: status.reason,
        message: status.message,
        aiStatus: status,
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
    const agentIdForLog = agentId || req.params.agentId || req.body?.agentId;
    logger.error('Agent enforcement middleware error', { 
      error: error.message, 
      path: req.path,
      agentId: agentIdForLog
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
