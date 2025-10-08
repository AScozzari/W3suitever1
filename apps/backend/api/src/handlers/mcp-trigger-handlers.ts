import { db } from '../core/db.js';
import { workflowInstances } from '../db/schema/w3suite.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../core/logger.js';
import { WorkflowEngine } from '../services/workflow-engine.js';

/**
 * MCP INBOUND Trigger Handlers
 * 
 * Process webhook events from external services and trigger workflows.
 * Organized by ecosystem: Google, AWS, Meta, Microsoft, Stripe, GTM
 */

interface TriggerHandlerParams {
  tenantId: string;
  serverId: string;
  payload: any;
  triggerType: string;
}

/**
 * Find workflow instances configured for a specific trigger
 */
async function findWorkflowsForTrigger(params: {
  tenantId: string;
  serverId: string;
  triggerType: string;
}): Promise<any[]> {
  const { tenantId, serverId, triggerType } = params;

  try {
    // Query workflow instances that:
    // 1. Belong to the tenant
    // 2. Are active
    // 3. Have a trigger node matching the trigger type and server
    const workflows = await db
      .select()
      .from(workflowInstances)
      .where(and(
        eq(workflowInstances.tenantId, tenantId),
        eq(workflowInstances.status, 'active')
      ));

    // Filter workflows that have matching trigger nodes
    const matchingWorkflows = workflows.filter(workflow => {
      if (!workflow.definition || typeof workflow.definition !== 'object') return false;
      
      const nodes = (workflow.definition as any).nodes || [];
      return nodes.some((node: any) => 
        node.type === triggerType && 
        node.data?.serverId === serverId
      );
    });

    return matchingWorkflows;

  } catch (error) {
    logger.error('❌ [Find Workflows For Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error),
      tenantId,
      triggerType
    });
    return [];
  }
}

/**
 * Start workflow execution with trigger data
 */
async function startWorkflowExecution(params: {
  workflowId: string;
  tenantId: string;
  triggerData: Record<string, any>;
  triggerType: string;
}) {
  const { workflowId, tenantId, triggerData, triggerType } = params;

  try {
    logger.info('🚀 [MCP Trigger] Starting workflow execution', {
      workflowId,
      triggerType,
      triggerData: Object.keys(triggerData)
    });

    // Create workflow engine instance
    const workflowEngine = new WorkflowEngine();

    // Create execution context with trigger data
    const context = {
      tenantId,
      userId: 'mcp-webhook-system',
      workflowData: triggerData,
      metadata: {
        triggeredBy: 'mcp-webhook',
        triggerType,
        timestamp: new Date().toISOString()
      }
    };

    // Execute ReactFlow workflow (supports both SYNC and ASYNC modes)
    await workflowEngine.executeReactFlowWorkflow(workflowId, context);

    logger.info('✅ [MCP Trigger] Workflow started successfully', {
      workflowId,
      triggerType
    });

  } catch (error) {
    logger.error('❌ [MCP Trigger] Workflow execution failed', {
      error: error instanceof Error ? error.message : String(error),
      workflowId,
      triggerType
    });
  }
}

// ==================== GOOGLE WORKSPACE TRIGGERS ====================

export async function handleGmailReceived(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    // Extract Gmail message data
    const triggerData = {
      messageId: payload.historyId || payload.message?.id,
      from: payload.message?.from,
      to: payload.message?.to,
      subject: payload.message?.subject,
      body: payload.message?.snippet || payload.message?.body
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'google.gmail.received'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'google.gmail.received'
      });
    }

  } catch (error) {
    logger.error('❌ [Gmail Received Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleDriveFileCreated(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      fileId: payload.id,
      fileName: payload.name,
      mimeType: payload.mimeType,
      createdBy: payload.createdBy?.emailAddress
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'google.drive.file-created'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'google.drive.file-created'
      });
    }

  } catch (error) {
    logger.error('❌ [Drive File Created Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleCalendarEventCreated(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      eventId: payload.id,
      summary: payload.summary,
      startTime: payload.start?.dateTime,
      endTime: payload.end?.dateTime,
      organizer: payload.organizer?.email
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'google.calendar.event-created'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'google.calendar.event-created'
      });
    }

  } catch (error) {
    logger.error('❌ [Calendar Event Created Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== AWS TRIGGERS ====================

export async function handleS3ObjectCreated(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    // AWS S3 event structure
    const s3Record = payload.Records?.[0]?.s3;
    const triggerData = {
      key: s3Record?.object?.key,
      bucket: s3Record?.bucket?.name,
      etag: s3Record?.object?.eTag,
      size: s3Record?.object?.size
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'aws.s3.object-created'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'aws.s3.object-created'
      });
    }

  } catch (error) {
    logger.error('❌ [S3 Object Created Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleSNSMessagePublished(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      message: payload.Message,
      subject: payload.Subject,
      messageId: payload.MessageId,
      topicArn: payload.TopicArn
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'aws.sns.message-published'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'aws.sns.message-published'
      });
    }

  } catch (error) {
    logger.error('❌ [SNS Message Published Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== META/INSTAGRAM TRIGGERS ====================

export async function handleInstagramComment(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    const triggerData = {
      commentId: change?.id,
      text: change?.text,
      username: change?.from?.username,
      mediaId: change?.media?.id
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'meta.instagram.comment-created'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'meta.instagram.comment-created'
      });
    }

  } catch (error) {
    logger.error('❌ [Instagram Comment Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleInstagramDM(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];

    const triggerData = {
      conversationId: messaging?.sender?.id,
      message: messaging?.message?.text,
      sender: messaging?.sender?.id
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'meta.instagram.dm-received'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'meta.instagram.dm-received'
      });
    }

  } catch (error) {
    logger.error('❌ [Instagram DM Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleInstagramMention(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    const triggerData = {
      mediaId: change?.media_id,
      caption: change?.caption || change?.text,
      username: change?.from?.username
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'meta.instagram.mention'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'meta.instagram.mention'
      });
    }

  } catch (error) {
    logger.error('❌ [Instagram Mention Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== MICROSOFT 365 TRIGGERS ====================

export async function handleOutlookEmailReceived(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      messageId: payload.id,
      from: payload.from?.emailAddress?.address,
      subject: payload.subject,
      body: payload.bodyPreview || payload.body?.content
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'microsoft.outlook.email-received'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'microsoft.outlook.email-received'
      });
    }

  } catch (error) {
    logger.error('❌ [Outlook Email Received Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleTeamsMessagePosted(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      messageId: payload.id,
      message: payload.body?.content,
      from: payload.from?.user?.displayName,
      channelId: payload.channelIdentity?.channelId
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'microsoft.teams.message-posted'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'microsoft.teams.message-posted'
      });
    }

  } catch (error) {
    logger.error('❌ [Teams Message Posted Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleOneDriveFileUpdated(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      fileId: payload.id,
      fileName: payload.name,
      modifiedBy: payload.lastModifiedBy?.user?.displayName,
      webUrl: payload.webUrl
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'microsoft.onedrive.file-updated'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'microsoft.onedrive.file-updated'
      });
    }

  } catch (error) {
    logger.error('❌ [OneDrive File Updated Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== STRIPE TRIGGERS ====================

export async function handleStripePaymentSucceeded(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const paymentIntent = payload.data?.object;

    const triggerData = {
      paymentIntentId: paymentIntent?.id,
      amount: paymentIntent?.amount,
      customerId: paymentIntent?.customer
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'stripe.payment_intent.succeeded'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'stripe.payment_intent.succeeded'
      });
    }

  } catch (error) {
    logger.error('❌ [Stripe Payment Succeeded Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleStripePaymentFailed(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const paymentIntent = payload.data?.object;

    const triggerData = {
      paymentIntentId: paymentIntent?.id,
      failureReason: paymentIntent?.last_payment_error?.message
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'stripe.payment_intent.failed'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'stripe.payment_intent.failed'
      });
    }

  } catch (error) {
    logger.error('❌ [Stripe Payment Failed Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleStripeSubscriptionCreated(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const subscription = payload.data?.object;

    const triggerData = {
      subscriptionId: subscription?.id,
      customerId: subscription?.customer,
      status: subscription?.status
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'stripe.customer.subscription.created'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'stripe.customer.subscription.created'
      });
    }

  } catch (error) {
    logger.error('❌ [Stripe Subscription Created Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== GTM/ANALYTICS TRIGGERS ====================

export async function handleGTMFormSubmission(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      formId: payload.formId,
      formData: payload.formData,
      userId: payload.userId || payload.clientId
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'gtm.form.submission'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'gtm.form.submission'
      });
    }

  } catch (error) {
    logger.error('❌ [GTM Form Submission Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function handleGTMConversionEvent(params: TriggerHandlerParams) {
  const { tenantId, serverId, payload } = params;

  try {
    const triggerData = {
      eventName: payload.event_name,
      eventValue: payload.value,
      userId: payload.user_id || payload.client_id
    };

    const workflows = await findWorkflowsForTrigger({
      tenantId,
      serverId,
      triggerType: 'gtm.conversion.event'
    });

    for (const workflow of workflows) {
      await startWorkflowExecution({
        workflowId: workflow.id,
        tenantId,
        triggerData,
        triggerType: 'gtm.conversion.event'
      });
    }

  } catch (error) {
    logger.error('❌ [GTM Conversion Event Trigger] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// ==================== TRIGGER HANDLER REGISTRY ====================

export const TriggerHandlerRegistry: Record<string, (params: TriggerHandlerParams) => Promise<void>> = {
  // Google Workspace
  'google.gmail.received': handleGmailReceived,
  'google.drive.file-created': handleDriveFileCreated,
  'google.drive.file-updated': handleDriveFileCreated, // Reuse same handler
  'google.calendar.event-created': handleCalendarEventCreated,
  'google.calendar.event-updated': handleCalendarEventCreated, // Reuse same handler

  // AWS
  'aws.s3.object-created': handleS3ObjectCreated,
  'aws.s3.object-deleted': handleS3ObjectCreated, // Reuse same handler
  'aws.sns.message-published': handleSNSMessagePublished,
  'aws.sqs.message-received': handleSNSMessagePublished, // Similar structure

  // Meta/Instagram
  'meta.instagram.comment-created': handleInstagramComment,
  'meta.instagram.dm-received': handleInstagramDM,
  'meta.instagram.mention': handleInstagramMention,
  'meta.instagram.story-mention': handleInstagramMention, // Similar structure
  'meta.facebook.post-created': handleInstagramComment, // Similar structure
  'meta.facebook.comment-created': handleInstagramComment,

  // Microsoft 365
  'microsoft.outlook.email-received': handleOutlookEmailReceived,
  'microsoft.teams.message-posted': handleTeamsMessagePosted,
  'microsoft.teams.channel-created': handleTeamsMessagePosted, // Similar structure
  'microsoft.onedrive.file-updated': handleOneDriveFileUpdated,

  // Stripe
  'stripe.payment_intent.succeeded': handleStripePaymentSucceeded,
  'stripe.payment_intent.failed': handleStripePaymentFailed,
  'stripe.customer.created': handleStripePaymentSucceeded, // Similar structure
  'stripe.customer.subscription.created': handleStripeSubscriptionCreated,
  'stripe.customer.subscription.deleted': handleStripeSubscriptionCreated, // Similar structure
  'stripe.invoice.paid': handleStripePaymentSucceeded, // Similar structure

  // GTM/Analytics
  'gtm.form.submission': handleGTMFormSubmission,
  'gtm.conversion.event': handleGTMConversionEvent,
  'gtm.page.view': handleGTMConversionEvent // Similar structure
};

/**
 * Main trigger dispatcher - called by WebhookService
 */
export async function dispatchMCPTrigger(params: {
  tenantId: string;
  serverId: string;
  triggerType: string;
  payload: any;
}) {
  const { tenantId, serverId, triggerType, payload } = params;

  try {
    const handler = TriggerHandlerRegistry[triggerType];

    if (!handler) {
      logger.warn('⚠️  [MCP Trigger Dispatcher] No handler found', {
        triggerType,
        availableHandlers: Object.keys(TriggerHandlerRegistry)
      });
      return;
    }

    logger.info('📥 [MCP Trigger Dispatcher] Processing trigger', {
      triggerType,
      tenantId,
      serverId
    });

    await handler({ tenantId, serverId, payload, triggerType });

  } catch (error) {
    logger.error('❌ [MCP Trigger Dispatcher] Failed', {
      error: error instanceof Error ? error.message : String(error),
      triggerType,
      tenantId
    });
  }
}
