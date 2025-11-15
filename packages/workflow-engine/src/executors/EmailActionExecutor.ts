import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class EmailActionExecutor extends BaseExecutor {
  executorId = 'email-action-executor';
  description = 'Sends email notifications using notification service';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('📧 [EXECUTOR] Executing email action', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const emailData = {
        to: config.recipient || inputData?.email || context?.requesterEmail,
        subject: config.subject || 'Workflow Notification',
        message: config.message || 'A workflow action has been completed.',
        type: 'workflow' as const,
        priority: config.priority || 'medium' as const
      };

      if (!emailData.to) {
        throw new Error('Email recipient is required');
      }

      await this.sendEmail(
        context?.tenantId || 'default',
        emailData.to,
        emailData.subject,
        emailData.message,
        emailData.type,
        emailData.priority,
        { 
          stepId: step.nodeId,
          instanceId: context?.instanceId,
          ...inputData 
        }
      );

      return {
        success: true,
        message: `Email sent successfully to ${emailData.to}`,
        data: { 
          recipient: emailData.to,
          subject: emailData.subject,
          sentAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Email action failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
