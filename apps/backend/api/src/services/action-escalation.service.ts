/**
 * 🚨 ACTION ESCALATION SERVICE
 * 
 * Gestisce l'escalation automatica delle richieste di approvazione:
 * - Dopo SLA ore (default 24h) senza risposta, abilita observers all'approvazione
 * - Invia reminder ai supervisori
 * - Scheduler automatico con node-cron (ogni 15 minuti)
 */

import cron from 'node-cron';
import { db } from '../core/db';
import { eq, and, lt, isNull, sql } from 'drizzle-orm';
import { 
  actionConfigurations,
  workflowInstances,
  users
} from '../db/schema/w3suite';
import { notificationService } from '../core/notification-service';
import { logger } from '../core/logger';

interface EscalatedRequest {
  instanceId: string;
  tenantId: string;
  department: string;
  actionId: string;
  entityType: string;
  entityId: string;
  triggeredById: string;
  createdAt: Date;
  slaHours: number;
  observers: string[];
}

class ActionEscalationService {
  private isInitialized = false;
  private scheduledJob: cron.ScheduledTask | null = null;

  initialize(): void {
    if (this.isInitialized) {
      logger.info('🚨 [ESCALATION] Service already initialized');
      return;
    }

    logger.info('🚨 [ESCALATION] Initializing escalation scheduler...');

    this.scheduledJob = cron.schedule('*/15 * * * *', async () => {
      logger.info('🚨 [ESCALATION] Running escalation check...');
      try {
        await this.processEscalations();
      } catch (error) {
        logger.error('❌ [ESCALATION] Error processing escalations', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, {
      timezone: 'Europe/Rome'
    });

    this.isInitialized = true;
    logger.info('✅ [ESCALATION] Scheduler initialized - runs every 15 minutes');
  }

  async processEscalations(): Promise<{ processed: number; escalated: number }> {
    try {
      const now = new Date();
      let processed = 0;
      let escalated = 0;

      const pendingInstances = await db
        .select({
          id: workflowInstances.id,
          tenantId: workflowInstances.tenantId,
          status: workflowInstances.status,
          createdAt: workflowInstances.createdAt,
          triggeredById: workflowInstances.triggeredBy,
          currentStepData: workflowInstances.currentStepData,
          entityType: workflowInstances.entityType,
          entityId: workflowInstances.entityId
        })
        .from(workflowInstances)
        .where(
          and(
            eq(workflowInstances.status, 'pending'),
            isNull(workflowInstances.completedAt)
          )
        )
        .limit(100);

      for (const instance of pendingInstances) {
        processed++;

        const stepData = instance.currentStepData as any || {};
        const department = stepData.department || 'general';
        const actionId = stepData.actionId || 'unknown';
        const alreadyEscalated = stepData.escalated === true;

        if (alreadyEscalated) {
          logger.debug('⏭️ [ESCALATION] Skipping already escalated request', { instanceId: instance.id });
          continue;
        }

        const [config] = await db
          .select()
          .from(actionConfigurations)
          .where(
            and(
              eq(actionConfigurations.tenantId, instance.tenantId!),
              eq(actionConfigurations.department, department as any),
              eq(actionConfigurations.actionId, actionId)
            )
          )
          .limit(1);

        const slaHours = config?.slaHours || 24;
        const createdAt = new Date(instance.createdAt!);
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation >= slaHours) {
          await this.escalateRequest(instance.id, stepData);
          escalated++;

          logger.info('🚨 [ESCALATION] Request escalated', {
            instanceId: instance.id,
            hoursSinceCreation: Math.round(hoursSinceCreation),
            slaHours,
            department,
            actionId
          });
        }
      }

      logger.info('✅ [ESCALATION] Escalation check complete', {
        processed,
        escalated
      });

      return { processed, escalated };

    } catch (error) {
      logger.error('❌ [ESCALATION] Error in processEscalations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async escalateRequest(instanceId: string, stepData: any): Promise<void> {
    try {
      const updatedStepData = {
        ...stepData,
        escalated: true,
        escalatedAt: new Date().toISOString(),
        observersCanApprove: true
      };

      await db
        .update(workflowInstances)
        .set({
          currentStepData: updatedStepData,
          updatedAt: new Date()
        })
        .where(eq(workflowInstances.id, instanceId));

      const supervisorIds = [
        stepData.primarySupervisorId,
        stepData.secondarySupervisorId,
        ...(stepData.observerIds || [])
      ].filter(Boolean);

      for (const userId of supervisorIds) {
        try {
          await notificationService.send({
            tenantId: stepData.tenantId || '',
            userId,
            title: '⏰ Richiesta in attesa - Escalation',
            message: `La richiesta "${stepData.actionName || stepData.actionId}" è in attesa da più di ${stepData.slaHours || 24}h. Richiesta attenzione immediata.`,
            type: 'reminder',
            priority: 'high',
            actionUrl: `/tasks?instance=${instanceId}`,
            metadata: {
              instanceId,
              escalated: true,
              actionId: stepData.actionId,
              department: stepData.department
            }
          });
        } catch (notifyError) {
          logger.warn('⚠️ [ESCALATION] Failed to send reminder notification', {
            userId,
            instanceId,
            error: notifyError instanceof Error ? notifyError.message : 'Unknown'
          });
        }
      }

    } catch (error) {
      logger.error('❌ [ESCALATION] Error escalating request', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async runManualCheck(): Promise<{ processed: number; escalated: number }> {
    logger.info('🚨 [ESCALATION] Manual escalation check triggered');
    return await this.processEscalations();
  }

  stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      this.isInitialized = false;
      logger.info('🛑 [ESCALATION] Scheduler stopped');
    }
  }
}

export const actionEscalationService = new ActionEscalationService();
