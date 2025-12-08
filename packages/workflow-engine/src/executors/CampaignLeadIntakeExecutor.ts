import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class CampaignLeadIntakeExecutor extends BaseExecutor {
  executorId = 'campaign-lead-intake-executor';
  description = 'Manages campaign lead intake with unified routing (automatic/manual) and notifications';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('📥 [EXECUTOR] Executing campaign lead intake with unified routing', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const leadData = inputData?.lead || inputData;
      const campaignInput = inputData?.campaign || {};

      if (!campaignInput.id) {
        throw new Error('Campaign ID is required');
      }

      this.logInfo('🔍 [EXECUTOR] Fetching campaign from DB', {
        campaignId: campaignInput.id,
        tenantId: context?.tenantId
      });

      const campaigns = await this.runtime.database.query(
        'SELECT * FROM crm_campaigns WHERE id = $1 LIMIT 1',
        [campaignInput.id]
      );

      if (!campaigns[0]) {
        throw new Error(`Campaign not found: ${campaignInput.id}`);
      }

      const campaignFull = campaigns[0];

      this.logInfo('✅ [EXECUTOR] Campaign loaded', {
        campaignId: campaignFull.id,
        routingMode: campaignFull.routing_mode,
        workflowId: campaignFull.workflow_id,
        storeId: campaignFull.store_id
      });

      if (campaignFull.store_id) {
        const scopeCheck = await this.validateUserScope(
          context.requesterId,
          context.tenantId,
          campaignFull.store_id
        );

        if (!scopeCheck.hasAccess) {
          return {
            success: false,
            message: 'User lacks permissions for campaign store scope',
            error: 'SCOPE_DENIED',
            data: { storeId: campaignFull.store_id, reason: scopeCheck.message }
          };
        }
      }

      const routingMode = campaignFull.routing_mode || 'automatic';
      
      if (!campaignFull.routing_mode) {
        this.logWarn('⚠️ [EXECUTOR] routingMode not defined, defaulting to automatic', {
          campaignId: campaignFull.id
        });
      }

      let assignedPipelineId: string | null = null;
      let pipelineName: string | null = null;
      let notificationSent = false;
      let fallbackActivated = false;

      if (routingMode === 'automatic') {
        this.logInfo('🤖 [EXECUTOR] Processing AUTOMATIC routing mode', {
          workflowId: campaignFull.workflow_id,
          fallbackPipelineId1: campaignFull.fallback_pipeline_id1,
          fallbackPipelineId2: campaignFull.fallback_pipeline_id2
        });

        if (campaignFull.workflow_id) {
          try {
            this.logInfo('🚀 [EXECUTOR] Executing workflow for automatic routing', {
              workflowId: campaignFull.workflow_id,
              leadId: leadData?.id
            });

            this.logWarn('⏱️ [EXECUTOR] Workflow execution not yet implemented, activating fallback', {
              workflowId: campaignFull.workflow_id
            });

            fallbackActivated = true;

          } catch (workflowError) {
            this.logError('❌ [EXECUTOR] Workflow execution failed, activating fallback', {
              workflowId: campaignFull.workflow_id,
              error: workflowError instanceof Error ? workflowError.message : String(workflowError)
            });
            fallbackActivated = true;
          }
        } else {
          this.logWarn('⚠️ [EXECUTOR] workflowId missing in automatic mode, using fallback directly', {
            campaignId: campaignFull.id
          });
          fallbackActivated = true;
        }

        if (fallbackActivated) {
          assignedPipelineId = campaignFull.fallback_pipeline_id1 || campaignFull.fallback_pipeline_id2 || null;
          
          if (assignedPipelineId) {
            const pipelines = await this.runtime.database.query(
              'SELECT name FROM crm_pipelines WHERE id = $1 LIMIT 1',
              [assignedPipelineId]
            );
            
            pipelineName = pipelines[0]?.name || 'Pipeline';

            this.logInfo('✅ [EXECUTOR] Fallback pipeline assigned', {
              pipelineId: assignedPipelineId,
              pipelineName,
              leadId: leadData?.id
            });

            try {
              const notificationTargets: string[] = [];
              
              if (campaignFull.notify_user_ids && Array.isArray(campaignFull.notify_user_ids)) {
                notificationTargets.push(...campaignFull.notify_user_ids);
              }

              for (const userId of notificationTargets) {
                await this.sendNotification(
                  context.tenantId,
                  userId,
                  'Fallback Automatico Lead',
                  `Fallback automatico attivato per lead ${leadData?.firstName || ''} ${leadData?.lastName || leadData?.id} assegnato a pipeline ${pipelineName}`,
                  'custom',
                  'medium',
                  {
                    leadId: leadData?.id,
                    campaignId: campaignFull.id,
                    pipelineId: assignedPipelineId,
                    routingMode: 'automatic',
                    fallbackActivated: true
                  }
                );
              }

              notificationSent = notificationTargets.length > 0;

              this.logInfo('🔔 [EXECUTOR] Fallback notifications sent', {
                count: notificationTargets.length,
                leadId: leadData?.id
              });

            } catch (notifError) {
              this.logError('❌ [EXECUTOR] Failed to send fallback notifications', {
                error: notifError instanceof Error ? notifError.message : String(notifError)
              });
            }

          } else {
            this.logError('❌ [EXECUTOR] No fallback pipelines configured', {
              campaignId: campaignFull.id
            });
          }
        }
      }

      else if (routingMode === 'manual') {
        this.logInfo('👤 [EXECUTOR] Processing MANUAL routing mode', {
          manualPipelineId1: campaignFull.manual_pipeline_id1,
          manualPipelineId2: campaignFull.manual_pipeline_id2
        });

        assignedPipelineId = campaignFull.manual_pipeline_id1 || campaignFull.manual_pipeline_id2 || null;

        if (!assignedPipelineId) {
          throw new Error('Manual routing mode requires at least one manual pipeline configured (manualPipelineId1 or manualPipelineId2)');
        }

        const pipelines = await this.runtime.database.query(
          'SELECT name FROM crm_pipelines WHERE id = $1 LIMIT 1',
          [assignedPipelineId]
        );
        
        pipelineName = pipelines[0]?.name || 'Pipeline';

        this.logInfo('✅ [EXECUTOR] Manual pipeline assigned', {
          pipelineId: assignedPipelineId,
          pipelineName,
          leadId: leadData?.id
        });

        try {
          const notificationTargets: string[] = [];
          
          if (campaignFull.notify_user_ids && Array.isArray(campaignFull.notify_user_ids)) {
            notificationTargets.push(...campaignFull.notify_user_ids);
          }

          for (const userId of notificationTargets) {
            await this.sendNotification(
              context.tenantId,
              userId,
              'Nuovo Lead',
              `Nuovo lead ${leadData?.firstName || ''} ${leadData?.lastName || leadData?.id} assegnato alla pipeline ${pipelineName}`,
              'custom',
              'medium',
              {
                leadId: leadData?.id,
                campaignId: campaignFull.id,
                pipelineId: assignedPipelineId,
                routingMode: 'manual'
              }
            );
          }

          notificationSent = notificationTargets.length > 0;

          this.logInfo('🔔 [EXECUTOR] Manual assignment notifications sent', {
            count: notificationTargets.length,
            leadId: leadData?.id
          });

        } catch (notifError) {
          this.logError('❌ [EXECUTOR] Failed to send manual assignment notifications', {
            error: notifError instanceof Error ? notifError.message : String(notifError)
          });
        }
      }

      return {
        success: true,
        message: 'Lead processed successfully',
        data: {
          leadId: leadData?.id,
          campaignId: campaignFull.id,
          assignedPipeline: assignedPipelineId,
          pipelineName,
          routingMode,
          notificationSent,
          fallbackActivated,
          leadScore: leadData?.leadScore || 0
        },
        nextAction: 'lead-qualification'
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Campaign lead intake failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to process campaign lead intake',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
