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
import { aiSettings, aiAgentTenantSettings } from '../db/schema/w3suite';
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

    // 🔒 SECURITY: Mask API key before sending to frontend
    const maskedSettings = {
      ...settings,
      openaiApiKey: settings.openaiApiKey 
        ? `${settings.openaiApiKey.substring(0, 7)}${'*'.repeat(20)}${settings.openaiApiKey.slice(-4)}`
        : null
    };

    res.status(200).json({
      success: true,
      data: maskedSettings,
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
      openaiApiKey: z.union([z.string().min(1), z.literal('')]).optional(),
      openaiModel: z.enum(['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']).optional(),
      isActive: z.boolean().optional(),
      trainingMode: z.boolean().optional(),
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
      privacySettings: z.object({
        dataRetentionDays: z.number().min(1).max(365).optional(),
        allowDataTraining: z.boolean().optional(),
        anonymizeConversations: z.boolean().optional()
      }).optional(),
      trainingSettings: z.object({
        urlIngestion: z.boolean().optional(),
        documentProcessing: z.boolean().optional(),
        imageAnalysis: z.boolean().optional(),
        audioTranscription: z.boolean().optional(),
        videoProcessing: z.boolean().optional(),
        responseValidation: z.boolean().optional()
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
      // UPDATE existing settings (partial updates allowed)
      const updateData: any = {};
      
      if (data.openaiApiKey !== undefined) updateData.openaiApiKey = data.openaiApiKey;
      if (data.openaiModel !== undefined) updateData.openaiModel = data.openaiModel;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.trainingMode !== undefined) updateData.trainingMode = data.trainingMode;
      if (data.featuresEnabled !== undefined) updateData.featuresEnabled = data.featuresEnabled;
      if (data.privacySettings !== undefined) updateData.privacySettings = data.privacySettings;
      if (data.trainingSettings !== undefined) updateData.trainingSettings = data.trainingSettings;
      if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
      if (data.temperature !== undefined) updateData.temperature = data.temperature;
      
      // Reset connection status if API key changed
      if (data.openaiApiKey) {
        updateData.apiConnectionStatus = 'disconnected';
      }

      [result] = await db
        .update(aiSettings)
        .set(updateData)
        .where(eq(aiSettings.id, existing.id))
        .returning();

      logger.info('AI settings updated', { tenantId, settingsId: result.id, fieldsUpdated: Object.keys(updateData) });
    } else {
      // INSERT new settings (openaiApiKey required for creation)
      if (!data.openaiApiKey) {
        return res.status(400).json({
          success: false,
          error: 'OpenAI API key is required for initial setup',
          message: 'Please provide an OpenAI API key to create AI settings',
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }

      [result] = await db
        .insert(aiSettings)
        .values({
          tenantId,
          openaiApiKey: data.openaiApiKey,
          openaiModel: data.openaiModel || 'gpt-4-turbo',
          isActive: data.isActive !== undefined ? data.isActive : true,
          trainingMode: data.trainingMode !== undefined ? data.trainingMode : false,
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
          privacySettings: data.privacySettings || {
            dataRetentionDays: 30,
            allowDataTraining: false,
            anonymizeConversations: true
          },
          trainingSettings: data.trainingSettings || {
            urlIngestion: true,
            documentProcessing: true,
            imageAnalysis: false,
            audioTranscription: false,
            videoProcessing: false,
            responseValidation: true
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

/**
 * PUT /api/ai/agents/:agentId/toggle
 * Enable or disable a specific AI agent for the current tenant
 */
router.put('/agents/:agentId/toggle', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { agentId } = req.params;
    
    const toggleSchema = z.object({
      isEnabled: z.boolean()
    });

    const validation = toggleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { isEnabled } = validation.data;

    await setTenantContext(tenantId);

    // UPSERT: Insert or update agent settings for this tenant
    const [result] = await db
      .insert(aiAgentTenantSettings)
      .values({
        tenantId,
        agentId,
        isEnabled,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [aiAgentTenantSettings.tenantId, aiAgentTenantSettings.agentId],
        set: {
          isEnabled,
          updatedAt: new Date()
        }
      })
      .returning();

    logger.info('AI agent toggle updated', { 
      tenantId, 
      agentId, 
      isEnabled,
      settingId: result.id
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Agent ${agentId} ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof result>);

  } catch (error: any) {
    logger.error('Error toggling AI agent', { 
      error: error.message, 
      tenantId: req.user?.tenantId,
      agentId: req.params.agentId
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export { router as aiSettingsRoutes };
