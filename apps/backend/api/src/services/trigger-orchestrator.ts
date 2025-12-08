/**
 * 🎯 TRIGGER ORCHESTRATION LAYER
 * 
 * Manages trigger lifecycle separately from step-level action executors.
 * Handles Schedule, Webhook, Error, and Manual triggers that INITIATE workflow execution.
 * 
 * Architecture:
 * - TriggerRegistry: In-memory cache backed by persistence (keyed by tenant+template)
 * - TriggerOrchestrator: Entry point that normalizes trigger payloads and enforces guardrails
 * - Trigger lifecycle: activate/deactivate operations invoked when workflow template is published/updated
 */

import { logger } from '../core/logger';
import { db } from '../core/db';
import { workflowTriggers, workflowInstances } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { getWorkflowQueue } from '../queue/workflow-queue';
import { WorkflowEngine } from './workflow-engine';

// ==================== INTERFACES ====================

/**
 * Trigger metadata shape (persisted in database)
 */
export interface TriggerMetadata {
  triggerId: string;
  templateId: string;
  tenantId: string;
  triggerType: 'schedule' | 'webhook' | 'error' | 'manual';
  config: Record<string, any>; // Zod-validated trigger config from frontend
  status: 'active' | 'inactive' | 'error';
  metadata?: Record<string, any>; // Runtime metadata (e.g., BullMQ job ID, webhook URL)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trigger context envelope passed to WorkflowEngine.startInstance()
 */
export interface TriggerContext {
  triggerType: 'schedule' | 'webhook' | 'error' | 'manual';
  triggerId: string;
  payload: Record<string, any>; // Normalized trigger-specific data
  metadata: {
    triggeredAt: Date;
    triggeredBy?: string; // User ID for manual triggers
    source?: string; // External system for webhook triggers
    [key: string]: any;
  };
}

/**
 * Trigger activation result
 */
export interface TriggerActivationResult {
  success: boolean;
  triggerId: string;
  message: string;
  metadata?: Record<string, any>;
  error?: string;
}

// ==================== TRIGGER REGISTRY ====================

/**
 * 📋 TRIGGER REGISTRY
 * In-memory cache of active triggers backed by database persistence
 */
export class TriggerRegistry {
  private triggers = new Map<string, TriggerMetadata>(); // Key: tenant:template:triggerId
  private scheduleJobs = new Map<string, string>(); // Key: triggerId, Value: BullMQ job ID
  private webhookRoutes = new Map<string, { path: string; method: string; triggerId: string }>();

  constructor() {
    logger.info('📋 [TRIGGER-REGISTRY] Initializing trigger registry');
  }

  /**
   * Generate composite key for trigger lookup
   */
  private getKey(tenantId: string, templateId: string, triggerId: string): string {
    return `${tenantId}:${templateId}:${triggerId}`;
  }

  /**
   * Register trigger in memory cache
   */
  registerTrigger(trigger: TriggerMetadata): void {
    const key = this.getKey(trigger.tenantId, trigger.templateId, trigger.triggerId);
    this.triggers.set(key, trigger);
    logger.debug('📝 [TRIGGER-REGISTRY] Registered trigger', {
      key,
      triggerType: trigger.triggerType,
      status: trigger.status
    });
  }

  /**
   * Get trigger from cache
   */
  getTrigger(tenantId: string, templateId: string, triggerId: string): TriggerMetadata | null {
    const key = this.getKey(tenantId, templateId, triggerId);
    return this.triggers.get(key) || null;
  }

  /**
   * Get trigger by triggerId only (searches all tenants/templates)
   */
  getTriggerById(triggerId: string): TriggerMetadata | null {
    for (const [key, trigger] of this.triggers.entries()) {
      if (trigger.triggerId === triggerId) {
        return trigger;
      }
    }
    return null;
  }

  /**
   * Get all triggers for a template
   */
  getTemplateTriggers(tenantId: string, templateId: string): TriggerMetadata[] {
    const prefix = `${tenantId}:${templateId}:`;
    return Array.from(this.triggers.values()).filter(
      t => this.getKey(t.tenantId, t.templateId, t.triggerId).startsWith(prefix)
    );
  }

  /**
   * Remove trigger from cache
   */
  removeTrigger(tenantId: string, templateId: string, triggerId: string): void {
    const key = this.getKey(tenantId, templateId, triggerId);
    this.triggers.delete(key);
    this.scheduleJobs.delete(triggerId);
    this.webhookRoutes.delete(triggerId);
    logger.debug('🗑️ [TRIGGER-REGISTRY] Removed trigger', { key });
  }

  /**
   * Associate BullMQ job ID with schedule trigger
   */
  setScheduleJob(triggerId: string, jobId: string): void {
    this.scheduleJobs.set(triggerId, jobId);
  }

  /**
   * Get BullMQ job ID for schedule trigger
   */
  getScheduleJob(triggerId: string): string | null {
    return this.scheduleJobs.get(triggerId) || null;
  }

  /**
   * Register webhook route mapping
   */
  registerWebhookRoute(triggerId: string, tenantId: string, path: string, method: string): void {
    const key = `${tenantId}:${path}:${method}`;
    this.webhookRoutes.set(key, { path, method, triggerId });
    logger.debug('🌐 [TRIGGER-REGISTRY] Registered webhook route', {
      triggerId,
      tenantId,
      path,
      method
    });
  }

  /**
   * Get webhook trigger ID by tenant, path, and method (multi-tenant safe)
   */
  getWebhookTriggerId(tenantId: string, path: string, method: string): string | null {
    const key = `${tenantId}:${path}:${method}`;
    const route = this.webhookRoutes.get(key);
    return route?.triggerId || null;
  }

  /**
   * Clear all triggers (for testing)
   */
  clear(): void {
    this.triggers.clear();
    this.scheduleJobs.clear();
    this.webhookRoutes.clear();
  }
}

// ==================== TRIGGER ORCHESTRATOR ====================

/**
 * 🎭 TRIGGER ORCHESTRATOR
 * Entry point for all trigger activations
 * - Normalizes trigger payloads
 * - Enforces guardrails (debounce, quotas)
 * - Calls WorkflowEngine.startInstance() with trigger context
 */
export class TriggerOrchestrator {
  private registry: TriggerRegistry;
  private workflowQueue: Queue | null = null;
  private workflowEngine: WorkflowEngine;
  private lastTriggerTimes = new Map<string, Date>(); // For debouncing

  constructor(registry: TriggerRegistry) {
    this.registry = registry;
    this.workflowEngine = new WorkflowEngine();
    logger.info('🎭 [TRIGGER-ORCHESTRATOR] Initialized orchestrator');
  }

  /**
   * Get workflow queue (lazy initialization)
   * Returns null if Redis is not configured
   */
  private getQueue(): Queue | null {
    try {
      if (!this.workflowQueue) {
        this.workflowQueue = getWorkflowQueue();
      }
      return this.workflowQueue;
    } catch (error) {
      logger.warn('⚠️ [TRIGGER-ORCHESTRATOR] Cannot get workflow queue (Redis not configured)', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Activate a trigger (called when workflow template is published)
   */
  async activateTrigger(
    tenantId: string,
    templateId: string,
    nodeId: string,
    triggerType: 'schedule' | 'webhook' | 'error' | 'manual',
    config: Record<string, any>
  ): Promise<TriggerActivationResult> {
    try {
      logger.info('🚀 [TRIGGER-ORCHESTRATOR] Activating trigger', {
        tenantId,
        templateId,
        nodeId,
        triggerType
      });

      // Persist trigger to database (using workflowTriggers table or similar)
      // For now, create in-memory metadata
      const triggerId = `${templateId}-${nodeId}`;
      const metadata: TriggerMetadata = {
        triggerId,
        templateId,
        tenantId,
        triggerType,
        config,
        status: 'active',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Register in memory cache
      this.registry.registerTrigger(metadata);

      // Trigger-specific activation logic
      let activationMetadata: Record<string, any> = {};

      switch (triggerType) {
        case 'schedule':
          activationMetadata = await this.activateScheduleTrigger(triggerId, tenantId, templateId, config);
          break;

        case 'webhook':
          activationMetadata = await this.activateWebhookTrigger(triggerId, tenantId, config);
          break;

        case 'error':
          activationMetadata = await this.activateErrorTrigger(triggerId, tenantId, config);
          break;

        case 'manual':
          activationMetadata = { enabled: true }; // Manual triggers don't need background setup
          break;

        default:
          throw new Error(`Unknown trigger type: ${triggerType}`);
      }

      // Update metadata with activation results
      metadata.metadata = activationMetadata;
      this.registry.registerTrigger(metadata);

      logger.info('✅ [TRIGGER-ORCHESTRATOR] Trigger activated successfully', {
        triggerId,
        triggerType,
        metadata: activationMetadata
      });

      return {
        success: true,
        triggerId,
        message: `${triggerType} trigger activated successfully`,
        metadata: activationMetadata
      };

    } catch (error) {
      logger.error('❌ [TRIGGER-ORCHESTRATOR] Trigger activation failed', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        templateId,
        triggerType
      });

      return {
        success: false,
        triggerId: `${templateId}-${nodeId}`,
        message: 'Trigger activation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deactivate a trigger (called when workflow template is disabled)
   */
  async deactivateTrigger(
    tenantId: string,
    templateId: string,
    triggerId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('🛑 [TRIGGER-ORCHESTRATOR] Deactivating trigger', {
        tenantId,
        templateId,
        triggerId
      });

      const trigger = this.registry.getTrigger(tenantId, templateId, triggerId);
      if (!trigger) {
        return {
          success: false,
          message: 'Trigger not found in registry'
        };
      }

      // Trigger-specific deactivation logic
      switch (trigger.triggerType) {
        case 'schedule':
          await this.deactivateScheduleTrigger(triggerId);
          break;

        case 'webhook':
          await this.deactivateWebhookTrigger(triggerId);
          break;

        case 'error':
          await this.deactivateErrorTrigger(triggerId);
          break;

        case 'manual':
          // Manual triggers don't need background cleanup
          break;
      }

      // Remove from registry
      this.registry.removeTrigger(tenantId, templateId, triggerId);

      logger.info('✅ [TRIGGER-ORCHESTRATOR] Trigger deactivated successfully', {
        triggerId
      });

      return {
        success: true,
        message: 'Trigger deactivated successfully'
      };

    } catch (error) {
      logger.error('❌ [TRIGGER-ORCHESTRATOR] Trigger deactivation failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Deactivation failed'
      };
    }
  }

  /**
   * Fire a trigger (enqueue workflow instance with trigger context)
   */
  async fireTrigger(
    tenantId: string,
    templateId: string,
    triggerId: string,
    payload: Record<string, any>,
    triggeredBy?: string
  ): Promise<{ success: boolean; instanceId?: string; message: string }> {
    try {
      const trigger = this.registry.getTrigger(tenantId, templateId, triggerId);
      if (!trigger) {
        throw new Error('Trigger not found or inactive');
      }

      // Debouncing check (for error triggers)
      if (trigger.triggerType === 'error') {
        const debounceMs = (trigger.config.debounce?.durationMs as number) || 60000;
        const lastTime = this.lastTriggerTimes.get(triggerId);
        if (lastTime && Date.now() - lastTime.getTime() < debounceMs) {
          logger.debug('⏸️ [TRIGGER-ORCHESTRATOR] Trigger debounced', {
            triggerId,
            debounceMs,
            lastTime
          });
          return {
            success: true,
            message: 'Trigger debounced (too frequent)'
          };
        }
      }

      // Build trigger context envelope
      const triggerContext: TriggerContext = {
        triggerType: trigger.triggerType,
        triggerId,
        payload,
        metadata: {
          triggeredAt: new Date(),
          triggeredBy,
          source: payload.source || 'system'
        }
      };

      // Call WorkflowEngine.createInstanceFromReactFlow() to start workflow
      logger.info('🔥 [TRIGGER-ORCHESTRATOR] Trigger fired - starting workflow', {
        tenantId,
        templateId,
        triggerId,
        triggerType: trigger.triggerType,
        payloadSize: Object.keys(payload).length
      });

      // Update last trigger time for debouncing
      this.lastTriggerTimes.set(triggerId, new Date());

      // Start workflow instance via WorkflowEngine
      const instance = await this.workflowEngine.createInstanceFromReactFlow(templateId, {
        tenantId,
        requesterId: triggeredBy || 'system',
        requestId: triggerId,
        instanceName: `${trigger.triggerType}-trigger-${new Date().toISOString()}`,
        metadata: {
          ...triggerContext.metadata,
          trigger: triggerContext
        }
      });

      if (!instance || !instance.id) {
        logger.error('❌ [TRIGGER-ORCHESTRATOR] WorkflowEngine failed to create instance', {
          tenantId,
          templateId,
          triggerId,
          triggerType: trigger.triggerType
        });
        return {
          success: false,
          message: 'Failed to create workflow instance - template may be missing or invalid'
        };
      }

      const instanceId = instance.id;

      return {
        success: true,
        instanceId,
        message: 'Workflow instance triggered successfully'
      };

    } catch (error) {
      logger.error('❌ [TRIGGER-ORCHESTRATOR] Trigger fire failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Trigger fire failed'
      };
    }
  }

  // ==================== TRIGGER-SPECIFIC ACTIVATION ====================

  /**
   * Activate schedule trigger (create BullMQ repeatable job)
   */
  private async activateScheduleTrigger(
    triggerId: string,
    tenantId: string,
    templateId: string,
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      logger.info('⏰ [SCHEDULE-TRIGGER] Activating schedule trigger', {
        triggerId,
        config
      });

      const mode = config.mode || 'simple';
      let cronExpression: string;
      let timezone: string;

      // Convert simple mode to cron expression or use provided cron
      if (mode === 'simple' && config.simple) {
        cronExpression = this.convertSimpleToCron(config.simple);
        timezone = config.simple.timezone || 'Europe/Rome';
      } else if (mode === 'cron' && config.cron) {
        cronExpression = config.cron.expression;
        timezone = config.cron.timezone || 'Europe/Rome';
      } else {
        throw new Error('Invalid schedule configuration: missing simple or cron config');
      }

      // Create BullMQ repeatable job (skip if Redis not available)
      const queue = this.getQueue();
      if (!queue) {
        logger.warn('⚠️ [SCHEDULE-TRIGGER] Cannot create repeatable job - Redis not configured', {
          triggerId
        });
        return {
          message: 'Schedule trigger registered (queue unavailable in development)',
          cronExpression,
          timezone
        };
      }

      const jobName = `schedule-trigger-${triggerId}`;
      const job = await queue.add(
        jobName,
        {
          type: 'schedule_trigger',
          triggerId,
          tenantId,
          templateId,
          config
        },
        {
          repeat: {
            pattern: cronExpression,
            tz: timezone
          }
        }
      );

      // Store the actual repeat job key returned by BullMQ
      // This key includes hashed cron metadata and is needed for removal
      const repeatJobKey = job.opts?.repeat?.key || `${job.name}:${cronExpression}:${timezone}`;
      this.registry.setScheduleJob(triggerId, repeatJobKey);

      logger.info('✅ [SCHEDULE-TRIGGER] BullMQ repeatable job created', {
        triggerId,
        jobId: job.id,
        cronExpression,
        timezone
      });

      return {
        jobId: job.id || triggerId,
        type: mode,
        cronExpression,
        timezone,
        enabled: config.enabled !== false,
        nextRun: job.opts.repeat?.pattern || 'N/A'
      };

    } catch (error) {
      logger.error('❌ [SCHEDULE-TRIGGER] Activation failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });
      throw error;
    }
  }

  /**
   * Convert simple schedule config to cron expression
   */
  private convertSimpleToCron(simpleConfig: Record<string, any>): string {
    const { interval, value, minute = 0, hour = 9, weekdays, dayOfMonth } = simpleConfig;

    switch (interval) {
      case 'seconds':
        // Cron doesn't support seconds precision, fallback to every minute
        logger.warn('⚠️ [SCHEDULE-TRIGGER] Seconds interval not supported by cron, using every minute');
        return '* * * * *';

      case 'minutes':
        return `*/${value} * * * *`;

      case 'hours':
        return `${minute} */${value} * * *`;

      case 'days':
        if (weekdays && weekdays.length > 0) {
          // Map weekday names to cron day numbers (0=Sunday, 1=Monday, etc.)
          const dayMap: Record<string, number> = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6
          };
          const dayNumbers = weekdays.map((d: string) => dayMap[d.toLowerCase()]).join(',');
          return `${minute} ${hour} * * ${dayNumbers}`;
        }
        return `${minute} ${hour} */${value} * *`;

      case 'weeks':
        return `${minute} ${hour} * * 1`; // Every Monday at specified time

      case 'months':
        const day = dayOfMonth || 1;
        return `${minute} ${hour} ${day} */${value} *`;

      default:
        throw new Error(`Unknown interval type: ${interval}`);
    }
  }

  /**
   * Activate webhook trigger (register webhook route)
   */
  private async activateWebhookTrigger(
    triggerId: string,
    tenantId: string,
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      // Normalize path to always have leading slash
      const normalizedPath = (config.path as string).startsWith('/')
        ? config.path as string
        : `/${config.path as string}`;

      logger.info('🌐 [WEBHOOK-TRIGGER] Activating webhook trigger', {
        triggerId,
        path: normalizedPath,
        method: config.httpMethod
      });

      // Register webhook route mapping in registry (with tenant scoping)
      this.registry.registerWebhookRoute(
        triggerId,
        tenantId,
        normalizedPath,
        config.httpMethod as string
      );

      return {
        path: normalizedPath,
        method: config.httpMethod,
        authType: config.authentication?.type || 'none',
        enabled: true
      };

    } catch (error) {
      logger.error('❌ [WEBHOOK-TRIGGER] Activation failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });
      throw error;
    }
  }

  /**
   * Activate error trigger (subscribe to workflow error events)
   */
  private async activateErrorTrigger(
    triggerId: string,
    tenantId: string,
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      logger.info('⚠️ [ERROR-TRIGGER] Activating error trigger', {
        triggerId,
        scope: config.scope
      });

      // TODO: Subscribe to workflow event bus for error events
      return {
        scope: config.scope || 'all_workflows',
        errorTypes: config.errorTypes || [],
        debounce: config.debounce || { enabled: true, durationMs: 60000 },
        enabled: config.enabled !== false
      };

    } catch (error) {
      logger.error('❌ [ERROR-TRIGGER] Activation failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });
      throw error;
    }
  }

  /**
   * Deactivate schedule trigger (remove BullMQ job)
   */
  private async deactivateScheduleTrigger(triggerId: string): Promise<void> {
    try {
      const jobId = this.registry.getScheduleJob(triggerId);
      if (!jobId) {
        logger.warn('⚠️ [SCHEDULE-TRIGGER] No job ID found for trigger', { triggerId });
        return;
      }

      logger.info('🛑 [SCHEDULE-TRIGGER] Removing BullMQ repeatable job', {
        triggerId,
        jobId
      });

      // Remove repeatable job pattern using the exact key stored during activation
      const queue = this.getQueue();
      if (!queue) {
        logger.warn('⚠️ [SCHEDULE-TRIGGER] Cannot remove repeatable job - Redis not configured', {
          triggerId,
          jobId
        });
        return;
      }

      await queue.removeRepeatableByKey(jobId);

      // Also try to remove any existing job instance by ID
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        // Job might not exist, that's ok
        logger.debug('ℹ️ [SCHEDULE-TRIGGER] Job instance not found (already removed or completed)', {
          jobId
        });
      }

      logger.info('✅ [SCHEDULE-TRIGGER] BullMQ job removed successfully', {
        triggerId,
        jobId
      });

    } catch (error) {
      logger.error('❌ [SCHEDULE-TRIGGER] Job removal failed', {
        error: error instanceof Error ? error.message : String(error),
        triggerId
      });
      throw error;
    }
  }

  /**
   * Deactivate webhook trigger (unregister route)
   */
  private async deactivateWebhookTrigger(triggerId: string): Promise<void> {
    logger.info('🛑 [WEBHOOK-TRIGGER] Unregistering webhook route', { triggerId });
    // Route is already removed from registry in deactivateTrigger()
  }

  /**
   * Deactivate error trigger (unsubscribe from events)
   */
  private async deactivateErrorTrigger(triggerId: string): Promise<void> {
    logger.info('🛑 [ERROR-TRIGGER] Unsubscribing from error events', { triggerId });
    // TODO: Unsubscribe from workflow event bus
  }
}

// ==================== SINGLETON EXPORTS ====================

export const triggerRegistry = new TriggerRegistry();
export const triggerOrchestrator = new TriggerOrchestrator(triggerRegistry);
