// 🎯 BASE EXECUTOR & CORE INFRASTRUCTURE EXECUTORS (22 total)
// Removed executors remain in apps/backend/api:
// - TaskAction, TeamRouting, AILeadRouting (domain-specific services)
// - UserRouting, IfCondition, MCPConnector, AIMCP (dynamic imports/type issues)
export { BaseExecutor } from './BaseExecutor';

// Action Executors (4)
export { EmailActionExecutor } from './EmailActionExecutor';
export { ApprovalActionExecutor } from './ApprovalActionExecutor';
export { AutoApprovalExecutor } from './AutoApprovalExecutor';
export { GenericActionExecutor } from './GenericActionExecutor';

// Decision & Trigger Executors (4)
export { DecisionEvaluator } from './DecisionEvaluator';
export { AiDecisionExecutor } from './AiDecisionExecutor';
export { FormTriggerExecutor } from './FormTriggerExecutor';
export { TaskTriggerExecutor } from './TaskTriggerExecutor';

// Routing Executors (3)
export { LeadRoutingExecutor } from './LeadRoutingExecutor';
export { DealRoutingExecutor } from './DealRoutingExecutor';
export { CustomerRoutingExecutor } from './CustomerRoutingExecutor';

// Campaign & Pipeline Executors (2)
export { CampaignLeadIntakeExecutor } from './CampaignLeadIntakeExecutor';
export { PipelineAssignmentExecutor } from './PipelineAssignmentExecutor';

// Funnel Executors (5)
export { FunnelStageTransitionExecutor } from './FunnelStageTransitionExecutor';
export { FunnelPipelineTransitionExecutor } from './FunnelPipelineTransitionExecutor';
export { AIFunnelOrchestratorExecutor } from './AIFunnelOrchestratorExecutor';
export { FunnelExitExecutor } from './FunnelExitExecutor';
export { DealStageWebhookTriggerExecutor } from './DealStageWebhookTriggerExecutor';

// Control Flow Executors (4)
export { SwitchCaseExecutor } from './SwitchCaseExecutor';
export { WhileLoopExecutor } from './WhileLoopExecutor';
export { ParallelForkExecutor} from './ParallelForkExecutor';
export { JoinSyncExecutor } from './JoinSyncExecutor';
