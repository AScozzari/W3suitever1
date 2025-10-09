/**
 * AI Settings API Routes
 * 
 * Provides REST endpoints for AI settings management (OpenAI configuration, model selection, connection testing)
 * with full tenant isolation and RBAC integration.
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { eq } from 'drizzle-orm';
import { aiSettings } from '../db/schema/w3suite';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';
import OpenAI from 'openai';

const router = express.Router();

router.use(correlationMiddleware);
router.use(tenantMiddleware);

// ==================== AI SETTINGS ====================

/**
 * GET /api/ai/settings
 * Get AI settings for the current tenant
 */
router.get('/settings', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'AI settings not found',
        message: 'Please configure AI settings first',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: settings,
      message: 'AI settings retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof settings>);

  } catch (error: any) {
    logger.error('Error retrieving AI settings', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/ai/settings
 * Create or update AI settings for the current tenant (UPSERT pattern)
 */
router.put('/settings', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const updateSchema = z.object({
      openaiApiKey: z.string().min(1, 'OpenAI API key is required'),
      openaiModel: z.enum(['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']).optional(),
      featuresEnabled: z.object({
        chat_assistant: z.boolean().optional(),
        document_analysis: z.boolean().optional(),
        natural_queries: z.boolean().optional(),
        financial_forecasting: z.boolean().optional(),
        web_search: z.boolean().optional(),
        code_interpreter: z.boolean().optional(),
        file_search: z.boolean().optional(),
        image_generation: z.boolean().optional()
      }).optional(),
      maxTokens: z.number().min(100).max(8000).optional(),
      temperature: z.number().min(0).max(2).optional()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const data = validation.data;

    await setTenantContext(tenantId);

    const [existing] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    let result;

    if (existing) {
      [result] = await db
        .update(aiSettings)
        .set({
          openaiApiKey: data.openaiApiKey,
          openaiModel: data.openaiModel || existing.openaiModel,
          featuresEnabled: data.featuresEnabled || existing.featuresEnabled,
          maxTokens: data.maxTokens || existing.maxTokens,
          temperature: data.temperature || existing.temperature,
          apiConnectionStatus: 'disconnected'
        })
        .where(eq(aiSettings.id, existing.id))
        .returning();

      logger.info('AI settings updated', { tenantId, settingsId: result.id });
    } else {
      [result] = await db
        .insert(aiSettings)
        .values({
          tenantId,
          openaiApiKey: data.openaiApiKey,
          openaiModel: data.openaiModel || 'gpt-4-turbo',
          featuresEnabled: data.featuresEnabled || {
            chat_assistant: true,
            document_analysis: true,
            natural_queries: true,
            financial_forecasting: false,
            web_search: false,
            code_interpreter: false,
            file_search: true,
            image_generation: false
          },
          maxTokens: data.maxTokens || 2000,
          temperature: data.temperature || 0.7,
          apiConnectionStatus: 'disconnected'
        })
        .returning();

      logger.info('AI settings created', { tenantId, settingsId: result.id });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: existing ? 'AI settings updated successfully' : 'AI settings created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof result>);

  } catch (error: any) {
    logger.error('Error updating AI settings', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/ai/test-connection
 * Test OpenAI API connection
 */
router.post('/test-connection', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const testSchema = z.object({
      openaiApiKey: z.string().min(1, 'OpenAI API key is required')
    });

    const validation = testSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { openaiApiKey } = validation.data;

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const testResult = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test connection' }],
      max_tokens: 10
    });

    await setTenantContext(tenantId);

    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (settings) {
      await db
        .update(aiSettings)
        .set({
          apiConnectionStatus: 'connected',
          lastConnectionTest: new Date(),
          connectionTestResult: {
            success: true,
            model: testResult.model,
            timestamp: new Date().toISOString()
          }
        })
        .where(eq(aiSettings.id, settings.id));
    }

    logger.info('OpenAI connection test successful', { 
      tenantId, 
      model: testResult.model 
    });

    res.status(200).json({
      success: true,
      data: {
        status: 'connected',
        model: testResult.model,
        timestamp: new Date().toISOString()
      },
      message: 'OpenAI API connection successful',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{
      status: string;
      model: string;
      timestamp: string;
    }>);

  } catch (error: any) {
    logger.error('OpenAI connection test failed', { 
      error: error.message, 
      tenantId: req.user?.tenantId 
    });

    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (tenantId) {
      await setTenantContext(tenantId);

      const [settings] = await db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.tenantId, tenantId))
        .limit(1);

      if (settings) {
        await db
          .update(aiSettings)
          .set({
            apiConnectionStatus: 'error',
            lastConnectionTest: new Date(),
            connectionTestResult: {
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          })
          .where(eq(aiSettings.id, settings.id));
      }
    }

    res.status(400).json({
      success: false,
      error: 'Connection test failed',
      message: error.message || 'Invalid API key or network error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export { router as aiSettingsRoutes };
