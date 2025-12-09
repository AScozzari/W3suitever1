/**
 * 🏭 WMS WORKFLOW SERVICE
 * 
 * Gestisce l'integrazione tra movimenti stock WMS e il sistema workflow.
 * Quando un movimento richiede approvazione (requires_approval = true),
 * questo servizio:
 * 1. Crea un'istanza workflow dal template configurato
 * 2. Imposta il movimento in status 'pending_approval'
 * 3. Notifica i supervisori appropriati
 * 4. Gestisce i callback di approvazione/rifiuto
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  wmsMovementTypeConfig,
  wmsStockMovements,
  workflowTemplates,
  workflowInstances,
  stores,
  users
} from '../db/schema/w3suite';
import { notificationService } from '../notification-service';
import { logger } from '../logger';

export interface WmsWorkflowContext {
  tenantId: string;
  storeId: string;
  userId: string;
  movementId: string;
  movementType: string;
  movementDirection: 'inbound' | 'outbound' | 'internal';
  productName?: string;
  quantity: number;
}

export interface MovementApprovalResult {
  requiresApproval: boolean;
  workflowInstanceId?: string;
  supervisorIds?: string[];
  message: string;
}

class WmsWorkflowService {
  
  /**
   * 🔍 Verifica se un tipo di movimento richiede approvazione
   */
  async checkApprovalRequired(
    tenantId: string,
    movementType: string
  ): Promise<{ requiresApproval: boolean; workflowTemplateId: string | null; config: any | null }> {
    try {
      const [config] = await db
        .select()
        .from(wmsMovementTypeConfig)
        .where(
          and(
            eq(wmsMovementTypeConfig.tenantId, tenantId),
            eq(wmsMovementTypeConfig.movementType, movementType as any)
          )
        )
        .limit(1);

      if (!config) {
        logger.info('📦 [WMS-WORKFLOW] No config found for movement type, using defaults', {
          tenantId,
          movementType
        });
        return { requiresApproval: false, workflowTemplateId: null, config: null };
      }

      return {
        requiresApproval: config.requiresApproval,
        workflowTemplateId: config.workflowTemplateId,
        config
      };
    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error checking approval requirement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        movementType
      });
      return { requiresApproval: false, workflowTemplateId: null, config: null };
    }
  }

  /**
   * 🚀 Triggera il workflow di approvazione per un movimento
   */
  async triggerApprovalWorkflow(context: WmsWorkflowContext): Promise<MovementApprovalResult> {
    try {
      logger.info('🚀 [WMS-WORKFLOW] Triggering approval workflow for movement', {
        movementId: context.movementId,
        movementType: context.movementType,
        tenantId: context.tenantId
      });

      // 1. Verifica configurazione movimento
      const { requiresApproval, workflowTemplateId, config } = await this.checkApprovalRequired(
        context.tenantId,
        context.movementType
      );

      if (!requiresApproval) {
        return {
          requiresApproval: false,
          message: 'Questo tipo di movimento non richiede approvazione'
        };
      }

      // 2. Aggiorna status movimento a 'pending_approval'
      await db
        .update(wmsStockMovements)
        .set({
          status: 'pending_approval',
          updatedAt: new Date()
        })
        .where(eq(wmsStockMovements.id, context.movementId));

      // 3. Trova supervisori del negozio
      const supervisorIds = await this.findStoreSupervisors(context.tenantId, context.storeId);

      // 4. Se c'è un workflow template configurato, crea istanza
      let workflowInstanceId: string | undefined;
      if (workflowTemplateId) {
        workflowInstanceId = await this.createWorkflowInstance(
          context,
          workflowTemplateId,
          supervisorIds
        );
      }

      // 5. Invia notifiche ai supervisori
      await this.notifySupervisors(context, supervisorIds, config);

      logger.info('✅ [WMS-WORKFLOW] Approval workflow triggered successfully', {
        movementId: context.movementId,
        workflowInstanceId,
        supervisorCount: supervisorIds.length
      });

      return {
        requiresApproval: true,
        workflowInstanceId,
        supervisorIds,
        message: `Movimento in attesa di approvazione. ${supervisorIds.length} supervisore(i) notificato(i).`
      };

    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error triggering approval workflow', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      });
      throw error;
    }
  }

  /**
   * 👥 Trova i supervisori del negozio per le notifiche
   */
  private async findStoreSupervisors(tenantId: string, storeId: string): Promise<string[]> {
    try {
      // Trova utenti con ruolo supervisor/manager associati al negozio
      const supervisors = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.storeId, storeId),
            eq(users.isActive, true)
          )
        );

      // Filtra per ruoli di supervisione (manager, supervisor, admin, store_manager)
      const supervisorRoles = ['admin', 'manager', 'supervisor', 'store_manager', 'wms_manager'];
      
      const filteredSupervisors = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.storeId, storeId),
            eq(users.isActive, true)
          )
        );

      const supervisorIds = filteredSupervisors
        .filter(u => u.role && supervisorRoles.includes(u.role.toLowerCase()))
        .map(u => u.id);

      // Se non trova supervisori specifici, cerca admin del tenant
      if (supervisorIds.length === 0) {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.role, 'admin'),
              eq(users.isActive, true)
            )
          )
          .limit(3);
        
        return admins.map(a => a.id);
      }

      return supervisorIds;
    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error finding store supervisors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        storeId
      });
      return [];
    }
  }

  /**
   * 📋 Crea istanza workflow dal template
   */
  private async createWorkflowInstance(
    context: WmsWorkflowContext,
    templateId: string,
    assigneeIds: string[]
  ): Promise<string | undefined> {
    try {
      // Verifica che il template esista e sia attivo
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.id, templateId),
            eq(workflowTemplates.tenantId, context.tenantId),
            eq(workflowTemplates.isActive, true)
          )
        )
        .limit(1);

      if (!template) {
        logger.warn('⚠️ [WMS-WORKFLOW] Workflow template not found or inactive', {
          templateId,
          tenantId: context.tenantId
        });
        return undefined;
      }

      // Crea istanza workflow
      const movementLabel = this.getMovementLabel(context.movementType);
      const instanceName = `${movementLabel} - Approvazione #${context.movementId.slice(-8)}`;

      const [instance] = await db
        .insert(workflowInstances)
        .values({
          tenantId: context.tenantId,
          templateId,
          category: 'wms',
          referenceId: context.movementId,
          instanceType: 'wms_approval',
          instanceName,
          currentStatus: 'running',
          workflowData: {
            currentAssigneeId: assigneeIds[0] || null,
            allAssigneeIds: assigneeIds,
            templateName: template.name,
            movementId: context.movementId,
            movementType: context.movementType,
            movementDirection: context.movementDirection,
            storeId: context.storeId,
            quantity: context.quantity,
            productName: context.productName,
            priority: 'normal',
            routingType: 'first_wins'
          },
          context: {
            source: 'wms_movement',
            movementId: context.movementId,
            requesterId: context.userId,
            storeId: context.storeId
          },
          startedAt: new Date()
        })
        .returning();

      logger.info('📋 [WMS-WORKFLOW] Workflow instance created', {
        instanceId: instance.id,
        templateId,
        movementId: context.movementId
      });

      return instance.id;

    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error creating workflow instance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateId,
        movementId: context.movementId
      });
      return undefined;
    }
  }

  /**
   * 🔔 Invia notifiche ai supervisori
   */
  private async notifySupervisors(
    context: WmsWorkflowContext,
    supervisorIds: string[],
    config: any
  ): Promise<void> {
    if (supervisorIds.length === 0) {
      logger.warn('⚠️ [WMS-WORKFLOW] No supervisors found for notification', {
        movementId: context.movementId,
        storeId: context.storeId
      });
      return;
    }

    const movementLabel = this.getMovementLabel(context.movementType);
    const directionLabel = context.movementDirection === 'inbound' ? 'Entrata' :
                          context.movementDirection === 'outbound' ? 'Uscita' : 'Interno';

    const title = `🏭 Approvazione Movimento WMS Richiesta`;
    const message = `Nuovo movimento "${movementLabel}" (${directionLabel}) da approvare.\n` +
                   `Quantità: ${context.quantity}` +
                   (context.productName ? `\nProdotto: ${context.productName}` : '');

    for (const supervisorId of supervisorIds) {
      try {
        await notificationService.sendNotification(
          context.tenantId,
          supervisorId,
          title,
          message,
          'wms_approval',
          'high',
          {
            movementId: context.movementId,
            movementType: context.movementType,
            actionRequired: 'approve_or_reject',
            storeId: context.storeId,
            quantity: context.quantity
          }
        );
      } catch (error) {
        logger.error('❌ [WMS-WORKFLOW] Error sending notification to supervisor', {
          error: error instanceof Error ? error.message : 'Unknown error',
          supervisorId,
          movementId: context.movementId
        });
      }
    }

    logger.info('🔔 [WMS-WORKFLOW] Notifications sent to supervisors', {
      movementId: context.movementId,
      supervisorCount: supervisorIds.length
    });
  }

  /**
   * ✅ Approva un movimento
   */
  async approveMovement(
    movementId: string,
    approverId: string,
    tenantId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('✅ [WMS-WORKFLOW] Approving movement', {
        movementId,
        approverId
      });

      // Verifica che il movimento esista e sia in pending_approval
      const [movement] = await db
        .select()
        .from(wmsStockMovements)
        .where(
          and(
            eq(wmsStockMovements.id, movementId),
            eq(wmsStockMovements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!movement) {
        return { success: false, message: 'Movimento non trovato' };
      }

      if (movement.status !== 'pending_approval') {
        return { success: false, message: `Movimento non in attesa di approvazione (status: ${movement.status})` };
      }

      // Aggiorna status a 'approved'
      await db
        .update(wmsStockMovements)
        .set({
          status: 'approved',
          approvedBy: approverId,
          approvedAt: new Date(),
          approvalNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(wmsStockMovements.id, movementId));

      // Aggiorna workflow instance se esiste
      await db
        .update(workflowInstances)
        .set({
          currentStatus: 'completed',
          completedAt: new Date(),
          workflowData: {
            approvedBy: approverId,
            approvedAt: new Date().toISOString(),
            approvalNotes: notes
          }
        })
        .where(
          and(
            eq(workflowInstances.referenceId, movementId),
            eq(workflowInstances.tenantId, tenantId)
          )
        );

      // Notifica il creatore del movimento
      if (movement.createdBy) {
        await notificationService.sendNotification(
          tenantId,
          movement.createdBy,
          '✅ Movimento WMS Approvato',
          `Il tuo movimento "${this.getMovementLabel(movement.movementType)}" è stato approvato.`,
          'wms_approval_result',
          'normal',
          {
            movementId,
            status: 'approved',
            approverId
          }
        );
      }

      logger.info('✅ [WMS-WORKFLOW] Movement approved successfully', {
        movementId,
        approverId
      });

      return { success: true, message: 'Movimento approvato con successo' };

    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error approving movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId
      });
      return { success: false, message: 'Errore durante l\'approvazione' };
    }
  }

  /**
   * ❌ Rifiuta un movimento
   */
  async rejectMovement(
    movementId: string,
    rejecterId: string,
    tenantId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('❌ [WMS-WORKFLOW] Rejecting movement', {
        movementId,
        rejecterId,
        reason
      });

      // Verifica che il movimento esista e sia in pending_approval
      const [movement] = await db
        .select()
        .from(wmsStockMovements)
        .where(
          and(
            eq(wmsStockMovements.id, movementId),
            eq(wmsStockMovements.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!movement) {
        return { success: false, message: 'Movimento non trovato' };
      }

      if (movement.status !== 'pending_approval') {
        return { success: false, message: `Movimento non in attesa di approvazione (status: ${movement.status})` };
      }

      // Aggiorna status a 'rejected'
      await db
        .update(wmsStockMovements)
        .set({
          status: 'rejected',
          rejectedBy: rejecterId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(wmsStockMovements.id, movementId));

      // Aggiorna workflow instance se esiste
      await db
        .update(workflowInstances)
        .set({
          currentStatus: 'failed',
          completedAt: new Date(),
          workflowData: {
            rejectedBy: rejecterId,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason
          }
        })
        .where(
          and(
            eq(workflowInstances.referenceId, movementId),
            eq(workflowInstances.tenantId, tenantId)
          )
        );

      // Notifica il creatore del movimento
      if (movement.createdBy) {
        await notificationService.sendNotification(
          tenantId,
          movement.createdBy,
          '❌ Movimento WMS Rifiutato',
          `Il tuo movimento "${this.getMovementLabel(movement.movementType)}" è stato rifiutato.\nMotivo: ${reason}`,
          'wms_approval_result',
          'high',
          {
            movementId,
            status: 'rejected',
            rejecterId,
            reason
          }
        );
      }

      logger.info('❌ [WMS-WORKFLOW] Movement rejected successfully', {
        movementId,
        rejecterId,
        reason
      });

      return { success: true, message: 'Movimento rifiutato' };

    } catch (error) {
      logger.error('❌ [WMS-WORKFLOW] Error rejecting movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId
      });
      return { success: false, message: 'Errore durante il rifiuto' };
    }
  }

  /**
   * 🏷️ Ottiene label italiano per il tipo di movimento
   */
  private getMovementLabel(movementType: string): string {
    const labels: Record<string, string> = {
      'purchase': 'Acquisto',
      'customer_return': 'Reso Cliente',
      'transfer_in': 'Trasferimento Entrata',
      'warranty_return': 'Rientro Garanzia',
      'trade_in': 'Permuta (Trade-in)',
      'sale': 'Vendita',
      'supplier_return': 'Reso a Fornitore',
      'transfer_out': 'Trasferimento Uscita',
      'doa': 'DOA',
      'pullback': 'Pullback',
      'loan': 'Comodato d\'uso',
      'adjustment': 'Rettifica Inventario',
      'damage': 'Danneggiamento',
      'demo': 'Uso Demo',
      'internal_use': 'Uso Interno'
    };
    return labels[movementType] || movementType;
  }
}

export const wmsWorkflowService = new WmsWorkflowService();
