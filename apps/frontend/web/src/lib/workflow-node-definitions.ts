/**
 * 🎯 DEFINIZIONI WORKFLOW NODES - ALLINEATE AI BACKEND EXECUTORS
 * Solo nodi con executors backend reali implementati
 */

import {
  BaseNodeDefinition,
  EmailActionConfigSchema,
  ApprovalActionConfigSchema,
  AiDecisionConfigSchema,
  AILeadRoutingConfigSchema,
  EventTriggerConfigSchema,
  MCPConnectorConfigSchema,
  AIMCPNodeConfigSchema,
  LeadRoutingConfigSchema,
  DealRoutingConfigSchema,
  CustomerRoutingConfigSchema,
  PipelineAssignmentConfigSchema,
  FunnelStageTransitionConfigSchema,
  FunnelPipelineTransitionConfigSchema,
  AIFunnelOrchestratorConfigSchema,
  FunnelExitConfigSchema,
  DealStageWebhookTriggerConfigSchema,
  ScheduleTriggerConfigSchema,
  WebhookInboundTriggerConfigSchema,
  ErrorTriggerConfigSchema,
  ManualTriggerConfigSchema
} from '../types/workflow-nodes';
import { ALL_MCP_NODES } from './mcp-node-definitions';

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
      to: ['workflow@windtre.it'], // Min 1 recipient required by schema (RFC-compliant)
      subject: 'Notifica Workflow', // Non-empty required by schema
      template: 'workflow_notification', // Non-empty required by schema
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
      approverType: 'role', // Valid enum value
      roles: ['manager'], // Required array for role-based approval
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
    id: 'auto-approval',
    name: 'Auto Approval',
    description: 'Automatic approval based on business rules (time, amount, role)',
    category: 'action',
    icon: 'CheckCircle2',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: ApprovalActionConfigSchema,
    defaultConfig: {
      approverType: 'role', // Valid enum value
      roles: ['employee'], // Required per schema
      autoApprove: {
        enabled: true,
        conditions: [
          { field: 'amount', operator: 'less_than', value: 1000 },
          { field: 'role', operator: 'equals', value: 'employee' }
        ]
      },
      timeout: {
        hours: 72,
        action: 'auto_approve'
      }
    }
  },
  {
    id: 'decision-evaluator',
    name: 'Decision Evaluator',
    description: 'Evaluate conditions and make routing decisions',
    category: 'action',
    icon: 'GitBranch',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema, // Reuse for condition evaluation
    defaultConfig: {
      eventType: 'condition_check',
      source: 'internal',
      conditions: [
        { field: 'amount', operator: 'greater_than', value: 500 },
        { field: 'priority', operator: 'equals', value: 'high' }
      ]
    }
  },
  {
    id: 'generic-action',
    name: 'Generic Action',
    description: 'Generic action executor for custom business logic',
    category: 'action',
    icon: 'Settings',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'generic_action',
      source: 'internal',
      customLogic: {
        enabled: true,
        fallback: 'success'
      }
    }
  },
  {
    id: 'create-task',
    name: 'Create Task',
    description: 'Create a new task with title, description, priority and urgency',
    category: 'action',
    icon: 'CheckSquare',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      action: 'create',
      title: 'Nuova richiesta: {{request_type}}',
      description: 'Task generato dal workflow per {{requester.name}} - {{description}}',
      status: 'todo',
      priority: 'medium',
      urgency: 'medium',
      department: null,
      assignToUser: null
    }
  },
  {
    id: 'assign-task',
    name: 'Assign Task',
    description: 'Assign existing task to user or role',
    category: 'action',
    icon: 'UserPlus',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      action: 'assign',
      taskId: '{{workflow.taskId}}',
      assignToUser: '{{assignee.id}}',
      role: 'assignee'
    }
  },
  {
    id: 'update-task-status',
    name: 'Update Task Status',
    description: 'Change task status (todo, in_progress, review, done, archived)',
    category: 'action',
    icon: 'RefreshCw',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      action: 'update_status',
      taskId: '{{workflow.taskId}}',
      newStatus: 'in_progress'
    }
  }
];

// ==================== TRIGGER NODES DEFINITIONS ====================

export const TRIGGER_NODES: BaseNodeDefinition[] = [
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
      source: 'api',
      validation: {
        required: true,
        schema: 'default'
      }
    }
  },
  {
    id: 'task-created',
    name: 'Task Created',
    description: 'Trigger workflow when a new task is created',
    category: 'trigger',
    icon: 'PlusSquare',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'task_created',
      source: 'tasks',
      filters: {
        department: null,
        priority: null,
        createdBy: null
      }
    }
  },
  {
    id: 'task-status-changed',
    name: 'Task Status Changed',
    description: 'Trigger workflow when task status changes',
    category: 'trigger',
    icon: 'GitBranch',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'task_status_changed',
      source: 'tasks',
      filters: {
        fromStatus: null,
        toStatus: null,
        department: null
      }
    }
  },
  {
    id: 'task-assigned',
    name: 'Task Assigned',
    description: 'Trigger workflow when task is assigned to user',
    category: 'trigger',
    icon: 'UserCheck',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      eventType: 'task_assigned',
      source: 'tasks',
      filters: {
        assignedTo: null,
        role: 'assignee',
        department: null
      }
    }
  },
  {
    id: 'schedule-trigger',
    name: 'Schedule',
    description: 'Execute workflow on a schedule (intervals or cron expressions)',
    category: 'trigger',
    icon: 'Clock',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: ScheduleTriggerConfigSchema,
    defaultConfig: {
      mode: 'simple',
      simple: {
        interval: 'hours',
        value: 24,
        hour: 9,
        minute: 0
      },
      enabled: true,
      executeOnce: false,
      retryPolicy: {
        maxRetries: 3,
        retryDelayMinutes: 5
      }
    }
  },
  {
    id: 'webhook-inbound-trigger',
    name: 'Webhook',
    description: 'Receive HTTP requests from external systems and trigger workflows',
    category: 'trigger',
    icon: 'Webhook',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: WebhookInboundTriggerConfigSchema,
    defaultConfig: {
      path: `/webhook/${Math.random().toString(36).substring(2, 15)}`,
      httpMethod: 'POST',
      authentication: {
        type: 'none'
      },
      respondMode: 'immediately',
      responseCode: 200,
      responseData: 'all_entries',
      options: {
        allowedOrigins: '*',
        binaryData: false,
        ignoreBots: true,
        rawBody: false,
        maxPayloadSizeMB: 16,
        responseContentType: 'application/json'
      }
    }
  },
  {
    id: 'error-trigger',
    name: 'Error Trigger',
    description: 'Catch and handle errors from other workflows for monitoring and recovery',
    category: 'trigger',
    icon: 'AlertTriangle',
    color: '#DC2626', // Red for errors
    version: '1.0.0',
    configSchema: ErrorTriggerConfigSchema,
    defaultConfig: {
      scope: 'all_workflows',
      errorTypes: ['execution_error'],
      triggerOn: 'after_retries_exhausted',
      debounce: {
        enabled: true,
        windowMinutes: 5,
        maxTriggersPerWindow: 10
      },
      notificationChannels: ['email'],
      autoRecover: {
        enabled: false,
        maxAttempts: 3,
        strategyType: 'retry'
      }
    }
  },
  {
    id: 'manual-trigger',
    name: 'Manual Trigger',
    description: 'Manually execute workflow for testing and development purposes',
    category: 'trigger',
    icon: 'Play',
    color: '#10B981', // Green for manual execution
    version: '1.0.0',
    configSchema: ManualTriggerConfigSchema,
    defaultConfig: {
      testPayload: {},
      mockContext: {},
      description: 'Click Execute to run this workflow manually',
      executionMode: 'async'
    }
  }
];

// ==================== AI NODES DEFINITIONS ====================

export const AI_NODES: BaseNodeDefinition[] = [
  {
    id: 'ai-decision',
    name: 'AI Decision',
    description: 'Make intelligent decisions using AI models via workflow-assistant',
    category: 'ai',
    icon: 'Brain',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: AiDecisionConfigSchema,
    defaultConfig: {
      model: 'gpt-3.5-turbo',
      prompt: 'Analizza questa richiesta e decidi se approvarla:\n- Importo: {{amount}}€\n- Richiedente: {{requester.name}}\n- Dipartimento: {{department}}\n- Motivazione: {{reason}}\n\nCriteri: approva se importo < 1000€ e motivazione valida',
      parameters: {
        temperature: 0.3,
        maxTokens: 200,
        topP: 1,
        frequencyPenalty: 0
      },
      outputs: [
        { condition: 'approve', path: 'approve' },
        { condition: 'reject', path: 'reject' },
        { condition: 'escalate', path: 'escalate' }
      ],
      fallback: {
        enabled: true,
        defaultPath: 'manual_review',
        timeout: 30000
      }
    }
  },
  {
    id: 'ai-mcp-node',
    name: 'AI MCP Orchestrator',
    description: 'AI-powered orchestration of MCP tools with OpenAI function calling',
    category: 'ai',
    icon: 'BrainCircuit',
    color: '#7B2CBF', // WindTre Purple for AI integration
    version: '1.0.0',
    configSchema: AIMCPNodeConfigSchema,
    defaultConfig: {
      model: 'gpt-4',
      instructions: 'Sei un assistente AI che orchestra servizi esterni via MCP. Analizza il contesto del workflow e decidi quali tools chiamare e con quali parametri.',
      enabledTools: [],
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1,
        frequencyPenalty: 0
      },
      fallback: {
        enabled: true,
        defaultAction: 'manual_review',
        timeout: 60000
      },
      outputMapping: {
        saveResultTo: 'aiResponse',
        saveFunctionCallsTo: 'executedFunctions'
      }
    }
  },
  {
    id: 'ai-lead-routing',
    name: 'AI Lead Routing',
    description: 'Intelligent CRM lead routing using AI analysis of drivers, channels, and business context',
    category: 'ai',
    icon: 'Sparkles',
    color: '#FF6900', // WindTre Orange for CRM
    version: '1.0.0',
    configSchema: AILeadRoutingConfigSchema,
    defaultConfig: {
      agentId: 'lead-routing-assistant',
      considerDrivers: true,
      considerChannels: true,
      considerValue: true,
      considerGeo: false,
      autoAssignThreshold: 80,
      parameters: {
        temperature: 0.2,
        maxTokens: 1500,
        topP: 1,
        frequencyPenalty: 0
      },
      fallback: {
        enabled: true,
        defaultPipelineId: undefined,
        defaultOwnerId: undefined,
        escalateToManager: true
      },
      outputMapping: {
        savePipelineIdTo: 'assignedPipelineId',
        saveOwnerIdTo: 'assignedOwnerId',
        saveConfidenceTo: 'routingConfidence',
        saveReasoningTo: 'routingReasoning'
      }
    }
  }
];

// ==================== ROUTING NODES DEFINITIONS ====================

export const ROUTING_NODES: BaseNodeDefinition[] = [
  {
    id: 'team-assignment',
    name: 'Team Assignment',
    description: 'Route workflow to team (auto-selected via team_workflow_assignments or manual)',
    category: 'routing',
    icon: 'Users',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      assignmentMode: 'auto', // 'auto' | 'manual'
      teamId: null,           // Solo se manual
      forDepartment: null,    // Usa team_workflow_assignments se auto
      priority: 100,
      fallbackToAny: true     // Se non trova team, usa qualsiasi disponibile
    }
  },
  {
    id: 'user-assignment',
    name: 'User Assignment',
    description: 'Assign workflow to specific user(s) with parallel/sequential execution',
    category: 'routing',
    icon: 'UserCheck',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      userIds: [],              // Multi-select utenti
      assignmentType: 'all',    // 'all' (tutti) | 'any' (primo) | 'sequential' (in sequenza)
      waitForAll: true,         // Aspetta tutti o primo che completa
      escalation: {
        enabled: false,
        afterHours: 24,
        escalateTo: []
      }
    }
  },
  {
    id: 'lead-routing',
    name: 'Lead Routing',
    description: 'Route leads based on source, status, score, age and assignment',
    category: 'routing',
    icon: 'UserSearch',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: LeadRoutingConfigSchema,
    defaultConfig: {
      eventType: 'lead_routing',
      source: 'internal',
      filters: {
        source: [],
        status: [],
        scoreMin: 0,
        scoreMax: 100,
        ageDays: null,
        assignedTo: []
      },
      branches: [
        { name: 'Qualificato', conditions: [{ field: 'status', operator: 'equals', value: 'qualified' }] },
        { name: 'Non qualificato', conditions: [{ field: 'status', operator: 'equals', value: 'unqualified' }] },
        { name: 'Hot', conditions: [{ field: 'score', operator: 'greater_than', value: 80 }] },
        { name: 'Warm', conditions: [{ field: 'score', operator: 'greater_than', value: 50 }] },
        { name: 'Cold', conditions: [{ field: 'score', operator: 'less_than', value: 50 }] }
      ]
    }
  },
  {
    id: 'deal-routing',
    name: 'Deal Routing',
    description: 'Route deals based on stage, value, probability, pipeline and age',
    category: 'routing',
    icon: 'DollarSign',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: DealRoutingConfigSchema,
    defaultConfig: {
      eventType: 'deal_routing',
      source: 'internal',
      filters: {
        stage: [],
        valueMin: 0,
        valueMax: null,
        probabilityMin: 0,
        probabilityMax: 100,
        pipeline: [],
        ageDays: null
      },
      branches: [
        { name: 'Iniziale', conditions: [{ field: 'stage', operator: 'equals', value: 'initial' }] },
        { name: 'In Progress', conditions: [{ field: 'stage', operator: 'equals', value: 'in_progress' }] },
        { name: 'In Attesa', conditions: [{ field: 'stage', operator: 'equals', value: 'waiting' }] },
        { name: 'Acquisto', conditions: [{ field: 'stage', operator: 'equals', value: 'purchase' }] },
        { name: 'Finalizzato', conditions: [{ field: 'stage', operator: 'equals', value: 'finalized' }] },
        { name: 'Archiviato', conditions: [{ field: 'stage', operator: 'equals', value: 'archived' }] },
        { name: 'Perso/KO', conditions: [{ field: 'stage', operator: 'equals', value: 'lost' }] }
      ]
    }
  },
  {
    id: 'customer-routing',
    name: 'Customer Routing',
    description: 'Route customers based on type, segment, lifetime value and contract status',
    category: 'routing',
    icon: 'Users2',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: CustomerRoutingConfigSchema,
    defaultConfig: {
      eventType: 'customer_routing',
      source: 'internal',
      filters: {
        type: [],
        segment: [],
        lifetimeValueMin: 0,
        lifetimeValueMax: null,
        contractStatus: []
      },
      branches: [
        { name: 'Business', conditions: [{ field: 'type', operator: 'equals', value: 'B2B' }] },
        { name: 'Privati', conditions: [{ field: 'type', operator: 'equals', value: 'B2C' }] },
        { name: 'VIP', conditions: [{ field: 'segment', operator: 'equals', value: 'VIP' }] },
        { name: 'Standard', conditions: [{ field: 'segment', operator: 'equals', value: 'Standard' }] },
        { name: 'Attivo', conditions: [{ field: 'contractStatus', operator: 'equals', value: 'active' }] },
        { name: 'Inattivo', conditions: [{ field: 'contractStatus', operator: 'in', value: ['inactive', 'churned'] }] }
      ]
    }
  },
  {
    id: 'pipeline-assignment',
    name: 'Pipeline Assignment',
    description: 'Assign leads/deals to specific pipelines based on dynamic rules (product interest, source channel, lead score)',
    category: 'routing',
    icon: 'GitMerge',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: PipelineAssignmentConfigSchema,
    defaultConfig: {
      pipelineRules: [],
      defaultPipelineId: undefined,
      defaultOwnerId: undefined,
      escalateToManager: true,
      storeId: undefined
    }
  },
  {
    id: 'funnel-stage-transition',
    name: 'Funnel Stage Transition',
    description: 'Move deal to a different stage within current pipeline with automatic workflow triggers',
    category: 'routing',
    icon: 'MoveHorizontal',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: FunnelStageTransitionConfigSchema,
    defaultConfig: {
      triggerWorkflows: true,
      notifyAssignee: true,
      auditTrail: true
    }
  },
  {
    id: 'funnel-pipeline-transition',
    name: 'Funnel Pipeline Transition',
    description: 'Move deal to a different pipeline within same funnel with optional stage reset',
    category: 'routing',
    icon: 'GitBranch',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: FunnelPipelineTransitionConfigSchema,
    defaultConfig: {
      resetStage: true,
      preserveHistory: true,
      notifyTeam: true
    }
  },
  {
    id: 'ai-funnel-orchestrator',
    name: 'AI Funnel Orchestrator',
    description: 'Intelligent AI-powered routing to determine next best pipeline based on deal context and historical patterns',
    category: 'routing',
    icon: 'Brain',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: AIFunnelOrchestratorConfigSchema,
    defaultConfig: {
      aiAgentId: 'funnel-orchestrator-assistant',
      confidenceThreshold: 80,
      suggestThreshold: 60,
      fallbackBehavior: 'maintain_current',
      defaultPipelineId: undefined,
      evaluationCriteria: ['deal_value', 'customer_segment', 'lead_score'],
      enableLearning: true,
      auditLog: true
    }
  },
  {
    id: 'funnel-exit',
    name: 'Funnel Exit',
    description: 'Close deal and exit funnel with outcome tracking (won/lost/churned) and customer record creation',
    category: 'routing',
    icon: 'DoorOpen',
    color: '#7B2CBF', // WindTre Purple
    version: '1.0.0',
    configSchema: FunnelExitConfigSchema,
    defaultConfig: {
      archiveDeal: false,
      createCustomerRecord: true,
      notifyTeam: true,
      triggerAnalytics: true,
      webhookTrigger: false
    }
  },
  {
    id: 'deal-stage-webhook-trigger',
    name: 'Deal Stage Webhook',
    description: 'Trigger external webhooks on deal stage/pipeline changes with retry policy and authentication',
    category: 'routing',
    icon: 'Webhook',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: DealStageWebhookTriggerConfigSchema,
    defaultConfig: {
      method: 'POST',
      payloadTemplate: 'standard',
      authentication: { type: 'none' },
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelayMs: 5000
      },
      timeout: 30000,
      triggerOn: ['stage_change']
    }
  }
];

// ==================== INTEGRATION NODES DEFINITIONS ====================

export const INTEGRATION_NODES: BaseNodeDefinition[] = [
  {
    id: 'mcp-connector',
    name: 'MCP Connector',
    description: 'Connect to external services via Model Context Protocol (Google, Meta, AWS, Microsoft)',
    category: 'integration',
    icon: 'Plug',
    color: '#FF6900', // WindTre Orange
    version: '1.0.0',
    configSchema: MCPConnectorConfigSchema,
    defaultConfig: {
      serverId: null, // Will be populated from dropdown
      serverName: null, // Will be populated from serverId
      toolName: null, // Will be populated from tool selection
      toolDescription: null, // Will be populated from tool schema
      parameters: {},
      timeout: 30000, // 30 seconds
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        retryDelayMs: 1000
      },
      errorHandling: {
        onError: 'fail',
        fallbackValue: null
      }
    }
  }
];

// ==================== FLOW CONTROL NODES DEFINITIONS ====================

export const FLOW_CONTROL_NODES: BaseNodeDefinition[] = [
  {
    id: 'if-condition',
    name: 'IF Condition',
    description: 'Conditional branch with true/false paths',
    category: 'flow-control',
    icon: 'GitBranch',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      conditions: [
        { field: 'amount', operator: 'greater_than', value: 1000 }
      ],
      logic: 'AND', // 'AND' | 'OR'
      truePath: null,   // Node ID per true
      falsePath: null   // Node ID per false
    }
  },
  {
    id: 'switch-case',
    name: 'Switch Case',
    description: 'Multi-branch decision based on variable value',
    category: 'flow-control',
    icon: 'Split',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      variable: 'status',
      cases: [
        { value: 'urgent', label: 'Urgent', path: null },
        { value: 'normal', label: 'Normal', path: null },
        { value: 'low', label: 'Low', path: null }
      ],
      defaultPath: null  // Fallback path
    }
  },
  {
    id: 'while-loop',
    name: 'While Loop',
    description: 'Repeat actions while condition is true',
    category: 'flow-control',
    icon: 'RotateCw',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      condition: { field: 'retries', operator: 'less_than', value: 3 },
      maxIterations: 10,      // Safety limit
      loopBody: null,         // Node ID da eseguire in loop
      exitPath: null,         // Node ID quando esce
      incrementVar: 'retries' // Variabile da incrementare
    }
  },
  {
    id: 'parallel-fork',
    name: 'Parallel Fork',
    description: 'Execute multiple branches in parallel',
    category: 'flow-control',
    icon: 'GitMerge',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      branches: [
        { name: 'Branch A', startNode: null, color: '#FF6900' },
        { name: 'Branch B', startNode: null, color: '#7B2CBF' }
      ],
      waitFor: 'all', // 'all' | 'any' | 'first'
      timeout: 3600   // seconds
    }
  },
  {
    id: 'join-sync',
    name: 'Join/Sync',
    description: 'Synchronize parallel branches before continuing',
    category: 'flow-control',
    icon: 'Merge',
    color: '#7B2CBF',
    version: '1.0.0',
    configSchema: EventTriggerConfigSchema,
    defaultConfig: {
      waitForAll: true,
      timeout: 3600,          // seconds
      onTimeout: 'continue',  // 'continue' | 'fail' | 'retry'
      aggregateResults: true  // Combina risultati da tutti i branch
    }
  }
];

// ==================== COMBINED CATALOG ====================

export const ALL_WORKFLOW_NODES: BaseNodeDefinition[] = [
  ...ACTION_NODES,
  ...TRIGGER_NODES,
  ...AI_NODES,
  ...ROUTING_NODES,
  ...INTEGRATION_NODES,
  ...FLOW_CONTROL_NODES,
  ...ALL_MCP_NODES
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
export const getRoutingNodes = (): BaseNodeDefinition[] => ROUTING_NODES;
export const getIntegrationNodes = (): BaseNodeDefinition[] => INTEGRATION_NODES;
export const getFlowControlNodes = (): BaseNodeDefinition[] => FLOW_CONTROL_NODES;

// ==================== EXECUTOR MAPPING ====================

/**
 * Mapping tra IDs nodi frontend e backend executors
 * Utilizzato dal ReactFlow Bridge Parser
 */
export const NODE_TO_EXECUTOR_MAPPING = {
  'send-email': 'email-action-executor',
  'approve-request': 'approval-action-executor', 
  'auto-approval': 'auto-approval-executor',
  'decision-evaluator': 'decision-evaluator',
  'generic-action': 'generic-action-executor',
  'form-trigger': 'form-trigger-executor',
  'ai-decision': 'ai-decision-executor',
  'ai-mcp-node': 'ai-mcp-executor',
  'ai-lead-routing': 'ai-lead-routing-executor',
  'create-task': 'task-action-executor',
  'assign-task': 'task-action-executor',
  'update-task-status': 'task-action-executor',
  'task-created': 'task-trigger-executor',
  'task-status-changed': 'task-trigger-executor',
  'task-assigned': 'task-trigger-executor',
  // Routing nodes
  'team-assignment': 'team-routing-executor',
  'user-assignment': 'user-routing-executor',
  'lead-routing': 'lead-routing-executor',
  'deal-routing': 'deal-routing-executor',
  'customer-routing': 'customer-routing-executor',
  // Flow control nodes
  'if-condition': 'if-condition-executor',
  'switch-case': 'switch-case-executor',
  'while-loop': 'while-loop-executor',
  'parallel-fork': 'parallel-fork-executor',
  'join-sync': 'join-sync-executor',
  // Integration nodes
  'mcp-connector': 'mcp-connector-executor',
  // MCP nodes (all use mcp-connector-executor)
  'mcp-google-gmail-send': 'mcp-connector-executor'
} as const;

export type NodeId = keyof typeof NODE_TO_EXECUTOR_MAPPING;
export type ExecutorId = typeof NODE_TO_EXECUTOR_MAPPING[NodeId];