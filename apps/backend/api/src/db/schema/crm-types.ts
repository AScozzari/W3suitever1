/**
 * CRM Module Types
 * 
 * Consolidated TypeScript types for the CRM module using Drizzle ORM
 * inference and drizzle-zod schemas.
 * 
 * @module crm-types
 */

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  crmPersons,
  crmPersonConsents,
  crmCampaigns,
  crmLeads,
  crmPipelines,
  crmDeals,
  crmInteractions,
  crmTasks,
  crmActivityFeed,
  crmChannelSettings,
  crmDealProducts,
  crmEmailSequences,
  crmEmailSequenceSteps,
  crmLeadScoring,
  crmNoteTags,
  crmNotes,
  crmPlaybooks,
  crmPlaybookRules,
  crmProductCatalog,
  crmQuotes,
} from './w3suite';

import {
  brandCampaignTemplates,
  brandLeadTemplates,
  brandCampaignDeployments,
} from './brand-interface';

// ==================== Person (Identity Graph) ====================

export const insertPersonSchema = createInsertSchema(crmPersons, {
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  preferredChannel: z.enum(['email', 'sms', 'phone', 'whatsapp', 'telegram', 'in_person']).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectPersonSchema = createSelectSchema(crmPersons);

export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type SelectPerson = typeof crmPersons.$inferSelect;

// ==================== Person Consents (GDPR) ====================

export const insertPersonConsentSchema = createInsertSchema(crmPersonConsents, {
  personId: z.number().int().positive(),
  channel: z.enum(['email', 'sms', 'phone', 'whatsapp', 'telegram']),
  purpose: z.enum(['marketing', 'transactional', 'profiling', 'third_party_sharing']),
  isConsented: z.boolean(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectPersonConsentSchema = createSelectSchema(crmPersonConsents);

export type InsertPersonConsent = z.infer<typeof insertPersonConsentSchema>;
export type SelectPersonConsent = typeof crmPersonConsents.$inferSelect;

// ==================== Campaigns ====================

export const insertCampaignSchema = createInsertSchema(crmCampaigns, {
  name: z.string().min(1, 'Campaign name is required'),
  type: z.enum(['email', 'sms', 'whatsapp', 'telegram', 'phone', 'multi_channel']),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'archived']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectCampaignSchema = createSelectSchema(crmCampaigns);

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type SelectCampaign = typeof crmCampaigns.$inferSelect;

// ==================== Leads ====================

export const insertLeadSchema = createInsertSchema(crmLeads, {
  personId: z.number().int().positive(),
  source: z.enum(['gtm', 'meta_capi', 'api_external', 'manual', 'pdc_analyzer', 'sales_team', 'walk_in']),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost', 'disqualified']),
  score: z.number().int().min(0).max(100).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectLeadSchema = createSelectSchema(crmLeads);

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type SelectLead = typeof crmLeads.$inferSelect;

// ==================== Pipelines ====================

export const insertPipelineSchema = createInsertSchema(crmPipelines, {
  name: z.string().min(1, 'Pipeline name is required'),
  type: z.enum(['sales', 'service', 'custom']),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectPipelineSchema = createSelectSchema(crmPipelines);

export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type SelectPipeline = typeof crmPipelines.$inferSelect;

// ==================== Deals ====================

export const insertDealSchema = createInsertSchema(crmDeals, {
  personId: z.number().int().positive(),
  pipelineId: z.number().int().positive(),
  title: z.string().min(1, 'Deal title is required'),
  value: z.number().positive().optional(),
  stage: z.enum(['new', 'in_progress', 'waiting', 'won', 'lost']),
  probability: z.number().int().min(0).max(100).optional(),
  closeDate: z.string().datetime().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectDealSchema = createSelectSchema(crmDeals);

export type InsertDeal = z.infer<typeof insertDealSchema>;
export type SelectDeal = typeof crmDeals.$inferSelect;

// ==================== Interactions ====================

export const insertInteractionSchema = createInsertSchema(crmInteractions, {
  personId: z.number().int().positive(),
  channel: z.enum(['email', 'sms', 'phone', 'whatsapp', 'telegram', 'in_person', 'web', 'chat']),
  direction: z.enum(['inbound', 'outbound']),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed', 'bounced']),
}).omit({ id: true, createdAt: true });

export const selectInteractionSchema = createSelectSchema(crmInteractions);

export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type SelectInteraction = typeof crmInteractions.$inferSelect;

// ==================== Tasks ====================

export const insertTaskSchema = createInsertSchema(crmTasks, {
  title: z.string().min(1, 'Task title is required'),
  type: z.enum(['call', 'email', 'meeting', 'follow_up', 'demo', 'proposal', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']),
  dueDate: z.string().datetime().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectTaskSchema = createSelectSchema(crmTasks);

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type SelectTask = typeof crmTasks.$inferSelect;

// ==================== Activity Feed ====================

export const insertActivityFeedSchema = createInsertSchema(crmActivityFeed, {
  actorType: z.enum(['user', 'system', 'ai_agent', 'workflow']),
  actorId: z.string(),
  action: z.enum(['created', 'updated', 'deleted', 'assigned', 'completed', 'contacted', 'converted', 'won', 'lost', 'note_added', 'file_uploaded', 'email_sent', 'call_logged']),
  entityType: z.enum(['person', 'lead', 'deal', 'task', 'interaction', 'note', 'campaign']),
  entityId: z.string(),
}).omit({ id: true, createdAt: true });

export const selectActivityFeedSchema = createSelectSchema(crmActivityFeed);

export type InsertActivityFeed = z.infer<typeof insertActivityFeedSchema>;
export type SelectActivityFeed = typeof crmActivityFeed.$inferSelect;

// ==================== Channel Settings ====================

export const insertChannelSettingSchema = createInsertSchema(crmChannelSettings, {
  channel: z.enum(['email', 'sms', 'phone', 'whatsapp', 'telegram']),
  isEnabled: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectChannelSettingSchema = createSelectSchema(crmChannelSettings);

export type InsertChannelSetting = z.infer<typeof insertChannelSettingSchema>;
export type SelectChannelSetting = typeof crmChannelSettings.$inferSelect;

// ==================== Notes ====================

export const insertNoteSchema = createInsertSchema(crmNotes, {
  entityType: z.enum(['person', 'lead', 'deal', 'task']),
  entityId: z.string(),
  content: z.string().min(1, 'Note content is required'),
  isPinned: z.boolean().default(false),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectNoteSchema = createSelectSchema(crmNotes);

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type SelectNote = typeof crmNotes.$inferSelect;

// ==================== Note Tags ====================

export const insertNoteTagSchema = createInsertSchema(crmNoteTags, {
  noteId: z.number().int().positive(),
  tag: z.string().min(1),
}).omit({ id: true, createdAt: true });

export const selectNoteTagSchema = createSelectSchema(crmNoteTags);

export type InsertNoteTag = z.infer<typeof insertNoteTagSchema>;
export type SelectNoteTag = typeof crmNoteTags.$inferSelect;

// ==================== Product Catalog ====================

export const insertProductCatalogSchema = createInsertSchema(crmProductCatalog, {
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  price: z.number().positive(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectProductCatalogSchema = createSelectSchema(crmProductCatalog);

export type InsertProductCatalog = z.infer<typeof insertProductCatalogSchema>;
export type SelectProductCatalog = typeof crmProductCatalog.$inferSelect;

// ==================== Deal Products ====================

export const insertDealProductSchema = createInsertSchema(crmDealProducts, {
  dealId: z.number().int().positive(),
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
}).omit({ id: true, createdAt: true });

export const selectDealProductSchema = createSelectSchema(crmDealProducts);

export type InsertDealProduct = z.infer<typeof insertDealProductSchema>;
export type SelectDealProduct = typeof crmDealProducts.$inferSelect;

// ==================== Quotes ====================

export const insertQuoteSchema = createInsertSchema(crmQuotes, {
  dealId: z.number().int().positive(),
  quoteNumber: z.string().min(1),
  totalAmount: z.number().positive(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
  validUntil: z.string().datetime().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectQuoteSchema = createSelectSchema(crmQuotes);

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type SelectQuote = typeof crmQuotes.$inferSelect;

// ==================== Email Sequences ====================

export const insertEmailSequenceSchema = createInsertSchema(crmEmailSequences, {
  name: z.string().min(1, 'Sequence name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectEmailSequenceSchema = createSelectSchema(crmEmailSequences);

export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type SelectEmailSequence = typeof crmEmailSequences.$inferSelect;

// ==================== Email Sequence Steps ====================

export const insertEmailSequenceStepSchema = createInsertSchema(crmEmailSequenceSteps, {
  sequenceId: z.number().int().positive(),
  stepOrder: z.number().int().positive(),
  subject: z.string().min(1, 'Email subject is required'),
  delayDays: z.number().int().min(0).default(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectEmailSequenceStepSchema = createSelectSchema(crmEmailSequenceSteps);

export type InsertEmailSequenceStep = z.infer<typeof insertEmailSequenceStepSchema>;
export type SelectEmailSequenceStep = typeof crmEmailSequenceSteps.$inferSelect;

// ==================== Lead Scoring ====================

export const insertLeadScoringSchema = createInsertSchema(crmLeadScoring, {
  name: z.string().min(1, 'Scoring rule name is required'),
  condition: z.record(z.any()),
  points: z.number().int(),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectLeadScoringSchema = createSelectSchema(crmLeadScoring);

export type InsertLeadScoring = z.infer<typeof insertLeadScoringSchema>;
export type SelectLeadScoring = typeof crmLeadScoring.$inferSelect;

// ==================== Playbooks ====================

export const insertPlaybookSchema = createInsertSchema(crmPlaybooks, {
  pipelineId: z.number().int().positive(),
  name: z.string().min(1, 'Playbook name is required'),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectPlaybookSchema = createSelectSchema(crmPlaybooks);

export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type SelectPlaybook = typeof crmPlaybooks.$inferSelect;

// ==================== Playbook Rules ====================

export const insertPlaybookRuleSchema = createInsertSchema(crmPlaybookRules, {
  playbookId: z.number().int().positive(),
  trigger: z.enum(['stage_change', 'time_based', 'field_update', 'manual']),
  condition: z.record(z.any()),
  action: z.enum(['send_email', 'create_task', 'update_field', 'notify_user', 'trigger_workflow']),
  priority: z.number().int().min(0).default(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectPlaybookRuleSchema = createSelectSchema(crmPlaybookRules);

export type InsertPlaybookRule = z.infer<typeof insertPlaybookRuleSchema>;
export type SelectPlaybookRule = typeof crmPlaybookRules.$inferSelect;

// ==================== Brand Interface: Campaign Templates ====================

export const insertBrandCampaignTemplateSchema = createInsertSchema(brandCampaignTemplates, {
  name: z.string().min(1, 'Template name is required'),
  type: z.enum(['email', 'sms', 'whatsapp', 'telegram', 'phone', 'multi_channel']),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectBrandCampaignTemplateSchema = createSelectSchema(brandCampaignTemplates);

export type InsertBrandCampaignTemplate = z.infer<typeof insertBrandCampaignTemplateSchema>;
export type SelectBrandCampaignTemplate = typeof brandCampaignTemplates.$inferSelect;

// ==================== Brand Interface: Lead Templates ====================

export const insertBrandLeadTemplateSchema = createInsertSchema(brandLeadTemplates, {
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['b2c', 'b2b', 'enterprise']),
  isActive: z.boolean().default(true),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectBrandLeadTemplateSchema = createSelectSchema(brandLeadTemplates);

export type InsertBrandLeadTemplate = z.infer<typeof insertBrandLeadTemplateSchema>;
export type SelectBrandLeadTemplate = typeof brandLeadTemplates.$inferSelect;

// ==================== Brand Interface: Campaign Deployments ====================

export const insertBrandCampaignDeploymentSchema = createInsertSchema(brandCampaignDeployments, {
  templateId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  status: z.enum(['pending', 'active', 'paused', 'completed', 'cancelled']),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectBrandCampaignDeploymentSchema = createSelectSchema(brandCampaignDeployments);

export type InsertBrandCampaignDeployment = z.infer<typeof insertBrandCampaignDeploymentSchema>;
export type SelectBrandCampaignDeployment = typeof brandCampaignDeployments.$inferSelect;

// ==================== Utility Types ====================

/**
 * Common filter types for CRM queries
 */
export type CRMDateRange = {
  from: Date;
  to: Date;
};

export type CRMPaginationParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CRMFilterParams = {
  tenantId?: number;
  assignedUserId?: number;
  status?: string;
  dateRange?: CRMDateRange;
  search?: string;
};

/**
 * Person with all relations for Customer 360 view
 */
export type PersonWith360View = SelectPerson & {
  consents: SelectPersonConsent[];
  leads: SelectLead[];
  deals: SelectDeal[];
  interactions: SelectInteraction[];
  tasks: SelectTask[];
  notes: SelectNote[];
  activityFeed: SelectActivityFeed[];
};

/**
 * Deal with full pipeline context
 */
export type DealWithContext = SelectDeal & {
  person: SelectPerson;
  pipeline: SelectPipeline;
  products: (SelectDealProduct & { product: SelectProductCatalog })[];
  quotes: SelectQuote[];
  tasks: SelectTask[];
  interactions: SelectInteraction[];
};

/**
 * Lead with scoring and tracking
 */
export type LeadWithScoring = SelectLead & {
  person: SelectPerson;
  campaign?: SelectCampaign;
  score: number;
  scoringBreakdown: {
    ruleId: number;
    ruleName: string;
    points: number;
  }[];
};
