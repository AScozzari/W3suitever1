/**
 * 🎯 WORKFLOW NODE COMPONENTS
 * 
 * Exports all workflow node components for ReactFlow.
 */

import type { NodeTypes } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { WorkflowNodeData } from '../types';

export { BaseNode };

/**
 * Start node
 */
export const StartNode = (props: any) => (
  <BaseNode {...props} icon="▶️" color="green" />
);

/**
 * End node
 */
export const EndNode = (props: any) => (
  <BaseNode {...props} icon="⏹️" color="red" />
);

/**
 * Action node
 */
export const ActionNode = (props: any) => (
  <BaseNode {...props} icon="⚡" color="blue" showConfig />
);

/**
 * Decision node
 */
export const DecisionNode = (props: any) => (
  <BaseNode {...props} icon="🔀" color="orange" showConfig />
);

/**
 * AI Decision node
 */
export const AIDecisionNode = (props: any) => (
  <BaseNode {...props} icon="🤖" color="purple" showConfig />
);

/**
 * Approval node
 */
export const ApprovalNode = (props: any) => (
  <BaseNode {...props} icon="✅" color="blue" showConfig />
);

/**
 * Routing node
 */
export const RoutingNode = (props: any) => (
  <BaseNode {...props} icon="🎯" color="blue" showConfig />
);

/**
 * Trigger node
 */
export const TriggerNode = (props: any) => (
  <BaseNode {...props} icon="⚙️" color="gray" showConfig />
);

/**
 * Campaign Lead Intake node
 */
export const CampaignLeadIntakeNode = (props: any) => (
  <BaseNode {...props} icon="📢" color="purple" showConfig />
);

/**
 * Pipeline Assignment node
 */
export const PipelineAssignmentNode = (props: any) => (
  <BaseNode {...props} icon="🔗" color="blue" showConfig />
);

/**
 * Funnel Stage Transition node
 */
export const FunnelStageTransitionNode = (props: any) => (
  <BaseNode {...props} icon="➡️" color="green" showConfig />
);

/**
 * Funnel Pipeline Transition node
 */
export const FunnelPipelineTransitionNode = (props: any) => (
  <BaseNode {...props} icon="↔️" color="green" showConfig />
);

/**
 * AI Funnel Orchestrator node
 */
export const AIFunnelOrchestratorNode = (props: any) => (
  <BaseNode {...props} icon="🧠" color="purple" showConfig />
);

/**
 * Funnel Exit node
 */
export const FunnelExitNode = (props: any) => (
  <BaseNode {...props} icon="🚪" color="orange" showConfig />
);

/**
 * Deal Stage Webhook Trigger node
 */
export const DealStageWebhookTriggerNode = (props: any) => (
  <BaseNode {...props} icon="🔔" color="blue" showConfig />
);

/**
 * Switch Case node
 */
export const SwitchCaseNode = (props: any) => (
  <BaseNode {...props} icon="🔀" color="orange" showConfig />
);

/**
 * While Loop node
 */
export const WhileLoopNode = (props: any) => (
  <BaseNode {...props} icon="🔁" color="purple" showConfig />
);

/**
 * Parallel Fork node
 */
export const ParallelForkNode = (props: any) => (
  <BaseNode {...props} icon="🍴" color="blue" showConfig />
);

/**
 * Join Sync node
 */
export const JoinSyncNode = (props: any) => (
  <BaseNode {...props} icon="🔗" color="blue" showConfig />
);

/**
 * Complete NodeTypes configuration for ReactFlow
 */
export const workflowNodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  decision: DecisionNode,
  'ai-decision': AIDecisionNode,
  approval: ApprovalNode,
  routing: RoutingNode,
  trigger: TriggerNode,
  'campaign-lead-intake': CampaignLeadIntakeNode,
  'pipeline-assignment': PipelineAssignmentNode,
  'funnel-stage-transition': FunnelStageTransitionNode,
  'funnel-pipeline-transition': FunnelPipelineTransitionNode,
  'ai-funnel-orchestrator': AIFunnelOrchestratorNode,
  'funnel-exit': FunnelExitNode,
  'deal-stage-webhook-trigger': DealStageWebhookTriggerNode,
  'switch-case': SwitchCaseNode,
  'while-loop': WhileLoopNode,
  'parallel-fork': ParallelForkNode,
  'join-sync': JoinSyncNode
};
