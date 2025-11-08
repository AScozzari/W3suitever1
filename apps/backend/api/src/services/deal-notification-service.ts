import { NotificationService } from '../core/notification-service';
import { db } from '../core/db';
import { eq } from 'drizzle-orm';
import { crmPipelineSettings, crmDeals } from '../db/schema/w3suite';
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
      // Check pipeline notification preferences
      const [settings] = await db
        .select()
        .from(crmPipelineSettings)
        .where(eq(crmPipelineSettings.pipelineId, params.pipelineId));

      if (!settings || !settings.notifyOnStageChange) {
        logger.debug('[DealNotificationService] Stage change notifications disabled for pipeline', {
          pipelineId: params.pipelineId
        });
        return;
      }

      // Determine recipients (owner + pipeline admins)
      const recipients = this.getRecipients(params.ownerUserId, settings.pipelineAdmins);

      // Send notification to each recipient
      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification({
            recipientId: userId,
            tenantId: params.tenantId,
            type: 'custom',
            priority: 'medium',
            category: 'sales',
            title: '📊 Deal Cambiato Stato',
            message: `La trattativa "${params.dealTitle}" è passata da "${params.fromStage}" a "${params.toStage}"`,
            actionUrl: `/crm/deals/${params.dealId}`,
            metadata: {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              fromStage: params.fromStage,
              toStage: params.toStage,
              eventType: 'deal_stage_change'
            }
          })
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
        .select()
        .from(crmPipelineSettings)
        .where(eq(crmPipelineSettings.pipelineId, params.pipelineId));

      if (!settings || !settings.notifyOnDealWon) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.pipelineAdmins);
      const valueText = params.value ? ` del valore di €${params.value.toLocaleString('it-IT')}` : '';

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification({
            recipientId: userId,
            tenantId: params.tenantId,
            type: 'custom',
            priority: 'high',
            category: 'sales',
            title: '🎉 Deal Vinto!',
            message: `Congratulazioni! La trattativa "${params.dealTitle}"${valueText} è stata vinta!`,
            actionUrl: `/crm/deals/${params.dealId}`,
            metadata: {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              value: params.value,
              eventType: 'deal_won'
            }
          })
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
        .select()
        .from(crmPipelineSettings)
        .where(eq(crmPipelineSettings.pipelineId, params.pipelineId));

      if (!settings || !settings.notifyOnDealLost) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.pipelineAdmins);
      const reasonText = params.lostReason ? ` (Motivo: ${params.lostReason})` : '';

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification({
            recipientId: userId,
            tenantId: params.tenantId,
            type: 'custom',
            priority: 'medium',
            category: 'sales',
            title: '❌ Deal Perso',
            message: `La trattativa "${params.dealTitle}" è stata persa${reasonText}`,
            actionUrl: `/crm/deals/${params.dealId}`,
            metadata: {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              lostReason: params.lostReason,
              eventType: 'deal_lost'
            }
          })
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
        .select()
        .from(crmPipelineSettings)
        .where(eq(crmPipelineSettings.pipelineId, params.pipelineId));

      if (!settings || !settings.notifyOnDealRotten) {
        return;
      }

      const recipients = this.getRecipients(params.ownerUserId, settings.pipelineAdmins);

      await Promise.all(
        recipients.map(userId =>
          this.notificationService.sendNotification({
            recipientId: userId,
            tenantId: params.tenantId,
            type: 'custom',
            priority: 'medium',
            category: 'sales',
            title: '⚠️ Trattativa Stagnante',
            message: `La trattativa "${params.dealTitle}" non ha attività da ${params.daysSinceActivity} giorni`,
            actionUrl: `/crm/deals/${params.dealId}`,
            metadata: {
              dealId: params.dealId,
              pipelineId: params.pipelineId,
              daysSinceActivity: params.daysSinceActivity,
              eventType: 'deal_stale'
            }
          })
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
