/**
 * Shared Workflow Types & Validation Schemas
 * 
 * This file provides TypeScript types and Zod validation schemas for workflow entities
 * that can be safely imported by both frontend and backend applications.
 * 
 * Following W3 Suite architecture:
 * - Types derived from existing database schema (w3suite.ts)
 * - Zod schemas for API request/response validation
 * - Frontend-safe exports without database dependencies
 */

import { z } from 'zod';

// ==================== SHARED ENUMS ====================

export const WorkflowDepartmentEnum = z.enum([
  'hr', 'finance', 'sales', 'operations', 'support', 'crm', 'marketing'
]);

export const WorkflowStatusEnum = z.enum([
  'draft', 'pending', 'approved', 'rejected', 'cancelled'
]);

export const WorkflowInstanceStatusEnum = z.enum([
  'pending', 'running', 'completed', 'failed', 'cancelled', 'paused'
]);

export const WorkflowExecutionTypeEnum = z.enum([
  'action', 'trigger', 'condition', 'timer'
]);

export const TeamTypeEnum = z.enum([
  'functional', 'project', 'department'
]);

// ==================== WORKFLOW TEMPLATE TYPES ====================

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  data: z.record(z.any()),
  style: z.record(z.any()).optional(),
  className: z.string().optional(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional()
});

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  style: z.record(z.any()).optional(),
  className: z.string().optional(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  data: z.record(z.any()).optional()
});

export const WorkflowTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: WorkflowDepartmentEnum,
  templateType: z.string().min(1).max(100),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  isActive: z.boolean().default(true),
  version: z.number().int().default(1),
  metadata: z.record(z.any()).default({}),
  // Action Tags - Define what this workflow DOES (e.g., 'richiesta_ferie', 'rimborso_spese')
  actionTags: z.array(z.string()).default([]),
  customAction: z.string().nullish() // Custom action description for non-standard workflows
});

export const CreateWorkflowTemplateSchema = WorkflowTemplateSchema.omit({
  id: true
});

export const UpdateWorkflowTemplateSchema = WorkflowTemplateSchema.partial().omit({
  id: true,
  tenantId: true
});

// ==================== WORKFLOW INSTANCE TYPES ====================

export const WorkflowInstanceSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  templateId: z.string().uuid(),
  referenceId: z.string().optional(),
  instanceType: z.string().min(1),
  instanceName: z.string().min(1),
  currentStatus: WorkflowInstanceStatusEnum.default('pending'),
  currentStepId: z.string().uuid().optional(),
  currentNodeId: z.string().optional(),
  currentAssignee: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  context: z.record(z.any()).default({})
});

export const CreateWorkflowInstanceSchema = WorkflowInstanceSchema.omit({
  id: true
});

export const UpdateWorkflowInstanceSchema = WorkflowInstanceSchema.partial().omit({
  id: true,
  tenantId: true,
  templateId: true
});

// ==================== UNIVERSAL REQUEST TYPES ====================

export const UniversalRequestSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  requesterId: z.string().min(1),
  legalEntityId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  onBehalfOf: z.string().optional(),
  department: WorkflowDepartmentEnum,
  category: z.string().min(1).max(100),
  type: z.string().max(100).optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: WorkflowStatusEnum.default('draft'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  requestData: z.record(z.any()).default({}),
  attachmentUrls: z.array(z.string()).default([]),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const CreateUniversalRequestSchema = UniversalRequestSchema.omit({
  id: true
});

export const UpdateUniversalRequestSchema = UniversalRequestSchema.partial().omit({
  id: true,
  tenantId: true,
  requesterId: true
});

// ==================== TEAM TYPES ====================

export const TeamSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  teamType: TeamTypeEnum.default('functional'),
  userMembers: z.array(z.string()).default([]),
  roleMembers: z.array(z.string()).default([]),
  primarySupervisor: z.string().optional(),
  secondarySupervisors: z.array(z.string()).default([]),
  // 🎯 DEPARTMENT ASSIGNMENT: Team può gestire multipli dipartimenti
  assignedDepartments: z.array(z.enum(['hr', 'operations', 'support', 'crm', 'sales', 'finance'])).default([]),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).default({})
});

export const CreateTeamSchema = TeamSchema.omit({
  id: true
});

export const UpdateTeamSchema = TeamSchema.partial().omit({
  id: true,
  tenantId: true
});

// ==================== TEAM WORKFLOW ASSIGNMENTS ====================

export const TeamWorkflowAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  teamId: z.string().uuid(),
  templateId: z.string().uuid(),
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: z.enum(['hr', 'operations', 'support', 'crm', 'sales', 'finance']),
  autoAssign: z.boolean().default(true),
  priority: z.number().int().default(100),
  conditions: z.record(z.any()).default({}),
  overrides: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional()
});

export const CreateTeamWorkflowAssignmentSchema = TeamWorkflowAssignmentSchema.omit({
  id: true
});

export const UpdateTeamWorkflowAssignmentSchema = TeamWorkflowAssignmentSchema.partial().omit({
  id: true,
  tenantId: true
});

// ==================== WORKFLOW AI ROUTING ====================

export const WorkflowRoutingDecisionSchema = z.object({
  selectedTeam: z.string(),
  approvers: z.array(z.string()),
  flow: z.enum(['sequential', 'parallel']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  sla: z.string(),
  reasoning: z.string(),
  autoApprove: z.boolean().default(false),
  escalationPath: z.array(z.string()).default([])
});

export const AIWorkflowRoutingRequestSchema = z.object({
  requestId: z.string().uuid(),
  userContext: z.object({
    id: z.string(),
    department: z.string().optional(),
    roleAssignments: z.array(z.any()).optional()
  }),
  tenantId: z.string().uuid()
});

export const AIWorkflowRoutingResponseSchema = z.object({
  success: z.boolean(),
  workflowInstanceId: z.string().uuid().optional(),
  decision: WorkflowRoutingDecisionSchema,
  error: z.string().optional()
});

// ==================== API RESPONSE WRAPPERS ====================

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime()
  });

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
  code: z.string().optional()
});

export const ApiPaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative()
    }),
    timestamp: z.string().datetime()
  });

// ==================== TYPE EXPORTS ====================

export type WorkflowDepartment = z.infer<typeof WorkflowDepartmentEnum>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;
export type WorkflowInstanceStatus = z.infer<typeof WorkflowInstanceStatusEnum>;
export type WorkflowExecutionType = z.infer<typeof WorkflowExecutionTypeEnum>;
export type TeamType = z.infer<typeof TeamTypeEnum>;

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type CreateWorkflowTemplate = z.infer<typeof CreateWorkflowTemplateSchema>;
export type UpdateWorkflowTemplate = z.infer<typeof UpdateWorkflowTemplateSchema>;

export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
export type CreateWorkflowInstance = z.infer<typeof CreateWorkflowInstanceSchema>;
export type UpdateWorkflowInstance = z.infer<typeof UpdateWorkflowInstanceSchema>;

export type UniversalRequest = z.infer<typeof UniversalRequestSchema>;
export type CreateUniversalRequest = z.infer<typeof CreateUniversalRequestSchema>;
export type UpdateUniversalRequest = z.infer<typeof UpdateUniversalRequestSchema>;

export type Team = z.infer<typeof TeamSchema>;
export type CreateTeam = z.infer<typeof CreateTeamSchema>;
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;

export type TeamWorkflowAssignment = z.infer<typeof TeamWorkflowAssignmentSchema>;
export type CreateTeamWorkflowAssignment = z.infer<typeof CreateTeamWorkflowAssignmentSchema>;
export type UpdateTeamWorkflowAssignment = z.infer<typeof UpdateTeamWorkflowAssignmentSchema>;

export type WorkflowRoutingDecision = z.infer<typeof WorkflowRoutingDecisionSchema>;
export type AIWorkflowRoutingRequest = z.infer<typeof AIWorkflowRoutingRequestSchema>;
export type AIWorkflowRoutingResponse = z.infer<typeof AIWorkflowRoutingResponseSchema>;

// Type helpers for API responses
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
};

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export type ApiPaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
};

// ==================== VALIDATION HELPERS ====================

export const validateWorkflowTemplate = (data: unknown) => {
  return WorkflowTemplateSchema.safeParse(data);
};

export const validateCreateWorkflowTemplate = (data: unknown) => {
  return CreateWorkflowTemplateSchema.safeParse(data);
};

export const validateWorkflowInstance = (data: unknown) => {
  return WorkflowInstanceSchema.safeParse(data);
};

export const validateUniversalRequest = (data: unknown) => {
  return UniversalRequestSchema.safeParse(data);
};

export const validateTeam = (data: unknown) => {
  return TeamSchema.safeParse(data);
};

export const validateAIWorkflowRoutingRequest = (data: unknown) => {
  return AIWorkflowRoutingRequestSchema.safeParse(data);
};