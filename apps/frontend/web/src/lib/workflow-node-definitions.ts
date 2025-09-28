/**
 * 🎯 DEFINIZIONI SPECIFICHE WORKFLOW NODES
 * Implementazione concreta di tutti i nodi Actions, Triggers, AI
 * Utilizza gli schemi TypeScript da workflow-nodes.ts
 */

import {
  BaseNodeDefinition,
  EmailActionConfigSchema,
  ApprovalActionConfigSchema,
  PaymentActionConfigSchema,
  TicketActionConfigSchema,
  SmsActionConfigSchema,
  TimeTriggerConfigSchema,
  EventTriggerConfigSchema,
  WebhookTriggerConfigSchema,
  ThresholdTriggerConfigSchema,
  AiDecisionConfigSchema,
  AiClassificationConfigSchema,
  AiContentConfigSchema
} from '../types/workflow-nodes';

// ==================== ACTION NODES DEFINITIONS ====================

export const ACTION_NODES: BaseNodeDefinition[] = [
  {
    id: 'send-email',
    name: 'Send Email',
    description: 'Send notification or transactional email to recipients',
    category: 'action',
    icon: 'Mail',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: EmailActionConfigSchema,
    defaultConfig: {
      to: [],
      subject: '',
      template: '',
      priority: 'normal',
      tracking: true
    }
  },
  {
    id: 'approve-request',
    name: 'Approval Request',
    description: 'Request approval from users, roles or teams with escalation',
    category: 'action',
    icon: 'CheckCircle',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: ApprovalActionConfigSchema,
    defaultConfig: {
      approverType: 'specific',
      escalation: {
        enabled: false,
        delayHours: 24,
        escalateTo: [],
        maxLevels: 3
      },
      timeout: {
        hours: 72,
        action: 'escalate'
      }
    }
  },
  {
    id: 'process-payment',
    name: 'Process Payment',
    description: 'Execute financial transaction with verification and scheduling',
    category: 'action',
    icon: 'CreditCard',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: PaymentActionConfigSchema,
    defaultConfig: {
      gateway: 'stripe',
      amount: 0,
      currency: 'EUR',
      description: '',
      recipient: {
        type: 'user'
      },
      verification: {
        required: true,
        methods: ['manager_approval']
      },
      scheduling: {
        immediate: true
      }
    }
  },
  {
    id: 'create-ticket',
    name: 'Create Support Ticket',
    description: 'Create and assign support tickets with auto-routing',
    category: 'action',
    icon: 'Ticket',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: TicketActionConfigSchema,
    defaultConfig: {
      title: '',
      description: '',
      category: 'support',
      priority: 'medium',
      assignee: {
        type: 'auto_assign'
      },
      notifications: {
        onCreate: true,
        onUpdate: true,
        channels: ['email']
      }
    }
  },
  {
    id: 'send-sms',
    name: 'Send SMS',
    description: 'Send SMS notifications to mobile numbers',
    category: 'action',
    icon: 'MessageSquare',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: SmsActionConfigSchema,
    defaultConfig: {
      recipients: [],
      message: '',
      provider: 'twilio',
      tracking: true
    }
  },
  {
    id: 'assign-task',
    name: 'Assign Task',
    description: 'Assign tasks to users or teams with tracking',
    category: 'action',
    icon: 'UserCheck',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: TicketActionConfigSchema, // Reuse ticket schema for tasks
    defaultConfig: {
      title: '',
      description: '',
      category: 'feature',
      priority: 'medium',
      assignee: {
        type: 'specific'
      }
    }
  },
  {
    id: 'calculate-commission',
    name: 'Calculate Commission',
    description: 'Calculate sales commission based on rules and thresholds',
    category: 'action',
    icon: 'Calculator',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: PaymentActionConfigSchema, // Reuse payment schema for calculations
    defaultConfig: {
      gateway: 'bank_transfer',
      amount: 0,
      currency: 'EUR',
      description: 'Sales commission payment'
    }
  },
  {
    id: 'schedule-meeting',
    name: 'Schedule Meeting',
    description: 'Create calendar events and send meeting invitations',
    category: 'action',
    icon: 'Calendar',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EmailActionConfigSchema, // Reuse email schema for invitations
    defaultConfig: {
      to: [],
      subject: 'Meeting Invitation',
      template: 'meeting_invitation',
      priority: 'normal'
    }
  },
  {
    id: 'generate-report',
    name: 'Generate Report',
    description: 'Generate and distribute analytical reports',
    category: 'action',
    icon: 'FileText',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EmailActionConfigSchema, // Reuse email schema for report distribution
    defaultConfig: {
      to: [],
      subject: 'Automated Report',
      template: 'report_template',
      priority: 'normal'
    }
  },
  {
    id: 'update-inventory',
    name: 'Update Inventory',
    description: 'Update stock levels and inventory tracking',
    category: 'action',
    icon: 'Package',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema, // Reuse event schema for inventory updates
    defaultConfig: {
      eventType: 'inventory_update',
      source: 'api'
    }
  },
  {
    id: 'validate-data',
    name: 'Validate Data',
    description: 'Validate input data against business rules',
    category: 'action',
    icon: 'Shield',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema, // Reuse event schema for validation
    defaultConfig: {
      eventType: 'data_validation',
      source: 'internal'
    }
  },
  {
    id: 'backup-system',
    name: 'System Backup',
    description: 'Create automated system backups',
    category: 'action',
    icon: 'HardDrive',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: TimeTriggerConfigSchema, // Reuse time schema for scheduled backups
    defaultConfig: {
      type: 'cron',
      cronExpression: '0 2 * * *', // Daily at 2 AM
      timezone: 'Europe/Rome'
    }
  },
  {
    id: 'manage-leads',
    name: 'Manage Leads',
    description: 'Lead qualification and routing process',
    category: 'action',
    icon: 'Users',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: TicketActionConfigSchema, // Reuse ticket schema for lead management
    defaultConfig: {
      title: 'New Lead',
      description: '',
      category: 'feature',
      priority: 'medium',
      assignee: {
        type: 'team'
      }
    }
  },
  {
    id: 'update-customer',
    name: 'Update Customer',
    description: 'Update customer information and preferences',
    category: 'action',
    icon: 'User',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema, // Reuse event schema for customer updates
    defaultConfig: {
      eventType: 'customer_update',
      source: 'api'
    }
  },
  {
    id: 'launch-campaign',
    name: 'Launch Campaign',
    description: 'Start marketing campaign with targeting',
    category: 'action',
    icon: 'Megaphone',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EmailActionConfigSchema, // Reuse email schema for campaign launch
    defaultConfig: {
      to: [],
      subject: 'Campaign Launch',
      template: 'campaign_template',
      priority: 'high'
    }
  },
  {
    id: 'analyze-performance',
    name: 'Analyze Performance',
    description: 'Performance analytics and KPI calculation',
    category: 'action',
    icon: 'TrendingUp',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: ThresholdTriggerConfigSchema, // Reuse threshold schema for performance analysis
    defaultConfig: {
      metric: 'performance_score',
      operator: 'greater_than',
      value: 80,
      dataSource: {
        type: 'database',
        refreshInterval: 3600
      }
    }
  }
];

// ==================== TRIGGER NODES DEFINITIONS ====================

export const TRIGGER_NODES: BaseNodeDefinition[] = [
  {
    id: 'time-trigger',
    name: 'Time Trigger',
    description: 'Execute workflow based on schedule or time events',
    category: 'trigger',
    icon: 'Clock',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: TimeTriggerConfigSchema,
    defaultConfig: {
      type: 'cron',
      cronExpression: '0 9 * * 1-5', // Weekdays at 9 AM
      timezone: 'Europe/Rome',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        retryDelayMinutes: 5
      }
    }
  },
  {
    id: 'event-trigger',
    name: 'Event Trigger',
    description: 'React to system or business events',
    category: 'trigger',
    icon: 'Zap',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'user_action',
      source: 'api',
      debounce: {
        enabled: false,
        delayMs: 1000
      },
      batchProcessing: {
        enabled: false,
        batchSize: 10,
        timeoutMs: 30000
      }
    }
  },
  {
    id: 'webhook-trigger',
    name: 'Webhook Trigger',
    description: 'Receive external webhook calls to trigger workflows',
    category: 'trigger',
    icon: 'Webhook',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: WebhookTriggerConfigSchema,
    defaultConfig: {
      url: '',
      method: 'POST',
      authentication: {
        type: 'none'
      },
      payload: {
        type: 'json'
      },
      validation: {
        required: false
      },
      retry: {
        maxAttempts: 3,
        backoffMs: 1000
      }
    }
  },
  {
    id: 'threshold-trigger',
    name: 'Threshold Trigger',
    description: 'Monitor metrics and trigger when thresholds are exceeded',
    category: 'trigger',
    icon: 'AlertTriangle',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: ThresholdTriggerConfigSchema,
    defaultConfig: {
      metric: 'cpu_usage',
      operator: 'greater_than',
      value: 80,
      dataSource: {
        type: 'metric_service',
        refreshInterval: 300
      },
      window: {
        type: 'rolling',
        duration: 300,
        aggregation: 'avg'
      },
      cooldown: {
        enabled: true,
        durationMs: 300000
      }
    }
  },
  {
    id: 'form-trigger',
    name: 'Form Submission',
    description: 'Trigger workflow when forms are submitted',
    category: 'trigger',
    icon: 'FileInput',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'form_submission',
      source: 'api'
    }
  },
  {
    id: 'api-trigger',
    name: 'API Call',
    description: 'Trigger workflow via REST API endpoint',
    category: 'trigger',
    icon: 'Code',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: WebhookTriggerConfigSchema,
    defaultConfig: {
      url: '/api/workflow/trigger',
      method: 'POST',
      authentication: {
        type: 'bearer'
      }
    }
  },
  {
    id: 'email-trigger',
    name: 'Email Received',
    description: 'Trigger workflow when emails are received',
    category: 'trigger',
    icon: 'MailOpen',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'email_received',
      source: 'api'
    }
  },
  {
    id: 'database-trigger',
    name: 'Database Change',
    description: 'Monitor database changes and trigger workflows',
    category: 'trigger',
    icon: 'Database',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'database_change',
      source: 'database'
    }
  }
];

// ==================== AI NODES DEFINITIONS ====================

export const AI_NODES: BaseNodeDefinition[] = [
  {
    id: 'ai-decision',
    name: 'AI Decision',
    description: 'Make intelligent decisions using AI models',
    category: 'ai',
    icon: 'Brain',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: AiDecisionConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      prompt: 'Analyze the following data and make a decision: {{input}}',
      parameters: {
        temperature: 0.7,
        maxTokens: 500,
        topP: 1,
        frequencyPenalty: 0
      },
      outputs: [
        { condition: 'approve', path: 'approve' },
        { condition: 'reject', path: 'reject' }
      ],
      fallback: {
        enabled: true,
        defaultPath: 'manual_review',
        timeout: 30000
      }
    }
  },
  {
    id: 'ai-classification',
    name: 'AI Classification',
    description: 'Classify content using AI models',
    category: 'ai',
    icon: 'Tags',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: AiClassificationConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      inputField: 'content',
      categories: [
        { name: 'urgent', description: 'Requires immediate attention' },
        { name: 'normal', description: 'Standard priority' },
        { name: 'low', description: 'Can be handled later' }
      ],
      confidence: {
        threshold: 0.8,
        requireAboveThreshold: true
      },
      preprocessing: {
        lowercase: true,
        removeStopWords: false,
        maxLength: 1000
      },
      postprocessing: {
        defaultCategory: 'normal',
        logResults: true
      }
    }
  },
  {
    id: 'ai-content',
    name: 'AI Content Generation',
    description: 'Generate content using AI models',
    category: 'ai',
    icon: 'PenTool',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: AiContentConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      contentType: 'email',
      prompt: 'Generate professional content for: {{context}}',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        style: 'formal',
        language: 'it'
      },
      validation: {
        minLength: 50,
        maxLength: 2000
      },
      output: {
        format: 'text'
      }
    }
  },
  {
    id: 'ai-sentiment',
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment of text content',
    category: 'ai',
    icon: 'Heart',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: AiClassificationConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      inputField: 'text',
      categories: [
        { name: 'positive', description: 'Positive sentiment' },
        { name: 'neutral', description: 'Neutral sentiment' },
        { name: 'negative', description: 'Negative sentiment' }
      ],
      confidence: {
        threshold: 0.7,
        requireAboveThreshold: false
      }
    }
  },
  {
    id: 'ai-translation',
    name: 'AI Translation',
    description: 'Translate content between languages',
    category: 'ai',
    icon: 'Languages',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: AiContentConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      contentType: 'translation',
      prompt: 'Translate the following text from {{source_lang}} to {{target_lang}}: {{text}}',
      parameters: {
        temperature: 0.3,
        maxTokens: 2000,
        language: 'it'
      }
    }
  },
  {
    id: 'ai-summarization',
    name: 'AI Summarization',
    description: 'Generate summaries of long content',
    category: 'ai',
    icon: 'FileText',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: AiContentConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      contentType: 'summary',
      prompt: 'Summarize the following content in {{summary_length}} words: {{content}}',
      parameters: {
        temperature: 0.5,
        maxTokens: 500,
        language: 'it'
      }
    }
  },
  {
    id: 'ai-routing',
    name: 'AI Routing',
    description: 'Intelligently route requests based on content',
    category: 'ai',
    icon: 'Route',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: AiDecisionConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      prompt: 'Route this request to the appropriate department: {{request}}',
      outputs: [
        { condition: 'hr', path: 'hr_department' },
        { condition: 'finance', path: 'finance_department' },
        { condition: 'sales', path: 'sales_department' },
        { condition: 'support', path: 'support_department' }
      ]
    }
  }
];

// ==================== COMBINED CATALOG ====================

export const ALL_WORKFLOW_NODES: BaseNodeDefinition[] = [
  ...ACTION_NODES,
  ...TRIGGER_NODES,
  ...AI_NODES
];

// Helper functions for node management
export const getNodeById = (id: string): BaseNodeDefinition | undefined => {
  return ALL_WORKFLOW_NODES.find(node => node.id === id);
};

export const getNodesByCategory = (category: string): BaseNodeDefinition[] => {
  return ALL_WORKFLOW_NODES.filter(node => node.category === category);
};

export const getActionNodes = (): BaseNodeDefinition[] => ACTION_NODES;
export const getTriggerNodes = (): BaseNodeDefinition[] => TRIGGER_NODES;
export const getAiNodes = (): BaseNodeDefinition[] => AI_NODES;