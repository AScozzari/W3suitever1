/**
 * 🎯 CATALOGO CANONICO WORKFLOW NODES
 * Schema TypeScript professionale per Actions, Triggers, AI Nodes
 * Condiviso tra frontend e backend per consistenza
 */

import { z } from 'zod';

// ==================== BASE NODE TYPES ====================

export type NodeCategory = 'action' | 'trigger' | 'ai' | 'condition' | 'flow' | 'routing' | 'integration' | 'mcp-outbound' | 'mcp-inbound' | 'flow-control' | 'w3-data';

export interface BaseNodeDefinition {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  ecosystem?: 'google' | 'aws' | 'meta' | 'microsoft' | 'stripe' | 'gtm' | 'postgresql' | 'telegram' | 'whatsapp' | 'twilio' | 'w3suite'; // MCP ecosystem identifier
  icon: string; // Lucide icon name
  color: string; // CSS color
  version: string;
  deprecated?: boolean;
  configSchema: z.ZodSchema<any>; // Zod schema for validation
  defaultConfig: Record<string, any>;
  toolName?: string; // MCP tool name (e.g., 'gmail_send', 'drive_upload') - used to filter available servers
}

// ==================== ACTION NODES ====================

// Email Action Configuration
export const EmailActionConfigSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one recipient required"),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required"),
  template: z.string().min(1, "Template is required"),
  variables: z.record(z.string(), z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  attachments: z.array(z.string()).optional(),
  sendAt: z.date().optional(),
  tracking: z.boolean().default(true)
});

// Approval Action Configuration  
export const ApprovalActionConfigSchema = z.object({
  approverType: z.enum(['specific', 'role', 'team', 'hierarchy']),
  approvers: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  threshold: z.object({
    type: z.enum(['amount', 'percentage', 'count']),
    value: z.number(),
    currency: z.string().optional()
  }).optional(),
  escalation: z.object({
    enabled: z.boolean().default(false),
    delayHours: z.number().min(1).default(24),
    escalateTo: z.array(z.string()),
    maxLevels: z.number().min(1).max(5).default(3)
  }).optional(),
  autoApprove: z.object({
    enabled: z.boolean().default(false),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'less_than', 'greater_than', 'contains']),
      value: z.any()
    }))
  }).optional(),
  timeout: z.object({
    hours: z.number().min(1).default(72),
    action: z.enum(['auto_approve', 'auto_reject', 'escalate']).default('escalate')
  }).optional()
});

// Payment Action Configuration
export const PaymentActionConfigSchema = z.object({
  gateway: z.enum(['stripe', 'paypal', 'bank_transfer', 'cash']),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1),
  recipient: z.object({
    type: z.enum(['user', 'supplier', 'customer', 'external']),
    id: z.string().optional(),
    details: z.record(z.string(), z.any()).optional()
  }),
  verification: z.object({
    required: z.boolean().default(true),
    methods: z.array(z.enum(['manager_approval', 'dual_sign', 'sms_otp'])),
    threshold: z.number().optional()
  }).optional(),
  scheduling: z.object({
    immediate: z.boolean().default(true),
    scheduledDate: z.date().optional(),
    recurring: z.object({
      enabled: z.boolean().default(false),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
      endDate: z.date().optional()
    }).optional()
  }).optional()
});

// Ticket Creation Action Configuration
export const TicketActionConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['bug', 'feature', 'support', 'maintenance', 'security']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignee: z.object({
    type: z.enum(['specific', 'team', 'auto_assign']),
    userId: z.string().optional(),
    teamId: z.string().optional(),
    rules: z.array(z.object({
      condition: z.string(),
      assignTo: z.string()
    })).optional()
  }),
  labels: z.array(z.string()).optional(),
  dueDate: z.date().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  notifications: z.object({
    onCreate: z.boolean().default(true),
    onUpdate: z.boolean().default(true),
    channels: z.array(z.enum(['email', 'sms', 'slack', 'teams']))
  }).optional()
});

// SMS Action Configuration
export const SmsActionConfigSchema = z.object({
  recipients: z.array(z.string().regex(/^\+?[1-9]\d{1,14}$/)).min(1),
  message: z.string().min(1).max(160),
  variables: z.record(z.string(), z.any()).optional(),
  sendAt: z.date().optional(),
  provider: z.enum(['twilio', 'aws_sns', 'messagebird']).default('twilio'),
  tracking: z.boolean().default(true)
});

// ==================== TRIGGER NODES ====================

// Time Trigger Configuration
export const TimeTriggerConfigSchema = z.object({
  type: z.enum(['cron', 'interval', 'once']),
  cronExpression: z.string().optional(),
  interval: z.object({
    value: z.number().positive(),
    unit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months'])
  }).optional(),
  scheduleDate: z.date().optional(),
  timezone: z.string().default('UTC'),
  enabled: z.boolean().default(true),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    retryDelayMinutes: z.number().min(1).default(5)
  }).optional()
});

// Event Trigger Configuration
export const EventTriggerConfigSchema = z.object({
  eventType: z.string().min(1),
  source: z.enum(['api', 'database', 'webhook', 'internal']),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
    value: z.any()
  })).optional(),
  conditions: z.object({
    all: z.array(z.any()).optional(),
    any: z.array(z.any()).optional()
  }).optional(),
  debounce: z.object({
    enabled: z.boolean().default(false),
    delayMs: z.number().min(100).default(1000)
  }).optional(),
  batchProcessing: z.object({
    enabled: z.boolean().default(false),
    batchSize: z.number().min(1).max(100).default(10),
    timeoutMs: z.number().min(1000).default(30000)
  }).optional()
});

// Webhook Trigger Configuration
export const WebhookTriggerConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  authentication: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'api_key']),
    credentials: z.record(z.string(), z.string()).optional()
  }).optional(),
  payload: z.object({
    type: z.enum(['json', 'form', 'xml', 'raw']),
    data: z.any().optional(),
    template: z.string().optional()
  }).optional(),
  validation: z.object({
    required: z.boolean().default(false),
    schema: z.any().optional()
  }).optional(),
  retry: z.object({
    maxAttempts: z.number().min(1).max(10).default(3),
    backoffMs: z.number().min(100).default(1000)
  }).optional()
});

// Threshold Trigger Configuration
export const ThresholdTriggerConfigSchema = z.object({
  metric: z.string().min(1),
  operator: z.enum(['greater_than', 'less_than', 'equals', 'not_equals', 'between']),
  value: z.number(),
  upperValue: z.number().optional(), // For 'between' operator
  dataSource: z.object({
    type: z.enum(['database', 'api', 'metric_service']),
    query: z.string().optional(),
    endpoint: z.string().optional(),
    refreshInterval: z.number().min(60).default(300) // seconds
  }),
  window: z.object({
    type: z.enum(['rolling', 'fixed']),
    duration: z.number().min(60), // seconds
    aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count'])
  }).optional(),
  cooldown: z.object({
    enabled: z.boolean().default(true),
    durationMs: z.number().min(60000).default(300000) // 5 minutes
  }).optional()
});

// ==================== AI NODES ====================

// AI Decision Node Configuration
export const AiDecisionConfigSchema = z.object({
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'local']),
  prompt: z.string().min(10),
  systemPrompt: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object']),
    required: z.boolean().default(false),
    description: z.string().optional()
  })).optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(500),
    topP: z.number().min(0).max(1).default(1),
    frequencyPenalty: z.number().min(-2).max(2).default(0)
  }).optional(),
  outputs: z.array(z.object({
    condition: z.string(),
    path: z.string(),
    label: z.string().optional(), // Label personalizzata per l'edge visualizzato
    confidence: z.number().min(0).max(1).optional()
  })),
  fallback: z.object({
    enabled: z.boolean().default(true),
    defaultPath: z.string().optional(),
    timeout: z.number().min(1000).default(30000)
  }).optional()
});

// AI Classification Node Configuration
export const AiClassificationConfigSchema = z.object({
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'local']),
  inputField: z.string().min(1),
  categories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    examples: z.array(z.string()).optional()
  })).min(2),
  confidence: z.object({
    threshold: z.number().min(0).max(1).default(0.8),
    requireAboveThreshold: z.boolean().default(true)
  }),
  prompt: z.string().optional(),
  preprocessing: z.object({
    lowercase: z.boolean().default(true),
    removeStopWords: z.boolean().default(false),
    maxLength: z.number().min(1).default(1000)
  }).optional(),
  postprocessing: z.object({
    defaultCategory: z.string().optional(),
    logResults: z.boolean().default(true)
  }).optional()
});

// AI Content Generation Configuration
export const AiContentConfigSchema = z.object({
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'local']),
  contentType: z.enum(['email', 'summary', 'report', 'response', 'translation']),
  prompt: z.string().min(10),
  variables: z.record(z.string(), z.any()).optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(1000),
    style: z.enum(['formal', 'casual', 'technical', 'marketing']).optional(),
    language: z.string().default('it')
  }).optional(),
  validation: z.object({
    minLength: z.number().min(1).optional(),
    maxLength: z.number().min(1).optional(),
    requiredTerms: z.array(z.string()).optional(),
    forbiddenTerms: z.array(z.string()).optional()
  }).optional(),
  output: z.object({
    format: z.enum(['text', 'html', 'markdown']).default('text'),
    saveToField: z.string().optional()
  }).optional()
});

// AI MCP Node Configuration (AI-powered MCP orchestration)
export const AIMCPNodeConfigSchema = z.object({
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']).default('gpt-4'),
  instructions: z.string().min(20, 'Istruzioni AI devono essere almeno 20 caratteri'),
  enabledTools: z.array(z.object({
    serverId: z.string().uuid(),
    serverName: z.string(),
    toolName: z.string(),
    toolDescription: z.string().optional()
  })).default([]), // Empty array allowed for initial config, validated on execution
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(100).max(4000).default(1000),
    topP: z.number().min(0).max(1).default(1),
    frequencyPenalty: z.number().min(0).max(2).default(0)
  }).optional(),
  fallback: z.object({
    enabled: z.boolean().default(true),
    defaultAction: z.enum(['continue', 'fail', 'manual_review']).default('manual_review'),
    timeout: z.number().min(5000).max(120000).default(60000) // 1 minute default
  }).optional(),
  outputMapping: z.object({
    saveResultTo: z.string().optional(), // Field name to save AI response
    saveFunctionCallsTo: z.string().optional() // Field name to save executed function calls
  }).optional()
});

// AI Lead Routing Configuration (CRM intelligent routing)
export const AILeadRoutingConfigSchema = z.object({
  agentId: z.string().default('lead-routing-assistant'),
  considerDrivers: z.boolean().default(true),
  considerChannels: z.boolean().default(true),
  considerValue: z.boolean().default(true),
  considerGeo: z.boolean().default(false),
  autoAssignThreshold: z.number().min(0).max(100).default(80),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.2),
    maxTokens: z.number().min(100).max(2000).default(1500),
    topP: z.number().min(0).max(1).default(1),
    frequencyPenalty: z.number().min(0).max(2).default(0)
  }).optional(),
  fallback: z.object({
    enabled: z.boolean().default(true),
    defaultPipelineId: z.string().uuid().optional(),
    defaultOwnerId: z.string().uuid().optional(),
    escalateToManager: z.boolean().default(true)
  }).optional(),
  outputMapping: z.object({
    savePipelineIdTo: z.string().default('assignedPipelineId'),
    saveOwnerIdTo: z.string().default('assignedOwnerId'),
    saveConfidenceTo: z.string().default('routingConfidence'),
    saveReasoningTo: z.string().default('routingReasoning')
  }).optional()
});

// ==================== INTEGRATION NODES ====================

// MCP Connector Configuration
export const MCPConnectorConfigSchema = z.object({
  serverId: z.string().uuid('Server ID deve essere un UUID valido').nullable(),
  serverName: z.string().optional(), // Display name (populated from serverId)
  toolName: z.string().min(1, 'Nome tool richiesto').nullable(),
  toolDescription: z.string().optional(), // Display description (populated from tool schema)
  parameters: z.record(z.string(), z.any()).default({}),
  timeout: z.number().min(1000).max(300000).default(30000), // 30 seconds default
  retryPolicy: z.object({
    enabled: z.boolean().default(true),
    maxRetries: z.number().min(0).max(5).default(3),
    retryDelayMs: z.number().min(100).default(1000)
  }).optional(),
  errorHandling: z.object({
    onError: z.enum(['fail', 'continue', 'retry']).default('fail'),
    fallbackValue: z.any().optional()
  }).optional()
});

// ==================== CRM ROUTING NODES ====================

// Lead Routing Configuration
export const LeadRoutingConfigSchema = z.object({
  eventType: z.string().default('lead_routing'),
  source: z.enum(['api', 'database', 'webhook', 'internal']).default('internal'),
  filters: z.object({
    source: z.array(z.string()).optional(), // Lead source filter (website, referral, campaign, etc.)
    status: z.array(z.enum(['new', 'contacted', 'qualified', 'unqualified'])).optional(),
    scoreMin: z.number().min(0).max(100).optional(),
    scoreMax: z.number().min(0).max(100).optional(),
    ageDays: z.number().min(0).optional(), // Lead age in days
    assignedTo: z.array(z.string()).optional() // User IDs
  }).optional(),
  branches: z.array(z.object({
    name: z.enum(['Qualificato', 'Non qualificato', 'Hot', 'Warm', 'Cold']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
      value: z.any()
    }))
  })).optional()
});

// Deal Routing Configuration
export const DealRoutingConfigSchema = z.object({
  eventType: z.string().default('deal_routing'),
  source: z.enum(['api', 'database', 'webhook', 'internal']).default('internal'),
  filters: z.object({
    stage: z.array(z.string()).optional(), // Deal stage IDs
    valueMin: z.number().min(0).optional(),
    valueMax: z.number().min(0).optional(),
    probabilityMin: z.number().min(0).max(100).optional(),
    probabilityMax: z.number().min(0).max(100).optional(),
    pipeline: z.array(z.string()).optional(), // Pipeline IDs
    ageDays: z.number().min(0).optional() // Deal age in days
  }).optional(),
  branches: z.array(z.object({
    name: z.enum(['Iniziale', 'In Progress', 'In Attesa', 'Acquisto', 'Finalizzato', 'Archiviato', 'Perso/KO']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
      value: z.any()
    }))
  })).optional()
});

// Customer Routing Configuration
export const CustomerRoutingConfigSchema = z.object({
  eventType: z.string().default('customer_routing'),
  source: z.enum(['api', 'database', 'webhook', 'internal']).default('internal'),
  filters: z.object({
    type: z.array(z.enum(['B2B', 'B2C'])).optional(),
    segment: z.array(z.enum(['VIP', 'Premium', 'Standard', 'Basic'])).optional(),
    lifetimeValueMin: z.number().min(0).optional(),
    lifetimeValueMax: z.number().min(0).optional(),
    contractStatus: z.array(z.enum(['active', 'inactive', 'churned', 'pending'])).optional()
  }).optional(),
  branches: z.array(z.object({
    name: z.enum(['Business', 'Privati', 'VIP', 'Standard', 'Attivo', 'Inattivo']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
      value: z.any()
    }))
  })).optional()
});

// Pipeline Assignment Configuration (assigns leads/deals to specific pipelines based on rules)
export const PipelineAssignmentConfigSchema = z.object({
  pipelineRules: z.array(z.object({
    name: z.string().min(1, "Nome regola obbligatorio"),
    pipelineId: z.string().uuid("Pipeline ID deve essere un UUID valido"),
    pipelineName: z.string().optional(), // Display name (populated from pipelineId)
    // Condizioni per l'assegnazione
    productInterest: z.string().optional(), // Es: "Fibra 1000Mb", "Mobile 5G"
    sourceChannel: z.string().optional(), // Es: "facebook", "instagram", "google_ads"
    minScore: z.number().min(0).max(100).optional(), // Lead score minimo (0-100)
    // Future expansion: location, campaign, etc.
  })).default([]),
  defaultPipelineId: z.string().uuid().optional(), // Fallback pipeline se nessuna regola matcha
  defaultOwnerId: z.string().uuid().optional(), // Owner predefinito
  escalateToManager: z.boolean().default(true), // Escalate se nessun owner trovato
  storeId: z.string().uuid().optional() // Store scope per validazione permessi
});

// ==================== FUNNEL ORCHESTRATION NODES ====================

// Funnel Stage Transition Configuration
export const FunnelStageTransitionConfigSchema = z.object({
  targetStage: z.string().optional(), // Will be required when executing, optional for initial config
  triggerWorkflows: z.boolean().default(true), // Execute stage workflows automatically
  notifyAssignee: z.boolean().default(true),
  auditTrail: z.boolean().default(true)
});

// Funnel Pipeline Transition Configuration
export const FunnelPipelineTransitionConfigSchema = z.object({
  targetPipelineId: z.string().optional(), // Will be UUID validated at runtime, optional for initial config
  targetPipelineName: z.string().optional(), // Display name (populated from API)
  resetStage: z.boolean().default(true), // Reset to first stage of target pipeline
  transitionReason: z.string().optional(), // Required at execution time, optional for initial config
  preserveHistory: z.boolean().default(true),
  notifyTeam: z.boolean().default(true)
});

// AI Funnel Orchestrator Configuration
export const AIFunnelOrchestratorConfigSchema = z.object({
  aiAgentId: z.string().default("funnel-orchestrator-assistant"), // Brand AI Registry agent ID
  confidenceThreshold: z.number().min(0).max(100).default(80), // Auto-assign if confidence > threshold
  suggestThreshold: z.number().min(0).max(100).default(60), // Suggest to user if between this and confidenceThreshold
  fallbackBehavior: z.enum(['maintain_current', 'assign_default', 'escalate_to_manager']).default('maintain_current'),
  defaultPipelineId: z.string().uuid().optional(), // Used if fallbackBehavior is 'assign_default'
  evaluationCriteria: z.array(z.enum([
    'deal_value',
    'customer_segment',
    'lead_score',
    'interaction_quality',
    'historical_patterns',
    'product_interest'
  ])).default(['deal_value', 'customer_segment', 'lead_score']),
  enableLearning: z.boolean().default(true), // Track success/failure for AI improvement
  auditLog: z.boolean().default(true)
});

// Funnel Exit Configuration
export const FunnelExitConfigSchema = z.object({
  exitReason: z.enum(['won', 'lost', 'churned']).optional(), // Required at runtime, optional for initial config
  lostReason: z.string().optional(), // Required if exitReason is 'lost'
  archiveDeal: z.boolean().default(false),
  createCustomerRecord: z.boolean().default(true), // Auto-create customer if won
  notifyTeam: z.boolean().default(true),
  triggerAnalytics: z.boolean().default(true), // Update funnel analytics
  webhookTrigger: z.boolean().default(false) // Trigger external webhooks
});

// Deal Stage Webhook Trigger Configuration
export const DealStageWebhookTriggerConfigSchema = z.object({
  webhookUrl: z.string().optional(), // Required at runtime, optional for initial config (will validate URL format when provided)
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  payloadTemplate: z.enum(['minimal', 'standard', 'full', 'custom']).default('standard'),
  customPayload: z.record(z.string(), z.any()).optional(), // For custom template
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'api_key', 'hmac']),
    credentials: z.record(z.string(), z.string()).optional()
  }).default({ type: 'none' }),
  retryPolicy: z.object({
    enabled: z.boolean().default(true),
    maxRetries: z.number().min(0).max(5).default(3),
    backoffStrategy: z.enum(['linear', 'exponential']).default('exponential'),
    initialDelayMs: z.number().min(1000).default(5000)
  }).optional(),
  timeout: z.number().min(1000).max(60000).default(30000), // 30s default timeout
  triggerOn: z.array(z.enum(['stage_change', 'pipeline_change', 'deal_won', 'deal_lost'])).default(['stage_change'])
});

// ==================== TYPE EXPORTS ====================

export type EmailActionConfig = z.infer<typeof EmailActionConfigSchema>;
export type MCPConnectorConfig = z.infer<typeof MCPConnectorConfigSchema>;
export type ApprovalActionConfig = z.infer<typeof ApprovalActionConfigSchema>;
export type PaymentActionConfig = z.infer<typeof PaymentActionConfigSchema>;
export type TicketActionConfig = z.infer<typeof TicketActionConfigSchema>;
export type SmsActionConfig = z.infer<typeof SmsActionConfigSchema>;

export type TimeTriggerConfig = z.infer<typeof TimeTriggerConfigSchema>;
export type EventTriggerConfig = z.infer<typeof EventTriggerConfigSchema>;
export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;
export type ThresholdTriggerConfig = z.infer<typeof ThresholdTriggerConfigSchema>;

export type AiDecisionConfig = z.infer<typeof AiDecisionConfigSchema>;
export type AiClassificationConfig = z.infer<typeof AiClassificationConfigSchema>;
export type AiContentConfig = z.infer<typeof AiContentConfigSchema>;
export type AIMCPNodeConfig = z.infer<typeof AIMCPNodeConfigSchema>;
export type AILeadRoutingConfig = z.infer<typeof AILeadRoutingConfigSchema>;

export type LeadRoutingConfig = z.infer<typeof LeadRoutingConfigSchema>;
export type DealRoutingConfig = z.infer<typeof DealRoutingConfigSchema>;
export type CustomerRoutingConfig = z.infer<typeof CustomerRoutingConfigSchema>;
export type PipelineAssignmentConfig = z.infer<typeof PipelineAssignmentConfigSchema>;
export type FunnelStageTransitionConfig = z.infer<typeof FunnelStageTransitionConfigSchema>;
export type FunnelPipelineTransitionConfig = z.infer<typeof FunnelPipelineTransitionConfigSchema>;
export type AIFunnelOrchestratorConfig = z.infer<typeof AIFunnelOrchestratorConfigSchema>;
export type FunnelExitConfig = z.infer<typeof FunnelExitConfigSchema>;
export type DealStageWebhookTriggerConfig = z.infer<typeof DealStageWebhookTriggerConfigSchema>;

// Union types for all configurations
export type ActionConfig = EmailActionConfig | ApprovalActionConfig | PaymentActionConfig | TicketActionConfig | SmsActionConfig;
export type TriggerConfig = TimeTriggerConfig | EventTriggerConfig | WebhookTriggerConfig | ThresholdTriggerConfig;
export type AiConfig = AiDecisionConfig | AiClassificationConfig | AiContentConfig | AIMCPNodeConfig | AILeadRoutingConfig;
export type IntegrationConfig = MCPConnectorConfig;
export type RoutingConfig = LeadRoutingConfig | DealRoutingConfig | CustomerRoutingConfig | PipelineAssignmentConfig | FunnelStageTransitionConfig | FunnelPipelineTransitionConfig | AIFunnelOrchestratorConfig | FunnelExitConfig | DealStageWebhookTriggerConfig;

export type NodeConfig = ActionConfig | TriggerConfig | AiConfig | IntegrationConfig | RoutingConfig;