import { eq, and, desc } from 'drizzle-orm';
import { db } from '../core/db.js';
import { 
  crmDeals,
  crmPipelineWorkflows,
  workflowInstances,
  workflowTemplates,
  type CrmDeal,
  type InsertWorkflowInstance
} from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';

export interface CrmWorkflowTriggerResult {
  success: boolean;
  workflowInstanceId?: string;
  workflowName?: string;
  message?: string;
  error?: string;
}

/**
 * CRM Workflow Trigger Service
 * Automatically creates workflow instances when a deal is assigned to a pipeline
 * Triggers only workflows with executionMode='automatic'
 */
export class CrmWorkflowTriggerService {
  
  /**
   * 🎯 MAIN METHOD: Triggered when a deal is created/assigned to a pipeline
   * Finds automatic workflows for the pipeline, creates instance, and starts execution
   */
  static async triggerWorkflowForDeal(
    deal: CrmDeal, 
    tenantId: string,
    triggeredBy: string
  ): Promise<CrmWorkflowTriggerResult> {
    try {
      logger.info('🚀 CRM Workflow Trigger: Starting workflow automation for deal', {
        dealId: deal.id,
        pipelineId: deal.pipelineId,
        stage: deal.stage,
        tenantId
      });

      // STEP 1: Find active automatic workflows for this pipeline
      const automaticWorkflow = await this.findAutomaticWorkflowForPipeline(
        deal.pipelineId, 
        tenantId
      );
      
      if (!automaticWorkflow) {
        logger.info('ℹ️ No automatic workflow configured for pipeline', {
          pipelineId: deal.pipelineId,
          dealId: deal.id,
          tenantId
        });
        
        return {
          success: true,
          message: 'No automatic workflow configured for this pipeline (manual trigger required)'
        };
      }

      // STEP 2: Get workflow template details
      const [template] = await db
        .select({
          id: workflowTemplates.id,
          name: workflowTemplates.name,
          category: workflowTemplates.category
        })
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, automaticWorkflow.workflowTemplateId))
        .limit(1);

      if (!template) {
        logger.error('❌ Workflow template not found', {
          templateId: automaticWorkflow.workflowTemplateId,
          dealId: deal.id,
          tenantId
        });
        
        return {
          success: false,
          error: 'Workflow template not found'
        };
      }

      // STEP 3: Create workflow instance
      const workflowInstance = await this.createWorkflowInstance(
        template.id,
        template.name,
        deal.id,
        deal.pipelineId,
        tenantId,
        triggeredBy
      );

      logger.info('✅ CRM Workflow Trigger: Workflow automation completed successfully', {
        dealId: deal.id,
        pipelineId: deal.pipelineId,
        workflowInstanceId: workflowInstance.id,
        workflowName: template.name,
        templateId: template.id,
        tenantId
      });

      return {
        success: true,
        workflowInstanceId: workflowInstance.id,
        workflowName: template.name,
        message: `Workflow "${template.name}" automatically started for deal`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('❌ CRM Workflow Trigger: Failed to trigger workflow', {
        error: errorMessage,
        dealId: deal.id,
        pipelineId: deal.pipelineId,
        tenantId,
        stack: errorStack
      });

      return {
        success: false,
        error: `Workflow automation failed: ${errorMessage}`
      };
    }
  }

  /**
   * 🔍 STEP 1: Find automatic workflow for pipeline
   * Returns the first active workflow with executionMode='automatic'
   */
  private static async findAutomaticWorkflowForPipeline(
    pipelineId: string, 
    tenantId: string
  ) {
    const [workflow] = await db
      .select({
        id: crmPipelineWorkflows.id,
        workflowTemplateId: crmPipelineWorkflows.workflowTemplateId,
        executionMode: crmPipelineWorkflows.executionMode,
        isActive: crmPipelineWorkflows.isActive
      })
      .from(crmPipelineWorkflows)
      .where(and(
        eq(crmPipelineWorkflows.pipelineId, pipelineId),
        eq(crmPipelineWorkflows.executionMode, 'automatic'),
        eq(crmPipelineWorkflows.isActive, true)
      ))
      .orderBy(desc(crmPipelineWorkflows.assignedAt))
      .limit(1);

    if (workflow) {
      logger.info('📋 Found automatic workflow for pipeline', {
        workflowId: workflow.id,
        templateId: workflow.workflowTemplateId,
        pipelineId,
        executionMode: workflow.executionMode
      });
    }

    return workflow;
  }

  /**
   * ⚡ STEP 3: Create workflow instance
   */
  private static async createWorkflowInstance(
    templateId: string,
    templateName: string,
    dealId: string,
    pipelineId: string,
    tenantId: string,
    triggeredBy: string
  ) {
    const workflowInstanceData: InsertWorkflowInstance = {
      tenantId,
      templateId,
      referenceId: dealId, // Link to CRM deal
      instanceType: 'crm',
      instanceName: `${templateName} - Deal ${dealId.slice(0, 8)}`,
      category: 'crm',
      currentStepId: null, // NULL for newly created instance (not started yet)
      variables: {
        dealId,
        pipelineId,
        triggeredAt: new Date().toISOString()
      },
      metadata: {
        triggeredBy: 'crm-workflow-trigger-service',
        autoCreated: true,
        executionMode: 'automatic',
        timestamp: new Date().toISOString(),
        dealId,
        pipelineId
      },
      createdBy: triggeredBy
    };

    const [newInstance] = await db
      .insert(workflowInstances)
      .values(workflowInstanceData)
      .returning();

    logger.info('⚡ Created CRM workflow instance', {
      instanceId: newInstance.id,
      templateId,
      dealId,
      pipelineId,
      tenantId
    });

    return newInstance;
  }

  /**
   * 🔍 HELPER: Get workflow automation status for a deal
   */
  static async getAutomationStatus(dealId: string, tenantId: string) {
    const [deal] = await db
      .select({
        id: crmDeals.id,
        pipelineId: crmDeals.pipelineId,
        stage: crmDeals.stage,
        status: crmDeals.status
      })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.id, dealId),
        eq(crmDeals.tenantId, tenantId)
      ));

    if (!deal) {
      return {
        hasWorkflow: false,
        workflowInstanceId: null,
        pipelineId: null
      };
    }

    // Check if there's a workflow instance for this deal
    const [instance] = await db
      .select({
        id: workflowInstances.id,
        status: workflowInstances.status,
        templateId: workflowInstances.templateId
      })
      .from(workflowInstances)
      .where(and(
        eq(workflowInstances.referenceId, dealId),
        eq(workflowInstances.tenantId, tenantId),
        eq(workflowInstances.category, 'crm')
      ))
      .orderBy(desc(workflowInstances.createdAt))
      .limit(1);

    return {
      hasWorkflow: !!instance,
      workflowInstanceId: instance?.id,
      workflowStatus: instance?.status,
      pipelineId: deal.pipelineId,
      dealStage: deal.stage
    };
  }

  /**
   * 🔄 BATCH TRIGGER: Trigger workflows for multiple deals
   * Useful for bulk operations or migrations
   */
  static async triggerWorkflowsForDeals(
    dealIds: string[],
    tenantId: string,
    triggeredBy: string
  ): Promise<{ success: number; failed: number; results: CrmWorkflowTriggerResult[] }> {
    const results: CrmWorkflowTriggerResult[] = [];
    let success = 0;
    let failed = 0;

    logger.info('🔄 Batch triggering workflows for deals', {
      dealCount: dealIds.length,
      tenantId,
      triggeredBy
    });

    for (const dealId of dealIds) {
      const [deal] = await db
        .select()
        .from(crmDeals)
        .where(and(
          eq(crmDeals.id, dealId),
          eq(crmDeals.tenantId, tenantId)
        ))
        .limit(1);

      if (!deal) {
        results.push({
          success: false,
          error: `Deal ${dealId} not found`
        });
        failed++;
        continue;
      }

      const result = await this.triggerWorkflowForDeal(deal, tenantId, triggeredBy);
      results.push(result);
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info('✅ Batch workflow trigger completed', {
      total: dealIds.length,
      success,
      failed,
      tenantId
    });

    return { success, failed, results };
  }
}
