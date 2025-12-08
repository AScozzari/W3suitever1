/**
 * 🎯 NODE TYPE DEFINITIONS
 * 
 * Defines all available workflow node types and their categorization
 * for the workflow builder palette.
 */

import type { NodePaletteCategory } from '../types';

/**
 * Complete node palette organized by category
 */
export const NODE_PALETTE: NodePaletteCategory[] = [
  {
    id: 'triggers',
    label: 'Triggers',
    nodes: [
      {
        type: 'start',
        label: 'Start',
        description: 'Workflow entry point',
        icon: 'Play'
      },
      {
        type: 'trigger',
        label: 'Form Trigger',
        description: 'Triggers workflow on form submission',
        executorId: 'form-trigger-executor',
        icon: 'FileText'
      },
      {
        type: 'trigger',
        label: 'Task Trigger',
        description: 'Triggers workflow on task events',
        executorId: 'task-trigger-executor',
        icon: 'CheckSquare'
      }
    ]
  },
  {
    id: 'actions',
    label: 'Actions',
    nodes: [
      {
        type: 'action',
        label: 'Send Email',
        description: 'Send email notification',
        executorId: 'email-action-executor',
        icon: 'Mail'
      },
      {
        type: 'approval',
        label: 'Approval Request',
        description: 'Request approval from user/team',
        executorId: 'approval-action-executor',
        icon: 'UserCheck'
      },
      {
        type: 'approval',
        label: 'Auto Approval',
        description: 'Automatically approve based on rules',
        executorId: 'auto-approval-executor',
        icon: 'CheckCircle'
      },
      {
        type: 'action',
        label: 'Generic Action',
        description: 'Execute custom workflow action',
        executorId: 'generic-action-executor',
        icon: 'Zap'
      }
    ]
  },
  {
    id: 'decisions',
    label: 'Decisions',
    nodes: [
      {
        type: 'decision',
        label: 'Decision',
        description: 'Evaluate conditions and branch',
        executorId: 'decision-evaluator',
        icon: 'GitBranch'
      },
      {
        type: 'ai-decision',
        label: 'AI Decision',
        description: 'AI-powered intelligent decision',
        executorId: 'ai-decision-executor',
        icon: 'Sparkles'
      },
      {
        type: 'switch-case',
        label: 'Switch Case',
        description: 'Multiple condition routing',
        executorId: 'switch-case-executor',
        icon: 'ListTree'
      }
    ]
  },
  {
    id: 'routing',
    label: 'Routing',
    nodes: [
      {
        type: 'routing',
        label: 'Route Lead',
        description: 'Route lead to team/user',
        executorId: 'lead-routing-executor',
        icon: 'UserPlus'
      },
      {
        type: 'routing',
        label: 'Route Deal',
        description: 'Route deal to pipeline/stage',
        executorId: 'deal-routing-executor',
        icon: 'TrendingUp'
      },
      {
        type: 'routing',
        label: 'Route Customer',
        description: 'Route customer to team',
        executorId: 'customer-routing-executor',
        icon: 'Users'
      }
    ]
  },
  {
    id: 'campaign',
    label: 'Campaign',
    nodes: [
      {
        type: 'campaign-lead-intake',
        label: 'Campaign Lead Intake',
        description: 'Process incoming campaign leads',
        executorId: 'campaign-lead-intake-executor',
        icon: 'Megaphone'
      },
      {
        type: 'pipeline-assignment',
        label: 'Pipeline Assignment',
        description: 'Assign deal to pipeline',
        executorId: 'pipeline-assignment-executor',
        icon: 'GitMerge'
      }
    ]
  },
  {
    id: 'funnel',
    label: 'Funnel',
    nodes: [
      {
        type: 'funnel-stage-transition',
        label: 'Funnel Stage Transition',
        description: 'Move deal between stages',
        executorId: 'funnel-stage-transition-executor',
        icon: 'ArrowRight'
      },
      {
        type: 'funnel-pipeline-transition',
        label: 'Funnel Pipeline Transition',
        description: 'Move deal between pipelines',
        executorId: 'funnel-pipeline-transition-executor',
        icon: 'ArrowRightLeft'
      },
      {
        type: 'ai-funnel-orchestrator',
        label: 'AI Funnel Orchestrator',
        description: 'AI-powered funnel routing',
        executorId: 'ai-funnel-orchestrator-executor',
        icon: 'Bot'
      },
      {
        type: 'funnel-exit',
        label: 'Funnel Exit',
        description: 'Handle funnel exit',
        executorId: 'funnel-exit-executor',
        icon: 'LogOut'
      },
      {
        type: 'deal-stage-webhook-trigger',
        label: 'Deal Stage Webhook',
        description: 'Trigger webhook on stage change',
        executorId: 'deal-stage-webhook-trigger-executor',
        icon: 'Webhook'
      }
    ]
  },
  {
    id: 'control',
    label: 'Control Flow',
    nodes: [
      {
        type: 'while-loop',
        label: 'While Loop',
        description: 'Repeat while condition true',
        executorId: 'while-loop-executor',
        icon: 'RotateCw'
      },
      {
        type: 'parallel-fork',
        label: 'Parallel Fork',
        description: 'Execute branches in parallel',
        executorId: 'parallel-fork-executor',
        icon: 'Split'
      },
      {
        type: 'join-sync',
        label: 'Join Sync',
        description: 'Synchronize parallel branches',
        executorId: 'join-sync-executor',
        icon: 'Merge'
      }
    ]
  },
  {
    id: 'end',
    label: 'End',
    nodes: [
      {
        type: 'end',
        label: 'End',
        description: 'Workflow completion',
        icon: 'StopCircle'
      }
    ]
  }
];

/**
 * Get node palette item by executor ID
 */
export function getNodeByExecutorId(executorId: string) {
  for (const category of NODE_PALETTE) {
    const node = category.nodes.find(n => n.executorId === executorId);
    if (node) return node;
  }
  return null;
}

/**
 * Get all executor IDs from palette
 */
export function getAllExecutorIds(): string[] {
  const ids: string[] = [];
  for (const category of NODE_PALETTE) {
    for (const node of category.nodes) {
      if (node.executorId) {
        ids.push(node.executorId);
      }
    }
  }
  return ids;
}
