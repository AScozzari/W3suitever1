/**
 * 🎯 CATALOGO CANONICO WORKFLOW NODES
 * Schema TypeScript professionale per Actions, Triggers, AI Nodes
 * Condiviso tra frontend e backend per consistenza
 */

import { z } from 'zod';

// ==================== BASE NODE TYPES ====================

export type NodeCategory = 'action' | 'trigger' | 'ai' | 'condition' | 'flow';

export interface BaseNodeDefinition {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  icon: string; // Lucide icon name
  color: string; // CSS color
  version: string;
  deprecated?: boolean;
  configSchema: z.ZodSchema<any>; // Zod schema for validation
  defaultConfig: Record<string, any>;
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

// ==================== TYPE EXPORTS ====================

export type EmailActionConfig = z.infer<typeof EmailActionConfigSchema>;
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

// Union types for all configurations
export type ActionConfig = EmailActionConfig | ApprovalActionConfig | PaymentActionConfig | TicketActionConfig | SmsActionConfig;
export type TriggerConfig = TimeTriggerConfig | EventTriggerConfig | WebhookTriggerConfig | ThresholdTriggerConfig;
export type AiConfig = AiDecisionConfig | AiClassificationConfig | AiContentConfig;

export type NodeConfig = ActionConfig | TriggerConfig | AiConfig;