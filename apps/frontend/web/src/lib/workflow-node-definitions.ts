/**
 * 🎯 DEFINIZIONI WORKFLOW NODES - ALLINEATE AI BACKEND EXECUTORS
 * Solo nodi con executors backend reali implementati
 */

import {
  BaseNodeDefinition,
  EmailActionConfigSchema,
  ApprovalActionConfigSchema,
  AiDecisionConfigSchema,
  EventTriggerConfigSchema
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
    id: 'auto-approval',
    name: 'Auto Approval',
    description: 'Automatic approval based on business rules (time, amount, role)',
    category: 'action',
    icon: 'CheckCircle2',
    color: '#FF6900',
    version: '1.0.0',
    configSchema: ApprovalActionConfigSchema,
    defaultConfig: {
      approverType: 'automatic',
      rules: {
        maxAmount: 1000,
        businessHours: true,
        requiredRole: 'employee'
      },
      fallback: {
        enabled: true,
        action: 'manual_approval'
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
      title: '',
      description: '',
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
      taskId: '',
      assignToUser: '',
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
      taskId: '',
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
      prompt: 'Analyze the following data and make a decision: {{input}}',
      parameters: {
        temperature: 0.7,
        maxTokens: 500,
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
  ...FLOW_CONTROL_NODES
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
  'create-task': 'task-action-executor',
  'assign-task': 'task-action-executor',
  'update-task-status': 'task-action-executor',
  'task-created': 'task-trigger-executor',
  'task-status-changed': 'task-trigger-executor',
  'task-assigned': 'task-trigger-executor',
  // Routing nodes
  'team-assignment': 'team-routing-executor',
  'user-assignment': 'user-routing-executor',
  // Flow control nodes
  'if-condition': 'if-condition-executor',
  'switch-case': 'switch-case-executor',
  'while-loop': 'while-loop-executor',
  'parallel-fork': 'parallel-fork-executor',
  'join-sync': 'join-sync-executor'
} as const;

export type NodeId = keyof typeof NODE_TO_EXECUTOR_MAPPING;
export type ExecutorId = typeof NODE_TO_EXECUTOR_MAPPING[NodeId];