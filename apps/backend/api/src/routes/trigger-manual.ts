/**
 * 🎯 MANUAL TRIGGER ROUTES
 * 
 * API endpoints for manual workflow triggers
 * - Authenticated endpoint for one-time execution
 * - RBAC checks + requester metadata auditing
 * - Delegates to TriggerOrchestrator
 */

import express from 'express';
import { logger } from '../core/logger';
import { triggerOrchestrator } from '../services/trigger-orchestrator';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { z } from 'zod';

const router = express.Router();

// Apply middleware to all routes
router.use(tenantMiddleware);
router.use(rbacMiddleware);

// ==================== VALIDATION SCHEMAS ====================

const manualTriggerSchema = z.object({
  templateId: z.string().uuid({ message: 'Valid template ID required' }),
  triggerId: z.string().min(1, { message: 'Trigger ID required' }),
  payload: z.record(z.any()).optional().default({}),
  metadata: z.record(z.any()).optional()
});

// ==================== MANUAL TRIGGER ENDPOINT ====================

/**
 * POST /api/triggers/manual/fire
 * Fire a manual workflow trigger
 * 
 * Body:
 * {
 *   "templateId": "uuid",
 *   "triggerId": "trigger-id",
 *   "payload": { ... },
 *   "metadata": { ... }
 * }
 */
router.post(
  '/fire',
  requirePermission('workflow.execute'),
  async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
      const userId = req.user?.id || 'system';

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Missing tenant context',
          timestamp: new Date().toISOString()
        });
      }

      // Validate request body
      const validation = manualTriggerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
          timestamp: new Date().toISOString()
        });
      }

      const { templateId, triggerId, payload, metadata } = validation.data;

      logger.info('🎯 [MANUAL-TRIGGER] Manual trigger requested', {
        tenantId,
        templateId,
        triggerId,
        userId,
        payloadSize: Object.keys(payload).length
      });

      // Fire trigger via orchestrator
      const result = await triggerOrchestrator.fireTrigger(
        tenantId,
        templateId,
        triggerId,
        {
          ...payload,
          manualTrigger: true,
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          metadata
        },
        userId // triggeredBy parameter
      );

      if (!result.success) {
        logger.error('❌ [MANUAL-TRIGGER] Failed to fire trigger', {
          tenantId,
          triggerId,
          error: result.message
        });

        return res.status(500).json({
          success: false,
          error: result.message,
          timestamp: new Date().toISOString()
        });
      }

      logger.info('✅ [MANUAL-TRIGGER] Manual trigger fired successfully', {
        tenantId,
        triggerId,
        instanceId: result.instanceId,
        userId
      });

      return res.json({
        success: true,
        message: 'Manual trigger fired successfully',
        instanceId: result.instanceId,
        triggeredBy: userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ [MANUAL-TRIGGER] Manual trigger error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/triggers/manual/templates/:templateId
 * Get manual triggers for a specific workflow template
 */
router.get(
  '/templates/:templateId',
  requirePermission('workflow.read_template'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Missing tenant context',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('📋 [MANUAL-TRIGGER] Listing manual triggers', {
        tenantId,
        templateId
      });

      // TODO: Get manual triggers from registry by template
      // For now, return empty array
      return res.json({
        success: true,
        triggers: [],
        templateId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ [MANUAL-TRIGGER] List triggers error', {
        error: error instanceof Error ? error.message : String(error)
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
