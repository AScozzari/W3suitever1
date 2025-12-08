import { NotificationService } from '../core/notification-service';
import { db } from '../core/db';
import { eq, and } from 'drizzle-orm';
import { crmPipelineSettings, crmDeals, crmPipelines } from '../db/schema/w3suite';
import { logger } from '../core/logger';

/**
 * Deal Notification Service
 * Sends in-app notifications for CRM deal events based on pipeline preferences
 */
export class DealNotificationService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Notify when deal changes stage
   */
  async notifyStateChange(params: {
    dealId: string;
    tenantId: string;
    pipelineId: string;
    fromStage: string;
    toStage: string;
    dealTitle: string;
    ownerUserId?: string;
    assignedTeamId?: string;
  }): Promise<void> {
    try {
      // Check pipeline notification preferences (with tenant isolation via pipeline join)
      const [settings] = await db
        .select({ settings: crmPipelineSettings })
        .from(crmPipelineSettings)
        .innerJoin(crmPipelines, eq(crmPipelineSettings.pipelineId, crmPipelines.id))
        .where(
          and(
            eq(crmPipelineSettings.pipelineId, params.pipelineId),
            eq(crmPipelines.tenantId, params.tenantId)
          )
        );

      if (!settings?.settings || !settings.settings.notifyOnStageChange) {
        logger.debug('[DealNotificationService] Stage change notifications disabled for pipeline', {
          pipelineId: params.pipelineId
        });
        return;
      }

      // Determine recipients (owner + pipeline admins)
      const recipients = this.getRecipients(params.ownerUserId, settings.settings.pipelineAdmins as string[] | undefined);

      // Send notification to each recipient
      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification(
            params.tenantId,
            userId,
            '📊 Deal Cambiato Stato',
            `La trattativa "${params.dealTitle}" è passata da "${params.fromStage}" a "${params.toStage}"`,
            { priority: 'medium', url: `/crm/deals/${params.dealId}` },
            undefined,
            {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              fromStage: params.fromStage,
              toStage: params.toStage,
              eventType: 'deal_stage_change'
            }
          )
        )
      );

      logger.info('[DealNotificationService] Stage change notifications sent', {
        dealId: params.dealId,
        recipientCount: recipients.length
      });
    } catch (error) {
      logger.error('[DealNotificationService] Error sending stage change notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dealId: params.dealId
      });
    }
  }

  /**
   * Notify when deal is won
   */
  async notifyDealWon(params: {
    dealId: string;
    tenantId: string;
    pipelineId: string;
    dealTitle: string;
    value?: number;
    ownerUserId?: string;
    assignedTeamId?: string;
  }): Promise<void> {
    try {
      const [settings] = await db
        .select({ settings: crmPipelineSettings })
        .from(crmPipelineSettings)
        .innerJoin(crmPipelines, eq(crmPipelineSettings.pipelineId, crmPipelines.id))
        .where(
          and(
            eq(crmPipelineSettings.pipelineId, params.pipelineId),
            eq(crmPipelines.tenantId, params.tenantId)
          )
        );

      if (!settings?.settings || !settings.settings.notifyOnDealWon) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.settings.pipelineAdmins as string[] | undefined);
      const valueText = params.value ? ` del valore di €${params.value.toLocaleString('it-IT')}` : '';

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification(
            params.tenantId,
            userId,
            '🎉 Deal Vinto!',
            `Congratulazioni! La trattativa "${params.dealTitle}"${valueText} è stata vinta!`,
            { priority: 'high', url: `/crm/deals/${params.dealId}` },
            undefined,
            {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              value: params.value,
              eventType: 'deal_won'
            }
          )
        )
      );

      logger.info('[DealNotificationService] Deal won notifications sent', {
        dealId: params.dealId,
        recipientCount: recipients.length
      });
    } catch (error) {
      logger.error('[DealNotificationService] Error sending deal won notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dealId: params.dealId
      });
    }
  }

  /**
   * Notify when deal is lost
   */
  async notifyDealLost(params: {
    dealId: string;
    tenantId: string;
    pipelineId: string;
    dealTitle: string;
    lostReason?: string;
    ownerUserId?: string;
    assignedTeamId?: string;
  }): Promise<void> {
    try {
      const [settings] = await db
        .select({ settings: crmPipelineSettings })
        .from(crmPipelineSettings)
        .innerJoin(crmPipelines, eq(crmPipelineSettings.pipelineId, crmPipelines.id))
        .where(
          and(
            eq(crmPipelineSettings.pipelineId, params.pipelineId),
            eq(crmPipelines.tenantId, params.tenantId)
          )
        );

      if (!settings?.settings || !settings.settings.notifyOnDealLost) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.settings.pipelineAdmins as string[] | undefined);
      const reasonText = params.lostReason ? ` (Motivo: ${params.lostReason})` : '';

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification(
            params.tenantId,
            userId,
            '❌ Deal Perso',
            `La trattativa "${params.dealTitle}" è stata persa${reasonText}`,
            { priority: 'medium', url: `/crm/deals/${params.dealId}` },
            undefined,
            {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              lostReason: params.lostReason,
              eventType: 'deal_lost'
            }
          )
        )
      );

      logger.info('[DealNotificationService] Deal lost notifications sent', {
        dealId: params.dealId,
        recipientCount: recipients.length
      });
    } catch (error) {
      logger.error('[DealNotificationService] Error sending deal lost notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dealId: params.dealId
      });
    }
  }

  /**
   * Notify when deal becomes stale/rotten
   */
  async notifyDealStale(params: {
    dealId: string;
    tenantId: string;
    pipelineId: string;
    dealTitle: string;
    daysSinceActivity: number;
    ownerUserId?: string;
    assignedTeamId?: string;
  }): Promise<void> {
    try {
      const [settings] = await db
        .select({ settings: crmPipelineSettings })
        .from(crmPipelineSettings)
        .innerJoin(crmPipelines, eq(crmPipelineSettings.pipelineId, crmPipelines.id))
        .where(
          and(
            eq(crmPipelineSettings.pipelineId, params.pipelineId),
            eq(crmPipelines.tenantId, params.tenantId)
          )
        );

      if (!settings?.settings || !settings.settings.notifyOnDealRotten) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.settings.pipelineAdmins as string[] | undefined);

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification(
            params.tenantId,
            userId,
            '⚠️ Trattativa Stagnante',
            `La trattativa "${params.dealTitle}" non ha attività da ${params.daysSinceActivity} giorni`,
            { priority: 'medium', url: `/crm/deals/${params.dealId}` },
            undefined,
            {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              daysSinceActivity: params.daysSinceActivity,
              eventType: 'deal_stale'
            }
          )
        )
      );

      logger.info('[DealNotificationService] Deal stale notifications sent', {
        dealId: params.dealId,
        recipientCount: recipients.length
      });
    } catch (error) {
      logger.error('[DealNotificationService] Error sending deal stale notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dealId: params.dealId
      });
    }
  }

  /**
   * Get list of recipients for notifications
   * Includes deal owner and pipeline admins
   */
  private getRecipients(ownerUserId?: string, pipelineAdmins?: string[]): string[] {
    const recipients = new Set<string>();

    if (ownerUserId) {
      recipients.add(ownerUserId);
    }

    if (pipelineAdmins && pipelineAdmins.length > 0) {
      pipelineAdmins.forEach(adminId => recipients.add(adminId));
    }

    return Array.from(recipients);
  }
}

// Export singleton instance
export const dealNotificationService = new DealNotificationService();
