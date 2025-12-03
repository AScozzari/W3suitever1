import { eq, and, desc } from 'drizzle-orm';
import { db, setTenantContext } from '../core/db.js';
import { 
  crmLeads,
  crmDeals,
  crmCampaigns,
  crmLeadNotifications,
  workflowInstances,
  workflowTemplates,
  type CrmLead,
  type CrmCampaign,
  type InsertWorkflowInstance
} from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';

export interface CampaignWorkflowResult {
  success: boolean;
  workflowInstanceId?: string;
  workflowName?: string;
  pipelineAssigned?: boolean;
  fallbackScheduled?: boolean;
  message?: string;
  error?: string;
}

/**
 * Campaign Workflow Trigger Service
 * Manages automatic workflow execution for campaign leads
 * Handles fallback pipeline assignment after timeout
 */
export class CampaignWorkflowTriggerService {
  
  // Store fallback timers to cancel if needed
  private static fallbackTimers = new Map<string, NodeJS.Timeout>();

  /**
   * 🎯 MAIN METHOD: Trigger workflow for campaign lead
   * Called when a lead arrives from a campaign with automatic routing
   */
  static async triggerWorkflowForLead(
    lead: CrmLead,
    campaign: CrmCampaign,
    tenantId: string,
    triggeredBy: string
  ): Promise<CampaignWorkflowResult> {
    try {
      logger.info('🚀 [CAMPAIGN WORKFLOW] Starting automatic workflow for lead', {
        leadId: lead.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        workflowId: campaign.workflowId,
        tenantId
      });

      if (!campaign.workflowId) {
        logger.warn('⚠️ [CAMPAIGN WORKFLOW] No workflow configured for automatic campaign', {
          campaignId: campaign.id,
          leadId: lead.id
        });
        
        // If no workflow, try immediate fallback
        if (campaign.fallbackPipelineId1) {
          await this.assignToFallbackPipeline(lead.id, campaign, tenantId);
          return {
            success: true,
            pipelineAssigned: true,
            message: 'No workflow configured, assigned to fallback pipeline immediately'
          };
        }
        
        return {
          success: false,
          error: 'No workflow or fallback pipeline configured'
        };
      }

      // STEP 1: Get workflow template details
      const [template] = await db
        .select({
          id: workflowTemplates.id,
          name: workflowTemplates.name,
          category: workflowTemplates.category
        })
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, campaign.workflowId))
        .limit(1);

      if (!template) {
        logger.error('❌ [CAMPAIGN WORKFLOW] Workflow template not found', {
          templateId: campaign.workflowId,
          leadId: lead.id,
          tenantId
        });
        
        // Template not found, try fallback
        if (campaign.fallbackPipelineId1) {
          await this.assignToFallbackPipeline(lead.id, campaign, tenantId);
          return {
            success: true,
            pipelineAssigned: true,
            message: 'Workflow template not found, assigned to fallback pipeline'
          };
        }
        
        return {
          success: false,
          error: 'Workflow template not found and no fallback pipeline'
        };
      }

      // STEP 2: Create workflow instance
      const workflowInstance = await this.createWorkflowInstance(
        template.id,
        template.name,
        lead.id,
        campaign.id,
        campaign.enableAIScoring || false,
        campaign.enableAIRouting || false,
        tenantId,
        triggeredBy
      );

      logger.info('✅ [CAMPAIGN WORKFLOW] Workflow instance created', {
        instanceId: workflowInstance.id,
        templateId: template.id,
        templateName: template.name,
        leadId: lead.id,
        campaignId: campaign.id
      });

      // STEP 3: Schedule fallback timer if configured
      if (campaign.fallbackPipelineId1 && campaign.fallbackTimeoutSeconds) {
        this.scheduleFallbackTimer(
          lead.id,
          campaign,
          tenantId,
          campaign.fallbackTimeoutSeconds
        );
        
        logger.info('⏱️ [CAMPAIGN WORKFLOW] Fallback timer scheduled', {
          leadId: lead.id,
          timeoutSeconds: campaign.fallbackTimeoutSeconds,
          fallbackPipelineId: campaign.fallbackPipelineId1
        });
      }

      return {
        success: true,
        workflowInstanceId: workflowInstance.id,
        workflowName: template.name,
        fallbackScheduled: !!(campaign.fallbackPipelineId1 && campaign.fallbackTimeoutSeconds),
        message: `Workflow "${template.name}" started for lead`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('❌ [CAMPAIGN WORKFLOW] Failed to trigger workflow', {
        error: errorMessage,
        leadId: lead.id,
        campaignId: campaign.id,
        tenantId,
        stack: errorStack
      });

      // On error, try immediate fallback
      if (campaign.fallbackPipelineId1) {
        try {
          await this.assignToFallbackPipeline(lead.id, campaign, tenantId);
          return {
            success: true,
            pipelineAssigned: true,
            message: 'Workflow failed, assigned to fallback pipeline',
            error: errorMessage
          };
        } catch (fallbackError) {
          logger.error('❌ [CAMPAIGN WORKFLOW] Fallback also failed', {
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown',
            leadId: lead.id
          });
        }
      }

      return {
        success: false,
        error: `Workflow trigger failed: ${errorMessage}`
      };
    }
  }

  /**
   * ⏱️ Schedule fallback timer
   * After timeout, check if lead has pipeline, if not assign fallback
   */
  private static scheduleFallbackTimer(
    leadId: string,
    campaign: CrmCampaign,
    tenantId: string,
    timeoutSeconds: number
  ): void {
    // Cancel existing timer if any
    const existingTimer = this.fallbackTimers.get(leadId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        logger.info('⏰ [FALLBACK TIMER] Checking if lead needs fallback assignment', {
          leadId,
          campaignId: campaign.id,
          timeoutSeconds
        });

        // Set tenant context for async execution
        await setTenantContext(tenantId);

        // Check if lead already has pipeline
        const [lead] = await db
          .select({ pipelineId: crmLeads.pipelineId })
          .from(crmLeads)
          .where(and(
            eq(crmLeads.id, leadId),
            eq(crmLeads.tenantId, tenantId)
          ))
          .limit(1);

        if (!lead) {
          logger.error('❌ [FALLBACK TIMER] Lead not found', { leadId });
          return;
        }

        if (lead.pipelineId) {
          logger.info('✅ [FALLBACK TIMER] Lead already has pipeline, skipping fallback', {
            leadId,
            pipelineId: lead.pipelineId
          });
          return;
        }

        // Assign to fallback pipeline
        await this.assignToFallbackPipeline(leadId, campaign, tenantId);
        
        logger.info('✅ [FALLBACK TIMER] Fallback pipeline assigned', {
          leadId,
          fallbackPipelineId: campaign.fallbackPipelineId1
        });

      } catch (error) {
        logger.error('❌ [FALLBACK TIMER] Failed to execute fallback', {
          error: error instanceof Error ? error.message : 'Unknown',
          leadId,
          campaignId: campaign.id
        });
      } finally {
        // Remove timer from map
        this.fallbackTimers.delete(leadId);
      }
    }, timeoutSeconds * 1000);

    // Store timer reference
    this.fallbackTimers.set(leadId, timer);
  }

  /**
   * 📌 Assign lead to fallback pipeline
   */
  private static async assignToFallbackPipeline(
    leadId: string,
    campaign: CrmCampaign,
    tenantId: string
  ): Promise<void> {
    const fallbackPipelineId = campaign.fallbackPipelineId1 || campaign.fallbackPipelineId2;
    
    if (!fallbackPipelineId) {
      throw new Error('No fallback pipeline configured');
    }

    logger.info('🔄 [FALLBACK] Assigning lead to fallback pipeline', {
      leadId,
      pipelineId: fallbackPipelineId,
      campaignId: campaign.id
    });

    // Update lead with pipeline
    const [updatedLead] = await db
      .update(crmLeads)
      .set({ pipelineId: fallbackPipelineId })
      .where(and(
        eq(crmLeads.id, leadId),
        eq(crmLeads.tenantId, tenantId)
      ))
      .returning();

    if (!updatedLead) {
      throw new Error('Failed to update lead with fallback pipeline');
    }

    // Create deal in fallback pipeline
    const [deal] = await db
      .insert(crmDeals)
      .values({
        tenantId,
        leadId,
        pipelineId: fallbackPipelineId,
        stage: 'new',
        title: `${updatedLead.firstName || 'Lead'} ${updatedLead.lastName || ''}`.trim() || 'New Deal',
        value: 0,
        probability: 10,
        status: 'open',
        metadata: {
          source: 'campaign_fallback',
          campaignId: campaign.id,
          fallbackReason: 'workflow_timeout'
        }
      })
      .returning();

    logger.info('✅ [FALLBACK] Deal created in fallback pipeline', {
      dealId: deal.id,
      pipelineId: fallbackPipelineId,
      leadId
    });

    // Notify users about fallback
    if (campaign.notifyUserIds && campaign.notifyUserIds.length > 0) {
      for (const userId of campaign.notifyUserIds) {
        await db.insert(crmLeadNotifications).values({
          tenantId,
          leadId,
          userId,
          notificationType: 'fallback_assignment',
          priority: 'medium',
          message: `⏰ Lead assegnato a pipeline di fallback dopo timeout per campagna "${campaign.name}"`,
          metadata: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            pipelineId: fallbackPipelineId,
            reason: 'workflow_timeout'
          },
          deliveryStatus: 'pending',
          deliveryChannels: ['in_app', 'email']
        });
      }
      logger.info('🔔 [FALLBACK] Notifications sent for fallback assignment', {
        userIds: campaign.notifyUserIds
      });
    }
  }

  /**
   * ⚡ Create workflow instance
   */
  private static async createWorkflowInstance(
    templateId: string,
    templateName: string,
    leadId: string,
    campaignId: string,
    enableAIScoring: boolean,
    enableAIRouting: boolean,
    tenantId: string,
    triggeredBy: string
  ): Promise<any> {
    const workflowInstanceData: InsertWorkflowInstance = {
      tenantId,
      templateId,
      referenceId: leadId, // Link to lead
      instanceType: 'campaign_lead',
      instanceName: `${templateName} - Lead ${leadId.slice(0, 8)}`,
      category: 'campaign',
      currentStepId: null, // NULL for newly created instance
      variables: {
        leadId,
        campaignId,
        enableAIScoring,
        enableAIRouting,
        triggeredAt: new Date().toISOString()
      },
      metadata: {
        triggeredBy: 'campaign-workflow-trigger',
        autoCreated: true,
        executionMode: 'automatic',
        timestamp: new Date().toISOString(),
        leadId,
        campaignId,
        // These settings can be used by workflow nodes
        aiSettings: {
          enableScoring: enableAIScoring,
          enableRouting: enableAIRouting
        }
      },
      createdBy: triggeredBy
    };

    const [newInstance] = await db
      .insert(workflowInstances)
      .values(workflowInstanceData)
      .returning();

    return newInstance;
  }

  /**
   * 🧹 Cleanup: Cancel fallback timer for a lead
   */
  static cancelFallbackTimer(leadId: string): void {
    const timer = this.fallbackTimers.get(leadId);
    if (timer) {
      clearTimeout(timer);
      this.fallbackTimers.delete(leadId);
      logger.info('🛑 [FALLBACK TIMER] Timer cancelled for lead', { leadId });
    }
  }

  /**
   * 🔍 Check if lead has pending fallback timer
   */
  static hasPendingFallback(leadId: string): boolean {
    return this.fallbackTimers.has(leadId);
  }
}