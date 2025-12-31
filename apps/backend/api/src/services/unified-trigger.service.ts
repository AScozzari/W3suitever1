/**
 * 🎯 UNIFIED TRIGGER SERVICE
 * 
 * Servizio centralizzato per gestire trigger di azioni con routing intelligente.
 * Questo servizio unifica tutti i trigger (WMS, HR, CRM, Finance, etc.) e decide:
 * 
 * 1. Se l'azione richiede approvazione
 * 2. Se usare flusso default (notifica supervisori) o workflow specifico
 * 3. Chi notificare (primary supervisor, secondary supervisor, observers)
 * 4. Come gestire escalation (24h → observers possono approvare)
 * 
 * Pattern: Azione → UnifiedTriggerService → (Workflow | Notifica Supervisori)
 */

import { db } from '../core/db';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  actionConfigurations,
  teams,
  userTeams,
  teamObservers,
  universalRequests,
  workflowTemplates,
  users
} from '../db/schema/w3suite';
import { notificationService } from '../core/notification-service';
import { WorkflowEngine } from './workflow-engine';
import { logger } from '../core/logger';

// ==================== INTERFACES ====================

export interface TriggerContext {
  tenantId: string;
  userId: string;
  department: string;
  actionId: string;
  storeId?: string;
  organizationEntityId?: string;
  requestId?: string;
  context: Record<string, any>;
}

export interface TriggerResult {
  success: boolean;
  flowType: 'none' | 'default' | 'workflow';
  message: string;
  workflowInstanceId?: string;
  notifiedUsers?: string[];
  requestId?: string;
  teamId?: string;
}

export interface TeamSupervisors {
  teamId: string;
  teamName: string;
  primarySupervisorId: string | null;
  secondarySupervisorId: string | null;
  observerIds: string[];
}

// ==================== UNIFIED TRIGGER SERVICE ====================

class UnifiedTriggerService {
  
  /**
   * 🚀 MAIN ENTRY POINT: Triggera un'azione con routing intelligente
   * 
   * 1. Trova la configurazione dell'azione per department + actionId
   * 2. Determina il team dell'utente per quel department
   * 3. Se flowType = 'none' → nessuna azione
   * 4. Se flowType = 'default' → notifica supervisori team
   * 5. Se flowType = 'workflow' → avvia workflow instance
   */
  async trigger(ctx: TriggerContext): Promise<TriggerResult> {
    try {
      logger.info('🎯 [UNIFIED-TRIGGER] Processing action trigger', {
        department: ctx.department,
        actionId: ctx.actionId,
        userId: ctx.userId,
        tenantId: ctx.tenantId
      });

      // 1. Trova configurazione azione
      const actionConfig = await this.getActionConfiguration(
        ctx.tenantId,
        ctx.department,
        ctx.actionId
      );

      if (!actionConfig) {
        logger.info('📝 [UNIFIED-TRIGGER] No action configuration found, using default behavior', {
          department: ctx.department,
          actionId: ctx.actionId
        });
        // Default: se non c'è configurazione, usa flusso default
        return await this.handleDefaultFlow(ctx);
      }

      // 2. Se non richiede approvazione, nessuna azione
      if (!actionConfig.requiresApproval) {
        logger.info('✅ [UNIFIED-TRIGGER] Action does not require approval, proceeding directly');
        return {
          success: true,
          flowType: 'none',
          message: 'Azione eseguita direttamente senza approvazione'
        };
      }

      // 3. Trova team dell'utente per questo department
      const teamSupervisors = await this.findUserTeamSupervisors(
        ctx.tenantId,
        ctx.userId,
        ctx.department
      );

      if (!teamSupervisors) {
        logger.warn('⚠️ [UNIFIED-TRIGGER] No team found for user in department', {
          userId: ctx.userId,
          department: ctx.department
        });
        // Fallback: cerca admin tenant
        return await this.handleNoTeamFallback(ctx);
      }

      // 4. Verifica scope team se configurazione specifica
      if (actionConfig.teamScope === 'specific' && actionConfig.specificTeamIds) {
        const teamIds = actionConfig.specificTeamIds as string[];
        if (!teamIds.includes(teamSupervisors.teamId)) {
          logger.info('📝 [UNIFIED-TRIGGER] Team not in specific scope, using default flow');
          return await this.handleDefaultFlowWithSupervisors(ctx, teamSupervisors);
        }
      }

      // 5. Route in base a flowType
      switch (actionConfig.flowType) {
        case 'workflow':
          return await this.handleWorkflowFlow(ctx, actionConfig, teamSupervisors);
        
        case 'default':
          return await this.handleDefaultFlowWithSupervisors(ctx, teamSupervisors);
        
        case 'none':
        default:
          return {
            success: true,
            flowType: 'none',
            message: 'Azione non richiede flusso di approvazione'
          };
      }

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error processing trigger', {
        error: error instanceof Error ? error.message : 'Unknown error',
        context: ctx
      });
      throw error;
    }
  }

  /**
   * 📋 Recupera configurazione azione per department + actionId
   */
  async getActionConfiguration(
    tenantId: string,
    department: string,
    actionId: string
  ) {
    try {
      const [config] = await db
        .select()
        .from(actionConfigurations)
        .where(
          and(
            eq(actionConfigurations.tenantId, tenantId),
            eq(actionConfigurations.department, department as any),
            eq(actionConfigurations.actionId, actionId),
            eq(actionConfigurations.isActive, true)
          )
        )
        .limit(1);

      return config || null;
    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error getting action configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        department,
        actionId
      });
      return null;
    }
  }

  /**
   * 👥 Trova supervisori del team dell'utente per department specifico
   * 
   * Cerca:
   * 1. Team primario dell'utente per quel department (isPrimary = true)
   * 2. Estrae primarySupervisorId, secondarySupervisorId
   * 3. Estrae observers dalla tabella team_observers
   */
  async findUserTeamSupervisors(
    tenantId: string,
    userId: string,
    department: string
  ): Promise<TeamSupervisors | null> {
    try {
      // Trova team primario dell'utente per questo department
      const [userTeam] = await db
        .select({
          teamId: userTeams.teamId,
          isPrimary: userTeams.isPrimary
        })
        .from(userTeams)
        .innerJoin(teams, eq(teams.id, userTeams.teamId))
        .where(
          and(
            eq(userTeams.userId, userId),
            eq(teams.tenantId, tenantId),
            eq(teams.departmentId, department),
            eq(userTeams.isPrimary, true),
            eq(userTeams.isActive, true),
            eq(teams.isActive, true)
          )
        )
        .limit(1);

      if (!userTeam) {
        // Prova a trovare qualsiasi team per questo department
        const [anyTeam] = await db
          .select({
            teamId: userTeams.teamId
          })
          .from(userTeams)
          .innerJoin(teams, eq(teams.id, userTeams.teamId))
          .where(
            and(
              eq(userTeams.userId, userId),
              eq(teams.tenantId, tenantId),
              eq(teams.departmentId, department),
              eq(userTeams.isActive, true),
              eq(teams.isActive, true)
            )
          )
          .limit(1);

        if (!anyTeam) {
          return null;
        }
        
        return await this.getTeamSupervisors(anyTeam.teamId);
      }

      return await this.getTeamSupervisors(userTeam.teamId);

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error finding user team supervisors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        department
      });
      return null;
    }
  }

  /**
   * 👥 Recupera supervisori e observers di un team
   */
  async getTeamSupervisors(teamId: string): Promise<TeamSupervisors | null> {
    try {
      const [team] = await db
        .select({
          id: teams.id,
          name: teams.name,
          primarySupervisorId: teams.primarySupervisorId,
          secondarySupervisorId: teams.secondarySupervisorId
        })
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      if (!team) return null;

      // Recupera observers (can_approve = true significa che possono approvare dopo escalation 24h)
      const observers = await db
        .select({ observerId: teamObservers.userId })
        .from(teamObservers)
        .where(
          and(
            eq(teamObservers.teamId, teamId),
            eq(teamObservers.canApprove, true)
          )
        );

      return {
        teamId: team.id,
        teamName: team.name,
        primarySupervisorId: team.primarySupervisorId,
        secondarySupervisorId: team.secondarySupervisorId,
        observerIds: observers.map(o => o.observerId)
      };

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error getting team supervisors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId
      });
      return null;
    }
  }

  /**
   * 📧 FLUSSO DEFAULT: Notifica supervisori (primary + secondary + observers)
   * Pattern: First Wins - chi approva prima chiude la richiesta
   */
  async handleDefaultFlow(ctx: TriggerContext): Promise<TriggerResult> {
    const teamSupervisors = await this.findUserTeamSupervisors(
      ctx.tenantId,
      ctx.userId,
      ctx.department
    );

    if (!teamSupervisors) {
      return await this.handleNoTeamFallback(ctx);
    }

    return await this.handleDefaultFlowWithSupervisors(ctx, teamSupervisors);
  }

  /**
   * 📧 Gestisce flusso default con supervisori noti
   */
  async handleDefaultFlowWithSupervisors(
    ctx: TriggerContext,
    supervisors: TeamSupervisors
  ): Promise<TriggerResult> {
    try {
      // Raccogli tutti gli utenti da notificare
      const notifyUsers: string[] = [];
      
      if (supervisors.primarySupervisorId) {
        notifyUsers.push(supervisors.primarySupervisorId);
      }
      if (supervisors.secondarySupervisorId) {
        notifyUsers.push(supervisors.secondarySupervisorId);
      }
      // Observers ricevono notifica ma inizialmente NON possono approvare
      // Dopo 24h escalation, anche loro possono approvare
      notifyUsers.push(...supervisors.observerIds);

      // Rimuovi duplicati
      const uniqueUsers = [...new Set(notifyUsers)];

      if (uniqueUsers.length === 0) {
        logger.warn('⚠️ [UNIFIED-TRIGGER] No supervisors to notify');
        return {
          success: false,
          flowType: 'default',
          message: 'Nessun supervisore disponibile per approvazione',
          teamId: supervisors.teamId
        };
      }

      // Invia notifiche
      await this.sendApprovalNotifications(ctx, uniqueUsers, supervisors);

      logger.info('✅ [UNIFIED-TRIGGER] Default flow notifications sent', {
        notifiedCount: uniqueUsers.length,
        teamId: supervisors.teamId
      });

      return {
        success: true,
        flowType: 'default',
        message: `Richiesta inviata a ${uniqueUsers.length} supervisore(i) per approvazione`,
        notifiedUsers: uniqueUsers,
        teamId: supervisors.teamId,
        requestId: ctx.requestId
      };

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error handling default flow', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 🔄 FLUSSO WORKFLOW: Avvia istanza workflow
   */
  async handleWorkflowFlow(
    ctx: TriggerContext,
    actionConfig: any,
    supervisors: TeamSupervisors
  ): Promise<TriggerResult> {
    try {
      if (!actionConfig.workflowTemplateId) {
        logger.warn('⚠️ [UNIFIED-TRIGGER] Workflow flow configured but no template assigned, falling back to default');
        return await this.handleDefaultFlowWithSupervisors(ctx, supervisors);
      }

      // Verifica che il template esista e sia attivo
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.id, actionConfig.workflowTemplateId),
            eq(workflowTemplates.isActive, true)
          )
        )
        .limit(1);

      if (!template) {
        logger.warn('⚠️ [UNIFIED-TRIGGER] Workflow template not found or inactive, falling back to default');
        return await this.handleDefaultFlowWithSupervisors(ctx, supervisors);
      }

      // Avvia istanza workflow tramite WorkflowEngine
      const workflowEngine = new WorkflowEngine();
      const instanceResult = await workflowEngine.startInstance({
        templateId: actionConfig.workflowTemplateId,
        tenantId: ctx.tenantId,
        triggeredBy: ctx.userId,
        referenceId: ctx.requestId,
        referenceType: ctx.department,
        inputData: {
          department: ctx.department,
          actionId: ctx.actionId,
          ...ctx.context
        },
        assignedTeamId: supervisors.teamId
      });

      logger.info('✅ [UNIFIED-TRIGGER] Workflow instance started', {
        workflowInstanceId: instanceResult.instanceId,
        templateId: actionConfig.workflowTemplateId,
        teamId: supervisors.teamId
      });

      return {
        success: true,
        flowType: 'workflow',
        message: 'Workflow avviato con successo',
        workflowInstanceId: instanceResult.instanceId,
        teamId: supervisors.teamId,
        requestId: ctx.requestId
      };

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error handling workflow flow', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fallback a flusso default in caso di errore
      logger.info('🔄 [UNIFIED-TRIGGER] Falling back to default flow due to workflow error');
      return await this.handleDefaultFlowWithSupervisors(ctx, supervisors);
    }
  }

  /**
   * 🆘 Fallback quando non trova team per l'utente
   * Cerca admin del tenant come ultima risorsa
   */
  async handleNoTeamFallback(ctx: TriggerContext): Promise<TriggerResult> {
    try {
      // Cerca admin tenant
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.tenantId, ctx.tenantId),
            eq(users.role, 'admin'),
            eq(users.isActive, true)
          )
        )
        .limit(3);

      if (admins.length === 0) {
        return {
          success: false,
          flowType: 'default',
          message: 'Nessun supervisore o admin disponibile per approvazione'
        };
      }

      const adminIds = admins.map(a => a.id);

      // Invia notifiche agli admin
      for (const adminId of adminIds) {
        try {
          await notificationService.createNotification({
            userId: adminId,
            tenantId: ctx.tenantId,
            type: 'approval_request',
            title: 'Nuova richiesta di approvazione',
            message: `Richiesta ${ctx.actionId} da approvare (nessun team assegnato)`,
            data: {
              department: ctx.department,
              actionId: ctx.actionId,
              requesterId: ctx.userId,
              requestId: ctx.requestId,
              ...ctx.context
            }
          });
        } catch (notifError) {
          logger.error('❌ [UNIFIED-TRIGGER] Error sending admin notification', {
            error: notifError instanceof Error ? notifError.message : 'Unknown error',
            adminId
          });
        }
      }

      return {
        success: true,
        flowType: 'default',
        message: `Richiesta inviata a ${adminIds.length} admin per approvazione (fallback)`,
        notifiedUsers: adminIds
      };

    } catch (error) {
      logger.error('❌ [UNIFIED-TRIGGER] Error in no-team fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        success: false,
        flowType: 'default',
        message: 'Errore nel processo di approvazione'
      };
    }
  }

  /**
   * 📧 Invia notifiche di approvazione ai supervisori
   */
  async sendApprovalNotifications(
    ctx: TriggerContext,
    userIds: string[],
    supervisors: TeamSupervisors
  ): Promise<void> {
    for (const userId of userIds) {
      try {
        const isObserver = supervisors.observerIds.includes(userId);
        const isPrimary = userId === supervisors.primarySupervisorId;
        const isSecondary = userId === supervisors.secondarySupervisorId;

        let role = 'supervisore';
        if (isPrimary) role = 'supervisore primario';
        else if (isSecondary) role = 'supervisore secondario';
        else if (isObserver) role = 'osservatore';

        await notificationService.createNotification({
          userId,
          tenantId: ctx.tenantId,
          type: 'approval_request',
          title: 'Nuova richiesta di approvazione',
          message: `Hai una nuova richiesta da ${ctx.department}/${ctx.actionId} da gestire come ${role}`,
          data: {
            department: ctx.department,
            actionId: ctx.actionId,
            requesterId: ctx.userId,
            requestId: ctx.requestId,
            teamId: supervisors.teamId,
            teamName: supervisors.teamName,
            canApprove: !isObserver, // Observers inizialmente non possono approvare
            ...ctx.context
          }
        });
      } catch (error) {
        logger.error('❌ [UNIFIED-TRIGGER] Error sending notification', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        });
      }
    }
  }

  /**
   * 🔍 Ottieni tutte le azioni configurate per un department
   */
  async getActionsByDepartment(tenantId: string, department: string) {
    return await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.department, department as any),
          eq(actionConfigurations.isActive, true)
        )
      )
      .orderBy(actionConfigurations.priority);
  }

  /**
   * 📊 Ottieni coverage delle azioni per department
   */
  async getActionCoverage(tenantId: string, department: string) {
    const actions = await this.getActionsByDepartment(tenantId, department);
    
    const coverage = {
      total: actions.length,
      withWorkflow: actions.filter(a => a.flowType === 'workflow').length,
      withDefaultFlow: actions.filter(a => a.flowType === 'default').length,
      noApproval: actions.filter(a => !a.requiresApproval || a.flowType === 'none').length
    };

    return {
      ...coverage,
      workflowCoveragePercent: coverage.total > 0 
        ? Math.round((coverage.withWorkflow / coverage.total) * 100) 
        : 0
    };
  }
}

// Export singleton instance
export const unifiedTriggerService = new UnifiedTriggerService();
export { UnifiedTriggerService };
