"use strict";
// W3 Suite Schema - Dedicated schema for tenant-specific tables
// All tables in this file will be created in 'w3suite' schema
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmCustomerTypeEnum = exports.crmDealStatusEnum = exports.crmPipelineStageCategoryEnum = exports.crmPipelineDomainEnum = exports.leadSourceEnum = exports.leadStatusCategoryEnum = exports.crmLeadStatusEnum = exports.workflowExecutionModeEnum = exports.crmCampaignStatusEnum = exports.crmCampaignTypeEnum = exports.outboundChannelEnum = exports.leadRoutingConfidenceEnum = exports.aiModelEnum = exports.aiFeatureTypeEnum = exports.aiPrivacyModeEnum = exports.aiConnectionStatusEnum = exports.expenseCategoryEnum = exports.expensePaymentMethodEnum = exports.expenseReportStatusEnum = exports.hrDocumentSourceEnum = exports.hrDocumentTypeEnum = exports.shiftPatternEnum = exports.shiftStatusEnum = exports.shiftTypeEnum = exports.timeTrackingStatusEnum = exports.trackingMethodEnum = exports.calendarEventStatusEnum = exports.calendarEventVisibilityEnum = exports.calendarEventTypeEnum = exports.employmentContractTypeEnum = exports.ccnlLevelEnum = exports.maritalStatusEnum = exports.genderEnum = exports.workflowSourceEnum = exports.supplierStatusEnum = exports.supplierTypeEnum = exports.supplierOriginEnum = exports.pipelineDeletionModeEnum = exports.pipelinePermissionModeEnum = exports.objectTypeEnum = exports.objectVisibilityEnum = exports.notificationCategoryEnum = exports.storeCategoryEnum = exports.notificationStatusEnum = exports.notificationPriorityEnum = exports.notificationTypeEnum = exports.userStatusEnum = exports.permModeEnum = exports.scopeTypeEnum = exports.w3suiteSchema = void 0;
exports.productBatchStatusEnum = exports.serialTypeEnum = exports.productLogisticStatusEnum = exports.productConditionEnum = exports.productStatusEnum = exports.productTypeEnum = exports.productSourceEnum = exports.voipAssignmentTypeEnum = exports.voipRouteTypeEnum = exports.voipDidStatusEnum = exports.voipCredentialTypeEnum = exports.voipTrunkStatusEnum = exports.voipExtensionStatusEnum = exports.voipDeviceTypeEnum = exports.voipCallDispositionEnum = exports.voipCallDirectionEnum = exports.voipProtocolEnum = exports.mcpAccountTypeEnum = exports.mcpToolCategoryEnum = exports.mcpCredentialTypeEnum = exports.mcpServerStatusEnum = exports.mcpTransportEnum = exports.activityFeedInteractionTypeEnum = exports.activityFeedActorTypeEnum = exports.activityFeedPriorityEnum = exports.activityFeedCategoryEnum = exports.chatInviteStatusEnum = exports.chatVisibilityEnum = exports.chatNotificationPreferenceEnum = exports.chatMemberRoleEnum = exports.chatChannelTypeEnum = exports.taskDependencyTypeEnum = exports.taskAssignmentRoleEnum = exports.taskUrgencyEnum = exports.taskPriorityEnum = exports.taskStatusEnum = exports.calendarEventCategoryEnum = exports.customerTypeEnum = exports.crmIdentifierTypeEnum = exports.crmSourceTypeEnum = exports.crmConsentScopeEnum = exports.crmConsentStatusEnum = exports.crmConsentTypeEnum = exports.crmTaskPriorityEnum = exports.crmTaskStatusEnum = exports.crmTaskTypeEnum = exports.crmOutboundChannelEnum = exports.crmInboundChannelEnum = exports.crmInteractionDirectionEnum = exports.crmLegalFormEnum = void 0;
exports.calendarEvents = exports.insertTenantDriverTypologySchema = exports.tenantDriverTypologies = exports.insertTenantDriverCategorySchema = exports.tenantDriverCategories = exports.insertTenantCustomDriverSchema = exports.tenantCustomDrivers = exports.insertSupplierOverrideSchema = exports.supplierOverrides = exports.insertSupplierSchema = exports.suppliers = exports.insertNotificationPreferenceSchema = exports.notificationPreferences = exports.insertNotificationTemplateSchema = exports.notificationTemplates = exports.insertNotificationSchema = exports.notifications = exports.insertObjectAclSchema = exports.objectAcls = exports.insertObjectMetadataSchema = exports.objectMetadata = exports.insertStructuredLogSchema = exports.structuredLogs = exports.insertEntityLogSchema = exports.entityLogs = exports.storeDriverPotential = exports.storeBrands = exports.insertUserLegalEntitySchema = exports.userLegalEntities = exports.insertUserStoreSchema = exports.userStores = exports.userExtraPerms = exports.insertUserAssignmentSchema = exports.userAssignments = exports.rolePerms = exports.insertRoleSchema = exports.roles = exports.insertStoreTrackingConfigSchema = exports.storeTrackingConfig = exports.insertStoreSchema = exports.stores = exports.insertLegalEntitySchema = exports.legalEntities = exports.insertUserSchema = exports.users = exports.insertTenantSchema = exports.tenants = exports.priceListTypeEnum = exports.stockMovementDirectionEnum = exports.stockMovementTypeEnum = void 0;
exports.shiftTemplatesRelations = exports.shiftsRelations = exports.storesTimetrackingMethodsRelations = exports.timeTrackingRelations = exports.calendarEventsRelations = exports.supplierOverridesRelations = exports.suppliersRelations = exports.objectAclsRelations = exports.objectMetadataRelations = exports.userLegalEntitiesRelations = exports.structuredLogsRelations = exports.entityLogsRelations = exports.storeDriverPotentialRelations = exports.storeBrandsRelations = exports.userStoresRelations = exports.userExtraPermsRelations = exports.userAssignmentsRelations = exports.rolePermsRelations = exports.rolesRelations = exports.storesRelations = exports.legalEntitiesRelations = exports.usersRelations = exports.tenantsRelations = exports.insertExpenseItemSchema = exports.expenseItems = exports.insertExpenseReportSchema = exports.expenseReports = exports.insertHrDocumentSchema = exports.hrDocuments = exports.insertResourceAvailabilitySchema = exports.resourceAvailability = exports.insertAttendanceAnomalySchema = exports.attendanceAnomalies = exports.insertShiftAttendanceSchema = exports.shiftAttendance = exports.insertShiftAssignmentSchema = exports.shiftAssignments = exports.insertShiftTimeSlotSchema = exports.shiftTimeSlots = exports.insertShiftTemplateSchema = exports.shiftTemplates = exports.insertShiftSchema = exports.shifts = exports.insertStoresTimetrackingMethodsSchema = exports.storesTimetrackingMethods = exports.insertTimeTrackingSchema = exports.timeTracking = exports.insertEncryptionKeySchema = exports.encryptionKeys = exports.insertCalendarEventSchema = void 0;
exports.insertWorkflowActionSchema = exports.activityFeedInteractions = exports.activityFeedEvents = exports.chatTypingIndicators = exports.chatMessages = exports.chatChannelMembers = exports.chatChannels = exports.taskTemplates = exports.taskAttachments = exports.taskDependencies = exports.taskTimeLogs = exports.taskComments = exports.taskChecklistItems = exports.taskAssignments = exports.tasks = exports.webhookSignatures = exports.webhookEvents = exports.workflowStateSnapshots = exports.workflowStateEvents = exports.workflowStepExecutions = exports.workflowExecutions = exports.workflowInstances = exports.userWorkflowAssignments = exports.teamWorkflowAssignments = exports.teams = exports.insertTenantWorkflowNodeOverrideSchema = exports.tenantWorkflowNodeOverrides = exports.workflowSteps = exports.workflowTemplates = exports.workflowTriggers = exports.workflowActions = exports.insertServicePermissionSchema = exports.servicePermissions = exports.universalRequestsRelations = exports.insertUniversalRequestSchema = exports.universalRequests = exports.requestStatusEnum = exports.departmentEnum = exports.insertApprovalWorkflowSchema = exports.approvalWorkflows = exports.insertOrganizationalStructureSchema = exports.organizationalStructure = exports.expenseItemsRelations = exports.expenseReportsRelations = exports.hrDocumentsRelations = exports.resourceAvailabilityRelations = exports.attendanceAnomaliesRelations = exports.shiftAttendanceRelations = exports.shiftAssignmentsRelations = exports.shiftTimeSlotsRelations = void 0;
exports.insertAISettingsSchema = exports.mcpToolSchemasRelations = exports.mcpServerCredentialsRelations = exports.mcpServersRelations = exports.aiTrainingSessionsRelations = exports.vectorCollectionsRelations = exports.vectorSearchQueriesRelations = exports.vectorEmbeddingsRelations = exports.leadAiInsightsRelations = exports.leadRoutingHistoryRelations = exports.aiConversationsRelations = exports.aiAgentTenantSettingsRelations = exports.aiUsageLogsRelations = exports.aiSettingsRelations = exports.aiTrainingSessions = exports.vectorCollections = exports.vectorSearchQueries = exports.vectorEmbeddings = exports.extractionMethodEnum = exports.mediaTypeEnum = exports.vectorOriginEnum = exports.embeddingModelEnum = exports.vectorStatusEnum = exports.vectorSourceTypeEnum = exports.mcpToolSchemas = exports.mcpConnectedAccounts = exports.mcpServerCredentials = exports.mcpServers = exports.leadAiInsights = exports.leadRoutingHistory = exports.aiConversations = exports.aiAgentTenantSettings = exports.aiUsageLogs = exports.aiSettings = exports.notificationPreferencesRelations = exports.notificationTemplatesRelations = exports.notificationsRelations = exports.insertWebhookSignatureSchema = exports.insertWebhookEventSchema = exports.insertWorkflowStateSnapshotSchema = exports.insertWorkflowStateEventSchema = exports.insertWorkflowStepExecutionSchema = exports.insertWorkflowExecutionSchema = exports.insertWorkflowInstanceSchema = exports.insertUserWorkflowAssignmentSchema = exports.insertTeamWorkflowAssignmentSchema = exports.insertTeamSchema = exports.insertWorkflowStepSchema = exports.insertWorkflowTemplateSchema = exports.insertWorkflowTriggerSchema = void 0;
exports.crmCampaignPipelineLinks = exports.crmCustomerNotes = exports.crmCustomerDocuments = exports.crmOrders = exports.crmPersonConsents = exports.crmCustomers = exports.crmTasks = exports.crmInteractions = exports.crmDeals = exports.crmPipelineStages = exports.crmPipelineWorkflows = exports.crmPipelineStagePlaybooks = exports.crmPipelineSettings = exports.crmPipelines = exports.insertCrmFunnelWorkflowSchema = exports.crmFunnelWorkflows = exports.insertCrmFunnelSchema = exports.crmFunnels = exports.leadStatusHistory = exports.leadStatuses = exports.crmLeads = exports.insertCampaignSocialAccountSchema = exports.campaignSocialAccounts = exports.crmCampaigns = exports.crmPersonIdentities = exports.insertActivityFeedInteractionSchema = exports.insertActivityFeedEventSchema = exports.insertChatTypingIndicatorSchema = exports.insertChatMessageSchema = exports.insertChatChannelMemberSchema = exports.insertChatChannelSchema = exports.insertTaskTemplateSchema = exports.insertTaskAttachmentSchema = exports.insertTaskDependencySchema = exports.insertTaskTimeLogSchema = exports.insertTaskCommentSchema = exports.insertTaskChecklistItemSchema = exports.insertTaskAssignmentSchema = exports.insertTaskSchema = exports.insertMCPToolSchemaSchema = exports.insertMCPServerCredentialSchema = exports.insertMCPServerSchema = exports.insertAITrainingSessionSchema = exports.insertVectorCollectionSchema = exports.insertVectorSearchQuerySchema = exports.insertVectorEmbeddingSchema = exports.insertAIConversationSchema = exports.insertAIUsageLogSchema = exports.insertLeadAiInsightsSchema = exports.insertLeadRoutingHistorySchema = void 0;
exports.contactPolicies = exports.insertVoipCdrSchema = exports.voipCdrs = exports.updateVoipExtensionStoreAccessSchema = exports.insertVoipExtensionStoreAccessSchema = exports.voipExtensionStoreAccess = exports.updateVoipExtensionSchema = exports.insertVoipExtensionSchema = exports.voipExtensions = exports.voipTrunks = exports.insertCrmCustomerNoteSchema = exports.insertCrmCustomerDocumentSchema = exports.insertGtmEventLogSchema = exports.insertCrmLeadNotificationSchema = exports.insertCrmCampaignUtmLinkSchema = exports.insertCrmSavedViewSchema = exports.insertCrmAutomationRuleSchema = exports.insertCrmCustomerSegmentSchema = exports.insertCrmWhatsappTemplateSchema = exports.insertCrmSmsTemplateSchema = exports.insertCrmEmailTemplateSchema = exports.insertCrmSourceMappingSchema = exports.insertCrmLeadAttributionSchema = exports.insertCrmCampaignPipelineLinkSchema = exports.insertCrmOrderSchema = exports.insertCrmCustomerSchema = exports.insertCrmTaskSchema = exports.insertCrmInteractionSchema = exports.insertCrmDealSchema = exports.insertCrmPipelineStageSchema = exports.insertCrmPipelineWorkflowSchema = exports.insertCrmPipelineStagePlaybookSchema = exports.insertCrmPipelineSettingsSchema = exports.insertCrmPipelineSchema = exports.insertLeadStatusHistorySchema = exports.insertLeadStatusSchema = exports.insertCrmLeadSchema = exports.insertCrmCampaignSchema = exports.insertCrmPersonIdentitySchema = exports.gtmEventLog = exports.crmLeadNotifications = exports.crmCampaignUtmLinks = exports.crmSavedViews = exports.crmAutomationRules = exports.crmCustomerSegments = exports.crmWhatsappTemplates = exports.crmSmsTemplates = exports.crmEmailTemplates = exports.crmSourceMappings = exports.crmLeadAttributions = void 0;
exports.insertWarehouseLocationSchema = exports.wmsWarehouseLocations = exports.insertProductBatchSchema = exports.productBatches = exports.insertProductItemStatusHistorySchema = exports.productItemStatusHistory = exports.insertStockMovementSchema = exports.wmsStockMovements = exports.insertInventoryAdjustmentSchema = exports.wmsInventoryAdjustments = exports.insertProductSerialSchema = exports.productSerials = exports.updateProductItemSchema = exports.insertProductItemSchema = exports.productItems = exports.updateProductSchema = exports.insertProductSchema = exports.products = exports.wmsProductTypes = exports.updateCategorySchema = exports.insertCategorySchema = exports.wmsCategories = exports.insertWorkflowManualExecutionSchema = exports.workflowManualExecutions = exports.insertWorkflowExecutionQueueSchema = exports.workflowExecutionQueue = exports.insertLeadTouchpointSchema = exports.leadTouchpoints = exports.insertUtmShortUrlSchema = exports.utmShortUrls = exports.insertUtmLinkSchema = exports.utmLinks = exports.insertVoipAiSessionSchema = exports.voipAiSessions = exports.insertVoipActivityLogSchema = exports.voipActivityLog = exports.updateContactPolicySchema = exports.insertContactPolicySchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Import public schema tables for FK references
const public_1 = require("./public");
// Import brand_interface schema tables for FK references
const brand_interface_1 = require("./brand-interface");
// ==================== CUSTOM TYPES FOR PGVECTOR ====================
// Define custom type for pgvector columns
const vector = (0, pg_core_1.customType)({
    dataType() {
        return 'vector(1536)';
    },
    toDriver(value) {
        return JSON.stringify(value);
    },
    fromDriver(value) {
        return JSON.parse(value);
    },
});
// ==================== W3 SUITE SCHEMA ====================
exports.w3suiteSchema = (0, pg_core_1.pgSchema)("w3suite");
// ==================== ENUMS ====================
exports.scopeTypeEnum = (0, pg_core_1.pgEnum)('scope_type', ['tenant', 'legal_entity', 'store']);
exports.permModeEnum = (0, pg_core_1.pgEnum)('perm_mode', ['grant', 'revoke']);
exports.userStatusEnum = (0, pg_core_1.pgEnum)('user_status', ['attivo', 'sospeso', 'off-boarding']);
// Notification System Enums
exports.notificationTypeEnum = (0, pg_core_1.pgEnum)('notification_type', ['system', 'security', 'data', 'custom']);
exports.notificationPriorityEnum = (0, pg_core_1.pgEnum)('notification_priority', ['low', 'medium', 'high', 'critical']);
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)('notification_status', ['unread', 'read']);
// ✅ STORES CATEGORY: Enum for store types (sales_point=9xxx, office=6xxx, warehouse=5xxx)
exports.storeCategoryEnum = (0, pg_core_1.pgEnum)('store_category', ['sales_point', 'office', 'warehouse']);
exports.notificationCategoryEnum = (0, pg_core_1.pgEnum)('notification_category', ['sales', 'finance', 'marketing', 'support', 'operations']);
// Object Storage Enums
exports.objectVisibilityEnum = (0, pg_core_1.pgEnum)('object_visibility', ['public', 'private']);
exports.objectTypeEnum = (0, pg_core_1.pgEnum)('object_type', ['avatar', 'document', 'image', 'file']);
// CRM Pipeline Permission Enums
exports.pipelinePermissionModeEnum = (0, pg_core_1.pgEnum)('pipeline_permission_mode', ['all', 'deal_managers', 'pipeline_admins', 'supervisor_only', 'custom', 'none']);
exports.pipelineDeletionModeEnum = (0, pg_core_1.pgEnum)('pipeline_deletion_mode', ['admins', 'supervisor_only', 'none']);
// Supplier Enums
exports.supplierOriginEnum = (0, pg_core_1.pgEnum)('supplier_origin', ['brand', 'tenant']);
exports.supplierTypeEnum = (0, pg_core_1.pgEnum)('supplier_type', ['distributore', 'produttore', 'servizi', 'logistica']);
exports.supplierStatusEnum = (0, pg_core_1.pgEnum)('supplier_status', ['active', 'suspended', 'blocked']);
// Workflow Source Enum - Track if workflow originated from Brand or Tenant
exports.workflowSourceEnum = (0, pg_core_1.pgEnum)('workflow_source', ['brand', 'tenant']);
// HR System Enums
// Employee Demographics Enums
exports.genderEnum = (0, pg_core_1.pgEnum)('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
exports.maritalStatusEnum = (0, pg_core_1.pgEnum)('marital_status', ['single', 'married', 'divorced', 'widowed', 'other']);
// ==================== ITALIAN HR COMPLIANCE ENUMS (CCNL Commercio 2024) ====================
// CCNL Level Enum - Contratto Collettivo Nazionale Lavoro - Settore Commercio
exports.ccnlLevelEnum = (0, pg_core_1.pgEnum)('ccnl_level', [
    'quadro', // Quadri - Management Level
    'livello_1', // 1° Livello - Senior Professional
    'livello_2', // 2° Livello - Professional
    'livello_3', // 3° Livello - Skilled Employee
    'livello_4', // 4° Livello - Mid-level Employee
    'livello_5', // 5° Livello - Junior Employee
    'livello_6', // 6° Livello - Entry Level
    'livello_7', // 7° Livello - Basic Level
    'operatore_vendita_a', // Operatore Vendita A - Sales Operator A
    'operatore_vendita_b', // Operatore Vendita B - Sales Operator B
]);
// Contract Type Enum - Italian Labor Law Compliance
exports.employmentContractTypeEnum = (0, pg_core_1.pgEnum)('employment_contract_type', [
    'tempo_indeterminato', // Permanent Contract
    'tempo_determinato', // Fixed-term Contract
    'apprendistato_professionalizzante', // Professional Apprenticeship
    'apprendistato_qualifica', // Qualification Apprenticeship
    'collaborazione_coordinata', // Coordinated Collaboration
    'parttime_verticale', // Part-time Vertical (some days full)
    'parttime_orizzontale', // Part-time Horizontal (reduced daily hours)
    'parttime_misto', // Part-time Mixed
    'intermittente', // Intermittent Work
    'somministrazione', // Temporary Agency Work
    'stage_tirocinio', // Internship/Training
    'contratto_inserimento', // Integration Contract
    'lavoro_occasionale', // Occasional Work
]);
// Calendar Event Enums
exports.calendarEventTypeEnum = (0, pg_core_1.pgEnum)('calendar_event_type', ['meeting', 'shift', 'time_off', 'overtime', 'training', 'deadline', 'other']);
exports.calendarEventVisibilityEnum = (0, pg_core_1.pgEnum)('calendar_event_visibility', ['private', 'team', 'store', 'area', 'tenant']);
exports.calendarEventStatusEnum = (0, pg_core_1.pgEnum)('calendar_event_status', ['tentative', 'confirmed', 'cancelled']);
// Time Tracking Enums
exports.trackingMethodEnum = (0, pg_core_1.pgEnum)('tracking_method', ['badge', 'nfc', 'app', 'gps', 'manual', 'biometric', 'qr', 'smart', 'web']);
exports.timeTrackingStatusEnum = (0, pg_core_1.pgEnum)('time_tracking_status', ['active', 'completed', 'edited', 'disputed']);
// Shift Enums
exports.shiftTypeEnum = (0, pg_core_1.pgEnum)('shift_type', ['morning', 'afternoon', 'night', 'full_day', 'split', 'on_call']);
exports.shiftStatusEnum = (0, pg_core_1.pgEnum)('shift_status', ['draft', 'published', 'in_progress', 'completed', 'cancelled']);
exports.shiftPatternEnum = (0, pg_core_1.pgEnum)('shift_pattern', ['daily', 'weekly', 'monthly', 'custom']);
// HR Document Enums
exports.hrDocumentTypeEnum = (0, pg_core_1.pgEnum)('hr_document_type', ['payslip', 'contract', 'certificate', 'id_document', 'cv', 'evaluation', 'warning', 'other']);
exports.hrDocumentSourceEnum = (0, pg_core_1.pgEnum)('hr_document_source', ['employee', 'hr', 'system']);
// Expense Report Enums
exports.expenseReportStatusEnum = (0, pg_core_1.pgEnum)('expense_report_status', ['draft', 'submitted', 'approved', 'rejected', 'reimbursed']);
exports.expensePaymentMethodEnum = (0, pg_core_1.pgEnum)('expense_payment_method', ['cash', 'credit_card', 'bank_transfer']);
exports.expenseCategoryEnum = (0, pg_core_1.pgEnum)('expense_category', ['travel', 'meal', 'accommodation', 'transport', 'supplies', 'other']);
// HR Announcement Enums
// AI System Enums
exports.aiConnectionStatusEnum = (0, pg_core_1.pgEnum)('ai_connection_status', ['connected', 'disconnected', 'error']);
exports.aiPrivacyModeEnum = (0, pg_core_1.pgEnum)('ai_privacy_mode', ['standard', 'strict']);
exports.aiFeatureTypeEnum = (0, pg_core_1.pgEnum)('ai_feature_type', [
    'chat',
    'embedding',
    'transcription',
    'vision_analysis',
    'url_scraping',
    'document_analysis',
    'natural_queries',
    'financial_forecasting',
    'web_search',
    'code_interpreter',
    'image_generation',
    'voice_assistant'
]);
exports.aiModelEnum = (0, pg_core_1.pgEnum)('ai_model', [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4o-mini',
    'gpt-4',
    'gpt-3.5-turbo',
    'text-embedding-3-small',
    'text-embedding-3-large',
    'whisper-1',
    'dall-e-3'
]);
// Lead Routing AI Enums
exports.leadRoutingConfidenceEnum = (0, pg_core_1.pgEnum)('lead_routing_confidence', ['low', 'medium', 'high', 'very_high']);
exports.outboundChannelEnum = (0, pg_core_1.pgEnum)('outbound_channel', ['email', 'phone', 'whatsapp', 'linkedin', 'sms']);
// CRM System Enums
exports.crmCampaignTypeEnum = (0, pg_core_1.pgEnum)('crm_campaign_type', ['inbound_media', 'outbound_crm', 'retention']);
exports.crmCampaignStatusEnum = (0, pg_core_1.pgEnum)('crm_campaign_status', ['draft', 'scheduled', 'active', 'paused', 'completed']);
exports.workflowExecutionModeEnum = (0, pg_core_1.pgEnum)('workflow_execution_mode', ['automatic', 'manual']);
exports.crmLeadStatusEnum = (0, pg_core_1.pgEnum)('crm_lead_status', ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'disqualified']);
exports.leadStatusCategoryEnum = (0, pg_core_1.pgEnum)('lead_status_category', ['new', 'working', 'qualified', 'converted', 'disqualified', 'on_hold']);
exports.leadSourceEnum = (0, pg_core_1.pgEnum)('lead_source', ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import']);
exports.crmPipelineDomainEnum = (0, pg_core_1.pgEnum)('crm_pipeline_domain', ['sales', 'service', 'retention']);
exports.crmPipelineStageCategoryEnum = (0, pg_core_1.pgEnum)('crm_pipeline_stage_category', [
    'starter', // Fase iniziale contatto
    'progress', // In lavorazione attiva
    'pending', // In attesa cliente/interno
    'purchase', // Fase acquisto
    'finalized', // Finalizzato con successo
    'archive', // Archiviato
    'ko' // Perso/Rifiutato
]);
exports.crmDealStatusEnum = (0, pg_core_1.pgEnum)('crm_deal_status', ['open', 'won', 'lost', 'abandoned']);
exports.crmCustomerTypeEnum = (0, pg_core_1.pgEnum)('crm_customer_type', ['b2b', 'b2c']);
exports.crmLegalFormEnum = (0, pg_core_1.pgEnum)('crm_legal_form', [
    'ditta_individuale',
    'snc', // Società in Nome Collettivo
    'sas', // Società in Accomandita Semplice
    'srl', // Società a Responsabilità Limitata
    'srls', // SRL Semplificata
    'spa', // Società per Azioni
    'sapa', // Società in Accomandita per Azioni
    'cooperativa',
    'consorzio',
    'societa_semplice',
    'geie', // Gruppo Europeo Interesse Economico
    'startup_innovativa',
    'pmi_innovativa'
]);
exports.crmInteractionDirectionEnum = (0, pg_core_1.pgEnum)('crm_interaction_direction', ['inbound', 'outbound']);
// CRM Channel Enums - Dual Tracking: Inbound (Lead Source) + Outbound (Contact Method)
exports.crmInboundChannelEnum = (0, pg_core_1.pgEnum)('crm_inbound_channel', [
    'landing_page', // URL/Landing page
    'web_form', // Form compilato su sito
    'whatsapp_inbound', // Messaggio WhatsApp ricevuto
    'cold_call_inbound', // Chiamata ricevuta da prospect
    'linkedin_campaign', // Campagna LinkedIn Ads
    'partner_referral', // Segnalazione partner
    'facebook', // Social: Facebook
    'instagram', // Social: Instagram
    'tiktok', // Social: TikTok
    'youtube', // Social: YouTube
    'twitter' // Social: Twitter/X
]);
exports.crmOutboundChannelEnum = (0, pg_core_1.pgEnum)('crm_outbound_channel', [
    'email', // Email outbound
    'telegram', // Messaggio Telegram
    'whatsapp', // WhatsApp Business outbound
    'phone', // Chiamata telefonica
    'linkedin', // LinkedIn InMail/Message
    'social_dm', // Direct Message social (FB/IG)
    'sms' // SMS
]);
exports.crmTaskTypeEnum = (0, pg_core_1.pgEnum)('crm_task_type', ['call', 'email', 'meeting', 'follow_up', 'demo', 'other']);
exports.crmTaskStatusEnum = (0, pg_core_1.pgEnum)('crm_task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
exports.crmTaskPriorityEnum = (0, pg_core_1.pgEnum)('crm_task_priority', ['low', 'medium', 'high', 'urgent']);
exports.crmConsentTypeEnum = (0, pg_core_1.pgEnum)('crm_consent_type', ['privacy_policy', 'marketing', 'profiling', 'third_party']);
exports.crmConsentStatusEnum = (0, pg_core_1.pgEnum)('crm_consent_status', ['granted', 'denied', 'withdrawn', 'pending']);
exports.crmConsentScopeEnum = (0, pg_core_1.pgEnum)('crm_consent_scope', ['marketing', 'service', 'both']);
exports.crmSourceTypeEnum = (0, pg_core_1.pgEnum)('crm_source_type', ['meta_page', 'google_ads', 'whatsapp_phone', 'instagram', 'tiktok']);
exports.crmIdentifierTypeEnum = (0, pg_core_1.pgEnum)('crm_identifier_type', ['email', 'phone', 'social']);
exports.customerTypeEnum = (0, pg_core_1.pgEnum)('customer_type', ['b2c', 'b2b']);
// ✅ CRITICAL ENUM FIX: Add missing calendar_event_category enum
exports.calendarEventCategoryEnum = (0, pg_core_1.pgEnum)('calendar_event_category', [
    'sales', 'finance', 'hr', 'crm', 'support', 'operations', 'marketing'
]);
// ==================== TASK MANAGEMENT SYSTEM ENUMS ====================
exports.taskStatusEnum = (0, pg_core_1.pgEnum)('task_status', [
    'todo',
    'in_progress',
    'review',
    'done',
    'archived'
]);
exports.taskPriorityEnum = (0, pg_core_1.pgEnum)('task_priority', [
    'low', // Bassa importanza strategica
    'medium', // Importanza media
    'high' // Alta importanza strategica
]);
exports.taskUrgencyEnum = (0, pg_core_1.pgEnum)('task_urgency', [
    'low', // Non urgente (settimane)
    'medium', // Moderatamente urgente (giorni)
    'high', // Urgente (ore/1 giorno)
    'critical' // Critico (immediato)
]);
exports.taskAssignmentRoleEnum = (0, pg_core_1.pgEnum)('task_assignment_role', [
    'assignee',
    'watcher'
]);
exports.taskDependencyTypeEnum = (0, pg_core_1.pgEnum)('task_dependency_type', [
    'blocks',
    'blocked_by',
    'related'
]);
// ==================== CHAT SYSTEM ENUMS ====================
exports.chatChannelTypeEnum = (0, pg_core_1.pgEnum)('chat_channel_type', [
    'team',
    'dm',
    'task_thread',
    'general'
]);
exports.chatMemberRoleEnum = (0, pg_core_1.pgEnum)('chat_member_role', [
    'owner',
    'admin',
    'member'
]);
exports.chatNotificationPreferenceEnum = (0, pg_core_1.pgEnum)('chat_notification_preference', [
    'all',
    'mentions',
    'none'
]);
exports.chatVisibilityEnum = (0, pg_core_1.pgEnum)('chat_visibility', [
    'public',
    'private'
]);
exports.chatInviteStatusEnum = (0, pg_core_1.pgEnum)('chat_invite_status', [
    'pending',
    'accepted',
    'declined'
]);
// ==================== ACTIVITY FEED ENUMS ====================
exports.activityFeedCategoryEnum = (0, pg_core_1.pgEnum)('activity_feed_category', [
    'TASK',
    'WORKFLOW',
    'HR',
    'CRM',
    'WEBHOOK',
    'SYSTEM'
]);
exports.activityFeedPriorityEnum = (0, pg_core_1.pgEnum)('activity_feed_priority', [
    'low',
    'normal',
    'high'
]);
exports.activityFeedActorTypeEnum = (0, pg_core_1.pgEnum)('activity_feed_actor_type', [
    'user',
    'system',
    'webhook'
]);
exports.activityFeedInteractionTypeEnum = (0, pg_core_1.pgEnum)('activity_feed_interaction_type', [
    'like',
    'comment',
    'share',
    'bookmark',
    'hide'
]);
// ==================== MCP (MODEL CONTEXT PROTOCOL) ENUMS ====================
exports.mcpTransportEnum = (0, pg_core_1.pgEnum)('mcp_transport', ['stdio', 'http-sse']);
exports.mcpServerStatusEnum = (0, pg_core_1.pgEnum)('mcp_server_status', ['active', 'inactive', 'error', 'configuring']);
exports.mcpCredentialTypeEnum = (0, pg_core_1.pgEnum)('mcp_credential_type', ['oauth2_user', 'service_account', 'api_key', 'basic_auth', 'none']);
exports.mcpToolCategoryEnum = (0, pg_core_1.pgEnum)('mcp_tool_category', [
    'communication', // Gmail, Teams, Slack
    'storage', // Drive, S3, Dropbox
    'analytics', // GTM, GA
    'social_media', // Meta/Instagram, Facebook
    'productivity', // Calendar, Sheets, Docs
    'ai', // OpenAI, AI services
    'database', // Postgres, MongoDB
    'other'
]);
exports.mcpAccountTypeEnum = (0, pg_core_1.pgEnum)('mcp_account_type', [
    'facebook_page',
    'instagram_business',
    'google_workspace',
    'aws_account',
    'microsoft_tenant'
]);
// ==================== VOIP SYSTEM ENUMS ====================
exports.voipProtocolEnum = (0, pg_core_1.pgEnum)('voip_protocol', ['udp', 'tcp', 'tls', 'wss']);
exports.voipCallDirectionEnum = (0, pg_core_1.pgEnum)('voip_call_direction', ['inbound', 'outbound', 'internal']);
exports.voipCallDispositionEnum = (0, pg_core_1.pgEnum)('voip_call_disposition', ['answered', 'no_answer', 'busy', 'failed', 'voicemail']);
exports.voipDeviceTypeEnum = (0, pg_core_1.pgEnum)('voip_device_type', ['webrtc', 'deskphone', 'mobile_app', 'softphone']);
exports.voipExtensionStatusEnum = (0, pg_core_1.pgEnum)('voip_extension_status', ['active', 'inactive', 'suspended']);
exports.voipTrunkStatusEnum = (0, pg_core_1.pgEnum)('voip_trunk_status', ['active', 'inactive', 'error']);
exports.voipCredentialTypeEnum = (0, pg_core_1.pgEnum)('voip_credential_type', ['sip_trunk', 'sip_extension', 'turn_server', 'api_key']);
exports.voipDidStatusEnum = (0, pg_core_1.pgEnum)('voip_did_status', ['active', 'porting_in', 'porting_out', 'inactive', 'cancelled']);
exports.voipRouteTypeEnum = (0, pg_core_1.pgEnum)('voip_route_type', ['inbound', 'outbound', 'emergency']);
exports.voipAssignmentTypeEnum = (0, pg_core_1.pgEnum)('voip_assignment_type', ['store', 'extension', 'ivr', 'queue', 'conference']);
// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) ENUMS ====================
exports.productSourceEnum = (0, pg_core_1.pgEnum)('product_source', ['brand', 'tenant']);
exports.productTypeEnum = (0, pg_core_1.pgEnum)('product_type', ['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']);
exports.productStatusEnum = (0, pg_core_1.pgEnum)('product_status', ['active', 'inactive', 'discontinued', 'draft']);
exports.productConditionEnum = (0, pg_core_1.pgEnum)('product_condition', ['new', 'used', 'refurbished', 'demo']);
exports.productLogisticStatusEnum = (0, pg_core_1.pgEnum)('product_logistic_status', [
    'in_stock', // In giacenza
    'reserved', // Prenotato
    'preparing', // In preparazione
    'shipping', // DDT/In spedizione
    'delivered', // Consegnato
    'customer_return', // Reso cliente
    'doa_return', // Reso DOA
    'in_service', // In assistenza
    'supplier_return', // Restituito fornitore
    'in_transfer', // In trasferimento
    'lost', // Smarrito
    'damaged', // Danneggiato/Dismesso
    'internal_use' // AD uso interno
]);
exports.serialTypeEnum = (0, pg_core_1.pgEnum)('serial_type', ['imei', 'iccid', 'mac_address', 'other']);
exports.productBatchStatusEnum = (0, pg_core_1.pgEnum)('product_batch_status', ['available', 'reserved', 'damaged', 'expired']);
exports.stockMovementTypeEnum = (0, pg_core_1.pgEnum)('stock_movement_type', [
    'purchase_in', // Acquisto da fornitore
    'sale_out', // Vendita
    'return_in', // Reso da cliente
    'transfer', // Trasferimento (crea coppia inbound/outbound)
    'adjustment', // Rettifica inventario
    'damaged' // Danneggiato
]);
exports.stockMovementDirectionEnum = (0, pg_core_1.pgEnum)('stock_movement_direction', [
    'inbound', // Entrata (aumenta stock)
    'outbound' // Uscita (diminuisce stock)
]);
exports.priceListTypeEnum = (0, pg_core_1.pgEnum)('price_list_type', ['b2c', 'b2b', 'wholesale']);
// ==================== TENANTS ====================
exports.tenants = exports.w3suiteSchema.table("tenants", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)("slug", { length: 100 }).notNull().unique(),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("active"),
    notes: (0, pg_core_1.text)("notes"), // Added notes field for Management Center
    settings: (0, pg_core_1.jsonb)("settings").default({}),
    features: (0, pg_core_1.jsonb)("features").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
});
exports.insertTenantSchema = (0, drizzle_zod_1.createInsertSchema)(exports.tenants).omit({
    id: true,
    createdAt: true,
    updatedAt: true
}).extend({
    slug: zod_1.z.string().min(1, "Slug non può essere vuoto").max(100, "Slug troppo lungo")
});
// ==================== USERS TABLE (OAuth2 Enterprise) ====================
exports.users = exports.w3suiteSchema.table("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey(), // OAuth2 standard sub field
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }),
    profileImageUrl: (0, pg_core_1.varchar)("profile_image_url", { length: 500 }),
    // Avatar metadata fields
    avatarObjectPath: (0, pg_core_1.varchar)("avatar_object_path", { length: 500 }),
    avatarVisibility: (0, exports.objectVisibilityEnum)("avatar_visibility").default("public"),
    avatarUploadedAt: (0, pg_core_1.timestamp)("avatar_uploaded_at"),
    avatarUploadedBy: (0, pg_core_1.varchar)("avatar_uploaded_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    isSystemAdmin: (0, pg_core_1.boolean)("is_system_admin").default(false),
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    status: (0, exports.userStatusEnum)("status").default("attivo"),
    mfaEnabled: (0, pg_core_1.boolean)("mfa_enabled").default(false),
    // Extended enterprise fields
    role: (0, pg_core_1.varchar)("role", { length: 50 }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id),
    phone: (0, pg_core_1.varchar)("phone", { length: 20 }),
    position: (0, pg_core_1.varchar)("position", { length: 100 }),
    department: (0, pg_core_1.varchar)("department", { length: 100 }),
    hireDate: (0, pg_core_1.date)("hire_date"),
    contractType: (0, pg_core_1.varchar)("contract_type", { length: 50 }), // Keep as varchar to preserve existing data
    // Personal/Demographic Information (HR Best Practices 2025)
    dateOfBirth: (0, pg_core_1.date)("date_of_birth"),
    fiscalCode: (0, pg_core_1.varchar)("fiscal_code", { length: 16 }), // Codice Fiscale italiano
    gender: (0, exports.genderEnum)("gender"),
    maritalStatus: (0, exports.maritalStatusEnum)("marital_status"),
    nationality: (0, pg_core_1.varchar)("nationality", { length: 100 }),
    placeOfBirth: (0, pg_core_1.varchar)("place_of_birth", { length: 100 }),
    // Address Information
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.varchar)("city", { length: 100 }),
    province: (0, pg_core_1.varchar)("province", { length: 2 }),
    postalCode: (0, pg_core_1.varchar)("postal_code", { length: 5 }),
    country: (0, pg_core_1.varchar)("country", { length: 100 }).default("Italia"),
    // Emergency Contact
    emergencyContactName: (0, pg_core_1.varchar)("emergency_contact_name", { length: 200 }),
    emergencyContactRelationship: (0, pg_core_1.varchar)("emergency_contact_relationship", { length: 100 }),
    emergencyContactPhone: (0, pg_core_1.varchar)("emergency_contact_phone", { length: 20 }),
    emergencyContactEmail: (0, pg_core_1.varchar)("emergency_contact_email", { length: 255 }),
    // Administrative Information
    employeeNumber: (0, pg_core_1.varchar)("employee_number", { length: 50 }), // Matricola
    annualCost: (0, pg_core_1.real)("annual_cost"), // Costo aziendale annuo totale
    grossAnnualSalary: (0, pg_core_1.real)("gross_annual_salary"), // RAL - Retribuzione Annua Lorda
    level: (0, pg_core_1.varchar)("level", { length: 50 }), // Livello CCNL (keep as varchar to preserve existing data)
    ccnl: (0, pg_core_1.varchar)("ccnl", { length: 255 }), // CCNL applicato (es: "Commercio", "Telecomunicazioni")
    managerId: (0, pg_core_1.varchar)("manager_id").references(() => exports.users.id), // Responsabile diretto
    employmentEndDate: (0, pg_core_1.date)("employment_end_date"), // Per contratti a tempo determinato
    probationEndDate: (0, pg_core_1.date)("probation_end_date"), // Fine periodo di prova
    offboardingDate: (0, pg_core_1.date)("offboarding_date"), // Data offboarding
    // Italian Social Security (INPS/INAIL)
    inpsPosition: (0, pg_core_1.varchar)("inps_position", { length: 50 }), // Matricola INPS
    inailPosition: (0, pg_core_1.varchar)("inail_position", { length: 50 }), // Posizione assicurativa INAIL
    // Identity Document
    idDocumentType: (0, pg_core_1.varchar)("id_document_type", { length: 50 }), // Tipo documento (Carta Identità, Passaporto, Patente)
    idDocumentNumber: (0, pg_core_1.varchar)("id_document_number", { length: 50 }), // Numero documento
    idDocumentExpiryDate: (0, pg_core_1.date)("id_document_expiry_date"), // Scadenza documento
    // Banking Information
    bankIban: (0, pg_core_1.varchar)("bank_iban", { length: 34 }), // IBAN per stipendio
    bankName: (0, pg_core_1.varchar)("bank_name", { length: 255 }),
    // Professional Background
    education: (0, pg_core_1.text)("education"), // Titolo di studio
    certifications: (0, pg_core_1.text)("certifications").array(), // Certificazioni possedute
    skills: (0, pg_core_1.text)("skills").array(), // Competenze tecniche
    languages: (0, pg_core_1.text)("languages").array(), // Lingue parlate
    // Notes
    notes: (0, pg_core_1.text)("notes"), // Note interne HR
}, (table) => [
    (0, pg_core_1.index)("users_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("users_store_idx").on(table.storeId),
    (0, pg_core_1.index)("users_manager_idx").on(table.managerId),
    (0, pg_core_1.index)("users_employee_number_idx").on(table.employeeNumber),
]);
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    createdAt: true,
    updatedAt: true
});
// ==================== LEGAL ENTITIES ====================
exports.legalEntities = exports.w3suiteSchema.table("legal_entities", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    codice: (0, pg_core_1.varchar)("codice", { length: 20 }).notNull(),
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    pIva: (0, pg_core_1.varchar)("piva", { length: 50 }),
    billingProfileId: (0, pg_core_1.uuid)("billing_profile_id"),
    stato: (0, pg_core_1.varchar)("stato", { length: 50 }).default("Attiva"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Extended enterprise fields
    codiceFiscale: (0, pg_core_1.varchar)("codiceFiscale", { length: 50 }),
    formaGiuridica: (0, pg_core_1.varchar)("formaGiuridica", { length: 100 }),
    capitaleSociale: (0, pg_core_1.varchar)("capitaleSociale", { length: 50 }),
    dataCostituzione: (0, pg_core_1.date)("dataCostituzione"),
    indirizzo: (0, pg_core_1.text)("indirizzo"),
    citta: (0, pg_core_1.varchar)("citta", { length: 100 }),
    provincia: (0, pg_core_1.varchar)("provincia", { length: 10 }),
    cap: (0, pg_core_1.varchar)("cap", { length: 10 }),
    telefono: (0, pg_core_1.varchar)("telefono", { length: 50 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    pec: (0, pg_core_1.varchar)("pec", { length: 255 }),
    rea: (0, pg_core_1.varchar)("rea", { length: 100 }),
    registroImprese: (0, pg_core_1.varchar)("registroImprese", { length: 255 }),
    // New enterprise fields for enhanced functionality
    logo: (0, pg_core_1.text)("logo"), // PNG file path or base64
    codiceSDI: (0, pg_core_1.varchar)("codiceSDI", { length: 10 }),
    // Administrative contact section - using camelCase column names
    refAmminNome: (0, pg_core_1.varchar)("refAmminNome", { length: 100 }),
    refAmminCognome: (0, pg_core_1.varchar)("refAmminCognome", { length: 100 }),
    refAmminEmail: (0, pg_core_1.varchar)("refAmminEmail", { length: 255 }),
    refAmminCodiceFiscale: (0, pg_core_1.varchar)("refAmminCodiceFiscale", { length: 16 }),
    refAmminIndirizzo: (0, pg_core_1.text)("refAmminIndirizzo"),
    refAmminCitta: (0, pg_core_1.varchar)("refAmminCitta", { length: 100 }),
    refAmminCap: (0, pg_core_1.varchar)("refAmminCap", { length: 10 }),
    refAmminPaese: (0, pg_core_1.varchar)("refAmminPaese", { length: 100 }),
    // Dynamic notes field
    note: (0, pg_core_1.text)("note"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("legal_entities_tenant_codice_unique").on(table.tenantId, table.codice),
]);
exports.insertLegalEntitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.legalEntities).omit({
    createdAt: true,
    updatedAt: true
}).extend({
    // Allow id to be optionally provided (if not provided, will be auto-generated from code)
    id: zod_1.z.string().uuid().optional()
});
// ==================== STORES ====================
exports.stores = exports.w3suiteSchema.table("stores", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id").notNull().references(() => exports.legalEntities.id),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    channelId: (0, pg_core_1.uuid)("channel_id").notNull().references(() => public_1.channels.id),
    commercialAreaId: (0, pg_core_1.uuid)("commercial_area_id").notNull().references(() => public_1.commercialAreas.id),
    // LOCATION FIELDS (real database fields only)
    address: (0, pg_core_1.text)("address"),
    geo: (0, pg_core_1.jsonb)("geo"),
    citta: (0, pg_core_1.varchar)("citta", { length: 100 }),
    provincia: (0, pg_core_1.varchar)("provincia", { length: 10 }),
    cap: (0, pg_core_1.varchar)("cap", { length: 10 }),
    region: (0, pg_core_1.varchar)("region", { length: 100 }),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("active"),
    category: (0, exports.storeCategoryEnum)("category").default("sales_point").notNull(),
    openedAt: (0, pg_core_1.date)("opened_at"),
    closedAt: (0, pg_core_1.date)("closed_at"),
    billingOverrideId: (0, pg_core_1.uuid)("billing_override_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Contact fields
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    // Social and digital contact fields
    whatsapp1: (0, pg_core_1.varchar)("whatsapp1", { length: 20 }),
    whatsapp2: (0, pg_core_1.varchar)("whatsapp2", { length: 20 }),
    facebook: (0, pg_core_1.varchar)("facebook", { length: 255 }),
    instagram: (0, pg_core_1.varchar)("instagram", { length: 255 }),
    tiktok: (0, pg_core_1.varchar)("tiktok", { length: 255 }),
    googleMapsUrl: (0, pg_core_1.text)("google_maps_url"),
    telegram: (0, pg_core_1.varchar)("telegram", { length: 255 }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("stores_tenant_code_unique").on(table.tenantId, table.code),
]);
exports.insertStoreSchema = (0, drizzle_zod_1.createInsertSchema)(exports.stores).omit({
    createdAt: true,
    updatedAt: true
}).extend({
    // Allow id to be optionally provided (if not provided, will be auto-generated from code)
    id: zod_1.z.string().uuid().optional()
});
// ==================== STORE TRACKING CONFIGURATION ====================
// GTM Auto-Configuration System for Multi-Tenant Marketing Attribution
exports.storeTrackingConfig = exports.w3suiteSchema.table("store_tracking_config", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    // Marketing Tracking IDs
    ga4MeasurementId: (0, pg_core_1.varchar)("ga4_measurement_id", { length: 50 }), // Format: G-XXXXXXXXX
    googleAdsConversionId: (0, pg_core_1.varchar)("google_ads_conversion_id", { length: 50 }), // Format: AW-XXXXXXXX
    facebookPixelId: (0, pg_core_1.varchar)("facebook_pixel_id", { length: 50 }), // Numeric
    tiktokPixelId: (0, pg_core_1.varchar)("tiktok_pixel_id", { length: 50 }), // Alphanumeric
    // GTM Auto-Configuration Status
    gtmConfigured: (0, pg_core_1.boolean)("gtm_configured").default(false).notNull(),
    gtmTriggerId: (0, pg_core_1.varchar)("gtm_trigger_id", { length: 100 }), // GTM API trigger ID
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("store_tracking_config_store_unique").on(table.storeId),
    (0, pg_core_1.index)("store_tracking_config_tenant_idx").on(table.tenantId),
]);
exports.insertStoreTrackingConfigSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storeTrackingConfig).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== RBAC SYSTEM ====================
exports.roles = exports.w3suiteSchema.table("roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    isSystem: (0, pg_core_1.boolean)("is_system").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("roles_tenant_name_unique").on(table.tenantId, table.name),
]);
exports.insertRoleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.roles).omit({
    id: true,
    createdAt: true
});
exports.rolePerms = exports.w3suiteSchema.table("role_perms", {
    roleId: (0, pg_core_1.uuid)("role_id").notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
    perm: (0, pg_core_1.varchar)("perm", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.roleId, table.perm] }),
]);
exports.userAssignments = exports.w3suiteSchema.table("user_assignments", {
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    roleId: (0, pg_core_1.uuid)("role_id").notNull().references(() => exports.roles.id, { onDelete: 'cascade' }),
    scopeType: (0, exports.scopeTypeEnum)("scope_type").notNull(),
    scopeId: (0, pg_core_1.uuid)("scope_id").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] }),
]);
exports.insertUserAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userAssignments).omit({
    createdAt: true
});
exports.userExtraPerms = exports.w3suiteSchema.table("user_extra_perms", {
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    perm: (0, pg_core_1.varchar)("perm", { length: 255 }).notNull(),
    mode: (0, exports.permModeEnum)("mode").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.perm] }),
]);
// ==================== STORE ASSOCIATIONS ====================
exports.userStores = exports.w3suiteSchema.table("user_stores", {
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.storeId] }),
    (0, pg_core_1.index)("user_stores_user_idx").on(table.userId),
    (0, pg_core_1.index)("user_stores_store_idx").on(table.storeId),
    (0, pg_core_1.index)("user_stores_tenant_idx").on(table.tenantId),
]);
exports.insertUserStoreSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userStores).omit({
    createdAt: true
});
// ==================== USER LEGAL ENTITIES (1:M Users → Legal Entities) ====================
exports.userLegalEntities = exports.w3suiteSchema.table("user_legal_entities", {
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id").notNull().references(() => exports.legalEntities.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.userId, table.legalEntityId] }),
    (0, pg_core_1.index)("user_legal_entities_user_idx").on(table.userId),
    (0, pg_core_1.index)("user_legal_entities_legal_entity_idx").on(table.legalEntityId),
    (0, pg_core_1.index)("user_legal_entities_tenant_idx").on(table.tenantId),
]);
exports.insertUserLegalEntitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.userLegalEntities).omit({
    createdAt: true
});
exports.storeBrands = exports.w3suiteSchema.table("store_brands", {
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    brandId: (0, pg_core_1.uuid)("brand_id").notNull().references(() => public_1.brands.id),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.storeId, table.brandId] }),
    (0, pg_core_1.index)("store_brands_tenant_idx").on(table.tenantId),
]);
exports.storeDriverPotential = exports.w3suiteSchema.table("store_driver_potential", {
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    driverId: (0, pg_core_1.uuid)("driver_id").notNull().references(() => public_1.drivers.id),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    potentialScore: (0, pg_core_1.smallint)("potential_score").notNull(),
    clusterLabel: (0, pg_core_1.varchar)("cluster_label", { length: 50 }),
    kpis: (0, pg_core_1.jsonb)("kpis"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.storeId, table.driverId] }),
    (0, pg_core_1.index)("store_driver_potential_tenant_idx").on(table.tenantId),
]);
// ==================== ENTITY LOGS ====================
exports.entityLogs = exports.w3suiteSchema.table('entity_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.tenants.id),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(), // 'legal_entity', 'store', 'user'
    entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
    action: (0, pg_core_1.varchar)('action', { length: 50 }).notNull(), // 'created', 'status_changed', 'updated', 'deleted'
    previousStatus: (0, pg_core_1.varchar)('previous_status', { length: 50 }),
    newStatus: (0, pg_core_1.varchar)('new_status', { length: 50 }),
    changes: (0, pg_core_1.jsonb)('changes'), // JSON con tutti i cambiamenti
    userId: (0, pg_core_1.varchar)('user_id').references(() => exports.users.id), // Chi ha fatto il cambio
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.insertEntityLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.entityLogs).omit({
    id: true,
    createdAt: true
});
// ==================== STRUCTURED LOGS ====================
exports.structuredLogs = exports.w3suiteSchema.table('structured_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => exports.tenants.id),
    // Core log fields
    level: (0, pg_core_1.varchar)('level', { length: 10 }).notNull(), // INFO, WARN, ERROR, DEBUG
    message: (0, pg_core_1.text)('message').notNull(),
    component: (0, pg_core_1.varchar)('component', { length: 100 }).notNull(),
    // Context tracking
    correlationId: (0, pg_core_1.varchar)('correlation_id', { length: 50 }),
    userId: (0, pg_core_1.varchar)('user_id').references(() => exports.users.id),
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    // Business context
    action: (0, pg_core_1.varchar)('action', { length: 100 }),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }), // 'tenant', 'legal_entity', 'store', 'user'
    entityId: (0, pg_core_1.uuid)('entity_id'),
    // Performance metrics
    duration: (0, pg_core_1.integer)('duration'), // in milliseconds
    // Request context
    httpMethod: (0, pg_core_1.varchar)('http_method', { length: 10 }),
    httpPath: (0, pg_core_1.varchar)('http_path', { length: 255 }),
    httpStatusCode: (0, pg_core_1.integer)('http_status_code'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }), // IPv6 compatible
    userAgent: (0, pg_core_1.text)('user_agent'),
    // Error context
    errorStack: (0, pg_core_1.text)('error_stack'),
    errorCode: (0, pg_core_1.varchar)('error_code', { length: 50 }),
    // Additional metadata
    metadata: (0, pg_core_1.jsonb)('metadata'), // Flexible JSON data
    // Timestamps
    timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (table) => [
    // Indexes for performance
    (0, pg_core_1.index)('structured_logs_tenant_timestamp_idx').on(table.tenantId, table.timestamp),
    (0, pg_core_1.index)('structured_logs_level_timestamp_idx').on(table.level, table.timestamp),
    (0, pg_core_1.index)('structured_logs_component_timestamp_idx').on(table.component, table.timestamp),
    (0, pg_core_1.index)('structured_logs_correlation_idx').on(table.correlationId),
    (0, pg_core_1.index)('structured_logs_user_timestamp_idx').on(table.userId, table.timestamp),
    (0, pg_core_1.index)('structured_logs_entity_idx').on(table.entityType, table.entityId),
]);
exports.insertStructuredLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.structuredLogs).omit({
    id: true,
    createdAt: true,
    timestamp: true
});
// ==================== OBJECT STORAGE METADATA ====================
exports.objectMetadata = exports.w3suiteSchema.table("object_metadata", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    objectPath: (0, pg_core_1.varchar)("object_path", { length: 500 }).notNull().unique(),
    fileName: (0, pg_core_1.varchar)("file_name", { length: 255 }).notNull(),
    contentType: (0, pg_core_1.varchar)("content_type", { length: 100 }).notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(),
    visibility: (0, exports.objectVisibilityEnum)("visibility").notNull().default("private"),
    objectType: (0, exports.objectTypeEnum)("object_type").notNull().default("file"),
    uploadedBy: (0, pg_core_1.varchar)("uploaded_by").notNull().references(() => exports.users.id),
    publicUrl: (0, pg_core_1.varchar)("public_url", { length: 500 }),
    bucketId: (0, pg_core_1.varchar)("bucket_id", { length: 100 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Additional custom metadata
}, (table) => [
    (0, pg_core_1.index)("object_metadata_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("object_metadata_uploaded_by_idx").on(table.uploadedBy),
    (0, pg_core_1.index)("object_metadata_object_type_idx").on(table.objectType),
]);
exports.insertObjectMetadataSchema = (0, drizzle_zod_1.createInsertSchema)(exports.objectMetadata).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== OBJECT ACCESS CONTROL (ACL) ====================
exports.objectAcls = exports.w3suiteSchema.table("object_acls", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    objectPath: (0, pg_core_1.varchar)("object_path", { length: 500 }).notNull(),
    ownerId: (0, pg_core_1.varchar)("owner_id").notNull().references(() => exports.users.id),
    ownerTenantId: (0, pg_core_1.uuid)("owner_tenant_id").notNull().references(() => exports.tenants.id),
    visibility: (0, exports.objectVisibilityEnum)("visibility").notNull().default("private"),
    accessRules: (0, pg_core_1.jsonb)("access_rules").default([]), // Array of access rules
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("object_acls_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("object_acls_object_path_idx").on(table.objectPath),
    (0, pg_core_1.index)("object_acls_owner_idx").on(table.ownerId),
    (0, pg_core_1.uniqueIndex)("object_acls_object_path_unique").on(table.objectPath),
]);
exports.insertObjectAclSchema = (0, drizzle_zod_1.createInsertSchema)(exports.objectAcls).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== NOTIFICATIONS SYSTEM ====================
exports.notifications = exports.w3suiteSchema.table("notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Notification Classification
    type: (0, exports.notificationTypeEnum)("type").notNull().default("system"),
    priority: (0, exports.notificationPriorityEnum)("priority").notNull().default("medium"),
    status: (0, exports.notificationStatusEnum)("status").notNull().default("unread"),
    // ==================== BUSINESS CATEGORY EXTENSION ====================
    category: (0, exports.notificationCategoryEnum)("category").default("support"), // Business category
    sourceModule: (0, pg_core_1.varchar)("source_module", { length: 50 }), // Module that generated notification
    // Content
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    data: (0, pg_core_1.jsonb)("data").default({}), // Extra structured data
    url: (0, pg_core_1.varchar)("url", { length: 500 }), // Deep link URL
    // ==================== ENHANCED TARGETING ====================
    targetUserId: (0, pg_core_1.varchar)("target_user_id").references(() => exports.users.id), // Specific user (null = broadcast)
    targetRoles: (0, pg_core_1.text)("target_roles").array(), // Role-based targeting
    broadcast: (0, pg_core_1.boolean)("broadcast").default(false), // Send to all tenant users
    // Store/Area specific targeting
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id), // Store-specific notifications
    areaId: (0, pg_core_1.uuid)("area_id").references(() => exports.legalEntities.id), // Area-specific (via legal entities)
    // ==================== REAL-TIME TRACKING ====================
    websocketSent: (0, pg_core_1.boolean)("websocket_sent").default(false), // Track real-time delivery
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Auto-cleanup for temp notifications
}, (table) => [
    // Performance indexes for common queries
    (0, pg_core_1.index)("notifications_tenant_status_created_idx").on(table.tenantId, table.status, table.createdAt.desc()),
    (0, pg_core_1.index)("notifications_tenant_user_status_idx").on(table.tenantId, table.targetUserId, table.status),
    (0, pg_core_1.index)("notifications_target_roles_gin_idx").using("gin", table.targetRoles),
    (0, pg_core_1.index)("notifications_expires_at_idx").on(table.expiresAt),
    (0, pg_core_1.index)("notifications_tenant_priority_created_idx").on(table.tenantId, table.priority, table.createdAt.desc()),
    // ==================== NEW INDEXES FOR BUSINESS CATEGORIES ====================
    (0, pg_core_1.index)("notifications_category_created_idx").on(table.category, table.createdAt.desc()),
    (0, pg_core_1.index)("notifications_store_category_idx").on(table.storeId, table.category, table.status),
    (0, pg_core_1.index)("notifications_area_category_idx").on(table.areaId, table.category, table.status),
    (0, pg_core_1.index)("notifications_websocket_pending_idx").on(table.websocketSent, table.status, table.createdAt),
]);
exports.insertNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notifications).omit({
    id: true,
    createdAt: true
});
// ==================== NOTIFICATION TEMPLATES ====================
exports.notificationTemplates = exports.w3suiteSchema.table("notification_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Template Identification
    templateKey: (0, pg_core_1.varchar)("template_key", { length: 100 }).notNull(), // e.g., 'hr_request_submitted'
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // e.g., 'hr_request', 'general'
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(), // e.g., 'status_change', 'deadline_reminder'
    // Template Content
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // In-App Notification Template
    inAppTitle: (0, pg_core_1.varchar)("in_app_title", { length: 255 }).notNull(),
    inAppMessage: (0, pg_core_1.text)("in_app_message").notNull(),
    inAppUrl: (0, pg_core_1.varchar)("in_app_url", { length: 500 }), // Deep link template
    // Email Template
    emailSubject: (0, pg_core_1.varchar)("email_subject", { length: 255 }),
    emailBodyHtml: (0, pg_core_1.text)("email_body_html"),
    emailBodyText: (0, pg_core_1.text)("email_body_text"),
    // Template Variables (documentation)
    availableVariables: (0, pg_core_1.jsonb)("available_variables").default([]), // Array of variable names
    // Targeting Rules
    defaultPriority: (0, exports.notificationPriorityEnum)("default_priority").notNull().default("medium"),
    roleTargeting: (0, pg_core_1.text)("role_targeting").array(), // Default roles to target
    // Metadata
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("notification_templates_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("notification_templates_category_idx").on(table.category),
    (0, pg_core_1.uniqueIndex)("notification_templates_tenant_key_unique").on(table.tenantId, table.templateKey),
]);
exports.insertNotificationTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notificationTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== NOTIFICATION PREFERENCES ====================
exports.notificationPreferences = exports.w3suiteSchema.table("notification_preferences", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    // Channel Preferences
    inAppEnabled: (0, pg_core_1.boolean)("in_app_enabled").default(true),
    emailEnabled: (0, pg_core_1.boolean)("email_enabled").default(true),
    // Category Preferences (JSON for flexibility)
    categoryPreferences: (0, pg_core_1.jsonb)("category_preferences").default({}), // { hr_request: { email: true, inApp: true, priority: 'high' } }
    // Priority Filtering
    minPriorityInApp: (0, exports.notificationPriorityEnum)("min_priority_in_app").default("low"),
    minPriorityEmail: (0, exports.notificationPriorityEnum)("min_priority_email").default("medium"),
    // Quiet Hours (24-hour format)
    quietHoursEnabled: (0, pg_core_1.boolean)("quiet_hours_enabled").default(false),
    quietHoursStart: (0, pg_core_1.varchar)("quiet_hours_start", { length: 5 }), // "22:00"
    quietHoursEnd: (0, pg_core_1.varchar)("quiet_hours_end", { length: 5 }), // "08:00"
    // Digest Preferences
    dailyDigestEnabled: (0, pg_core_1.boolean)("daily_digest_enabled").default(false),
    weeklyDigestEnabled: (0, pg_core_1.boolean)("weekly_digest_enabled").default(true),
    digestDeliveryTime: (0, pg_core_1.varchar)("digest_delivery_time", { length: 5 }).default("09:00"), // "09:00"
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("notification_preferences_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("notification_preferences_user_idx").on(table.userId),
    (0, pg_core_1.uniqueIndex)("notification_preferences_tenant_user_unique").on(table.tenantId, table.userId),
]);
exports.insertNotificationPreferenceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notificationPreferences).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SUPPLIERS (Brand Base + Tenant Override Pattern) ====================
exports.suppliers = exports.w3suiteSchema.table("suppliers", {
    // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    origin: (0, exports.supplierOriginEnum)("origin").notNull(), // 'brand' | 'tenant'
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id), // NULL per supplier brand-managed
    externalId: (0, pg_core_1.varchar)("external_id", { length: 100 }), // ID da Brand Interface
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(), // Nome commerciale
    legalName: (0, pg_core_1.varchar)("legal_name", { length: 255 }), // Ragione sociale legale
    legalForm: (0, pg_core_1.varchar)("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
    supplierType: (0, exports.supplierTypeEnum)("supplier_type").notNull(),
    // ==================== DATI FISCALI ITALIA ====================
    vatNumber: (0, pg_core_1.varchar)("vat_number", { length: 20 }), // P.IVA
    taxCode: (0, pg_core_1.varchar)("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
    sdiCode: (0, pg_core_1.varchar)("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
    pecEmail: (0, pg_core_1.varchar)("pec_email", { length: 255 }), // PEC (alternativa a SDI)
    reaNumber: (0, pg_core_1.varchar)("rea_number", { length: 50 }), // Numero REA
    chamberOfCommerce: (0, pg_core_1.varchar)("chamber_of_commerce", { length: 255 }),
    // ==================== INDIRIZZO SEDE LEGALE ====================
    registeredAddress: (0, pg_core_1.jsonb)("registered_address"), // { via, civico, cap, citta, provincia }
    cityId: (0, pg_core_1.uuid)("city_id").references(() => public_1.italianCities.id), // FK to public.italian_cities
    countryId: (0, pg_core_1.uuid)("country_id").references(() => public_1.countries.id).notNull(), // FK to public.countries
    // ==================== PAGAMENTI ====================
    preferredPaymentMethodId: (0, pg_core_1.uuid)("preferred_payment_method_id").references(() => public_1.paymentMethods.id),
    paymentConditionId: (0, pg_core_1.uuid)("payment_condition_id").references(() => public_1.paymentMethodsConditions.id),
    paymentTerms: (0, pg_core_1.varchar)("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("EUR"),
    // ==================== CONTATTI ====================
    email: (0, pg_core_1.varchar)("email", { length: 255 }), // Email principale
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }), // Telefono principale
    website: (0, pg_core_1.varchar)("website", { length: 255 }), // Sito web
    // Referenti strutturati (JSONB per flessibilità)
    contacts: (0, pg_core_1.jsonb)("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
    // ==================== AMMINISTRATIVI ESTESI ====================
    iban: (0, pg_core_1.varchar)("iban", { length: 34 }), // Codice IBAN
    bic: (0, pg_core_1.varchar)("bic", { length: 11 }), // Codice BIC/SWIFT
    splitPayment: (0, pg_core_1.boolean)("split_payment").default(false), // Split Payment
    withholdingTax: (0, pg_core_1.boolean)("withholding_tax").default(false), // Ritenuta d'Acconto
    taxRegime: (0, pg_core_1.varchar)("tax_regime", { length: 100 }), // Regime fiscale
    // ==================== CONTROLLO & STATO ====================
    status: (0, exports.supplierStatusEnum)("status").notNull().default("active"),
    lockedFields: (0, pg_core_1.text)("locked_fields").array().default([]), // Campi bloccati dal brand
    // ==================== METADATI ====================
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => [
    // Performance indexes
    (0, pg_core_1.index)("suppliers_tenant_code_idx").on(table.tenantId, table.code),
    (0, pg_core_1.index)("suppliers_origin_status_idx").on(table.origin, table.status),
    (0, pg_core_1.index)("suppliers_vat_number_idx").on(table.vatNumber),
    (0, pg_core_1.index)("suppliers_name_idx").on(table.name),
    (0, pg_core_1.uniqueIndex)("suppliers_code_unique").on(table.code),
]);
exports.insertSupplierSchema = (0, drizzle_zod_1.createInsertSchema)(exports.suppliers).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SUPPLIER OVERRIDES (Tenant-Specific Suppliers) ====================
// Full table for tenant-created suppliers (not just overrides)
exports.supplierOverrides = exports.w3suiteSchema.table("supplier_overrides", {
    // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    origin: (0, exports.supplierOriginEnum)("origin").notNull().default("tenant"), // Always 'tenant' for this table
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id), // Always required for tenant suppliers
    externalId: (0, pg_core_1.varchar)("external_id", { length: 100 }), // ID from Brand Interface (usually NULL for tenant suppliers)
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(), // Nome commerciale
    legalName: (0, pg_core_1.varchar)("legal_name", { length: 255 }), // Ragione sociale legale
    legalForm: (0, pg_core_1.varchar)("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
    supplierType: (0, exports.supplierTypeEnum)("supplier_type").notNull(),
    // ==================== DATI FISCALI ITALIA ====================
    vatNumber: (0, pg_core_1.varchar)("vat_number", { length: 20 }), // P.IVA
    taxCode: (0, pg_core_1.varchar)("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
    sdiCode: (0, pg_core_1.varchar)("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
    pecEmail: (0, pg_core_1.varchar)("pec_email", { length: 255 }), // PEC (alternativa a SDI)
    reaNumber: (0, pg_core_1.varchar)("rea_number", { length: 50 }), // Numero REA
    chamberOfCommerce: (0, pg_core_1.varchar)("chamber_of_commerce", { length: 255 }),
    // ==================== INDIRIZZO SEDE LEGALE ====================
    registeredAddress: (0, pg_core_1.jsonb)("registered_address"), // { via, civico, cap, citta, provincia }
    cityId: (0, pg_core_1.uuid)("city_id").references(() => public_1.italianCities.id), // FK to public.italian_cities
    countryId: (0, pg_core_1.uuid)("country_id").references(() => public_1.countries.id).notNull(), // FK to public.countries
    // ==================== PAGAMENTI ====================
    preferredPaymentMethodId: (0, pg_core_1.uuid)("preferred_payment_method_id").references(() => public_1.paymentMethods.id),
    paymentConditionId: (0, pg_core_1.uuid)("payment_condition_id").references(() => public_1.paymentMethodsConditions.id),
    paymentTerms: (0, pg_core_1.varchar)("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("EUR"),
    // ==================== CONTATTI ====================
    email: (0, pg_core_1.varchar)("email", { length: 255 }), // Email principale
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }), // Telefono principale
    website: (0, pg_core_1.varchar)("website", { length: 255 }), // Sito web
    // Referenti strutturati (JSONB per flessibilità)
    contacts: (0, pg_core_1.jsonb)("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
    // ==================== AMMINISTRATIVI ESTESI ====================
    iban: (0, pg_core_1.varchar)("iban", { length: 34 }), // Codice IBAN
    bic: (0, pg_core_1.varchar)("bic", { length: 11 }), // Codice BIC/SWIFT
    splitPayment: (0, pg_core_1.boolean)("split_payment").default(false), // Split Payment
    withholdingTax: (0, pg_core_1.boolean)("withholding_tax").default(false), // Ritenuta d'Acconto
    taxRegime: (0, pg_core_1.varchar)("tax_regime", { length: 100 }), // Regime fiscale
    // ==================== CONTROLLO & STATO ====================
    status: (0, exports.supplierStatusEnum)("status").notNull().default("active"),
    lockedFields: (0, pg_core_1.text)("locked_fields").array().default([]), // Campi bloccati dal brand (usually empty for tenant suppliers)
    // ==================== METADATI ====================
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => [
    // Performance indexes
    (0, pg_core_1.index)("supplier_overrides_tenant_code_idx").on(table.tenantId, table.code),
    (0, pg_core_1.index)("supplier_overrides_origin_status_idx").on(table.origin, table.status),
    (0, pg_core_1.index)("supplier_overrides_vat_number_idx").on(table.vatNumber),
    (0, pg_core_1.index)("supplier_overrides_name_idx").on(table.name),
    (0, pg_core_1.uniqueIndex)("supplier_overrides_tenant_code_unique").on(table.tenantId, table.code),
]);
exports.insertSupplierOverrideSchema = (0, drizzle_zod_1.createInsertSchema)(exports.supplierOverrides).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== PRODUCT HIERARCHY - TENANT CUSTOM ====================
// ==================== TENANT CUSTOM DRIVERS ====================
exports.tenantCustomDrivers = exports.w3suiteSchema.table("tenant_custom_drivers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_tenant_custom_drivers_tenant").on(table.tenantId),
    (0, pg_core_1.uniqueIndex)("tenant_custom_drivers_unique").on(table.tenantId, table.code),
]);
exports.insertTenantCustomDriverSchema = (0, drizzle_zod_1.createInsertSchema)(exports.tenantCustomDrivers).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== TENANT DRIVER CATEGORIES (for both brand and custom drivers) ====================
exports.tenantDriverCategories = exports.w3suiteSchema.table("tenant_driver_categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Can reference either brand driver (public.drivers) OR tenant custom driver
    brandDriverId: (0, pg_core_1.uuid)("brand_driver_id"), // References public.drivers
    customDriverId: (0, pg_core_1.uuid)("custom_driver_id").references(() => exports.tenantCustomDrivers.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_tenant_driver_categories_tenant").on(table.tenantId),
    (0, pg_core_1.index)("idx_tenant_driver_categories_brand_driver").on(table.brandDriverId),
    (0, pg_core_1.index)("idx_tenant_driver_categories_custom_driver").on(table.customDriverId),
    (0, pg_core_1.uniqueIndex)("tenant_driver_categories_brand_unique").on(table.tenantId, table.brandDriverId, table.code),
    (0, pg_core_1.uniqueIndex)("tenant_driver_categories_custom_unique").on(table.tenantId, table.customDriverId, table.code),
]);
exports.insertTenantDriverCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.tenantDriverCategories).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== TENANT DRIVER TYPOLOGIES (for both brand and custom categories) ====================
exports.tenantDriverTypologies = exports.w3suiteSchema.table("tenant_driver_typologies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Can reference either brand category (public.driver_categories) OR tenant custom category
    brandCategoryId: (0, pg_core_1.uuid)("brand_category_id"), // References public.driver_categories
    customCategoryId: (0, pg_core_1.uuid)("custom_category_id").references(() => exports.tenantDriverCategories.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_tenant_driver_typologies_tenant").on(table.tenantId),
    (0, pg_core_1.index)("idx_tenant_driver_typologies_brand_category").on(table.brandCategoryId),
    (0, pg_core_1.index)("idx_tenant_driver_typologies_custom_category").on(table.customCategoryId),
    (0, pg_core_1.uniqueIndex)("tenant_driver_typologies_brand_unique").on(table.tenantId, table.brandCategoryId, table.code),
    (0, pg_core_1.uniqueIndex)("tenant_driver_typologies_custom_unique").on(table.tenantId, table.customCategoryId, table.code),
]);
exports.insertTenantDriverTypologySchema = (0, drizzle_zod_1.createInsertSchema)(exports.tenantDriverTypologies).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== HR SYSTEM TABLES ====================
// ==================== CALENDAR EVENTS ====================
exports.calendarEvents = exports.w3suiteSchema.table("calendar_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    ownerId: (0, pg_core_1.varchar)("owner_id").notNull().references(() => exports.users.id),
    // Core event data
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    location: (0, pg_core_1.varchar)("location", { length: 255 }),
    startDate: (0, pg_core_1.timestamp)("start_date").notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date").notNull(),
    allDay: (0, pg_core_1.boolean)("all_day").default(false),
    // Event classification
    type: (0, exports.calendarEventTypeEnum)("type").notNull().default("other"),
    visibility: (0, exports.calendarEventVisibilityEnum)("visibility").notNull().default("private"),
    status: (0, exports.calendarEventStatusEnum)("status").notNull().default("tentative"),
    hrSensitive: (0, pg_core_1.boolean)("hr_sensitive").default(false),
    // ✅ BUSINESS CATEGORY (was missing from Drizzle)
    category: (0, exports.calendarEventCategoryEnum)("category").notNull().default("hr"),
    // RBAC scoping
    teamId: (0, pg_core_1.uuid)("team_id"),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id),
    areaId: (0, pg_core_1.uuid)("area_id"),
    // Recurring events
    recurring: (0, pg_core_1.jsonb)("recurring").default({}), // { pattern, interval, daysOfWeek, endDate, exceptions }
    // Participants
    attendees: (0, pg_core_1.jsonb)("attendees").default([]), // [{ userId, status, responseTime }]
    // Additional metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Type-specific data
    color: (0, pg_core_1.varchar)("color", { length: 7 }), // Hex color for UI
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("calendar_events_tenant_owner_idx").on(table.tenantId, table.ownerId),
    (0, pg_core_1.index)("calendar_events_tenant_date_idx").on(table.tenantId, table.startDate, table.endDate),
    (0, pg_core_1.index)("calendar_events_tenant_type_idx").on(table.tenantId, table.type),
    (0, pg_core_1.index)("calendar_events_store_date_idx").on(table.storeId, table.startDate),
]);
exports.insertCalendarEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.calendarEvents).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== ENCRYPTION KEYS ====================
exports.encryptionKeys = exports.w3suiteSchema.table("encryption_keys", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Key identification
    keyId: (0, pg_core_1.varchar)("key_id", { length: 100 }).notNull().unique(),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    // Key metadata (NOT the actual key - keys are derived client-side)
    algorithm: (0, pg_core_1.varchar)("algorithm", { length: 50 }).notNull().default("AES-GCM"),
    keyLength: (0, pg_core_1.integer)("key_length").notNull().default(256),
    saltBase64: (0, pg_core_1.text)("salt_base64").notNull(), // Salt for key derivation
    iterations: (0, pg_core_1.integer)("iterations").notNull().default(100000),
    // Key status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    // GDPR compliance
    destroyedAt: (0, pg_core_1.timestamp)("destroyed_at"), // For "right to be forgotten"
    destroyReason: (0, pg_core_1.varchar)("destroy_reason", { length: 100 }),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Key rotation
}, (table) => [
    (0, pg_core_1.index)("encryption_keys_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("encryption_keys_key_id_idx").on(table.keyId),
]);
exports.insertEncryptionKeySchema = (0, drizzle_zod_1.createInsertSchema)(exports.encryptionKeys).omit({
    id: true,
    createdAt: true
});
// ==================== TIME TRACKING ====================
exports.timeTracking = exports.w3suiteSchema.table("time_tracking", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id),
    // Clock times
    clockIn: (0, pg_core_1.timestamp)("clock_in").notNull(),
    clockOut: (0, pg_core_1.timestamp)("clock_out"),
    breaks: (0, pg_core_1.jsonb)("breaks").default([]), // [{ start, end, duration }]
    // Tracking details
    trackingMethod: (0, exports.trackingMethodEnum)("tracking_method").notNull(),
    // LEGACY FIELDS (for backwards compatibility)
    geoLocation: (0, pg_core_1.jsonb)("geo_location"), // { lat, lng, accuracy, address } - DEPRECATED
    deviceInfo: (0, pg_core_1.jsonb)("device_info"), // { deviceId, deviceType, ipAddress, userAgent } - DEPRECATED
    notes: (0, pg_core_1.text)("notes"), // DEPRECATED - use encryptedNotes
    // ENCRYPTED FIELDS
    encryptedGeoLocation: (0, pg_core_1.text)("encrypted_geo_location"), // Base64 encrypted geo data
    encryptedDeviceInfo: (0, pg_core_1.text)("encrypted_device_info"), // Base64 encrypted device data  
    encryptedNotes: (0, pg_core_1.text)("encrypted_notes"), // Base64 encrypted notes
    // ENCRYPTION METADATA
    encryptionKeyId: (0, pg_core_1.varchar)("encryption_key_id", { length: 100 }).references(() => exports.encryptionKeys.keyId),
    encryptionVersion: (0, pg_core_1.integer)("encryption_version").default(1),
    geoLocationIv: (0, pg_core_1.varchar)("geo_location_iv", { length: 100 }), // Initialization vector for geo
    deviceInfoIv: (0, pg_core_1.varchar)("device_info_iv", { length: 100 }), // IV for device info
    notesIv: (0, pg_core_1.varchar)("notes_iv", { length: 100 }), // IV for notes
    geoLocationTag: (0, pg_core_1.varchar)("geo_location_tag", { length: 100 }), // Auth tag for geo
    deviceInfoTag: (0, pg_core_1.varchar)("device_info_tag", { length: 100 }), // Auth tag for device
    notesTag: (0, pg_core_1.varchar)("notes_tag", { length: 100 }), // Auth tag for notes
    encryptedAt: (0, pg_core_1.timestamp)("encrypted_at"), // When data was encrypted
    // Shift association
    shiftId: (0, pg_core_1.uuid)("shift_id").references(() => exports.shifts.id), // FK to planned shift
    // Calculated fields
    totalMinutes: (0, pg_core_1.integer)("total_minutes"),
    breakMinutes: (0, pg_core_1.integer)("break_minutes"),
    overtimeMinutes: (0, pg_core_1.integer)("overtime_minutes"),
    holidayBonus: (0, pg_core_1.boolean)("holiday_bonus").default(false),
    // Status and approval
    status: (0, exports.timeTrackingStatusEnum)("status").notNull().default("active"),
    editReason: (0, pg_core_1.text)("edit_reason"),
    approvedBy: (0, pg_core_1.varchar)("approved_by").references(() => exports.users.id),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("time_tracking_tenant_user_idx").on(table.tenantId, table.userId),
    (0, pg_core_1.index)("time_tracking_tenant_store_date_idx").on(table.tenantId, table.storeId, table.clockIn),
    (0, pg_core_1.index)("time_tracking_shift_idx").on(table.shiftId),
    (0, pg_core_1.index)("time_tracking_status_idx").on(table.status),
    (0, pg_core_1.index)("time_tracking_encryption_key_idx").on(table.encryptionKeyId),
]);
exports.insertTimeTrackingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.timeTracking).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== STORES TIMETRACKING METHODS ====================
// Configuration table linking stores to available timetracking methods
exports.storesTimetrackingMethods = exports.w3suiteSchema.table("stores_timetracking_methods", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id),
    // Method configuration
    method: (0, exports.trackingMethodEnum)("method").notNull(),
    enabled: (0, pg_core_1.boolean)("enabled").default(true),
    priority: (0, pg_core_1.integer)("priority").default(0), // For ordering methods in UI
    // Method-specific configuration
    config: (0, pg_core_1.jsonb)("config").default({}), // Store method-specific settings
    // Examples of config content:
    // GPS: { geofenceRadius: 200, requiresWiFi: false, accuracyThreshold: 50 }
    // QR: { qrCodeUrl: "...", dynamicRefresh: 300, cameraRequired: true }
    // NFC: { requiredBadgeTypes: ["employee", "temp"], timeout: 30 }
    // Badge: { allowedBadgeFormats: ["numeric", "barcode"], length: 8 }
    // Smart: { fallbackOrder: ["gps", "qr", "badge"], confidence: 0.8 }
    // Web: { cookieExpiry: 2592000, fingerprintStrict: true }
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
}, (table) => [
    // Ensure unique store-method combinations per tenant
    (0, pg_core_1.uniqueIndex)("stores_timetracking_methods_unique").on(table.tenantId, table.storeId, table.method),
    (0, pg_core_1.index)("stores_timetracking_methods_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("stores_timetracking_methods_store_idx").on(table.storeId),
    (0, pg_core_1.index)("stores_timetracking_methods_enabled_idx").on(table.enabled),
]);
exports.insertStoresTimetrackingMethodsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.storesTimetrackingMethods).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SHIFTS ====================
exports.shifts = exports.w3suiteSchema.table("shifts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id),
    // Shift identification
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    code: (0, pg_core_1.varchar)("code", { length: 50 }),
    // Timing
    date: (0, pg_core_1.date)("date").notNull(),
    startTime: (0, pg_core_1.timestamp)("start_time").notNull(),
    endTime: (0, pg_core_1.timestamp)("end_time").notNull(),
    breakMinutes: (0, pg_core_1.integer)("break_minutes").default(0),
    // Attendance tolerance (minutes)
    clockInToleranceMinutes: (0, pg_core_1.integer)("clock_in_tolerance_minutes").default(15),
    clockOutToleranceMinutes: (0, pg_core_1.integer)("clock_out_tolerance_minutes").default(15),
    // Staffing
    requiredStaff: (0, pg_core_1.integer)("required_staff").notNull(),
    assignedUsers: (0, pg_core_1.jsonb)("assigned_users").default([]), // [userId1, userId2, ...]
    // Shift details
    shiftType: (0, exports.shiftTypeEnum)("shift_type").notNull(),
    templateId: (0, pg_core_1.uuid)("template_id"),
    skills: (0, pg_core_1.jsonb)("skills").default([]), // Required skills/certifications
    // Status and display
    status: (0, exports.shiftStatusEnum)("status").notNull().default("draft"),
    notes: (0, pg_core_1.text)("notes"),
    color: (0, pg_core_1.varchar)("color", { length: 7 }), // Hex color for UI
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("shifts_tenant_store_date_idx").on(table.tenantId, table.storeId, table.date),
    (0, pg_core_1.index)("shifts_tenant_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("shifts_template_idx").on(table.templateId),
]);
exports.insertShiftSchema = (0, drizzle_zod_1.createInsertSchema)(exports.shifts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SHIFT TEMPLATES ====================
exports.shiftTemplates = exports.w3suiteSchema.table("shift_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Template identification
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // Store assignment (NEW: template belongs to specific store)
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id),
    // Pattern configuration
    pattern: (0, exports.shiftPatternEnum)("pattern").notNull(),
    rules: (0, pg_core_1.jsonb)("rules").default({}), // Complex recurrence rules
    // Default values
    defaultStartTime: (0, pg_core_1.varchar)("default_start_time", { length: 5 }), // HH:MM format
    defaultEndTime: (0, pg_core_1.varchar)("default_end_time", { length: 5 }), // HH:MM format
    defaultRequiredStaff: (0, pg_core_1.integer)("default_required_staff").notNull(),
    defaultSkills: (0, pg_core_1.jsonb)("default_skills").default([]),
    defaultBreakMinutes: (0, pg_core_1.integer)("default_break_minutes").default(30),
    // ✅ NEW: Shift Type and Global Tolerances for Split Shifts
    // 'slot_based': Each time slot is a separate shift with its own tolerances/breaks
    // 'split_shift': All time slots together form one shift with global tolerances/breaks
    shiftType: (0, pg_core_1.varchar)("shift_type", { length: 20 }).notNull().default("slot_based"), // 'slot_based' | 'split_shift'
    globalClockInTolerance: (0, pg_core_1.integer)("global_clock_in_tolerance"), // Used only for split_shift type
    globalClockOutTolerance: (0, pg_core_1.integer)("global_clock_out_tolerance"), // Used only for split_shift type
    globalBreakMinutes: (0, pg_core_1.integer)("global_break_minutes"), // Used only for split_shift type
    // Validity and status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("active"), // NEW: active | archived
    validFrom: (0, pg_core_1.date)("valid_from"),
    validUntil: (0, pg_core_1.date)("valid_until"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("shift_templates_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("shift_templates_pattern_idx").on(table.pattern),
    (0, pg_core_1.index)("shift_templates_store_idx").on(table.storeId),
]);
exports.insertShiftTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.shiftTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SHIFT TIME SLOTS ====================
// Enhanced support for multiple time slots per shift template
exports.shiftTimeSlots = exports.w3suiteSchema.table("shift_time_slots", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    templateId: (0, pg_core_1.uuid)("template_id").notNull().references(() => exports.shiftTemplates.id, { onDelete: 'cascade' }),
    // Time slot identification
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(), // e.g. "Apertura", "Pausa Pranzo", "Chiusura"
    slotOrder: (0, pg_core_1.integer)("slot_order").notNull(), // Order within the template
    // Timing
    startTime: (0, pg_core_1.varchar)("start_time", { length: 5 }).notNull(), // HH:MM format
    endTime: (0, pg_core_1.varchar)("end_time", { length: 5 }).notNull(), // HH:MM format
    // ✅ NEW: Multi-block shift support (up to 4 blocks)
    segmentType: (0, pg_core_1.varchar)("segment_type", { length: 20 }).notNull().default("continuous"), // continuous | split | triple | quad
    block2StartTime: (0, pg_core_1.varchar)("block2_start_time", { length: 5 }), // For multi-block shifts
    block2EndTime: (0, pg_core_1.varchar)("block2_end_time", { length: 5 }), // For multi-block shifts
    block3StartTime: (0, pg_core_1.varchar)("block3_start_time", { length: 5 }), // For triple/quad shifts
    block3EndTime: (0, pg_core_1.varchar)("block3_end_time", { length: 5 }), // For triple/quad shifts
    block4StartTime: (0, pg_core_1.varchar)("block4_start_time", { length: 5 }), // For quad shifts only
    block4EndTime: (0, pg_core_1.varchar)("block4_end_time", { length: 5 }), // For quad shifts only
    breakMinutes: (0, pg_core_1.integer)("break_minutes").default(0), // Break duration (applies to all types)
    clockInTolerance: (0, pg_core_1.integer)("clock_in_tolerance").default(15), // Minutes tolerance for clock-in
    clockOutTolerance: (0, pg_core_1.integer)("clock_out_tolerance").default(15), // Minutes tolerance for clock-out
    // Slot configuration
    requiredStaff: (0, pg_core_1.integer)("required_staff").notNull(),
    skills: (0, pg_core_1.jsonb)("skills").default([]), // Required skills for this slot
    isBreak: (0, pg_core_1.boolean)("is_break").default(false), // True if this is a break slot
    // Flexibility
    minStaff: (0, pg_core_1.integer)("min_staff"), // Minimum staff required
    maxStaff: (0, pg_core_1.integer)("max_staff"), // Maximum staff allowed
    priority: (0, pg_core_1.integer)("priority").default(1), // 1=critical, 2=important, 3=optional
    // Metadata
    color: (0, pg_core_1.varchar)("color", { length: 7 }), // Hex color for UI display
    notes: (0, pg_core_1.text)("notes"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("shift_time_slots_template_order_idx").on(table.templateId, table.slotOrder),
    (0, pg_core_1.index)("shift_time_slots_tenant_idx").on(table.tenantId),
    (0, pg_core_1.uniqueIndex)("shift_time_slots_template_order_unique").on(table.templateId, table.slotOrder),
]);
exports.insertShiftTimeSlotSchema = (0, drizzle_zod_1.createInsertSchema)(exports.shiftTimeSlots).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== SHIFT ASSIGNMENTS ====================
// Enhanced many-to-many relationship for user-shift assignments with metadata
exports.shiftAssignments = exports.w3suiteSchema.table("shift_assignments", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.varchar)("tenant_id").notNull().references(() => exports.tenants.id),
    shiftId: (0, pg_core_1.varchar)("shift_id").notNull().references(() => exports.shifts.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    // Assignment details
    assignmentType: (0, pg_core_1.varchar)("assignment_type", { length: 20 }).notNull().default("manual"), // manual, auto, template
    timeSlotId: (0, pg_core_1.varchar)("time_slot_id").references(() => exports.shiftTimeSlots.id), // Specific time slot assignment
    // Assignment metadata
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    assignedBy: (0, pg_core_1.varchar)("assigned_by").notNull().references(() => exports.users.id),
    // Status tracking
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("assigned"), // assigned, confirmed, rejected, completed
    confirmedAt: (0, pg_core_1.timestamp)("confirmed_at"),
    rejectedAt: (0, pg_core_1.timestamp)("rejected_at"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    // Performance tracking
    punctualityScore: (0, pg_core_1.integer)("punctuality_score"), // 0-100 score for punctuality
    performanceNotes: (0, pg_core_1.text)("performance_notes"),
    // Compliance and attendance
    expectedClockIn: (0, pg_core_1.timestamp)("expected_clock_in"),
    expectedClockOut: (0, pg_core_1.timestamp)("expected_clock_out"),
    actualClockIn: (0, pg_core_1.timestamp)("actual_clock_in"),
    actualClockOut: (0, pg_core_1.timestamp)("actual_clock_out"),
    // Deviation tracking
    clockInDeviationMinutes: (0, pg_core_1.integer)("clock_in_deviation_minutes"), // Calculated deviation
    clockOutDeviationMinutes: (0, pg_core_1.integer)("clock_out_deviation_minutes"),
    isCompliant: (0, pg_core_1.boolean)("is_compliant").default(true), // Auto-calculated compliance flag
    // Notes and communication
    employeeNotes: (0, pg_core_1.text)("employee_notes"), // Notes from employee
    managerNotes: (0, pg_core_1.text)("manager_notes"), // Notes from manager
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    // Core indexes for performance
    (0, pg_core_1.index)("shift_assignments_tenant_user_idx").on(table.tenantId, table.userId),
    (0, pg_core_1.index)("shift_assignments_shift_idx").on(table.shiftId),
    (0, pg_core_1.index)("shift_assignments_status_idx").on(table.status),
    (0, pg_core_1.index)("shift_assignments_compliance_idx").on(table.isCompliant),
    (0, pg_core_1.index)("shift_assignments_punctuality_idx").on(table.punctualityScore),
    // Unique constraint to prevent duplicate assignments
    (0, pg_core_1.uniqueIndex)("shift_assignments_unique").on(table.shiftId, table.userId, table.timeSlotId),
    // Time-based indexes for reporting
    (0, pg_core_1.index)("shift_assignments_assigned_date_idx").on(table.assignedAt),
    (0, pg_core_1.index)("shift_assignments_expected_clock_in_idx").on(table.expectedClockIn),
]);
exports.insertShiftAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.shiftAssignments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    assignedAt: true
});
// ==================== SHIFT ATTENDANCE ====================
// Enhanced shift compliance and attendance matching system
exports.shiftAttendance = exports.w3suiteSchema.table("shift_attendance", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    assignmentId: (0, pg_core_1.varchar)("assignment_id").notNull().references(() => exports.shiftAssignments.id, { onDelete: 'cascade' }),
    timeTrackingId: (0, pg_core_1.uuid)("time_tracking_id").references(() => exports.timeTracking.id),
    // Essential filtering fields
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    // Attendance status
    attendanceStatus: (0, pg_core_1.varchar)("attendance_status", { length: 20 }).notNull().default("scheduled"),
    // scheduled, present, late, absent, early_departure, overtime
    // Matching data
    matchingScore: (0, pg_core_1.real)("matching_score"), // 0.0-1.0 confidence score for auto-matching
    matchingMethod: (0, pg_core_1.varchar)("matching_method", { length: 20 }), // auto, manual, override
    // Deviation analysis
    scheduledStartTime: (0, pg_core_1.timestamp)("scheduled_start_time").notNull(),
    scheduledEndTime: (0, pg_core_1.timestamp)("scheduled_end_time").notNull(),
    actualStartTime: (0, pg_core_1.timestamp)("actual_start_time"),
    actualEndTime: (0, pg_core_1.timestamp)("actual_end_time"),
    // Calculated metrics
    startDeviationMinutes: (0, pg_core_1.integer)("start_deviation_minutes"), // + late, - early
    endDeviationMinutes: (0, pg_core_1.integer)("end_deviation_minutes"),
    totalWorkedMinutes: (0, pg_core_1.integer)("total_worked_minutes"),
    scheduledMinutes: (0, pg_core_1.integer)("scheduled_minutes"),
    overtimeMinutes: (0, pg_core_1.integer)("overtime_minutes"),
    // Compliance flags
    isOnTime: (0, pg_core_1.boolean)("is_on_time").default(true),
    isCompliantDuration: (0, pg_core_1.boolean)("is_compliant_duration").default(true),
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(false),
    // Geographic compliance
    clockInLocation: (0, pg_core_1.jsonb)("clock_in_location"), // { lat, lng, accuracy, address }
    clockOutLocation: (0, pg_core_1.jsonb)("clock_out_location"),
    isLocationCompliant: (0, pg_core_1.boolean)("is_location_compliant").default(true),
    geofenceDeviationMeters: (0, pg_core_1.integer)("geofence_deviation_meters"),
    // Alert and notification status
    alertsSent: (0, pg_core_1.jsonb)("alerts_sent").default([]), // Array of alert types sent
    escalationLevel: (0, pg_core_1.integer)("escalation_level").default(0), // 0=none, 1=supervisor, 2=hr, 3=admin
    // Manager review
    reviewedBy: (0, pg_core_1.varchar)("reviewed_by").references(() => exports.users.id),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
    reviewStatus: (0, pg_core_1.varchar)("review_status", { length: 20 }), // pending, approved, disputed, corrected
    reviewNotes: (0, pg_core_1.text)("review_notes"),
    // System metadata
    processingStatus: (0, pg_core_1.varchar)("processing_status", { length: 20 }).default("pending"), // pending, processed, error
    lastProcessedAt: (0, pg_core_1.timestamp)("last_processed_at"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    // Performance indexes
    (0, pg_core_1.index)("shift_attendance_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("shift_attendance_assignment_idx").on(table.assignmentId),
    (0, pg_core_1.index)("shift_attendance_time_tracking_idx").on(table.timeTrackingId),
    (0, pg_core_1.index)("shift_attendance_status_idx").on(table.attendanceStatus),
    // Compliance and monitoring indexes
    (0, pg_core_1.index)("shift_attendance_compliance_idx").on(table.isOnTime, table.isCompliantDuration, table.isLocationCompliant),
    (0, pg_core_1.index)("shift_attendance_alerts_idx").on(table.requiresApproval, table.escalationLevel),
    (0, pg_core_1.index)("shift_attendance_review_idx").on(table.reviewStatus, table.reviewedAt),
    // Time-based indexes for reporting
    (0, pg_core_1.index)("shift_attendance_scheduled_time_idx").on(table.scheduledStartTime),
    (0, pg_core_1.index)("shift_attendance_actual_time_idx").on(table.actualStartTime),
    (0, pg_core_1.index)("shift_attendance_processing_idx").on(table.processingStatus, table.lastProcessedAt),
    // Unique constraint for assignment-timetracking relationship
    (0, pg_core_1.uniqueIndex)("shift_attendance_assignment_tracking_unique").on(table.assignmentId, table.timeTrackingId),
]);
exports.insertShiftAttendanceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.shiftAttendance).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== ATTENDANCE ANOMALIES ====================
// Tracks attendance/timeclock anomalies for supervisor review
exports.attendanceAnomalies = exports.w3suiteSchema.table("attendance_anomalies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    attendanceId: (0, pg_core_1.uuid)("attendance_id").references(() => exports.shiftAttendance.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    shiftId: (0, pg_core_1.uuid)("shift_id").references(() => exports.shifts.id),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id),
    // Anomaly classification
    anomalyType: (0, pg_core_1.varchar)("anomaly_type", { length: 50 }).notNull(),
    // late_clock_in, early_clock_out, wrong_store, no_shift_assigned, overtime_unapproved, missing_clock_out
    severity: (0, pg_core_1.varchar)("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
    // Anomaly details
    expectedValue: (0, pg_core_1.text)("expected_value"), // JSON string with expected data
    actualValue: (0, pg_core_1.text)("actual_value"), // JSON string with actual data
    deviationMinutes: (0, pg_core_1.integer)("deviation_minutes"), // Time deviation if applicable
    deviationMeters: (0, pg_core_1.integer)("deviation_meters"), // Location deviation if applicable
    // Detection
    detectedAt: (0, pg_core_1.timestamp)("detected_at").defaultNow(),
    detectionMethod: (0, pg_core_1.varchar)("detection_method", { length: 20 }).default("automatic"), // automatic, manual, system
    // Resolution
    resolutionStatus: (0, pg_core_1.varchar)("resolution_status", { length: 20 }).notNull().default("pending"),
    // pending, acknowledged, resolved, dismissed, escalated
    resolvedBy: (0, pg_core_1.varchar)("resolved_by").references(() => exports.users.id),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    resolutionNotes: (0, pg_core_1.text)("resolution_notes"),
    resolutionAction: (0, pg_core_1.varchar)("resolution_action", { length: 50 }), // approved, corrected, penalized, excused
    // Notification
    notifiedSupervisor: (0, pg_core_1.boolean)("notified_supervisor").default(false),
    notifiedAt: (0, pg_core_1.timestamp)("notified_at"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("attendance_anomalies_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("attendance_anomalies_user_idx").on(table.userId),
    (0, pg_core_1.index)("attendance_anomalies_store_idx").on(table.storeId),
    (0, pg_core_1.index)("attendance_anomalies_type_idx").on(table.anomalyType),
    (0, pg_core_1.index)("attendance_anomalies_severity_idx").on(table.severity),
    (0, pg_core_1.index)("attendance_anomalies_status_idx").on(table.resolutionStatus),
    (0, pg_core_1.index)("attendance_anomalies_detected_idx").on(table.detectedAt),
]);
exports.insertAttendanceAnomalySchema = (0, drizzle_zod_1.createInsertSchema)(exports.attendanceAnomalies).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    detectedAt: true
});
// ==================== RESOURCE AVAILABILITY ====================
// Tracks employee availability for shift assignment (vacation, sick leave, etc)
exports.resourceAvailability = exports.w3suiteSchema.table("resource_availability", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    // Availability period
    startDate: (0, pg_core_1.date)("start_date").notNull(),
    endDate: (0, pg_core_1.date)("end_date").notNull(),
    // Availability status
    availabilityStatus: (0, pg_core_1.varchar)("availability_status", { length: 30 }).notNull(),
    // available, vacation, sick_leave, personal_leave, training, unavailable, restricted
    // Reason and justification
    reasonType: (0, pg_core_1.varchar)("reason_type", { length: 50 }), // approved_leave, medical, personal, scheduled_off
    reasonDescription: (0, pg_core_1.text)("reason_description"),
    leaveRequestId: (0, pg_core_1.uuid)("leave_request_id"), // Link to HR leave request if applicable
    // Time constraints
    isFullDay: (0, pg_core_1.boolean)("is_full_day").default(true),
    startTime: (0, pg_core_1.timestamp)("start_time"), // If partial day
    endTime: (0, pg_core_1.timestamp)("end_time"), // If partial day
    // Approval tracking
    approvalStatus: (0, pg_core_1.varchar)("approval_status", { length: 20 }).default("approved"), // pending, approved, rejected
    approvedBy: (0, pg_core_1.varchar)("approved_by").references(() => exports.users.id),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    // Impact on scheduling
    blocksShiftAssignment: (0, pg_core_1.boolean)("blocks_shift_assignment").default(true),
    showInSchedule: (0, pg_core_1.boolean)("show_in_schedule").default(true),
    // Metadata
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    // Audit
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("resource_availability_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("resource_availability_user_idx").on(table.userId),
    (0, pg_core_1.index)("resource_availability_date_range_idx").on(table.startDate, table.endDate),
    (0, pg_core_1.index)("resource_availability_status_idx").on(table.availabilityStatus),
    (0, pg_core_1.index)("resource_availability_approval_idx").on(table.approvalStatus),
    (0, pg_core_1.index)("resource_availability_blocking_idx").on(table.blocksShiftAssignment),
]);
exports.insertResourceAvailabilitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.resourceAvailability).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== HR DOCUMENTS ====================
exports.hrDocuments = exports.w3suiteSchema.table("hr_documents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    // Document classification
    documentType: (0, exports.hrDocumentTypeEnum)("document_type").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // File information
    fileName: (0, pg_core_1.varchar)("file_name", { length: 255 }).notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 100 }).notNull(),
    storagePath: (0, pg_core_1.varchar)("storage_path", { length: 500 }).notNull(),
    // Period reference (for payslips)
    year: (0, pg_core_1.integer)("year"),
    month: (0, pg_core_1.integer)("month"),
    // Security and expiry
    isConfidential: (0, pg_core_1.boolean)("is_confidential").default(false),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    // Document source and tracking
    source: (0, exports.hrDocumentSourceEnum)("source").notNull().default("employee"),
    viewedAt: (0, pg_core_1.timestamp)("viewed_at"),
    // Audit
    uploadedBy: (0, pg_core_1.varchar)("uploaded_by").notNull().references(() => exports.users.id),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at").defaultNow(),
    lastAccessedAt: (0, pg_core_1.timestamp)("last_accessed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("hr_documents_tenant_user_idx").on(table.tenantId, table.userId),
    (0, pg_core_1.index)("hr_documents_tenant_type_idx").on(table.tenantId, table.documentType),
    (0, pg_core_1.index)("hr_documents_tenant_source_idx").on(table.tenantId, table.source),
    (0, pg_core_1.index)("hr_documents_year_month_idx").on(table.year, table.month),
    (0, pg_core_1.index)("hr_documents_expiry_idx").on(table.expiryDate),
]);
exports.insertHrDocumentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.hrDocuments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    uploadedAt: true
});
// ==================== EXPENSE REPORTS ====================
exports.expenseReports = exports.w3suiteSchema.table("expense_reports", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    // Report identification
    reportNumber: (0, pg_core_1.varchar)("report_number", { length: 50 }).notNull(),
    period: (0, pg_core_1.varchar)("period", { length: 7 }), // YYYY-MM format
    // Financial summary
    totalAmount: (0, pg_core_1.integer)("total_amount").notNull().default(0), // Stored in cents
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("EUR"),
    // Status workflow
    status: (0, exports.expenseReportStatusEnum)("status").notNull().default("draft"),
    // Approval and payment
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    approvedBy: (0, pg_core_1.varchar)("approved_by").references(() => exports.users.id),
    reimbursedAt: (0, pg_core_1.timestamp)("reimbursed_at"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    paymentMethod: (0, exports.expensePaymentMethodEnum)("payment_method"),
    // Additional information
    notes: (0, pg_core_1.text)("notes"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("expense_reports_tenant_user_idx").on(table.tenantId, table.userId),
    (0, pg_core_1.index)("expense_reports_tenant_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("expense_reports_period_idx").on(table.period),
    (0, pg_core_1.uniqueIndex)("expense_reports_tenant_number_unique").on(table.tenantId, table.reportNumber),
]);
exports.insertExpenseReportSchema = (0, drizzle_zod_1.createInsertSchema)(exports.expenseReports).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== EXPENSE ITEMS ====================
exports.expenseItems = exports.w3suiteSchema.table("expense_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    expenseReportId: (0, pg_core_1.uuid)("expense_report_id").notNull().references(() => exports.expenseReports.id, { onDelete: "cascade" }),
    // Item details
    date: (0, pg_core_1.date)("date").notNull(),
    category: (0, exports.expenseCategoryEnum)("category").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    // Financial data
    amount: (0, pg_core_1.integer)("amount").notNull(), // Stored in cents
    vat: (0, pg_core_1.integer)("vat").default(0), // VAT percentage * 100 (e.g., 2200 = 22%)
    vatAmount: (0, pg_core_1.integer)("vat_amount").default(0), // VAT amount in cents
    // Receipt and documentation
    receipt: (0, pg_core_1.boolean)("receipt").default(false),
    receiptPath: (0, pg_core_1.varchar)("receipt_path", { length: 500 }),
    // Project allocation
    projectCode: (0, pg_core_1.varchar)("project_code", { length: 50 }),
    clientCode: (0, pg_core_1.varchar)("client_code", { length: 50 }),
    // Reimbursement
    isReimbursable: (0, pg_core_1.boolean)("is_reimbursable").default(true),
    // Additional information
    notes: (0, pg_core_1.text)("notes"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("expense_items_report_idx").on(table.expenseReportId),
    (0, pg_core_1.index)("expense_items_date_idx").on(table.date),
    (0, pg_core_1.index)("expense_items_category_idx").on(table.category),
]);
exports.insertExpenseItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.expenseItems).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== DRIZZLE RELATIONS ====================
// Tenants Relations
exports.tenantsRelations = (0, drizzle_orm_1.relations)(exports.tenants, ({ one, many }) => ({
    users: many(exports.users),
    stores: many(exports.stores),
    legalEntities: many(exports.legalEntities),
    roles: many(exports.roles),
    entityLogs: many(exports.entityLogs),
    structuredLogs: many(exports.structuredLogs),
    userStores: many(exports.userStores),
    userLegalEntities: many(exports.userLegalEntities),
    storeBrands: many(exports.storeBrands),
    storeDriverPotential: many(exports.storeDriverPotential),
    notifications: many(exports.notifications),
    // HR relations
    calendarEvents: many(exports.calendarEvents),
    timeTracking: many(exports.timeTracking),
    shifts: many(exports.shifts),
    shiftTemplates: many(exports.shiftTemplates),
    hrDocuments: many(exports.hrDocuments),
    expenseReports: many(exports.expenseReports),
    // Universal Request System relations
    universalRequests: many(exports.universalRequests),
    // Notification System relations
    notificationTemplates: many(exports.notificationTemplates),
    notificationPreferences: many(exports.notificationPreferences),
}));
// Users Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.users.tenantId], references: [exports.tenants.id] }),
    store: one(exports.stores, { fields: [exports.users.storeId], references: [exports.stores.id] }),
    userStores: many(exports.userStores),
    userLegalEntities: many(exports.userLegalEntities),
    userAssignments: many(exports.userAssignments),
    userExtraPerms: many(exports.userExtraPerms),
    entityLogs: many(exports.entityLogs),
    structuredLogs: many(exports.structuredLogs),
    notifications: many(exports.notifications),
    // HR relations
    ownedCalendarEvents: many(exports.calendarEvents),
    timeTrackingEntries: many(exports.timeTracking),
    hrDocuments: many(exports.hrDocuments),
    expenseReports: many(exports.expenseReports),
    createdShifts: many(exports.shifts),
    approvedTimeTracking: many(exports.timeTracking),
    shiftAssignments: many(exports.shiftAssignments),
    assignedShifts: many(exports.shiftAssignments),
    reviewedAttendance: many(exports.shiftAttendance),
    // Universal Request System relations
    universalRequests: many(exports.universalRequests),
    // Notification System relations
    notificationPreferences: many(exports.notificationPreferences),
}));
// Legal Entities Relations
exports.legalEntitiesRelations = (0, drizzle_orm_1.relations)(exports.legalEntities, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.legalEntities.tenantId], references: [exports.tenants.id] }),
    stores: many(exports.stores),
    userLegalEntities: many(exports.userLegalEntities),
}));
// Stores Relations
exports.storesRelations = (0, drizzle_orm_1.relations)(exports.stores, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.stores.tenantId], references: [exports.tenants.id] }),
    legalEntity: one(exports.legalEntities, { fields: [exports.stores.legalEntityId], references: [exports.legalEntities.id] }),
    channel: one(public_1.channels, { fields: [exports.stores.channelId], references: [public_1.channels.id] }),
    commercialArea: one(public_1.commercialAreas, { fields: [exports.stores.commercialAreaId], references: [public_1.commercialAreas.id] }),
    userStores: many(exports.userStores),
    storeBrands: many(exports.storeBrands),
    storeDriverPotential: many(exports.storeDriverPotential),
    users: many(exports.users),
    // HR relations
    calendarEvents: many(exports.calendarEvents),
    timeTracking: many(exports.timeTracking),
    shifts: many(exports.shifts),
    storesTimetrackingMethods: many(exports.storesTimetrackingMethods),
}));
// Roles Relations
exports.rolesRelations = (0, drizzle_orm_1.relations)(exports.roles, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.roles.tenantId], references: [exports.tenants.id] }),
    rolePerms: many(exports.rolePerms),
    userAssignments: many(exports.userAssignments),
}));
// Role Permissions Relations
exports.rolePermsRelations = (0, drizzle_orm_1.relations)(exports.rolePerms, ({ one }) => ({
    role: one(exports.roles, { fields: [exports.rolePerms.roleId], references: [exports.roles.id] }),
}));
// User Assignments Relations
exports.userAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.userAssignments, ({ one }) => ({
    user: one(exports.users, { fields: [exports.userAssignments.userId], references: [exports.users.id] }),
    role: one(exports.roles, { fields: [exports.userAssignments.roleId], references: [exports.roles.id] }),
}));
// User Extra Permissions Relations
exports.userExtraPermsRelations = (0, drizzle_orm_1.relations)(exports.userExtraPerms, ({ one }) => ({
    user: one(exports.users, { fields: [exports.userExtraPerms.userId], references: [exports.users.id] }),
}));
// User Stores Relations
exports.userStoresRelations = (0, drizzle_orm_1.relations)(exports.userStores, ({ one }) => ({
    user: one(exports.users, { fields: [exports.userStores.userId], references: [exports.users.id] }),
    store: one(exports.stores, { fields: [exports.userStores.storeId], references: [exports.stores.id] }),
    tenant: one(exports.tenants, { fields: [exports.userStores.tenantId], references: [exports.tenants.id] }),
}));
// Store Brands Relations
exports.storeBrandsRelations = (0, drizzle_orm_1.relations)(exports.storeBrands, ({ one }) => ({
    store: one(exports.stores, { fields: [exports.storeBrands.storeId], references: [exports.stores.id] }),
    brand: one(public_1.brands, { fields: [exports.storeBrands.brandId], references: [public_1.brands.id] }),
    tenant: one(exports.tenants, { fields: [exports.storeBrands.tenantId], references: [exports.tenants.id] }),
}));
// Store Driver Potential Relations
exports.storeDriverPotentialRelations = (0, drizzle_orm_1.relations)(exports.storeDriverPotential, ({ one }) => ({
    store: one(exports.stores, { fields: [exports.storeDriverPotential.storeId], references: [exports.stores.id] }),
    driver: one(public_1.drivers, { fields: [exports.storeDriverPotential.driverId], references: [public_1.drivers.id] }),
    tenant: one(exports.tenants, { fields: [exports.storeDriverPotential.tenantId], references: [exports.tenants.id] }),
}));
// Entity Logs Relations
exports.entityLogsRelations = (0, drizzle_orm_1.relations)(exports.entityLogs, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.entityLogs.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.entityLogs.userId], references: [exports.users.id] }),
}));
// Structured Logs Relations
exports.structuredLogsRelations = (0, drizzle_orm_1.relations)(exports.structuredLogs, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.structuredLogs.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.structuredLogs.userId], references: [exports.users.id] }),
}));
// User Legal Entities Relations
exports.userLegalEntitiesRelations = (0, drizzle_orm_1.relations)(exports.userLegalEntities, ({ one }) => ({
    user: one(exports.users, { fields: [exports.userLegalEntities.userId], references: [exports.users.id] }),
    legalEntity: one(exports.legalEntities, { fields: [exports.userLegalEntities.legalEntityId], references: [exports.legalEntities.id] }),
    tenant: one(exports.tenants, { fields: [exports.userLegalEntities.tenantId], references: [exports.tenants.id] }),
}));
// Notifications Relations
// Object Metadata Relations
exports.objectMetadataRelations = (0, drizzle_orm_1.relations)(exports.objectMetadata, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.objectMetadata.tenantId], references: [exports.tenants.id] }),
    uploadedByUser: one(exports.users, { fields: [exports.objectMetadata.uploadedBy], references: [exports.users.id] }),
}));
// Object ACLs Relations  
exports.objectAclsRelations = (0, drizzle_orm_1.relations)(exports.objectAcls, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.objectAcls.tenantId], references: [exports.tenants.id] }),
    ownerTenant: one(exports.tenants, { fields: [exports.objectAcls.ownerTenantId], references: [exports.tenants.id] }),
    owner: one(exports.users, { fields: [exports.objectAcls.ownerId], references: [exports.users.id] }),
}));
// ==================== SUPPLIERS RELATIONS ====================
exports.suppliersRelations = (0, drizzle_orm_1.relations)(exports.suppliers, ({ one, many }) => ({
    // Relations verso w3suite schema
    tenant: one(exports.tenants, { fields: [exports.suppliers.tenantId], references: [exports.tenants.id] }),
    createdByUser: one(exports.users, { fields: [exports.suppliers.createdBy], references: [exports.users.id] }),
    updatedByUser: one(exports.users, { fields: [exports.suppliers.updatedBy], references: [exports.users.id] }),
    // Relations verso public schema (reference tables)
    city: one(public_1.italianCities, { fields: [exports.suppliers.cityId], references: [public_1.italianCities.id] }),
    country: one(public_1.countries, { fields: [exports.suppliers.countryId], references: [public_1.countries.id] }),
    preferredPaymentMethod: one(public_1.paymentMethods, { fields: [exports.suppliers.preferredPaymentMethodId], references: [public_1.paymentMethods.id] }),
    paymentCondition: one(public_1.paymentMethodsConditions, { fields: [exports.suppliers.paymentConditionId], references: [public_1.paymentMethodsConditions.id] }),
    // Relations verso overrides
    overrides: many(exports.supplierOverrides),
}));
// Supplier Overrides Relations (now full table for tenant-specific suppliers)
exports.supplierOverridesRelations = (0, drizzle_orm_1.relations)(exports.supplierOverrides, ({ one }) => ({
    // Relations verso w3suite schema
    tenant: one(exports.tenants, { fields: [exports.supplierOverrides.tenantId], references: [exports.tenants.id] }),
    createdByUser: one(exports.users, { fields: [exports.supplierOverrides.createdBy], references: [exports.users.id] }),
    updatedByUser: one(exports.users, { fields: [exports.supplierOverrides.updatedBy], references: [exports.users.id] }),
    // Relations verso public schema (reference tables)
    city: one(public_1.italianCities, { fields: [exports.supplierOverrides.cityId], references: [public_1.italianCities.id] }),
    country: one(public_1.countries, { fields: [exports.supplierOverrides.countryId], references: [public_1.countries.id] }),
    preferredPaymentMethod: one(public_1.paymentMethods, { fields: [exports.supplierOverrides.preferredPaymentMethodId], references: [public_1.paymentMethods.id] }),
    paymentCondition: one(public_1.paymentMethodsConditions, { fields: [exports.supplierOverrides.paymentConditionId], references: [public_1.paymentMethodsConditions.id] }),
}));
// ==================== HR SYSTEM RELATIONS ====================
// Calendar Events Relations
exports.calendarEventsRelations = (0, drizzle_orm_1.relations)(exports.calendarEvents, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.calendarEvents.tenantId], references: [exports.tenants.id] }),
    owner: one(exports.users, { fields: [exports.calendarEvents.ownerId], references: [exports.users.id] }),
    store: one(exports.stores, { fields: [exports.calendarEvents.storeId], references: [exports.stores.id] }),
    createdByUser: one(exports.users, { fields: [exports.calendarEvents.createdBy], references: [exports.users.id] }),
    updatedByUser: one(exports.users, { fields: [exports.calendarEvents.updatedBy], references: [exports.users.id] }),
}));
// Time Tracking Relations
exports.timeTrackingRelations = (0, drizzle_orm_1.relations)(exports.timeTracking, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.timeTracking.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.timeTracking.userId], references: [exports.users.id] }),
    store: one(exports.stores, { fields: [exports.timeTracking.storeId], references: [exports.stores.id] }),
    shift: one(exports.shifts, { fields: [exports.timeTracking.shiftId], references: [exports.shifts.id] }),
    approvedByUser: one(exports.users, { fields: [exports.timeTracking.approvedBy], references: [exports.users.id] }),
    attendanceEntries: many(exports.shiftAttendance),
}));
// Stores Timetracking Methods Relations
exports.storesTimetrackingMethodsRelations = (0, drizzle_orm_1.relations)(exports.storesTimetrackingMethods, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.storesTimetrackingMethods.tenantId], references: [exports.tenants.id] }),
    store: one(exports.stores, { fields: [exports.storesTimetrackingMethods.storeId], references: [exports.stores.id] }),
    createdByUser: one(exports.users, { fields: [exports.storesTimetrackingMethods.createdBy], references: [exports.users.id] }),
}));
// Shifts Relations
exports.shiftsRelations = (0, drizzle_orm_1.relations)(exports.shifts, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.shifts.tenantId], references: [exports.tenants.id] }),
    store: one(exports.stores, { fields: [exports.shifts.storeId], references: [exports.stores.id] }),
    template: one(exports.shiftTemplates, { fields: [exports.shifts.templateId], references: [exports.shiftTemplates.id] }),
    createdByUser: one(exports.users, { fields: [exports.shifts.createdBy], references: [exports.users.id] }),
    timeTrackingEntries: many(exports.timeTracking),
    assignments: many(exports.shiftAssignments),
}));
// Shift Templates Relations
exports.shiftTemplatesRelations = (0, drizzle_orm_1.relations)(exports.shiftTemplates, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.shiftTemplates.tenantId], references: [exports.tenants.id] }),
    shifts: many(exports.shifts),
    timeSlots: many(exports.shiftTimeSlots),
}));
// Shift Time Slots Relations
exports.shiftTimeSlotsRelations = (0, drizzle_orm_1.relations)(exports.shiftTimeSlots, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.shiftTimeSlots.tenantId], references: [exports.tenants.id] }),
    template: one(exports.shiftTemplates, { fields: [exports.shiftTimeSlots.templateId], references: [exports.shiftTemplates.id] }),
    assignments: many(exports.shiftAssignments),
}));
// Shift Assignments Relations
exports.shiftAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.shiftAssignments, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.shiftAssignments.tenantId], references: [exports.tenants.id] }),
    shift: one(exports.shifts, { fields: [exports.shiftAssignments.shiftId], references: [exports.shifts.id] }),
    user: one(exports.users, { fields: [exports.shiftAssignments.userId], references: [exports.users.id] }),
    timeSlot: one(exports.shiftTimeSlots, { fields: [exports.shiftAssignments.timeSlotId], references: [exports.shiftTimeSlots.id] }),
    assignedByUser: one(exports.users, { fields: [exports.shiftAssignments.assignedBy], references: [exports.users.id] }),
    attendance: many(exports.shiftAttendance),
}));
// Shift Attendance Relations
exports.shiftAttendanceRelations = (0, drizzle_orm_1.relations)(exports.shiftAttendance, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.shiftAttendance.tenantId], references: [exports.tenants.id] }),
    assignment: one(exports.shiftAssignments, { fields: [exports.shiftAttendance.assignmentId], references: [exports.shiftAssignments.id] }),
    timeTracking: one(exports.timeTracking, { fields: [exports.shiftAttendance.timeTrackingId], references: [exports.timeTracking.id] }),
    store: one(exports.stores, { fields: [exports.shiftAttendance.storeId], references: [exports.stores.id] }),
    user: one(exports.users, { fields: [exports.shiftAttendance.userId], references: [exports.users.id] }),
    reviewedByUser: one(exports.users, { fields: [exports.shiftAttendance.reviewedBy], references: [exports.users.id] }),
    anomalies: many(exports.attendanceAnomalies),
}));
// Attendance Anomalies Relations
exports.attendanceAnomaliesRelations = (0, drizzle_orm_1.relations)(exports.attendanceAnomalies, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.attendanceAnomalies.tenantId], references: [exports.tenants.id] }),
    attendance: one(exports.shiftAttendance, { fields: [exports.attendanceAnomalies.attendanceId], references: [exports.shiftAttendance.id] }),
    user: one(exports.users, { fields: [exports.attendanceAnomalies.userId], references: [exports.users.id] }),
    shift: one(exports.shifts, { fields: [exports.attendanceAnomalies.shiftId], references: [exports.shifts.id] }),
    store: one(exports.stores, { fields: [exports.attendanceAnomalies.storeId], references: [exports.stores.id] }),
    resolvedByUser: one(exports.users, { fields: [exports.attendanceAnomalies.resolvedBy], references: [exports.users.id] }),
}));
// Resource Availability Relations
exports.resourceAvailabilityRelations = (0, drizzle_orm_1.relations)(exports.resourceAvailability, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.resourceAvailability.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.resourceAvailability.userId], references: [exports.users.id] }),
    approvedByUser: one(exports.users, { fields: [exports.resourceAvailability.approvedBy], references: [exports.users.id] }),
    createdByUser: one(exports.users, { fields: [exports.resourceAvailability.createdBy], references: [exports.users.id] }),
}));
// HR Documents Relations
exports.hrDocumentsRelations = (0, drizzle_orm_1.relations)(exports.hrDocuments, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.hrDocuments.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.hrDocuments.userId], references: [exports.users.id] }),
    uploadedByUser: one(exports.users, { fields: [exports.hrDocuments.uploadedBy], references: [exports.users.id] }),
}));
// Expense Reports Relations
exports.expenseReportsRelations = (0, drizzle_orm_1.relations)(exports.expenseReports, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.expenseReports.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.expenseReports.userId], references: [exports.users.id] }),
    approvedByUser: one(exports.users, { fields: [exports.expenseReports.approvedBy], references: [exports.users.id] }),
    expenseItems: many(exports.expenseItems),
}));
// Expense Items Relations
exports.expenseItemsRelations = (0, drizzle_orm_1.relations)(exports.expenseItems, ({ one }) => ({
    expenseReport: one(exports.expenseReports, { fields: [exports.expenseItems.expenseReportId], references: [exports.expenseReports.id] }),
}));
// Employee Balances Relations
// ==================== HR REQUEST SYSTEM RELATIONS ====================
// ==================== UNIVERSAL HIERARCHY SYSTEM ====================
// Organizational Structure - Gerarchia universale per tutti i servizi
exports.organizationalStructure = exports.w3suiteSchema.table("organizational_structure", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // User hierarchy
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    parentId: (0, pg_core_1.varchar)("parent_id").references(() => exports.users.id), // Manager diretto
    // Tree structure optimization
    pathTree: (0, pg_core_1.text)("path_tree").array().default([]), // ['ceo_id', 'area_mgr_id', 'store_mgr_id', 'user_id']
    depth: (0, pg_core_1.integer)("depth").notNull().default(0), // Livello nell'albero (0 = CEO)
    // Organizational unit
    organizationalUnit: (0, pg_core_1.varchar)("organizational_unit", { length: 100 }), // 'store_milano', 'it_dept', 'finance_team'
    unitType: (0, pg_core_1.varchar)("unit_type", { length: 50 }), // 'store', 'department', 'team', 'division'
    // Deleghe temporanee
    delegates: (0, pg_core_1.jsonb)("delegates").default([]), // [{userId, fromDate, toDate, permissions}]
    // Temporal validity
    validFrom: (0, pg_core_1.timestamp)("valid_from").notNull().defaultNow(),
    validTo: (0, pg_core_1.timestamp)("valid_to"),
    // RBAC permissions scope
    permissions: (0, pg_core_1.jsonb)("permissions").default({}), // Service-specific permissions
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("org_structure_tenant_user_idx").on(table.tenantId, table.userId),
    (0, pg_core_1.index)("org_structure_parent_idx").on(table.parentId),
    (0, pg_core_1.index)("org_structure_unit_idx").on(table.organizationalUnit),
    (0, pg_core_1.index)("org_structure_path_gin_idx").using("gin", table.pathTree),
    (0, pg_core_1.uniqueIndex)("org_structure_user_valid_unique").on(table.userId, table.validFrom),
]);
exports.insertOrganizationalStructureSchema = (0, drizzle_zod_1.createInsertSchema)(exports.organizationalStructure).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Approval Workflows - Definizione workflow di approvazione per ogni servizio
exports.approvalWorkflows = exports.w3suiteSchema.table("approval_workflows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Service identification
    serviceName: (0, pg_core_1.varchar)("service_name", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'it', 'sales'
    workflowType: (0, pg_core_1.varchar)("workflow_type", { length: 100 }).notNull(), // 'leave_request', 'purchase_order', 'discount_approval'
    // Workflow rules (JSONB for flexibility)
    rules: (0, pg_core_1.jsonb)("rules").notNull(), /* {
      levels: [
        { condition: "amount <= 1000", approvers: ["direct_manager"], slaHours: 24 },
        { condition: "amount > 1000", approvers: ["direct_manager", "department_head"], slaHours: 48 }
      ],
      escalation: { afterHours: 24, escalateTo: "next_level" },
      autoApprove: { condition: "amount < 100" }
    } */
    // Configuration
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    priority: (0, pg_core_1.integer)("priority").default(100), // Higher priority workflows are evaluated first
    // Metadata
    description: (0, pg_core_1.text)("description"),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("approval_workflows_service_idx").on(table.serviceName, table.workflowType),
    (0, pg_core_1.index)("approval_workflows_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.uniqueIndex)("approval_workflows_unique").on(table.tenantId, table.serviceName, table.workflowType),
]);
exports.insertApprovalWorkflowSchema = (0, drizzle_zod_1.createInsertSchema)(exports.approvalWorkflows).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== UNIFIED REQUESTS SYSTEM ====================
// ✅ ENTERPRISE CENTRALIZZAZIONE: Tabella unica per tutte le richieste aziendali
// Department Enum - Categorizzazione per dipartimenti aziendali
// ✅ SOURCE OF TRUTH: public.department (7 values including marketing)
exports.departmentEnum = (0, pg_core_1.pgEnum)('department', [
    'hr', // Human Resources (ferie, permessi, congedi)
    'operations', // Operazioni (manutenzione, logistics, inventory)
    'support', // Support IT (accessi, hardware, software)
    'finance', // Finanza (expenses, budgets, payments)
    'crm', // Customer Relations (complaints, escalations)
    'sales', // Vendite (discount approvals, contract changes)
    'marketing' // Marketing (campaigns, content, branding)
]);
// Universal Request Status - Stati unificati per tutte le categorie
exports.requestStatusEnum = (0, pg_core_1.pgEnum)('request_status', [
    'draft', // Bozza - non ancora inviata
    'pending', // In attesa di approvazione
    'approved', // Approvata
    'rejected', // Rifiutata
    'cancelled' // Annullata dal richiedente
]);
// Universal Requests - Tabella centralizzata per TUTTE le richieste aziendali
exports.universalRequests = exports.w3suiteSchema.table("universal_requests", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // ✅ SICUREZZA MULTI-LIVELLO: Tenant + User + Store + Legal Entity
    requesterId: (0, pg_core_1.varchar)("requester_id").notNull().references(() => exports.users.id),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id").references(() => exports.legalEntities.id),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id),
    onBehalfOf: (0, pg_core_1.varchar)("on_behalf_of").references(() => exports.users.id), // Richieste delegate
    // ✅ CATEGORIZZAZIONE ENTERPRISE: Department + Category + Type
    department: (0, exports.departmentEnum)("department").notNull(), // hr, finance, support, crm, sales, operations
    category: (0, pg_core_1.varchar)("category", { length: 100 }).notNull(), // leave, expense, access, legal, training, etc.
    type: (0, pg_core_1.varchar)("type", { length: 100 }), // vacation, travel_expense, vpn_access, etc.
    // ✅ CONTENUTO RICHIESTA
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    requestData: (0, pg_core_1.jsonb)("request_data").notNull(), // Dati specifici per categoria
    // ✅ WORKFLOW E APPROVAZIONE
    status: (0, exports.requestStatusEnum)("status").notNull().default("draft"),
    currentApproverId: (0, pg_core_1.varchar)("current_approver_id").references(() => exports.users.id),
    approvalChain: (0, pg_core_1.jsonb)("approval_chain").default([]), // Storia delle approvazioni
    workflowInstanceId: (0, pg_core_1.uuid)("workflow_instance_id"), // Link al workflow engine
    // ✅ SLA E PRIORITÀ
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    startDate: (0, pg_core_1.timestamp)("start_date"), // Per richieste con date (ferie, congedi)
    endDate: (0, pg_core_1.timestamp)("end_date"),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    // ✅ ALLEGATI E METADATI
    attachments: (0, pg_core_1.text)("attachments").array().default([]),
    tags: (0, pg_core_1.text)("tags").array().default([]),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Metadati aggiuntivi
    notes: (0, pg_core_1.text)("notes"),
    // ✅ AUDIT COMPLETO
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    // ✅ INDICI OTTIMIZZATI per performance enterprise
    (0, pg_core_1.index)("universal_requests_tenant_department_idx").on(table.tenantId, table.department),
    (0, pg_core_1.index)("universal_requests_tenant_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("universal_requests_requester_idx").on(table.requesterId),
    (0, pg_core_1.index)("universal_requests_approver_idx").on(table.currentApproverId),
    (0, pg_core_1.index)("universal_requests_store_idx").on(table.storeId),
    (0, pg_core_1.index)("universal_requests_legal_entity_idx").on(table.legalEntityId),
    (0, pg_core_1.index)("universal_requests_dates_idx").on(table.startDate, table.endDate),
    (0, pg_core_1.index)("universal_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
    (0, pg_core_1.index)("universal_requests_workflow_idx").on(table.workflowInstanceId),
    (0, pg_core_1.index)("universal_requests_department_category_type_idx").on(table.department, table.category, table.type),
]);
exports.insertUniversalRequestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.universalRequests).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ✅ RELAZIONI ENTERPRISE per Universal Requests
exports.universalRequestsRelations = (0, drizzle_orm_1.relations)(exports.universalRequests, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.universalRequests.tenantId], references: [exports.tenants.id] }),
    requester: one(exports.users, { fields: [exports.universalRequests.requesterId], references: [exports.users.id] }),
    currentApprover: one(exports.users, { fields: [exports.universalRequests.currentApproverId], references: [exports.users.id] }),
    onBehalfOfUser: one(exports.users, { fields: [exports.universalRequests.onBehalfOf], references: [exports.users.id] }),
    legalEntity: one(exports.legalEntities, { fields: [exports.universalRequests.legalEntityId], references: [exports.legalEntities.id] }),
    store: one(exports.stores, { fields: [exports.universalRequests.storeId], references: [exports.stores.id] }),
    createdByUser: one(exports.users, { fields: [exports.universalRequests.createdBy], references: [exports.users.id] }),
    updatedByUser: one(exports.users, { fields: [exports.universalRequests.updatedBy], references: [exports.users.id] }),
}));
// Service Permissions - Definizione permessi per ogni servizio
exports.servicePermissions = exports.w3suiteSchema.table("service_permissions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Service and permission
    serviceName: (0, pg_core_1.varchar)("service_name", { length: 50 }).notNull(),
    resource: (0, pg_core_1.varchar)("resource", { length: 100 }).notNull(),
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(),
    // Permission scope
    roleId: (0, pg_core_1.uuid)("role_id").references(() => exports.roles.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }),
    // Conditions
    conditions: (0, pg_core_1.jsonb)("conditions").default({}), // { maxAmount: 1000, maxDays: 10, etc }
    // Validity
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    validFrom: (0, pg_core_1.timestamp)("valid_from").defaultNow(),
    validTo: (0, pg_core_1.timestamp)("valid_to"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("service_permissions_service_idx").on(table.serviceName),
    (0, pg_core_1.index)("service_permissions_role_idx").on(table.roleId),
    (0, pg_core_1.index)("service_permissions_user_idx").on(table.userId),
    (0, pg_core_1.uniqueIndex)("service_permissions_unique").on(table.tenantId, table.serviceName, table.resource, table.action, table.roleId, table.userId),
]);
exports.insertServicePermissionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.servicePermissions).omit({
    id: true,
    createdAt: true
});
// ==================== WORKFLOW SYSTEM TABLES ====================
// Workflow Actions - Libreria azioni per categoria (HR, Finance, Operations, etc.)
exports.workflowActions = exports.w3suiteSchema.table("workflow_actions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Category and Action identification
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'crm', 'support', 'sales'
    actionId: (0, pg_core_1.varchar)("action_id", { length: 100 }).notNull(), // 'approve_vacation', 'reject_vacation', 'approve_expense'
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(), // 'Approva Ferie', 'Rifiuta Ferie'
    description: (0, pg_core_1.text)("description"),
    // RBAC Integration
    requiredPermission: (0, pg_core_1.varchar)("required_permission", { length: 200 }).notNull(), // 'hr.approve_vacation_max_5_days'
    constraints: (0, pg_core_1.jsonb)("constraints").default({}), // { maxAmount: 1000, maxDays: 5, excludedPeriods: [] }
    // Action Configuration
    actionType: (0, pg_core_1.varchar)("action_type", { length: 50 }).notNull().default("approval"), // 'approval', 'rejection', 'delegation', 'notification'
    priority: (0, pg_core_1.integer)("priority").default(100),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("workflow_actions_category_idx").on(table.category),
    (0, pg_core_1.index)("workflow_actions_permission_idx").on(table.requiredPermission),
    (0, pg_core_1.uniqueIndex)("workflow_actions_unique").on(table.tenantId, table.category, table.actionId),
]);
// Workflow Triggers - Libreria trigger per automazione
exports.workflowTriggers = exports.w3suiteSchema.table("workflow_triggers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Trigger identification
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
    triggerId: (0, pg_core_1.varchar)("trigger_id", { length: 100 }).notNull(), // 'notify_team', 'update_calendar', 'start_timer'
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(), // 'Notifica Team', 'Aggiorna Calendario'
    description: (0, pg_core_1.text)("description"),
    // Trigger Configuration
    triggerType: (0, pg_core_1.varchar)("trigger_type", { length: 50 }).notNull(), // 'notification', 'timer', 'webhook', 'conditional', 'integration'
    config: (0, pg_core_1.jsonb)("config").notNull(), // Configurazione specifica per tipo trigger
    // Execution settings
    isAsync: (0, pg_core_1.boolean)("is_async").default(false), // Esecuzione asincrona
    retryPolicy: (0, pg_core_1.jsonb)("retry_policy").default({}), // { maxRetries: 3, backoff: 'exponential' }
    timeout: (0, pg_core_1.integer)("timeout").default(30000), // Timeout in milliseconds
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    priority: (0, pg_core_1.integer)("priority").default(100),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("workflow_triggers_category_idx").on(table.category),
    (0, pg_core_1.index)("workflow_triggers_type_idx").on(table.triggerType),
    (0, pg_core_1.uniqueIndex)("workflow_triggers_unique").on(table.tenantId, table.category, table.triggerId),
]);
// Workflow Templates - Definizione visual workflow (reusable templates)
exports.workflowTemplates = exports.w3suiteSchema.table("workflow_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id), // NULL per global templates
    // Template identification
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
    templateType: (0, pg_core_1.varchar)("template_type", { length: 100 }).notNull(), // 'vacation_approval', 'expense_approval'
    // Visual Workflow Definition (React Flow format)
    nodes: (0, pg_core_1.jsonb)("nodes").notNull(), // Array of workflow nodes with positions
    edges: (0, pg_core_1.jsonb)("edges").notNull(), // Array of connections between nodes
    viewport: (0, pg_core_1.jsonb)("viewport").default({ x: 0, y: 0, zoom: 1 }), // Canvas viewport
    // 🌐 BRAND INTERFACE - Global Template Management
    isGlobal: (0, pg_core_1.boolean)("is_global").default(false).notNull(), // Template visibile a tutti i tenant
    isSystem: (0, pg_core_1.boolean)("is_system").default(false).notNull(), // Template di sistema (non modificabile)
    isDeletable: (0, pg_core_1.boolean)("is_deletable").default(true).notNull(), // Può essere cancellato
    isCustomizable: (0, pg_core_1.boolean)("is_customizable").default(true).notNull(), // Tenant può duplicare/customizzare
    createdByBrand: (0, pg_core_1.boolean)("created_by_brand").default(false).notNull(), // Creato da Brand Admin
    globalVersionId: (0, pg_core_1.uuid)("global_version_id"), // ID template globale originale (per tenant customizzati)
    // 🔒 BRAND WORKFLOW LOCK SYSTEM - Track brand-deployed workflows
    source: (0, exports.workflowSourceEnum)("source").default('tenant'), // 'brand' | 'tenant' - Origin of workflow
    // FK to brand_interface.brand_workflows (nullable - only for brand-sourced workflows)
    // onDelete: 'set null' - If brand deletes template, tenant keeps copy but loses brand reference
    brandWorkflowId: (0, pg_core_1.uuid)("brand_workflow_id").references(() => brand_interface_1.brandWorkflows.id, { onDelete: 'set null' }),
    lockedAt: (0, pg_core_1.timestamp)("locked_at"), // When workflow was locked (brand workflows are locked from structural editing)
    // Template settings
    isPublic: (0, pg_core_1.boolean)("is_public").default(false), // Can be shared across tenants
    version: (0, pg_core_1.integer)("version").default(1),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    tags: (0, pg_core_1.text)("tags").array().default([]),
    // Usage tracking
    usageCount: (0, pg_core_1.integer)("usage_count").default(0),
    lastUsed: (0, pg_core_1.timestamp)("last_used"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("workflow_templates_category_idx").on(table.category),
    (0, pg_core_1.index)("workflow_templates_type_idx").on(table.templateType),
    (0, pg_core_1.index)("workflow_templates_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("workflow_templates_global_idx").on(table.isGlobal), // Index per query global templates
    (0, pg_core_1.index)("workflow_templates_system_idx").on(table.isSystem), // Index per system templates
    (0, pg_core_1.index)("workflow_templates_global_version_idx").on(table.globalVersionId), // Index per customized templates
    (0, pg_core_1.uniqueIndex)("workflow_templates_name_unique").on(table.tenantId, table.name),
]);
// Workflow Steps - Singoli step all'interno di un workflow template
exports.workflowSteps = exports.w3suiteSchema.table("workflow_steps", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    templateId: (0, pg_core_1.uuid)("template_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    // Step identification
    nodeId: (0, pg_core_1.varchar)("node_id", { length: 100 }).notNull(), // ID del nodo nel visual editor
    stepType: (0, pg_core_1.varchar)("step_type", { length: 50 }).notNull(), // 'action', 'condition', 'timer', 'trigger'
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // Step configuration
    actionId: (0, pg_core_1.uuid)("action_id").references(() => exports.workflowActions.id), // Per step di tipo 'action'
    triggerId: (0, pg_core_1.uuid)("trigger_id").references(() => exports.workflowTriggers.id), // Per step di tipo 'trigger'
    conditions: (0, pg_core_1.jsonb)("conditions").default({}), // Condizioni per esecuzione
    config: (0, pg_core_1.jsonb)("config").default({}), // Configurazione specifica step
    // Approval logic
    approverLogic: (0, pg_core_1.varchar)("approver_logic", { length: 100 }), // 'team_supervisor', 'role:HR', 'department:Finance'
    escalationTimeout: (0, pg_core_1.integer)("escalation_timeout"), // Timeout escalation in hours
    escalationTarget: (0, pg_core_1.varchar)("escalation_target", { length: 100 }), // Target escalation
    // Step order and flow
    order: (0, pg_core_1.integer)("order").notNull(), // Ordine esecuzione
    isOptional: (0, pg_core_1.boolean)("is_optional").default(false),
    canSkip: (0, pg_core_1.boolean)("can_skip").default(false),
    // Visual position (React Flow)
    position: (0, pg_core_1.jsonb)("position").default({ x: 0, y: 0 }),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("workflow_steps_template_idx").on(table.templateId),
    (0, pg_core_1.index)("workflow_steps_order_idx").on(table.templateId, table.order),
    (0, pg_core_1.uniqueIndex)("workflow_steps_node_unique").on(table.templateId, table.nodeId),
]);
// 🔒 Tenant Workflow Node Overrides - Allow tenants to customize specific node configs in brand workflows
// While brand workflows are locked (cannot modify structure), tenants can override specific config fields
// like team assignments, email sender, etc. These overrides are merged at execution time.
exports.tenantWorkflowNodeOverrides = exports.w3suiteSchema.table("tenant_workflow_node_overrides", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Workflow and node reference
    workflowId: (0, pg_core_1.uuid)("workflow_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    nodeId: (0, pg_core_1.varchar)("node_id", { length: 100 }).notNull(), // Node ID from workflow DSL
    // Override configuration
    // Only specific fields are allowed to be overridden (enforced at API level)
    // Structure per executor type (examples):
    // - team-routing-executor: { teamId: "uuid-here" }
    // - email-action-executor: { from: "email@example.com", teamId: "uuid-here" }
    // - ai-decision-executor: { teamId: "uuid-here" }
    // - webhook-action-executor: { teamId: "uuid-here" }
    // 
    // Merge logic at execution: Deep merge override_config into node.config, only for allowed fields
    // Non-allowed fields in overrideConfig are ignored for security
    overrideConfig: (0, pg_core_1.jsonb)("override_config").notNull(), // JSONB with executor-specific allowed fields
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    updatedBy: (0, pg_core_1.varchar)("updated_by").notNull().references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("tenant_workflow_node_overrides_unique").on(table.tenantId, table.workflowId, table.nodeId),
    (0, pg_core_1.index)("tenant_workflow_node_overrides_workflow_idx").on(table.workflowId),
    (0, pg_core_1.index)("tenant_workflow_node_overrides_tenant_idx").on(table.tenantId),
]);
exports.insertTenantWorkflowNodeOverrideSchema = (0, drizzle_zod_1.createInsertSchema)(exports.tenantWorkflowNodeOverrides).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    tenantId: zod_1.z.string().uuid(),
    workflowId: zod_1.z.string().uuid(),
    nodeId: zod_1.z.string().min(1).max(100),
    overrideConfig: zod_1.z.record(zod_1.z.any()), // Validated at API level based on executor type
    updatedBy: zod_1.z.string().min(1),
});
// Teams - Team ibridi con utenti e ruoli, supervisor RBAC-validated
exports.teams = exports.w3suiteSchema.table("teams", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Team identification
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    teamType: (0, pg_core_1.varchar)("team_type", { length: 50 }).default("functional"), // 'functional', 'project', 'department', 'crm', 'sales'
    // Hybrid membership (users + roles)
    userMembers: (0, pg_core_1.text)("user_members").array().default([]), // Array of user IDs
    roleMembers: (0, pg_core_1.text)("role_members").array().default([]), // Array of role IDs (tutti gli utenti con questi ruoli)
    // Supervisor configuration (RBAC validated) - Hybrid User/Role support
    primarySupervisorUser: (0, pg_core_1.varchar)("primary_supervisor_user").references(() => exports.users.id, { onDelete: 'set null' }), // Primary supervisor (user-based)
    primarySupervisorRole: (0, pg_core_1.uuid)("primary_supervisor_role").references(() => exports.roles.id, { onDelete: 'set null' }), // Primary supervisor (role-based)
    secondarySupervisorUser: (0, pg_core_1.varchar)("secondary_supervisor_user").references(() => exports.users.id, { onDelete: 'set null' }), // Secondary supervisor (single user, optional)
    secondarySupervisorRoles: (0, pg_core_1.uuid)("secondary_supervisor_roles").array().default([]), // Secondary supervisors (role-based, UUID array - kept for compatibility)
    requiredSupervisorPermission: (0, pg_core_1.varchar)("required_supervisor_permission", { length: 200 }).default("team.manage"),
    // Team scope and permissions
    scope: (0, pg_core_1.jsonb)("scope").default({}), // Scope ereditato o personalizzato
    permissions: (0, pg_core_1.jsonb)("permissions").default({}), // Permessi team-specific
    // 🎯 DEPARTMENT ASSIGNMENT: Team può gestire multipli dipartimenti
    assignedDepartments: (0, pg_core_1.text)("assigned_departments").array().default([]), // Array of department enum values ['hr', 'finance', 'sales']
    // Configuration
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    autoAssignWorkflows: (0, pg_core_1.boolean)("auto_assign_workflows").default(true), // Auto-assign workflow ai membri
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("teams_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("teams_primary_supervisor_user_idx").on(table.primarySupervisorUser),
    (0, pg_core_1.index)("teams_primary_supervisor_role_idx").on(table.primarySupervisorRole),
    (0, pg_core_1.uniqueIndex)("teams_name_unique").on(table.tenantId, table.name),
]);
// Team Workflow Assignments - Mapping N:M tra team e workflow (con condizioni)
exports.teamWorkflowAssignments = exports.w3suiteSchema.table("team_workflow_assignments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    teamId: (0, pg_core_1.uuid)("team_id").notNull().references(() => exports.teams.id, { onDelete: 'cascade' }),
    templateId: (0, pg_core_1.uuid)("template_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
    forDepartment: (0, exports.departmentEnum)("for_department").notNull(), // Quale dipartimento usa questo workflow
    // Assignment configuration
    autoAssign: (0, pg_core_1.boolean)("auto_assign").default(true), // Auto-assign a richieste membri team
    priority: (0, pg_core_1.integer)("priority").default(100), // Se multipli workflow per team, quale usare primo
    // Conditions for workflow usage
    conditions: (0, pg_core_1.jsonb)("conditions").default({}), // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
    // Overrides specifici per questo team
    overrides: (0, pg_core_1.jsonb)("overrides").default({}), // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
    // Status and validity
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    validFrom: (0, pg_core_1.timestamp)("valid_from").defaultNow(),
    validTo: (0, pg_core_1.timestamp)("valid_to"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("team_workflow_assignments_team_idx").on(table.teamId),
    (0, pg_core_1.index)("team_workflow_assignments_template_idx").on(table.templateId),
    (0, pg_core_1.index)("team_workflow_assignments_active_idx").on(table.isActive),
    // 🎯 UNIQUE PER DIPARTIMENTO: Stesso team può avere stesso workflow per dipartimenti diversi
    (0, pg_core_1.uniqueIndex)("team_workflow_assignments_unique").on(table.teamId, table.templateId, table.forDepartment),
]);
// User Workflow Assignments - Mapping N:M tra utenti e workflow (con condizioni)
exports.userWorkflowAssignments = exports.w3suiteSchema.table("user_workflow_assignments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    templateId: (0, pg_core_1.uuid)("template_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
    forDepartment: (0, exports.departmentEnum)("for_department").notNull(), // Quale dipartimento usa questo workflow
    // Assignment configuration
    autoAssign: (0, pg_core_1.boolean)("auto_assign").default(true), // Auto-assign a richieste utente
    priority: (0, pg_core_1.integer)("priority").default(100), // Se multipli workflow per utente, quale usare primo
    // Conditions for workflow usage
    conditions: (0, pg_core_1.jsonb)("conditions").default({}), // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
    // Overrides specifici per questo utente
    overrides: (0, pg_core_1.jsonb)("overrides").default({}), // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
    // Status and validity
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    validFrom: (0, pg_core_1.timestamp)("valid_from").defaultNow(),
    validTo: (0, pg_core_1.timestamp)("valid_to"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("user_workflow_assignments_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("user_workflow_assignments_user_idx").on(table.userId),
    (0, pg_core_1.index)("user_workflow_assignments_template_idx").on(table.templateId),
    (0, pg_core_1.index)("user_workflow_assignments_active_idx").on(table.isActive),
    // 🎯 UNIQUE PER DIPARTIMENTO: Stesso utente può avere stesso workflow per dipartimenti diversi
    (0, pg_core_1.uniqueIndex)("user_workflow_assignments_unique").on(table.userId, table.templateId, table.forDepartment),
]);
// Workflow Instances - Istanze runtime di workflow in esecuzione
exports.workflowInstances = exports.w3suiteSchema.table("workflow_instances", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    templateId: (0, pg_core_1.uuid)("template_id").notNull().references(() => exports.workflowTemplates.id),
    // ✅ FIXED: Match existing database structure - use reference_id instead of request_id
    referenceId: (0, pg_core_1.varchar)("reference_id"), // Collegato a richiesta (existing column)
    // 🎯 NEW: Propagate category from template for department isolation
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // Inherited from workflowTemplates.category
    // ✅ FIXED: Match existing database columns exactly
    instanceType: (0, pg_core_1.varchar)("instance_type").notNull(), // existing column
    instanceName: (0, pg_core_1.varchar)("instance_name").notNull(), // existing column
    // ✅ FIXED: State machine - match existing structure  
    currentStatus: (0, pg_core_1.varchar)("current_status", { length: 50 }).default("pending"), // existing column
    currentStepId: (0, pg_core_1.uuid)("current_step_id"), // existing column
    currentNodeId: (0, pg_core_1.varchar)("current_node_id"), // existing column
    currentAssignee: (0, pg_core_1.varchar)("current_assignee"), // existing column
    assignedTeamId: (0, pg_core_1.uuid)("assigned_team_id"), // existing column
    assignedUsers: (0, pg_core_1.text)("assigned_users").array().default((0, drizzle_orm_1.sql) `'{}'::text[]`), // existing column
    escalationLevel: (0, pg_core_1.integer)("escalation_level").default(0), // existing column
    // ✅ FIXED: Match existing timestamp columns
    startedAt: (0, pg_core_1.timestamp)("started_at").default((0, drizzle_orm_1.sql) `now()`), // existing column  
    completedAt: (0, pg_core_1.timestamp)("completed_at"), // existing column
    lastActivityAt: (0, pg_core_1.timestamp)("last_activity_at").default((0, drizzle_orm_1.sql) `now()`), // existing column
    // ✅ FIXED: Match existing jsonb columns
    context: (0, pg_core_1.jsonb)("context").default((0, drizzle_orm_1.sql) `'{}'::jsonb`), // existing column
    workflowData: (0, pg_core_1.jsonb)("workflow_data").default((0, drizzle_orm_1.sql) `'{}'::jsonb`), // existing column
    metadata: (0, pg_core_1.jsonb)("metadata").default((0, drizzle_orm_1.sql) `'{}'::jsonb`), // existing column
    // ✅ FIXED: Match existing metadata columns
    createdBy: (0, pg_core_1.varchar)("created_by"), // existing column
    updatedBy: (0, pg_core_1.varchar)("updated_by"), // existing column
    createdAt: (0, pg_core_1.timestamp)("created_at").default((0, drizzle_orm_1.sql) `now()`), // existing column
    updatedAt: (0, pg_core_1.timestamp)("updated_at").default((0, drizzle_orm_1.sql) `now()`), // existing column
}); // ✅ TEMPORARILY REMOVED ALL INDEXES TO FIX STARTUP ERROR
// Workflow Executions - Log dettagliato esecuzioni step e trigger
exports.workflowExecutions = exports.w3suiteSchema.table("workflow_executions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    instanceId: (0, pg_core_1.uuid)("instance_id").notNull().references(() => exports.workflowInstances.id, { onDelete: 'cascade' }),
    stepId: (0, pg_core_1.uuid)("step_id").references(() => exports.workflowSteps.id),
    // Execution details
    executionType: (0, pg_core_1.varchar)("execution_type", { length: 50 }).notNull(), // 'action', 'trigger', 'condition', 'timer'
    executorId: (0, pg_core_1.varchar)("executor_id").references(() => exports.users.id), // Chi ha eseguito (per azioni manuali)
    automatedBy: (0, pg_core_1.varchar)("automated_by", { length: 100 }), // Sistema che ha eseguito automaticamente
    // Execution data
    inputData: (0, pg_core_1.jsonb)("input_data").default({}),
    outputData: (0, pg_core_1.jsonb)("output_data").default({}),
    // Results and status
    status: (0, pg_core_1.varchar)("status", { length: 50 }).notNull(), // 'success', 'failed', 'pending', 'skipped', 'timeout'
    errorMessage: (0, pg_core_1.text)("error_message"),
    retryCount: (0, pg_core_1.integer)("retry_count").default(0),
    // Timing
    startedAt: (0, pg_core_1.timestamp)("started_at").notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    duration: (0, pg_core_1.integer)("duration"), // Durata in millisecondi
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("workflow_executions_instance_idx").on(table.instanceId),
    (0, pg_core_1.index)("workflow_executions_step_idx").on(table.stepId),
    (0, pg_core_1.index)("workflow_executions_executor_idx").on(table.executorId),
    (0, pg_core_1.index)("workflow_executions_status_idx").on(table.status),
    (0, pg_core_1.index)("workflow_executions_started_idx").on(table.startedAt),
]);
// 🔄 WORKFLOW STEP EXECUTIONS - Idempotency & Retry Tracking (ASYNC EXECUTION ENGINE)
exports.workflowStepExecutions = exports.w3suiteSchema.table("workflow_step_executions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Step execution identification
    instanceId: (0, pg_core_1.uuid)("instance_id").notNull().references(() => exports.workflowInstances.id, { onDelete: 'cascade' }),
    stepId: (0, pg_core_1.varchar)("step_id", { length: 100 }).notNull(), // Node ID from ReactFlow
    stepName: (0, pg_core_1.varchar)("step_name", { length: 200 }), // Human-readable step name
    // 🔑 IDEMPOTENCY KEY - Prevents duplicate executions
    idempotencyKey: (0, pg_core_1.varchar)("idempotency_key", { length: 255 }).notNull().unique(), // SHA256(instanceId + stepId + attemptNumber)
    attemptNumber: (0, pg_core_1.integer)("attempt_number").default(1).notNull(), // Retry attempt counter
    // Execution status
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(), // 'pending', 'running', 'completed', 'failed', 'compensated'
    // Execution data
    inputData: (0, pg_core_1.jsonb)("input_data").default({}), // Input parameters for step
    outputData: (0, pg_core_1.jsonb)("output_data").default({}), // Result/output from step
    errorDetails: (0, pg_core_1.jsonb)("error_details").default({}), // { message, stack, code, recoverable }
    // Timing & Performance
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    durationMs: (0, pg_core_1.integer)("duration_ms"), // Execution duration in milliseconds
    // Retry & Compensation Logic
    retryCount: (0, pg_core_1.integer)("retry_count").default(0), // Number of retries performed
    maxRetries: (0, pg_core_1.integer)("max_retries").default(3), // Max retry attempts
    nextRetryAt: (0, pg_core_1.timestamp)("next_retry_at"), // Scheduled next retry
    compensationExecuted: (0, pg_core_1.boolean)("compensation_executed").default(false), // Rollback performed
    compensationData: (0, pg_core_1.jsonb)("compensation_data").default({}), // Compensation action details
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Additional context
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("workflow_step_executions_instance_idx").on(table.instanceId),
    (0, pg_core_1.index)("workflow_step_executions_step_idx").on(table.stepId),
    (0, pg_core_1.index)("workflow_step_executions_status_idx").on(table.status),
    (0, pg_core_1.index)("workflow_step_executions_idempotency_idx").on(table.idempotencyKey),
    (0, pg_core_1.index)("workflow_step_executions_retry_idx").on(table.nextRetryAt),
    (0, pg_core_1.uniqueIndex)("workflow_step_executions_unique").on(table.instanceId, table.stepId, table.attemptNumber),
]);
// ==================== WORKFLOW DURABILITY & EVENT SOURCING ====================
// Workflow State Events - Event sourcing for durable workflow execution
exports.workflowStateEvents = exports.w3suiteSchema.table("workflow_state_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Event identification
    instanceId: (0, pg_core_1.uuid)("instance_id").notNull().references(() => exports.workflowInstances.id, { onDelete: 'cascade' }),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(), // 'state_changed', 'step_completed', 'step_failed', 'workflow_paused', 'workflow_resumed'
    eventSequence: (0, pg_core_1.integer)("event_sequence").notNull(), // Ordered sequence for replay
    // State snapshot
    previousState: (0, pg_core_1.varchar)("previous_state", { length: 50 }), // Previous workflow status
    newState: (0, pg_core_1.varchar)("new_state", { length: 50 }).notNull(), // New workflow status
    // Event data
    stepId: (0, pg_core_1.varchar)("step_id", { length: 100 }), // Related step if applicable
    eventData: (0, pg_core_1.jsonb)("event_data").default({}), // Complete event payload
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Additional context
    // Causation tracking
    causedBy: (0, pg_core_1.varchar)("caused_by", { length: 50 }), // 'user', 'system', 'timer', 'webhook'
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id),
    // Timestamp
    occurredAt: (0, pg_core_1.timestamp)("occurred_at").notNull().defaultNow(),
    // Recovery tracking
    isProcessed: (0, pg_core_1.boolean)("is_processed").default(true), // False for pending replay
    processedAt: (0, pg_core_1.timestamp)("processed_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("workflow_state_events_instance_idx").on(table.instanceId),
    (0, pg_core_1.index)("workflow_state_events_sequence_idx").on(table.instanceId, table.eventSequence),
    (0, pg_core_1.index)("workflow_state_events_type_idx").on(table.eventType),
    (0, pg_core_1.index)("workflow_state_events_occurred_idx").on(table.occurredAt),
    (0, pg_core_1.uniqueIndex)("workflow_state_events_unique").on(table.instanceId, table.eventSequence),
]);
// Workflow State Snapshots - Periodic checkpoints for fast recovery
exports.workflowStateSnapshots = exports.w3suiteSchema.table("workflow_state_snapshots", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Snapshot identification
    instanceId: (0, pg_core_1.uuid)("instance_id").notNull().references(() => exports.workflowInstances.id, { onDelete: 'cascade' }),
    snapshotSequence: (0, pg_core_1.integer)("snapshot_sequence").notNull(), // Incrementing snapshot number
    eventSequenceAt: (0, pg_core_1.integer)("event_sequence_at").notNull(), // Last event sequence included in snapshot
    // Complete state snapshot
    workflowState: (0, pg_core_1.jsonb)("workflow_state").notNull(), // Full workflow state at this point
    executionContext: (0, pg_core_1.jsonb)("execution_context").default({}), // Runtime context variables
    completedSteps: (0, pg_core_1.text)("completed_steps").array().default([]), // Array of completed step IDs
    pendingSteps: (0, pg_core_1.text)("pending_steps").array().default([]), // Array of pending step IDs
    // Snapshot metadata
    currentStatus: (0, pg_core_1.varchar)("current_status", { length: 50 }).notNull(),
    currentStepId: (0, pg_core_1.varchar)("current_step_id", { length: 100 }),
    // Performance tracking
    snapshotSizeBytes: (0, pg_core_1.integer)("snapshot_size_bytes"), // Size for cleanup decisions
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Auto-cleanup old snapshots
}, (table) => [
    (0, pg_core_1.index)("workflow_state_snapshots_instance_idx").on(table.instanceId),
    (0, pg_core_1.index)("workflow_state_snapshots_sequence_idx").on(table.instanceId, table.snapshotSequence),
    (0, pg_core_1.index)("workflow_state_snapshots_created_idx").on(table.createdAt),
    (0, pg_core_1.uniqueIndex)("workflow_state_snapshots_unique").on(table.instanceId, table.snapshotSequence),
]);
// ==================== WEBHOOK SYSTEM TABLES ====================
// Webhook Events - Centralized webhook event log with audit trail
exports.webhookEvents = exports.w3suiteSchema.table("webhook_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Event identification
    eventId: (0, pg_core_1.varchar)("event_id", { length: 255 }).notNull(), // Provider's event ID (for deduplication)
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(), // 'payment.succeeded', 'sms.delivered', etc.
    source: (0, pg_core_1.varchar)("source", { length: 100 }).notNull(), // 'stripe', 'twilio', 'github', 'custom'
    // Event data
    payload: (0, pg_core_1.jsonb)("payload").notNull(), // Full webhook payload
    headers: (0, pg_core_1.jsonb)("headers").default({}), // HTTP headers from webhook request
    signature: (0, pg_core_1.text)("signature"), // Webhook signature for validation
    signatureValid: (0, pg_core_1.boolean)("signature_valid"), // Validation result
    // Processing status
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(), // 'pending', 'processing', 'completed', 'failed', 'skipped'
    processingError: (0, pg_core_1.text)("processing_error"), // Error message if failed
    retryCount: (0, pg_core_1.integer)("retry_count").default(0),
    maxRetries: (0, pg_core_1.integer)("max_retries").default(3),
    // Workflow trigger mapping
    workflowTriggerId: (0, pg_core_1.uuid)("workflow_trigger_id").references(() => exports.workflowTriggers.id), // Matched workflow trigger
    workflowInstanceId: (0, pg_core_1.uuid)("workflow_instance_id").references(() => exports.workflowInstances.id), // Created workflow instance
    // Timing
    receivedAt: (0, pg_core_1.timestamp)("received_at").defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)("processed_at"),
    nextRetryAt: (0, pg_core_1.timestamp)("next_retry_at"),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("webhook_events_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("webhook_events_event_id_idx").on(table.eventId),
    (0, pg_core_1.index)("webhook_events_event_type_idx").on(table.eventType),
    (0, pg_core_1.index)("webhook_events_source_idx").on(table.source),
    (0, pg_core_1.index)("webhook_events_status_idx").on(table.status),
    (0, pg_core_1.index)("webhook_events_received_idx").on(table.receivedAt),
    (0, pg_core_1.index)("webhook_events_next_retry_idx").on(table.nextRetryAt),
    (0, pg_core_1.uniqueIndex)("webhook_events_unique").on(table.tenantId, table.source, table.eventId), // Prevent duplicates
]);
// Webhook Signatures - Provider signature configuration per tenant
exports.webhookSignatures = exports.w3suiteSchema.table("webhook_signatures", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Provider identification
    provider: (0, pg_core_1.varchar)("provider", { length: 100 }).notNull(), // 'stripe', 'twilio', 'github', 'custom'
    providerName: (0, pg_core_1.varchar)("provider_name", { length: 200 }).notNull(), // Display name
    description: (0, pg_core_1.text)("description"),
    // Signature configuration
    signingSecret: (0, pg_core_1.text)("signing_secret").notNull(), // Encrypted webhook secret
    validationAlgorithm: (0, pg_core_1.varchar)("validation_algorithm", { length: 50 }).default('hmac-sha256').notNull(), // 'hmac-sha256', 'hmac-sha512', 'rsa'
    signatureHeader: (0, pg_core_1.varchar)("signature_header", { length: 100 }).default('x-webhook-signature'), // Header containing signature
    timestampHeader: (0, pg_core_1.varchar)("timestamp_header", { length: 100 }), // Header for timestamp (replay protection)
    // Validation settings
    toleranceWindowSeconds: (0, pg_core_1.integer)("tolerance_window_seconds").default(300), // 5 min replay protection
    requireTimestamp: (0, pg_core_1.boolean)("require_timestamp").default(false),
    // RBAC Integration
    requiredPermission: (0, pg_core_1.varchar)("required_permission", { length: 200 }).default('webhooks.receive.*'), // Permission to receive webhooks
    allowedEventTypes: (0, pg_core_1.text)("allowed_event_types").array().default([]), // Whitelist of event types (empty = all)
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    lastUsed: (0, pg_core_1.timestamp)("last_used"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.index)("webhook_signatures_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("webhook_signatures_provider_idx").on(table.provider),
    (0, pg_core_1.index)("webhook_signatures_active_idx").on(table.isActive),
    (0, pg_core_1.uniqueIndex)("webhook_signatures_unique").on(table.tenantId, table.provider),
]);
// ==================== TASK MANAGEMENT SYSTEM TABLES ====================
// Tasks - Core task entity
exports.tasks = exports.w3suiteSchema.table("tasks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    // Basic Info
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    status: (0, exports.taskStatusEnum)("status").default('todo').notNull(),
    priority: (0, exports.taskPriorityEnum)("priority").default('medium').notNull(),
    urgency: (0, exports.taskUrgencyEnum)("urgency").default('medium').notNull(),
    // Ownership & Visibility
    creatorId: (0, pg_core_1.varchar)("creator_id").notNull().references(() => exports.users.id),
    department: (0, exports.departmentEnum)("department"),
    // Dates
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    startDate: (0, pg_core_1.timestamp)("start_date"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Progress & Tracking
    estimatedHours: (0, pg_core_1.real)("estimated_hours"),
    actualHours: (0, pg_core_1.real)("actual_hours"),
    completionPercentage: (0, pg_core_1.integer)("completion_percentage").default(0),
    // Categorization
    tags: (0, pg_core_1.text)("tags").array().default([]),
    customFields: (0, pg_core_1.jsonb)("custom_fields").default({}),
    // Workflow Integration (OPTIONAL)
    linkedWorkflowInstanceId: (0, pg_core_1.uuid)("linked_workflow_instance_id").references(() => exports.workflowInstances.id),
    linkedWorkflowTeamId: (0, pg_core_1.uuid)("linked_workflow_team_id").references(() => exports.teams.id),
    triggeredByWorkflowStepId: (0, pg_core_1.uuid)("triggered_by_workflow_step_id"),
    // Recurrence
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.jsonb)("recurrence_rule"),
    parentRecurringTaskId: (0, pg_core_1.uuid)("parent_recurring_task_id"),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
}, (table) => [
    (0, pg_core_1.index)("tasks_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("tasks_creator_idx").on(table.tenantId, table.creatorId),
    (0, pg_core_1.index)("tasks_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("tasks_department_idx").on(table.tenantId, table.department),
    (0, pg_core_1.index)("tasks_due_date_idx").on(table.tenantId, table.dueDate),
    (0, pg_core_1.index)("tasks_workflow_idx").on(table.linkedWorkflowInstanceId),
]);
// Task Assignments - Assignees & Watchers (many-to-many)
exports.taskAssignments = exports.w3suiteSchema.table("task_assignments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    role: (0, exports.taskAssignmentRoleEnum)("role").notNull(),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow().notNull(),
    assignedBy: (0, pg_core_1.varchar)("assigned_by").notNull().references(() => exports.users.id),
    // Notification preferences
    notifyOnUpdate: (0, pg_core_1.boolean)("notify_on_update").default(true),
    notifyOnComment: (0, pg_core_1.boolean)("notify_on_comment").default(true),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("task_assignments_unique").on(table.taskId, table.userId, table.role),
    (0, pg_core_1.index)("task_assignments_user_idx").on(table.userId, table.role),
    (0, pg_core_1.index)("task_assignments_task_idx").on(table.taskId),
    (0, pg_core_1.index)("task_assignments_tenant_idx").on(table.tenantId),
]);
// Task Checklist Items - Subtasks with granular assignment
exports.taskChecklistItems = exports.w3suiteSchema.table("task_checklist_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    position: (0, pg_core_1.integer)("position").notNull(),
    // Granular Assignment (NULL = all task assignees)
    assignedToUserId: (0, pg_core_1.varchar)("assigned_to_user_id").references(() => exports.users.id),
    // Dates
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    completedBy: (0, pg_core_1.varchar)("completed_by").references(() => exports.users.id),
    // Status
    isCompleted: (0, pg_core_1.boolean)("is_completed").default(false),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
}, (table) => [
    (0, pg_core_1.index)("checklist_task_idx").on(table.taskId, table.position),
    (0, pg_core_1.index)("checklist_assigned_idx").on(table.assignedToUserId),
    (0, pg_core_1.index)("checklist_due_date_idx").on(table.dueDate),
]);
// Task Comments - Discussion threads
exports.taskComments = exports.w3suiteSchema.table("task_comments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    content: (0, pg_core_1.text)("content").notNull(),
    // Threading (optional)
    parentCommentId: (0, pg_core_1.uuid)("parent_comment_id"),
    // Mentions
    mentionedUserIds: (0, pg_core_1.varchar)("mentioned_user_ids").array().default([]),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    isEdited: (0, pg_core_1.boolean)("is_edited").default(false),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
}, (table) => [
    (0, pg_core_1.index)("comments_task_idx").on(table.taskId, table.createdAt),
    (0, pg_core_1.index)("comments_user_idx").on(table.userId),
]);
// Task Time Logs - Time tracking
exports.taskTimeLogs = exports.w3suiteSchema.table("task_time_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    checklistItemId: (0, pg_core_1.uuid)("checklist_item_id").references(() => exports.taskChecklistItems.id, { onDelete: 'set null' }),
    startedAt: (0, pg_core_1.timestamp)("started_at").notNull(),
    endedAt: (0, pg_core_1.timestamp)("ended_at"),
    duration: (0, pg_core_1.integer)("duration"),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("time_logs_task_idx").on(table.taskId, table.userId),
    (0, pg_core_1.index)("time_logs_user_idx").on(table.userId, table.startedAt),
    (0, pg_core_1.index)("time_logs_running_idx").on(table.userId, table.endedAt),
]);
// Task Dependencies - Task relationships
exports.taskDependencies = exports.w3suiteSchema.table("task_dependencies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    dependentTaskId: (0, pg_core_1.uuid)("dependent_task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    dependencyType: (0, exports.taskDependencyTypeEnum)("dependency_type").default('blocks').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("task_dependencies_unique").on(table.taskId, table.dependentTaskId),
    (0, pg_core_1.index)("task_dependencies_task_idx").on(table.taskId),
    (0, pg_core_1.index)("task_dependencies_depends_idx").on(table.dependentTaskId),
]);
// Task Attachments - File uploads
exports.taskAttachments = exports.w3suiteSchema.table("task_attachments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    taskId: (0, pg_core_1.uuid)("task_id").notNull().references(() => exports.tasks.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    uploadedBy: (0, pg_core_1.varchar)("uploaded_by").notNull().references(() => exports.users.id),
    fileName: (0, pg_core_1.varchar)("file_name", { length: 500 }).notNull(),
    fileUrl: (0, pg_core_1.text)("file_url").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 100 }).notNull(),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("attachments_task_idx").on(table.taskId),
    (0, pg_core_1.index)("attachments_user_idx").on(table.uploadedBy),
]);
// Task Templates - Quick create & recurring tasks
exports.taskTemplates = exports.w3suiteSchema.table("task_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    department: (0, exports.departmentEnum)("department"),
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // Template Configuration (JSON)
    templateData: (0, pg_core_1.jsonb)("template_data").notNull(),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    // Recurrence
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurrenceRule: (0, pg_core_1.jsonb)("recurrence_rule"),
    lastInstantiatedAt: (0, pg_core_1.timestamp)("last_instantiated_at"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
}, (table) => [
    (0, pg_core_1.index)("templates_tenant_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("templates_department_idx").on(table.department),
]);
// ==================== CHAT SYSTEM TABLES ====================
// Chat Channels - Team channels, DMs, task threads
exports.chatChannels = exports.w3suiteSchema.table("chat_channels", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    name: (0, pg_core_1.varchar)("name", { length: 200 }),
    description: (0, pg_core_1.text)("description"),
    channelType: (0, exports.chatChannelTypeEnum)("channel_type").notNull(),
    visibility: (0, exports.chatVisibilityEnum)("visibility").default('private').notNull(),
    // References
    teamId: (0, pg_core_1.uuid)("team_id").references(() => exports.teams.id),
    taskId: (0, pg_core_1.uuid)("task_id").references(() => exports.tasks.id),
    createdBy: (0, pg_core_1.varchar)("created_by").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    isArchived: (0, pg_core_1.boolean)("is_archived").default(false),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
}, (table) => [
    (0, pg_core_1.index)("channels_tenant_idx").on(table.tenantId, table.channelType),
    (0, pg_core_1.index)("channels_task_idx").on(table.taskId),
    (0, pg_core_1.index)("channels_team_idx").on(table.teamId),
]);
// Chat Channel Members - Who can access channels
exports.chatChannelMembers = exports.w3suiteSchema.table("chat_channel_members", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    channelId: (0, pg_core_1.uuid)("channel_id").notNull().references(() => exports.chatChannels.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    role: (0, exports.chatMemberRoleEnum)("role").default('member').notNull(),
    inviteStatus: (0, exports.chatInviteStatusEnum)("invite_status").default('accepted').notNull(),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow().notNull(),
    lastReadAt: (0, pg_core_1.timestamp)("last_read_at"),
    notificationPreference: (0, exports.chatNotificationPreferenceEnum)("notification_preference").default('all').notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("channel_members_unique").on(table.channelId, table.userId),
    (0, pg_core_1.index)("channel_members_user_idx").on(table.userId),
]);
// Chat Messages - Real-time messaging
exports.chatMessages = exports.w3suiteSchema.table("chat_messages", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    channelId: (0, pg_core_1.uuid)("channel_id").notNull().references(() => exports.chatChannels.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    content: (0, pg_core_1.text)("content").notNull(),
    // Threading
    parentMessageId: (0, pg_core_1.uuid)("parent_message_id"),
    // Mentions & Reactions
    mentionedUserIds: (0, pg_core_1.varchar)("mentioned_user_ids").array().default([]),
    reactions: (0, pg_core_1.jsonb)("reactions").default({}),
    // Attachments
    attachments: (0, pg_core_1.jsonb)("attachments").default([]),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    isEdited: (0, pg_core_1.boolean)("is_edited").default(false),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
}, (table) => [
    (0, pg_core_1.index)("messages_channel_idx").on(table.channelId, table.createdAt),
    (0, pg_core_1.index)("messages_user_idx").on(table.userId),
    (0, pg_core_1.index)("messages_parent_idx").on(table.parentMessageId),
]);
// Chat Typing Indicators - Real-time typing status
exports.chatTypingIndicators = exports.w3suiteSchema.table("chat_typing_indicators", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    channelId: (0, pg_core_1.uuid)("channel_id").notNull().references(() => exports.chatChannels.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    startedAt: (0, pg_core_1.timestamp)("started_at").defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("typing_unique").on(table.channelId, table.userId),
    (0, pg_core_1.index)("typing_expires_idx").on(table.expiresAt),
]);
// ==================== ACTIVITY FEED TABLES ====================
// Activity Feed Events - Business events stream
exports.activityFeedEvents = exports.w3suiteSchema.table("activity_feed_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(),
    category: (0, exports.activityFeedCategoryEnum)("category").notNull(),
    // Actor
    actorUserId: (0, pg_core_1.varchar)("actor_user_id").references(() => exports.users.id),
    actorType: (0, exports.activityFeedActorTypeEnum)("actor_type").default('user').notNull(),
    // Target Entity
    targetEntityType: (0, pg_core_1.varchar)("target_entity_type", { length: 100 }),
    targetEntityId: (0, pg_core_1.uuid)("target_entity_id"),
    // Content
    title: (0, pg_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // Data
    eventData: (0, pg_core_1.jsonb)("event_data").default({}),
    // Visibility
    department: (0, exports.departmentEnum)("department"),
    visibleToUserIds: (0, pg_core_1.varchar)("visible_to_user_ids").array(),
    // Metadata
    priority: (0, exports.activityFeedPriorityEnum)("priority").default('normal').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
}, (table) => [
    (0, pg_core_1.index)("feed_tenant_idx").on(table.tenantId, table.createdAt),
    (0, pg_core_1.index)("feed_category_idx").on(table.tenantId, table.category),
    (0, pg_core_1.index)("feed_actor_idx").on(table.actorUserId),
    (0, pg_core_1.index)("feed_target_idx").on(table.targetEntityType, table.targetEntityId),
    (0, pg_core_1.index)("feed_department_idx").on(table.department),
]);
// Activity Feed Interactions - Likes, comments, shares
exports.activityFeedInteractions = exports.w3suiteSchema.table("activity_feed_interactions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    eventId: (0, pg_core_1.uuid)("event_id").notNull().references(() => exports.activityFeedEvents.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    interactionType: (0, exports.activityFeedInteractionTypeEnum)("interaction_type").notNull(),
    // For comments
    commentContent: (0, pg_core_1.text)("comment_content"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("interactions_event_idx").on(table.eventId, table.interactionType),
    (0, pg_core_1.index)("interactions_user_idx").on(table.userId),
    (0, pg_core_1.index)("interactions_tenant_idx").on(table.tenantId),
    (0, pg_core_1.uniqueIndex)("interactions_like_unique").on(table.eventId, table.userId, table.interactionType),
]);
// Insert Schemas and Types for new workflow tables
exports.insertWorkflowActionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowActions).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWorkflowTriggerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowTriggers).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWorkflowTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWorkflowStepSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowSteps).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertTeamSchema = (0, drizzle_zod_1.createInsertSchema)(exports.teams).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertTeamWorkflowAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.teamWorkflowAssignments).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertUserWorkflowAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userWorkflowAssignments).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWorkflowInstanceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowInstances).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWorkflowExecutionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowExecutions).omit({
    id: true,
    createdAt: true
});
exports.insertWorkflowStepExecutionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowStepExecutions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    startedAt: true,
    completedAt: true,
    durationMs: true
});
exports.insertWorkflowStateEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowStateEvents).omit({
    id: true,
    occurredAt: true,
    processedAt: true
});
exports.insertWorkflowStateSnapshotSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowStateSnapshots).omit({
    id: true,
    createdAt: true
});
exports.insertWebhookEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.webhookEvents).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertWebhookSignatureSchema = (0, drizzle_zod_1.createInsertSchema)(exports.webhookSignatures).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== NOTIFICATION SYSTEM RELATIONS ====================
// Notifications Relations
exports.notificationsRelations = (0, drizzle_orm_1.relations)(exports.notifications, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.notifications.tenantId], references: [exports.tenants.id] }),
    targetUser: one(exports.users, { fields: [exports.notifications.targetUserId], references: [exports.users.id] }),
}));
// Notification Templates Relations
exports.notificationTemplatesRelations = (0, drizzle_orm_1.relations)(exports.notificationTemplates, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.notificationTemplates.tenantId], references: [exports.tenants.id] }),
}));
// Notification Preferences Relations
exports.notificationPreferencesRelations = (0, drizzle_orm_1.relations)(exports.notificationPreferences, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.notificationPreferences.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.notificationPreferences.userId], references: [exports.users.id] }),
}));
// ==================== AI SYSTEM TABLES ====================
// AI Settings - Configuration per tenant with encrypted API key storage
exports.aiSettings = exports.w3suiteSchema.table("ai_settings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    // AI Activation Control
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(), // Master switch for AI features
    // Model Configuration
    openaiModel: (0, exports.aiModelEnum)("openai_model").default('gpt-4-turbo').notNull(),
    openaiApiKey: (0, pg_core_1.text)("openai_api_key"), // Encrypted storage for tenant-specific API key
    apiConnectionStatus: (0, exports.aiConnectionStatusEnum)("api_connection_status").default('disconnected').notNull(),
    lastConnectionTest: (0, pg_core_1.timestamp)("last_connection_test"),
    connectionTestResult: (0, pg_core_1.jsonb)("connection_test_result"), // Store last test details
    // Features Configuration - Granular control via JSONB
    featuresEnabled: (0, pg_core_1.jsonb)("features_enabled").default({
        chat_assistant: true,
        document_analysis: true,
        natural_queries: true,
        financial_forecasting: false,
        web_search: false,
        code_interpreter: false,
        file_search: true,
        image_generation: false,
        voice_assistant: false,
        realtime_streaming: false,
        background_processing: true
    }).notNull(),
    // Response Configuration
    maxTokensPerResponse: (0, pg_core_1.integer)("max_tokens_per_response").default(1000).notNull(),
    responseCreativity: (0, pg_core_1.smallint)("response_creativity").default(7), // 0-20 scale (mapped to 0-2.0 temperature)
    responseLengthLimit: (0, pg_core_1.integer)("response_length_limit").default(4000).notNull(),
    // ➕ AI AGENT REGISTRY COMPATIBILITY (FASE 2 - Now active!)
    activeAgents: (0, pg_core_1.jsonb)("active_agents").default('["tippy-sales"]').notNull(), // Lista agenti attivi per tenant
    agentOverrides: (0, pg_core_1.jsonb)("agent_overrides").default('{}').notNull(), // Override specifici tenant per agenti
    // Usage & Limits
    monthlyTokenLimit: (0, pg_core_1.integer)("monthly_token_limit").default(100000).notNull(),
    currentMonthUsage: (0, pg_core_1.integer)("current_month_usage").default(0).notNull(),
    usageResetDate: (0, pg_core_1.date)("usage_reset_date"),
    // Privacy & Data Retention
    privacyMode: (0, exports.aiPrivacyModeEnum)("privacy_mode").default('standard').notNull(),
    chatRetentionDays: (0, pg_core_1.integer)("chat_retention_days").default(30).notNull(),
    dataSharingOpenai: (0, pg_core_1.boolean)("data_sharing_openai").default(false).notNull(),
    // Enterprise Features
    contextSettings: (0, pg_core_1.jsonb)("context_settings").default({
        hr_context_enabled: true,
        finance_context_enabled: true,
        business_rules_integration: false,
        custom_instructions: ""
    }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("ai_settings_tenant_idx").on(table.tenantId),
}));
// AI Usage Logs - Tracking & Analytics per tenant
exports.aiUsageLogs = exports.w3suiteSchema.table("ai_usage_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: 'set null' }),
    // Request Details
    modelUsed: (0, exports.aiModelEnum)("model_used").notNull(),
    featureType: (0, exports.aiFeatureTypeEnum)("feature_type").notNull(),
    tokensInput: (0, pg_core_1.integer)("tokens_input").default(0).notNull(),
    tokensOutput: (0, pg_core_1.integer)("tokens_output").default(0).notNull(),
    tokensTotal: (0, pg_core_1.integer)("tokens_total").default(0).notNull(),
    costUsd: (0, pg_core_1.integer)("cost_usd").default(0).notNull(), // Stored as cents for precision
    // Performance & Success
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms"),
    success: (0, pg_core_1.boolean)("success").default(true).notNull(),
    errorMessage: (0, pg_core_1.text)("error_message"),
    // Request Context
    requestContext: (0, pg_core_1.jsonb)("request_context").default({}),
    requestTimestamp: (0, pg_core_1.timestamp)("request_timestamp").defaultNow().notNull(),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("ai_usage_logs_tenant_idx").on(table.tenantId),
    userIndex: (0, pg_core_1.index)("ai_usage_logs_user_idx").on(table.userId),
    timestampIndex: (0, pg_core_1.index)("ai_usage_logs_timestamp_idx").on(table.requestTimestamp),
    featureIndex: (0, pg_core_1.index)("ai_usage_logs_feature_idx").on(table.featureType),
    // Composite index for granular analytics queries
    analyticsIndex: (0, pg_core_1.index)("ai_usage_logs_analytics_idx").on(table.tenantId, table.featureType, table.requestTimestamp),
    costIndex: (0, pg_core_1.index)("ai_usage_logs_cost_idx").on(table.tenantId, table.costUsd, table.requestTimestamp),
}));
// AI Agent Tenant Settings - Per-tenant agent enablement control
exports.aiAgentTenantSettings = exports.w3suiteSchema.table("ai_agent_tenant_settings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    // Agent Identification
    agentId: (0, pg_core_1.text)("agent_id").notNull(), // e.g., "tippy-sales", "workflow-assistant"
    // Enablement Control
    isEnabled: (0, pg_core_1.boolean)("is_enabled").default(true).notNull(),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("ai_agent_tenant_settings_tenant_idx").on(table.tenantId),
    agentIndex: (0, pg_core_1.index)("ai_agent_tenant_settings_agent_idx").on(table.agentId),
    // Unique constraint: one setting per agent per tenant
    uniqueTenantAgent: (0, pg_core_1.index)("ai_agent_tenant_settings_unique_idx").on(table.tenantId, table.agentId),
}));
// AI Conversations - Chat History with encryption and retention
exports.aiConversations = exports.w3suiteSchema.table("ai_conversations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    // Conversation Metadata
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    conversationData: (0, pg_core_1.jsonb)("conversation_data").notNull(), // Encrypted chat history
    featureContext: (0, exports.aiFeatureTypeEnum)("feature_context").default('chat').notNull(),
    // Business Context
    moduleContext: (0, pg_core_1.varchar)("module_context", { length: 50 }), // 'hr', 'finance', 'general'
    businessEntityId: (0, pg_core_1.uuid)("business_entity_id"), // Related entity (user, store, etc.)
    // Retention Management
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Based on retention policy
    isArchived: (0, pg_core_1.boolean)("is_archived").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("ai_conversations_tenant_idx").on(table.tenantId),
    userIndex: (0, pg_core_1.index)("ai_conversations_user_idx").on(table.userId),
    contextIndex: (0, pg_core_1.index)("ai_conversations_context_idx").on(table.featureContext),
    expiresIndex: (0, pg_core_1.index)("ai_conversations_expires_idx").on(table.expiresAt),
}));
// ==================== LEAD ROUTING AI SYSTEM ====================
// Lead Routing History - Tracks AI routing decisions for leads
exports.leadRoutingHistory = exports.w3suiteSchema.table("lead_routing_history", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    leadId: (0, pg_core_1.uuid)("lead_id").references(() => exports.crmLeads.id, { onDelete: 'cascade' }).notNull(),
    // Interaction Context
    interactionType: (0, pg_core_1.varchar)("interaction_type", { length: 50 }).notNull(), // social_post_view, email_open, webinar, etc.
    interactionContent: (0, pg_core_1.text)("interaction_content"), // Content description
    acquisitionSourceId: (0, pg_core_1.uuid)("acquisition_source_id"), // FK to be added later when acquisition_sources table exists
    // AI Routing Decision
    recommendedDriver: (0, pg_core_1.uuid)("recommended_driver").references(() => public_1.drivers.id),
    driverConfidence: (0, exports.leadRoutingConfidenceEnum)("driver_confidence").default('medium').notNull(),
    driverReasoning: (0, pg_core_1.text)("driver_reasoning"),
    // Pipeline Assignment
    targetPipelineId: (0, pg_core_1.uuid)("target_pipeline_id").references(() => exports.crmPipelines.id),
    campaignSuggestion: (0, pg_core_1.varchar)("campaign_suggestion", { length: 255 }),
    // Outbound Channel Recommendation
    primaryOutboundChannel: (0, exports.outboundChannelEnum)("primary_outbound_channel").notNull(),
    secondaryOutboundChannel: (0, exports.outboundChannelEnum)("secondary_outbound_channel"),
    channelReasoning: (0, pg_core_1.text)("channel_reasoning"),
    // Deal Prediction
    estimatedValue: (0, pg_core_1.integer)("estimated_value"), // in cents
    expectedCloseDate: (0, pg_core_1.date)("expected_close_date"),
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }), // High, Medium, Low
    // AI Response Metadata
    aiModel: (0, exports.aiModelEnum)("ai_model").default('gpt-4o').notNull(),
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms"),
    tokenUsage: (0, pg_core_1.integer)("token_usage"),
    fullAiResponse: (0, pg_core_1.jsonb)("full_ai_response"), // Complete AI JSON response
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("lead_routing_history_tenant_idx").on(table.tenantId),
    leadIndex: (0, pg_core_1.index)("lead_routing_history_lead_idx").on(table.leadId),
    driverIndex: (0, pg_core_1.index)("lead_routing_history_driver_idx").on(table.recommendedDriver),
    pipelineIndex: (0, pg_core_1.index)("lead_routing_history_pipeline_idx").on(table.targetPipelineId),
    createdAtIndex: (0, pg_core_1.index)("lead_routing_history_created_at_idx").on(table.createdAt),
}));
// Lead AI Insights - AI-generated insights and recommendations for leads
exports.leadAiInsights = exports.w3suiteSchema.table("lead_ai_insights", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    leadId: (0, pg_core_1.uuid)("lead_id").references(() => exports.crmLeads.id, { onDelete: 'cascade' }).notNull(),
    // Insight Data
    insightType: (0, pg_core_1.varchar)("insight_type", { length: 50 }).notNull(), // routing, scoring, next_action
    insights: (0, pg_core_1.jsonb)("insights").notNull(), // Array of insight strings
    nextAction: (0, pg_core_1.text)("next_action"),
    riskFactors: (0, pg_core_1.jsonb)("risk_factors"), // Array of risk strings
    // Scoring
    score: (0, pg_core_1.integer)("score"), // 0-100
    confidence: (0, pg_core_1.real)("confidence"), // 0.0-1.0
    // Metadata
    generatedBy: (0, pg_core_1.varchar)("generated_by", { length: 50 }).default('lead-routing-agent').notNull(),
    aiModel: (0, exports.aiModelEnum)("ai_model").default('gpt-4o').notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Optional expiration for insights
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("lead_ai_insights_tenant_idx").on(table.tenantId),
    leadIndex: (0, pg_core_1.index)("lead_ai_insights_lead_idx").on(table.leadId),
    typeIndex: (0, pg_core_1.index)("lead_ai_insights_type_idx").on(table.insightType),
    createdAtIndex: (0, pg_core_1.index)("lead_ai_insights_created_at_idx").on(table.createdAt),
}));
// ==================== MCP (MODEL CONTEXT PROTOCOL) SYSTEM ====================
// Enterprise-grade integration system for external services via MCP protocol
// Supports Google Workspace, Meta/Instagram, GTM, AWS S3, Microsoft Teams, etc.
// MCP Servers - Registry of configured MCP servers (tenant-scoped)
exports.mcpServers = exports.w3suiteSchema.table("mcp_servers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    // Server Identification
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(), // Unique identifier (e.g., 'google-workspace', 'meta-instagram')
    displayName: (0, pg_core_1.varchar)("display_name", { length: 255 }).notNull(), // User-friendly name
    description: (0, pg_core_1.text)("description"),
    // Connection Details
    serverUrl: (0, pg_core_1.text)("server_url"), // For http-sse transport (null for stdio)
    transport: (0, exports.mcpTransportEnum)("transport").notNull(), // stdio or http-sse
    status: (0, exports.mcpServerStatusEnum)("status").default('configuring').notNull(),
    // Configuration & Metadata
    config: (0, pg_core_1.jsonb)("config").default({}).notNull(), // Server-specific config (retries, timeout, etc.)
    iconUrl: (0, pg_core_1.varchar)("icon_url", { length: 500 }), // Optional icon for UI
    category: (0, exports.mcpToolCategoryEnum)("category").default('other'),
    // Installation & Source
    sourceType: (0, pg_core_1.varchar)("source_type", { length: 50 }).default('npm_package'), // 'npm_package' or 'custom_source'
    installMethod: (0, pg_core_1.text)("install_method"), // e.g., 'npm install @modelcontextprotocol/server-slack'
    installLocation: (0, pg_core_1.text)("install_location"), // e.g., 'node_modules/@modelcontextprotocol/server-slack' or '/mcp-servers/custom-webhook'
    discoveredTools: (0, pg_core_1.jsonb)("discovered_tools").default([]), // Cache of discovered tools [{name, description, schema}]
    // Health & Monitoring
    lastHealthCheck: (0, pg_core_1.timestamp)("last_health_check"),
    lastError: (0, pg_core_1.text)("last_error"),
    errorCount: (0, pg_core_1.integer)("error_count").default(0).notNull(),
    // Metadata
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("mcp_servers_tenant_idx").on(table.tenantId),
    statusIndex: (0, pg_core_1.index)("mcp_servers_status_idx").on(table.status),
    nameIndex: (0, pg_core_1.uniqueIndex)("mcp_servers_tenant_name_unique").on(table.tenantId, table.name),
    categoryIndex: (0, pg_core_1.index)("mcp_servers_category_idx").on(table.category),
}));
// MCP Server Credentials - Encrypted credential storage with RLS
exports.mcpServerCredentials = exports.w3suiteSchema.table("mcp_server_credentials", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    serverId: (0, pg_core_1.uuid)("server_id").references(() => exports.mcpServers.id, { onDelete: 'cascade' }).notNull(),
    // Credential Type & Data
    credentialType: (0, exports.mcpCredentialTypeEnum)("credential_type").notNull(),
    encryptedCredentials: (0, pg_core_1.jsonb)("encrypted_credentials").notNull(), // Encrypted: { accessToken, refreshToken, apiKey, etc. }
    encryptionKeyId: (0, pg_core_1.varchar)("encryption_key_id", { length: 100 }), // Key ID for decryption
    // Multi-Provider OAuth Support (n8n-style)
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }), // For multi-user OAuth (null = tenant-level)
    oauthProvider: (0, pg_core_1.varchar)("oauth_provider", { length: 50 }), // 'google', 'microsoft', 'meta', 'aws', etc.
    // OAuth-specific fields
    tokenType: (0, pg_core_1.varchar)("token_type", { length: 50 }), // 'Bearer', 'Basic', etc.
    scope: (0, pg_core_1.text)("scope"), // OAuth scopes granted
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Token expiration
    accountEmail: (0, pg_core_1.varchar)("account_email", { length: 255 }), // OAuth account email (for display in UI)
    accountName: (0, pg_core_1.varchar)("account_name", { length: 255 }), // OAuth account display name
    // Audit & Lifecycle
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at"),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at"),
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("mcp_server_credentials_tenant_idx").on(table.tenantId),
    serverIndex: (0, pg_core_1.index)("mcp_server_credentials_server_idx").on(table.serverId),
    expiresIndex: (0, pg_core_1.index)("mcp_server_credentials_expires_idx").on(table.expiresAt),
    userIndex: (0, pg_core_1.index)("mcp_server_credentials_user_idx").on(table.userId),
    providerIndex: (0, pg_core_1.index)("mcp_server_credentials_provider_idx").on(table.oauthProvider),
    // Unique: one credential per server/user/provider combination (COALESCE handles nulls)
    serverUserProviderUnique: (0, pg_core_1.uniqueIndex)("mcp_server_credentials_server_user_provider_unique").on(table.serverId, (0, drizzle_orm_1.sql) `COALESCE(${table.userId}, '')`, (0, drizzle_orm_1.sql) `COALESCE(${table.oauthProvider}, '')`),
}));
// MCP Connected Accounts - Multi-account support for Meta Pages, Instagram, Google Workspaces, etc.
exports.mcpConnectedAccounts = exports.w3suiteSchema.table("mcp_connected_accounts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    credentialId: (0, pg_core_1.uuid)("credential_id").references(() => exports.mcpServerCredentials.id, { onDelete: 'cascade' }).notNull(),
    // Account Type & Identity
    accountType: (0, exports.mcpAccountTypeEnum)("account_type").notNull(),
    platformAccountId: (0, pg_core_1.varchar)("platform_account_id", { length: 255 }).notNull(), // FB Page ID, IG Account ID, Google Workspace ID, etc.
    accountName: (0, pg_core_1.varchar)("account_name", { length: 255 }).notNull(), // Display name (e.g., "Negozio Milano")
    accountUsername: (0, pg_core_1.varchar)("account_username", { length: 255 }), // @username for Instagram, email for Google
    // Platform-Specific Access Token (for Page Access Tokens, etc.)
    encryptedAccessToken: (0, pg_core_1.text)("encrypted_access_token"), // Encrypted Page Access Token (Meta) or account-specific token
    tokenExpiresAt: (0, pg_core_1.timestamp)("token_expires_at"), // null = never expires (Meta Page tokens)
    // Account Metadata
    accountMetadata: (0, pg_core_1.jsonb)("account_metadata").default({}), // Followers, profile pic, additional info
    linkedAccounts: (0, pg_core_1.jsonb)("linked_accounts").default([]), // e.g., IG account linked to FB Page: [{type: 'instagram_business', id: 'xxx'}]
    // Permissions & Status
    grantedPermissions: (0, pg_core_1.text)("granted_permissions").array(), // Specific permissions for this account
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false).notNull(), // Mark one account as primary/default
    // Audit & Lifecycle
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastSyncedAt: (0, pg_core_1.timestamp)("last_synced_at"), // Last time account data was synced
    removedAt: (0, pg_core_1.timestamp)("removed_at"), // Soft delete when user removes account
}, (table) => ({
    tenantIndex: (0, pg_core_1.index)("mcp_connected_accounts_tenant_idx").on(table.tenantId),
    credentialIndex: (0, pg_core_1.index)("mcp_connected_accounts_credential_idx").on(table.credentialId),
    accountTypeIndex: (0, pg_core_1.index)("mcp_connected_accounts_type_idx").on(table.accountType),
    platformAccountIndex: (0, pg_core_1.index)("mcp_connected_accounts_platform_id_idx").on(table.platformAccountId),
    // Unique: one account per credential (prevent duplicate page connections)
    credentialPlatformAccountUnique: (0, pg_core_1.uniqueIndex)("mcp_connected_accounts_credential_platform_unique").on(table.credentialId, table.platformAccountId),
}));
// MCP Tool Schemas - Cached tool schemas for performance & offline access
exports.mcpToolSchemas = exports.w3suiteSchema.table("mcp_tool_schemas", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    serverId: (0, pg_core_1.uuid)("server_id").references(() => exports.mcpServers.id, { onDelete: 'cascade' }).notNull(),
    // Tool Identification
    toolName: (0, pg_core_1.varchar)("tool_name", { length: 100 }).notNull(), // e.g., 'gmail-send', 'instagram-publish'
    displayName: (0, pg_core_1.varchar)("display_name", { length: 255 }),
    description: (0, pg_core_1.text)("description"),
    category: (0, exports.mcpToolCategoryEnum)("category").default('other'),
    // JSON Schema Definition (from MCP server)
    inputSchema: (0, pg_core_1.jsonb)("input_schema").notNull(), // Zod-compatible JSON schema for inputs
    outputSchema: (0, pg_core_1.jsonb)("output_schema"), // Expected output schema
    // Tool Metadata
    examples: (0, pg_core_1.jsonb)("examples").default([]), // Example usage for AI agents
    tags: (0, pg_core_1.text)("tags").array(), // Searchable tags
    // Sync & Cache Management
    lastSyncedAt: (0, pg_core_1.timestamp)("last_synced_at").notNull(),
    syncVersion: (0, pg_core_1.varchar)("sync_version", { length: 50 }), // MCP server version
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    serverIndex: (0, pg_core_1.index)("mcp_tool_schemas_server_idx").on(table.serverId),
    categoryIndex: (0, pg_core_1.index)("mcp_tool_schemas_category_idx").on(table.category),
    // Unique: one schema per tool per server
    toolNameUnique: (0, pg_core_1.uniqueIndex)("mcp_tool_schemas_server_tool_unique").on(table.serverId, table.toolName),
    lastSyncedIndex: (0, pg_core_1.index)("mcp_tool_schemas_synced_idx").on(table.lastSyncedAt),
}));
// ==================== VECTOR EMBEDDINGS SYSTEM (pgvector) ====================
// Enterprise-grade vector storage with multi-tenant RLS isolation
// Vector Embeddings Enums
exports.vectorSourceTypeEnum = (0, pg_core_1.pgEnum)('vector_source_type', [
    'document', 'knowledge_base', 'chat_history', 'policy', 'training_material',
    'product_catalog', 'customer_data', 'financial_report', 'hr_document',
    'url_content', 'pdf_document', 'image', 'audio_transcript', 'video_transcript'
]);
exports.vectorStatusEnum = (0, pg_core_1.pgEnum)('vector_status', ['pending', 'processing', 'ready', 'failed', 'archived']);
exports.embeddingModelEnum = (0, pg_core_1.pgEnum)('embedding_model', [
    'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'
]);
// Cross-tenant RAG Origin - CRITICO per distinguere brand vs tenant knowledge
exports.vectorOriginEnum = (0, pg_core_1.pgEnum)('vector_origin', ['brand', 'tenant']);
// Media Type Enum for multimodal content
exports.mediaTypeEnum = (0, pg_core_1.pgEnum)('media_type', [
    'text', 'pdf', 'image', 'audio', 'video', 'url', 'document'
]);
// Extraction Method Enum for processing
exports.extractionMethodEnum = (0, pg_core_1.pgEnum)('extraction_method', [
    'native', 'ocr', 'transcription', 'vision_api', 'pdf_parse', 'web_scrape'
]);
// Vector Embeddings - Core table for storing document embeddings with pgvector
exports.vectorEmbeddings = exports.w3suiteSchema.table("vector_embeddings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    // 🎯 CROSS-TENANT RAG: Brand vs Tenant distinction
    origin: (0, exports.vectorOriginEnum)("origin").notNull(), // 'brand' = Brand Interface, 'tenant' = Tenant specific
    agentId: (0, pg_core_1.varchar)("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales')
    // Source Reference
    sourceType: (0, exports.vectorSourceTypeEnum)("source_type").notNull(),
    sourceId: (0, pg_core_1.uuid)("source_id"), // Reference to original document/entity
    sourceUrl: (0, pg_core_1.text)("source_url"), // Optional URL reference
    // Content & Embeddings (pgvector support)
    contentChunk: (0, pg_core_1.text)("content_chunk").notNull(), // Original text chunk
    embedding: vector("embedding"), // OpenAI embedding dimension (1536 for text-embedding-3-small)
    embeddingModel: (0, exports.embeddingModelEnum)("embedding_model").notNull(),
    // Multimedia Support
    mediaType: (0, exports.mediaTypeEnum)("media_type").default('text').notNull(),
    extractionMethod: (0, exports.extractionMethodEnum)("extraction_method"),
    originalFileName: (0, pg_core_1.varchar)("original_file_name", { length: 255 }),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 100 }),
    // Metadata & Search Optimization
    metadata: (0, pg_core_1.jsonb)("metadata").default({}).notNull(), // Searchable metadata with media-specific info
    tags: (0, pg_core_1.text)("tags").array(), // Search tags array
    language: (0, pg_core_1.varchar)("language", { length: 10 }).default('it'), // Language code
    // Temporal Metadata (for audio/video)
    startTime: (0, pg_core_1.real)("start_time"), // Start time in seconds for audio/video chunks
    endTime: (0, pg_core_1.real)("end_time"), // End time in seconds for audio/video chunks
    duration: (0, pg_core_1.real)("duration"), // Duration in seconds
    // Visual Metadata (for images)
    imageAnalysis: (0, pg_core_1.jsonb)("image_analysis"), // GPT-4 Vision analysis results
    detectedObjects: (0, pg_core_1.text)("detected_objects").array(), // Objects/entities detected
    imageResolution: (0, pg_core_1.varchar)("image_resolution", { length: 50 }), // e.g., "1920x1080"
    // Security & Access Control
    accessLevel: (0, pg_core_1.varchar)("access_level", { length: 50 }).default('private'), // public, private, restricted
    ownerUserId: (0, pg_core_1.varchar)("owner_user_id").references(() => exports.users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
    departmentRestriction: (0, pg_core_1.varchar)("department_restriction", { length: 100 }), // HR, Finance, etc.
    // Performance & Status
    chunkIndex: (0, pg_core_1.integer)("chunk_index").default(0), // Position in document
    chunkTotal: (0, pg_core_1.integer)("chunk_total").default(1), // Total chunks for document
    tokenCount: (0, pg_core_1.integer)("token_count").notNull(), // Tokens in chunk
    status: (0, exports.vectorStatusEnum)("status").default('pending').notNull(),
    // Audit & Lifecycle
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    lastAccessedAt: (0, pg_core_1.timestamp)("last_accessed_at"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // For retention policies
    processingTimeMs: (0, pg_core_1.integer)("processing_time_ms"), // Time to generate embedding
    // Training & Validation
    isValidated: (0, pg_core_1.boolean)("is_validated").default(false), // User validated for training
    validationScore: (0, pg_core_1.real)("validation_score"), // Quality score from validation
    validatedBy: (0, pg_core_1.varchar)("validated_by"), // User who validated
    validatedAt: (0, pg_core_1.timestamp)("validated_at") // When validation occurred
}, (table) => ({
    // Indexes for performance and search
    tenantIndex: (0, pg_core_1.index)("vector_embeddings_tenant_idx").on(table.tenantId),
    sourceIndex: (0, pg_core_1.index)("vector_embeddings_source_idx").on(table.sourceType, table.sourceId),
    statusIndex: (0, pg_core_1.index)("vector_embeddings_status_idx").on(table.status),
    ownerIndex: (0, pg_core_1.index)("vector_embeddings_owner_idx").on(table.ownerUserId),
    expiresIndex: (0, pg_core_1.index)("vector_embeddings_expires_idx").on(table.expiresAt),
    // 🎯 CROSS-TENANT RAG INDEXES: Performance critici per ricerca combinata brand+tenant
    crossTenantAgentIndex: (0, pg_core_1.index)("vector_embeddings_cross_tenant_agent_idx").on(table.origin, table.agentId),
    tenantAgentIndex: (0, pg_core_1.index)("vector_embeddings_tenant_agent_idx").on(table.tenantId, table.agentId),
    agentStatusIndex: (0, pg_core_1.index)("vector_embeddings_agent_status_idx").on(table.agentId, table.status),
    // Note: HNSW index for vector similarity will be created via SQL migration
}));
// Vector Search Queries - Audit and performance tracking
exports.vectorSearchQueries = exports.w3suiteSchema.table("vector_search_queries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }).notNull(), // VARCHAR for OAuth2 compatibility
    // Query Details
    queryText: (0, pg_core_1.text)("query_text").notNull(),
    queryEmbedding: vector("query_embedding"), // Store query embedding for analysis
    queryType: (0, pg_core_1.varchar)("query_type", { length: 50 }), // semantic, hybrid, filtered
    // Search Parameters
    searchFilters: (0, pg_core_1.jsonb)("search_filters").default({}).notNull(),
    maxResults: (0, pg_core_1.integer)("max_results").default(10),
    similarityThreshold: (0, pg_core_1.real)("similarity_threshold"), // Minimum similarity score
    // Results Metadata
    resultsReturned: (0, pg_core_1.integer)("results_returned").default(0),
    topScore: (0, pg_core_1.real)("top_score"), // Best similarity score
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms").notNull(),
    // Context & Purpose
    searchContext: (0, pg_core_1.varchar)("search_context", { length: 100 }), // hr_search, document_qa, etc.
    moduleContext: (0, pg_core_1.varchar)("module_context", { length: 50 }), // hr, finance, general
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    tenantUserIndex: (0, pg_core_1.index)("vector_search_queries_tenant_user_idx").on(table.tenantId, table.userId),
    timestampIndex: (0, pg_core_1.index)("vector_search_queries_timestamp_idx").on(table.createdAt),
    contextIndex: (0, pg_core_1.index)("vector_search_queries_context_idx").on(table.searchContext),
}));
// Vector Collections - Logical groupings of embeddings
exports.vectorCollections = exports.w3suiteSchema.table("vector_collections", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    // Collection Info
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    collectionType: (0, pg_core_1.varchar)("collection_type", { length: 50 }).notNull(), // knowledge_base, policies, etc.
    // Settings & Configuration
    embeddingModel: (0, exports.embeddingModelEnum)("embedding_model").notNull(),
    chunkingStrategy: (0, pg_core_1.jsonb)("chunking_strategy").default({
        method: 'sliding_window',
        chunk_size: 1000,
        overlap: 200
    }).notNull(),
    // Access Control
    isPublic: (0, pg_core_1.boolean)("is_public").default(false).notNull(),
    allowedRoles: (0, pg_core_1.text)("allowed_roles").array(), // Role-based access
    departmentScope: (0, pg_core_1.varchar)("department_scope", { length: 100 }),
    // Statistics
    totalEmbeddings: (0, pg_core_1.integer)("total_embeddings").default(0).notNull(),
    totalTokens: (0, pg_core_1.integer)("total_tokens").default(0).notNull(),
    lastUpdatedAt: (0, pg_core_1.timestamp)("last_updated_at").defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
}, (table) => ({
    tenantNameIndex: (0, pg_core_1.uniqueIndex)("vector_collections_tenant_name_idx").on(table.tenantId, table.name),
    typeIndex: (0, pg_core_1.index)("vector_collections_type_idx").on(table.collectionType),
}));
// AI Training Sessions - Track training and validation activities
exports.aiTrainingSessions = exports.w3suiteSchema.table("ai_training_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").references(() => exports.tenants.id, { onDelete: 'cascade' }).notNull(),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }).notNull(),
    // 🎯 AGENT LINKAGE: Critical for agent-specific RAG content
    agentId: (0, pg_core_1.varchar)("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales', 'workflow-assistant')
    // Session Info
    sessionType: (0, pg_core_1.varchar)("session_type", { length: 50 }).notNull(), // validation, url_import, media_upload
    sessionStatus: (0, pg_core_1.varchar)("session_status", { length: 50 }).default('active').notNull(), // active, completed, failed
    // Training Data
    sourceUrl: (0, pg_core_1.text)("source_url"), // For URL imports
    sourceFile: (0, pg_core_1.text)("source_file"), // For file uploads
    contentType: (0, pg_core_1.varchar)("content_type", { length: 100 }), // MIME type
    // Processing Details
    totalChunks: (0, pg_core_1.integer)("total_chunks").default(0),
    processedChunks: (0, pg_core_1.integer)("processed_chunks").default(0),
    failedChunks: (0, pg_core_1.integer)("failed_chunks").default(0),
    // Validation Data (for response validation sessions)
    originalQuery: (0, pg_core_1.text)("original_query"),
    originalResponse: (0, pg_core_1.text)("original_response"),
    correctedResponse: (0, pg_core_1.text)("corrected_response"),
    validationFeedback: (0, pg_core_1.jsonb)("validation_feedback"),
    // Metrics
    processingTimeMs: (0, pg_core_1.integer)("processing_time_ms"),
    tokensProcessed: (0, pg_core_1.integer)("tokens_processed").default(0),
    embeddingsCreated: (0, pg_core_1.integer)("embeddings_created").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
}, (table) => ({
    tenantUserIndex: (0, pg_core_1.index)("ai_training_sessions_tenant_user_idx").on(table.tenantId, table.userId),
    statusIndex: (0, pg_core_1.index)("ai_training_sessions_status_idx").on(table.sessionStatus),
    typeIndex: (0, pg_core_1.index)("ai_training_sessions_type_idx").on(table.sessionType),
    timestampIndex: (0, pg_core_1.index)("ai_training_sessions_timestamp_idx").on(table.createdAt),
    // 🎯 AGENT-SPECIFIC INDEXES: Performance critical for agent RAG queries  
    agentIndex: (0, pg_core_1.index)("ai_training_sessions_agent_idx").on(table.agentId),
    tenantAgentIndex: (0, pg_core_1.index)("ai_training_sessions_tenant_agent_idx").on(table.tenantId, table.agentId),
    agentStatusIndex: (0, pg_core_1.index)("ai_training_sessions_agent_status_idx").on(table.agentId, table.sessionStatus),
}));
// AI System Relations
exports.aiSettingsRelations = (0, drizzle_orm_1.relations)(exports.aiSettings, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.aiSettings.tenantId], references: [exports.tenants.id] }),
}));
exports.aiUsageLogsRelations = (0, drizzle_orm_1.relations)(exports.aiUsageLogs, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.aiUsageLogs.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.aiUsageLogs.userId], references: [exports.users.id] }),
}));
exports.aiAgentTenantSettingsRelations = (0, drizzle_orm_1.relations)(exports.aiAgentTenantSettings, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.aiAgentTenantSettings.tenantId], references: [exports.tenants.id] }),
}));
exports.aiConversationsRelations = (0, drizzle_orm_1.relations)(exports.aiConversations, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.aiConversations.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.aiConversations.userId], references: [exports.users.id] }),
}));
// Lead Routing AI Relations
exports.leadRoutingHistoryRelations = (0, drizzle_orm_1.relations)(exports.leadRoutingHistory, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.leadRoutingHistory.tenantId], references: [exports.tenants.id] }),
    lead: one(exports.crmLeads, { fields: [exports.leadRoutingHistory.leadId], references: [exports.crmLeads.id] }),
    driver: one(public_1.drivers, { fields: [exports.leadRoutingHistory.recommendedDriver], references: [public_1.drivers.id] }),
    pipeline: one(exports.crmPipelines, { fields: [exports.leadRoutingHistory.targetPipelineId], references: [exports.crmPipelines.id] }),
}));
exports.leadAiInsightsRelations = (0, drizzle_orm_1.relations)(exports.leadAiInsights, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.leadAiInsights.tenantId], references: [exports.tenants.id] }),
    lead: one(exports.crmLeads, { fields: [exports.leadAiInsights.leadId], references: [exports.crmLeads.id] }),
}));
// Vector Embeddings Relations
exports.vectorEmbeddingsRelations = (0, drizzle_orm_1.relations)(exports.vectorEmbeddings, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.vectorEmbeddings.tenantId], references: [exports.tenants.id] }),
    owner: one(exports.users, { fields: [exports.vectorEmbeddings.ownerUserId], references: [exports.users.id] }),
}));
exports.vectorSearchQueriesRelations = (0, drizzle_orm_1.relations)(exports.vectorSearchQueries, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.vectorSearchQueries.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.vectorSearchQueries.userId], references: [exports.users.id] }),
}));
exports.vectorCollectionsRelations = (0, drizzle_orm_1.relations)(exports.vectorCollections, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.vectorCollections.tenantId], references: [exports.tenants.id] }),
    createdBy: one(exports.users, { fields: [exports.vectorCollections.createdBy], references: [exports.users.id] }),
}));
exports.aiTrainingSessionsRelations = (0, drizzle_orm_1.relations)(exports.aiTrainingSessions, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.aiTrainingSessions.tenantId], references: [exports.tenants.id] }),
    user: one(exports.users, { fields: [exports.aiTrainingSessions.userId], references: [exports.users.id] }),
}));
// MCP System Relations
exports.mcpServersRelations = (0, drizzle_orm_1.relations)(exports.mcpServers, ({ one, many }) => ({
    tenant: one(exports.tenants, { fields: [exports.mcpServers.tenantId], references: [exports.tenants.id] }),
    createdBy: one(exports.users, { fields: [exports.mcpServers.createdBy], references: [exports.users.id] }),
    credentials: many(exports.mcpServerCredentials),
    toolSchemas: many(exports.mcpToolSchemas),
}));
exports.mcpServerCredentialsRelations = (0, drizzle_orm_1.relations)(exports.mcpServerCredentials, ({ one }) => ({
    tenant: one(exports.tenants, { fields: [exports.mcpServerCredentials.tenantId], references: [exports.tenants.id] }),
    server: one(exports.mcpServers, { fields: [exports.mcpServerCredentials.serverId], references: [exports.mcpServers.id] }),
    createdBy: one(exports.users, { fields: [exports.mcpServerCredentials.createdBy], references: [exports.users.id] }),
}));
exports.mcpToolSchemasRelations = (0, drizzle_orm_1.relations)(exports.mcpToolSchemas, ({ one }) => ({
    server: one(exports.mcpServers, { fields: [exports.mcpToolSchemas.serverId], references: [exports.mcpServers.id] }),
}));
// AI Insert Schemas and Types
exports.insertAISettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Lead Routing AI Insert Schemas and Types
exports.insertLeadRoutingHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadRoutingHistory).omit({
    id: true,
    createdAt: true
});
exports.insertLeadAiInsightsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadAiInsights).omit({
    id: true,
    createdAt: true
});
exports.insertAIUsageLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiUsageLogs).omit({
    id: true,
    requestTimestamp: true
});
exports.insertAIConversationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiConversations).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Vector Embeddings Insert Schemas and Types
exports.insertVectorEmbeddingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.vectorEmbeddings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastAccessedAt: true
});
exports.insertVectorSearchQuerySchema = (0, drizzle_zod_1.createInsertSchema)(exports.vectorSearchQueries).omit({
    id: true,
    createdAt: true
});
exports.insertVectorCollectionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.vectorCollections).omit({
    id: true,
    createdAt: true,
    lastUpdatedAt: true
});
exports.insertAITrainingSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiTrainingSessions).omit({
    id: true,
    createdAt: true,
    completedAt: true
});
// ==================== MCP SYSTEM INSERT SCHEMAS ====================
exports.insertMCPServerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mcpServers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastHealthCheck: true,
    errorCount: true,
    archivedAt: true
});
exports.insertMCPServerCredentialSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mcpServerCredentials).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastUsedAt: true,
    revokedAt: true
});
exports.insertMCPToolSchemaSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mcpToolSchemas).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== TASK SYSTEM INSERT SCHEMAS ====================
exports.insertTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.tasks).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
    archivedAt: true,
    actualHours: true,
    completionPercentage: true
});
exports.insertTaskAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskAssignments).omit({
    id: true,
    assignedAt: true
});
exports.insertTaskChecklistItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskChecklistItems).omit({
    id: true,
    createdAt: true,
    completedAt: true,
    completedBy: true
});
exports.insertTaskCommentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskComments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isEdited: true,
    deletedAt: true
});
exports.insertTaskTimeLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskTimeLogs).omit({
    id: true,
    createdAt: true,
    duration: true
});
exports.insertTaskDependencySchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskDependencies).omit({
    id: true,
    createdAt: true
});
exports.insertTaskAttachmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskAttachments).omit({
    id: true,
    uploadedAt: true
});
exports.insertTaskTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.taskTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastInstantiatedAt: true
});
// ==================== CHAT SYSTEM INSERT SCHEMAS ====================
exports.insertChatChannelSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatChannels).omit({
    id: true,
    createdAt: true
});
exports.insertChatChannelMemberSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatChannelMembers).omit({
    id: true,
    joinedAt: true,
    lastReadAt: true
});
exports.insertChatMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatMessages).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isEdited: true,
    deletedAt: true
});
exports.insertChatTypingIndicatorSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatTypingIndicators).omit({
    id: true,
    startedAt: true
});
// ==================== ACTIVITY FEED INSERT SCHEMAS ====================
exports.insertActivityFeedEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.activityFeedEvents).omit({
    id: true,
    createdAt: true
});
exports.insertActivityFeedInteractionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.activityFeedInteractions).omit({
    id: true,
    createdAt: true
});
// ==================== CRM SYSTEM TABLES ====================
// CRM Person Identities - Atomic identity deduplication table
exports.crmPersonIdentities = exports.w3suiteSchema.table("crm_person_identities", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    personId: (0, pg_core_1.uuid)("person_id").notNull(),
    identifierType: (0, exports.crmIdentifierTypeEnum)("identifier_type").notNull(),
    identifierValue: (0, pg_core_1.varchar)("identifier_value", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    tenantTypeValueUniq: (0, pg_core_1.uniqueIndex)("crm_person_identities_tenant_type_value_uniq").on(table.tenantId, table.identifierType, table.identifierValue),
    personIdIdx: (0, pg_core_1.index)("crm_person_identities_person_id_idx").on(table.personId),
    tenantIdIdx: (0, pg_core_1.index)("crm_person_identities_tenant_id_idx").on(table.tenantId),
}));
// CRM Campaigns - Marketing containers (STORE-LEVEL SCOPE ONLY)
exports.crmCampaigns = exports.w3suiteSchema.table("crm_campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    storeId: (0, pg_core_1.uuid)("store_id").notNull(), // Store-level scope (obbligatorio)
    isBrandTemplate: (0, pg_core_1.boolean)("is_brand_template").default(false),
    brandCampaignId: (0, pg_core_1.uuid)("brand_campaign_id"),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    type: (0, exports.crmCampaignTypeEnum)("type").notNull(),
    status: (0, exports.crmCampaignStatusEnum)("status").default('draft'),
    objective: (0, pg_core_1.integer)("objective"), // Target numero lead
    targetDriverIds: (0, pg_core_1.uuid)("target_driver_ids").array(), // Multi-driver support (FISSO, MOBILE, DEVICE, etc.)
    brandSourceType: (0, pg_core_1.varchar)("brand_source_type", { length: 50 }).default('tenant_only'), // 'tenant_only' | 'brand_derived'
    requiredConsents: (0, pg_core_1.jsonb)("required_consents"), // { privacy_policy: true, marketing: false, profiling: true, third_party: false }
    landingPageUrl: (0, pg_core_1.text)("landing_page_url"),
    channels: (0, pg_core_1.text)("channels").array(), // Array canali: phone, whatsapp, form, social, email, qr
    externalCampaignId: (0, pg_core_1.varchar)("external_campaign_id", { length: 255 }), // Powerful API campaign ID
    defaultLeadSource: (0, exports.leadSourceEnum)("default_lead_source"), // Default source for leads
    // 🎯 ROUTING & WORKFLOWS UNIFICATO
    routingMode: (0, pg_core_1.varchar)("routing_mode", { length: 20 }), // 'automatic' | 'manual'
    // AUTOMATIC MODE - Workflow + Fallback
    workflowId: (0, pg_core_1.uuid)("workflow_id"), // Workflow che esegue la logica (può includere nodo routing pipeline)
    fallbackTimeoutSeconds: (0, pg_core_1.integer)("fallback_timeout_seconds"), // Timeout in secondi prima del fallback
    fallbackPipelineId1: (0, pg_core_1.uuid)("fallback_pipeline_id1"), // Pipeline 1 per fallback automatico
    fallbackPipelineId2: (0, pg_core_1.uuid)("fallback_pipeline_id2"), // Pipeline 2 per fallback automatico
    // MANUAL MODE - Pipeline preselezionate
    manualPipelineId1: (0, pg_core_1.uuid)("manual_pipeline_id1"), // Pipeline 1 per assegnazione manuale
    manualPipelineId2: (0, pg_core_1.uuid)("manual_pipeline_id2"), // Pipeline 2 per assegnazione manuale
    // AI CONTROLS (entrambe le modalità)
    enableAIScoring: (0, pg_core_1.boolean)("enable_ai_scoring").default(false), // Abilita AI Lead Scoring (per manual e automatic)
    enableAIRouting: (0, pg_core_1.boolean)("enable_ai_routing").default(false), // Abilita AI Routing (solo per automatic, workflow può sovrascrivere)
    // NOTIFICHE (entrambe le modalità)
    notifyTeamId: (0, pg_core_1.uuid)("notify_team_id"), // Team da notificare
    notifyUserIds: (0, pg_core_1.uuid)("notify_user_ids").array(), // Array di user ID da notificare
    budget: (0, pg_core_1.real)("budget"),
    startDate: (0, pg_core_1.timestamp)("start_date"),
    endDate: (0, pg_core_1.timestamp)("end_date"),
    utmSourceId: (0, pg_core_1.uuid)("utm_source_id"), // DEPRECATED: Use marketingChannels array instead
    utmMediumId: (0, pg_core_1.uuid)("utm_medium_id"), // DEPRECATED: Use marketingChannels array instead
    utmCampaign: (0, pg_core_1.varchar)("utm_campaign", { length: 255 }),
    marketingChannels: (0, pg_core_1.text)("marketing_channels").array(), // Active channels: ['facebook_ads', 'instagram', 'google_ads', 'email', 'whatsapp']
    attributionWindowDays: (0, pg_core_1.integer)("attribution_window_days").default(30), // Attribution window (default 30 days)
    totalLeads: (0, pg_core_1.integer)("total_leads").default(0),
    totalDeals: (0, pg_core_1.integer)("total_deals").default(0),
    totalRevenue: (0, pg_core_1.real)("total_revenue").default(0),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantStatusStartIdx: (0, pg_core_1.index)("crm_campaigns_tenant_status_start_idx").on(table.tenantId, table.status, table.startDate),
    tenantIdIdx: (0, pg_core_1.index)("crm_campaigns_tenant_id_idx").on(table.tenantId),
    storeIdIdx: (0, pg_core_1.index)("crm_campaigns_store_id_idx").on(table.storeId),
}));
// Campaign Social Accounts - Link campagne a account social MCP (Facebook Pages, Instagram, LinkedIn)
exports.campaignSocialAccounts = exports.w3suiteSchema.table("campaign_social_accounts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id, { onDelete: 'cascade' }),
    mcpAccountId: (0, pg_core_1.uuid)("mcp_account_id").notNull().references(() => exports.mcpConnectedAccounts.id, { onDelete: 'cascade' }),
    platform: (0, pg_core_1.varchar)("platform", { length: 50 }).notNull(), // 'facebook', 'instagram', 'linkedin', 'google', etc.
    externalCampaignId: (0, pg_core_1.varchar)("external_campaign_id", { length: 255 }), // Campaign ID on the platform (FB Campaign ID, LinkedIn Campaign URN)
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("campaign_social_accounts_tenant_id_idx").on(table.tenantId),
    campaignIdIdx: (0, pg_core_1.index)("campaign_social_accounts_campaign_id_idx").on(table.campaignId),
    mcpAccountIdIdx: (0, pg_core_1.index)("campaign_social_accounts_mcp_account_id_idx").on(table.mcpAccountId),
    externalCampaignIdIdx: (0, pg_core_1.index)("campaign_social_accounts_external_campaign_id_idx").on(table.externalCampaignId),
    uniqueCampaignMcpAccount: (0, pg_core_1.uniqueIndex)("campaign_social_accounts_campaign_mcp_unique").on(table.campaignId, table.mcpAccountId),
}));
exports.insertCampaignSocialAccountSchema = (0, drizzle_zod_1.createInsertSchema)(exports.campaignSocialAccounts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// CRM Leads - Lead con person_id auto-generated (match su email/phone/social)
exports.crmLeads = exports.w3suiteSchema.table("crm_leads", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id"),
    storeId: (0, pg_core_1.uuid)("store_id").notNull(),
    personId: (0, pg_core_1.uuid)("person_id").notNull(), // Auto-generated UUID for identity tracking
    ownerUserId: (0, pg_core_1.varchar)("owner_user_id"),
    campaignId: (0, pg_core_1.uuid)("campaign_id").references(() => exports.crmCampaigns.id),
    sourceChannel: (0, exports.crmInboundChannelEnum)("source_channel"), // INBOUND: Lead acquisition source
    sourceSocialAccountId: (0, pg_core_1.uuid)("source_social_account_id"),
    status: (0, exports.crmLeadStatusEnum)("status").default('new'),
    leadScore: (0, pg_core_1.smallint)("lead_score").default(0), // 0-100
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    companyName: (0, pg_core_1.varchar)("company_name", { length: 255 }),
    productInterest: (0, pg_core_1.varchar)("product_interest", { length: 255 }),
    driverId: (0, pg_core_1.uuid)("driver_id").references(() => public_1.drivers.id),
    notes: (0, pg_core_1.text)("notes"),
    utmSource: (0, pg_core_1.varchar)("utm_source", { length: 255 }),
    utmMedium: (0, pg_core_1.varchar)("utm_medium", { length: 255 }),
    utmCampaign: (0, pg_core_1.varchar)("utm_campaign", { length: 255 }),
    // UTM Normalized Foreign Keys (for analytics and reporting)
    utmSourceId: (0, pg_core_1.uuid)("utm_source_id").references(() => public_1.utmSources.id),
    utmMediumId: (0, pg_core_1.uuid)("utm_medium_id").references(() => public_1.utmMediums.id),
    utmContent: (0, pg_core_1.varchar)("utm_content", { length: 255 }),
    utmTerm: (0, pg_core_1.varchar)("utm_term", { length: 255 }),
    landingPageUrl: (0, pg_core_1.text)("landing_page_url"),
    referrerUrl: (0, pg_core_1.text)("referrer_url"),
    eventName: (0, pg_core_1.varchar)("event_name", { length: 255 }),
    eventSource: (0, pg_core_1.text)("event_source"),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }),
    clientIpAddress: (0, pg_core_1.varchar)("client_ip_address", { length: 45 }),
    privacyPolicyAccepted: (0, pg_core_1.boolean)("privacy_policy_accepted").default(false),
    marketingConsent: (0, pg_core_1.boolean)("marketing_consent").default(false),
    profilingConsent: (0, pg_core_1.boolean)("profiling_consent").default(false),
    thirdPartyConsent: (0, pg_core_1.boolean)("third_party_consent").default(false),
    consentTimestamp: (0, pg_core_1.timestamp)("consent_timestamp"),
    consentSource: (0, pg_core_1.varchar)("consent_source", { length: 255 }),
    rawEventPayload: (0, pg_core_1.jsonb)("raw_event_payload"),
    // ==================== SLA & DATE RANGE MANAGEMENT ====================
    campaignValidUntil: (0, pg_core_1.timestamp)("campaign_valid_until"), // Eredita end_date dalla campagna (offerta scade con campagna)
    validUntil: (0, pg_core_1.timestamp)("valid_until"), // Scadenza PERSONALE lead (diverso da campaignValidUntil)
    slaDeadline: (0, pg_core_1.timestamp)("sla_deadline"), // Deadline gestione interna (es: created_at + 7 giorni)
    slaConfig: (0, pg_core_1.jsonb)("sla_config"), // Configurazione SLA { default_days: 7, urgent_days: 2, high_value_days: 3 }
    // ==================== POWERFUL API INTEGRATION ====================
    externalLeadId: (0, pg_core_1.varchar)("external_lead_id", { length: 255 }), // Powerful API lead ID
    leadSource: (0, exports.leadSourceEnum)("lead_source"), // Source: manual, web_form, powerful_api, landing_page, csv_import
    // ==================== FASE 1: GTM TRACKING ====================
    gtmClientId: (0, pg_core_1.varchar)("gtm_client_id", { length: 255 }), // GA Client ID univoco
    gtmSessionId: (0, pg_core_1.varchar)("gtm_session_id", { length: 255 }), // Session ID corrente
    gtmUserId: (0, pg_core_1.varchar)("gtm_user_id", { length: 255 }), // User ID cross-device
    gtmEvents: (0, pg_core_1.jsonb)("gtm_events"), // Array completo eventi GTM
    gtmProductsViewed: (0, pg_core_1.text)("gtm_products_viewed").array(), // Prodotti visualizzati
    gtmConversionEvents: (0, pg_core_1.text)("gtm_conversion_events").array(), // Eventi conversione
    gtmGoalsCompleted: (0, pg_core_1.text)("gtm_goals_completed").array(), // Obiettivi GA completati
    // ==================== FASE 1: MULTI-PDV TRACKING ====================
    originStoreId: (0, pg_core_1.uuid)("origin_store_id"), // PDV che ha generato il lead
    originStoreName: (0, pg_core_1.varchar)("origin_store_name", { length: 255 }), // Nome store per reporting
    storesVisited: (0, pg_core_1.text)("stores_visited").array(), // Lista PDV visitati
    storeInteractions: (0, pg_core_1.jsonb)("store_interactions"), // Interazioni dettagliate per store
    preferredStoreId: (0, pg_core_1.uuid)("preferred_store_id"), // Store preferito dal cliente
    nearestStoreId: (0, pg_core_1.uuid)("nearest_store_id"), // Store più vicino geograficamente
    // ==================== FASE 1: SOCIAL & FORM TRACKING ====================
    socialProfiles: (0, pg_core_1.jsonb)("social_profiles"), // Profili social collegati {facebook:{}, instagram:{}}
    socialInteractionsByStore: (0, pg_core_1.jsonb)("social_interactions_by_store"), // Interazioni social per PDV
    socialCampaignResponses: (0, pg_core_1.jsonb)("social_campaign_responses").array(), // Array risposte campagne
    formsSubmitted: (0, pg_core_1.jsonb)("forms_submitted").array(), // Form compilati con tutti i dettagli
    totalFormsStarted: (0, pg_core_1.integer)("total_forms_started").default(0),
    totalFormsCompleted: (0, pg_core_1.integer)("total_forms_completed").default(0),
    formCompletionRate: (0, pg_core_1.real)("form_completion_rate"),
    averageFormTime: (0, pg_core_1.real)("average_form_time"), // Tempo medio in secondi
    // ==================== FASE 1: DOCUMENTI FISCALI ITALIANI ====================
    fiscalCode: (0, pg_core_1.varchar)("fiscal_code", { length: 16 }), // Codice Fiscale
    vatNumber: (0, pg_core_1.varchar)("vat_number", { length: 11 }), // Partita IVA
    documentType: (0, pg_core_1.varchar)("document_type", { length: 50 }), // CI/Patente/Passaporto
    documentNumber: (0, pg_core_1.varchar)("document_number", { length: 50 }),
    documentExpiry: (0, pg_core_1.date)("document_expiry"),
    pecEmail: (0, pg_core_1.varchar)("pec_email", { length: 255 }), // PEC certificata
    // ==================== FASE 2: CUSTOMER JOURNEY & ATTRIBUTION ====================
    customerJourney: (0, pg_core_1.jsonb)("customer_journey").array(), // Journey completo con touchpoints
    firstTouchAttribution: (0, pg_core_1.jsonb)("first_touch_attribution"),
    lastTouchAttribution: (0, pg_core_1.jsonb)("last_touch_attribution"),
    firstContactDate: (0, pg_core_1.timestamp)("first_contact_date"),
    lastContactDate: (0, pg_core_1.timestamp)("last_contact_date"),
    contactCount: (0, pg_core_1.integer)("contact_count").default(0),
    nextActionDate: (0, pg_core_1.date)("next_action_date"),
    nextActionType: (0, pg_core_1.varchar)("next_action_type", { length: 100 }),
    // ==================== UTM MULTI-TOUCH ATTRIBUTION ====================
    firstTouchUtmLinkId: (0, pg_core_1.uuid)("first_touch_utm_link_id"), // First UTM click
    lastTouchUtmLinkId: (0, pg_core_1.uuid)("last_touch_utm_link_id"), // Last UTM click (for revenue attribution)
    allTouchUtmLinkIds: (0, pg_core_1.uuid)("all_touch_utm_link_ids").array(), // Complete touchpoint history
    firstTouchAt: (0, pg_core_1.timestamp)("first_touch_at"), // First touchpoint timestamp
    lastTouchAt: (0, pg_core_1.timestamp)("last_touch_at"), // Last touchpoint timestamp
    // ==================== FASE 2: BUSINESS PROFILING ====================
    customerType: (0, exports.customerTypeEnum)("customer_type"), // B2B/B2C (usa enum esistente)
    companyRole: (0, pg_core_1.varchar)("company_role", { length: 100 }), // Ruolo in azienda
    companySize: (0, pg_core_1.varchar)("company_size", { length: 50 }), // Micro/Small/Medium/Large
    companySector: (0, pg_core_1.varchar)("company_sector", { length: 100 }), // Settore merceologico
    annualRevenue: (0, pg_core_1.real)("annual_revenue"), // Fatturato stimato
    employeeCount: (0, pg_core_1.integer)("employee_count"),
    budgetRange: (0, pg_core_1.jsonb)("budget_range"), // {min: 0, max: 1000}
    purchaseTimeframe: (0, pg_core_1.varchar)("purchase_timeframe", { length: 50 }), // Immediate/1month/3months/6months
    painPoints: (0, pg_core_1.text)("pain_points").array(), // Problemi da risolvere
    competitors: (0, pg_core_1.text)("competitors").array(), // Competitor attuali
    // ==================== FASE 2: INDIRIZZO COMPLETO ====================
    addressStreet: (0, pg_core_1.varchar)("address_street", { length: 255 }),
    addressNumber: (0, pg_core_1.varchar)("address_number", { length: 20 }),
    addressCity: (0, pg_core_1.varchar)("address_city", { length: 100 }),
    addressProvince: (0, pg_core_1.varchar)("address_province", { length: 2 }),
    addressPostalCode: (0, pg_core_1.varchar)("address_postal_code", { length: 5 }),
    addressCountry: (0, pg_core_1.varchar)("address_country", { length: 50 }),
    geoLat: (0, pg_core_1.real)("geo_lat"), // Latitudine
    geoLng: (0, pg_core_1.real)("geo_lng"), // Longitudine
    deliveryAddress: (0, pg_core_1.jsonb)("delivery_address"), // Indirizzo spedizione alternativo
    // ==================== FASE 3: ENGAGEMENT METRICS ====================
    pageViewsCount: (0, pg_core_1.integer)("page_views_count").default(0),
    emailsOpenedCount: (0, pg_core_1.integer)("emails_opened_count").default(0),
    emailsClickedCount: (0, pg_core_1.integer)("emails_clicked_count").default(0),
    documentsDownloaded: (0, pg_core_1.text)("documents_downloaded").array(),
    videosWatched: (0, pg_core_1.text)("videos_watched").array(),
    sessionDuration: (0, pg_core_1.integer)("session_duration"), // Durata sessione in secondi
    deviceType: (0, pg_core_1.varchar)("device_type", { length: 50 }), // Mobile/Desktop/Tablet
    browserInfo: (0, pg_core_1.jsonb)("browser_info"), // User agent e info browser
    engagementScore: (0, pg_core_1.real)("engagement_score"), // Score 0-100
    // ==================== FASE 3: CONVERSION TRACKING ====================
    convertedToCustomerId: (0, pg_core_1.uuid)("converted_to_customer_id"),
    conversionDate: (0, pg_core_1.timestamp)("conversion_date"),
    conversionValue: (0, pg_core_1.real)("conversion_value"), // Valore prima vendita
    lifecycleStage: (0, pg_core_1.varchar)("lifecycle_stage", { length: 50 }), // Subscriber/Lead/MQL/SQL/Opportunity/Customer
    conversionProbability: (0, pg_core_1.real)("conversion_probability"), // % probabilità conversione
    lostReason: (0, pg_core_1.varchar)("lost_reason", { length: 255 }), // Motivo perdita lead
    // ==================== FASE 3: AI ENRICHMENT ====================
    aiEnrichmentDate: (0, pg_core_1.timestamp)("ai_enrichment_date"),
    aiSentimentScore: (0, pg_core_1.real)("ai_sentiment_score"), // Sentiment analysis -1 to 1
    aiIntentSignals: (0, pg_core_1.text)("ai_intent_signals").array(), // Segnali intento rilevati
    aiPredictedValue: (0, pg_core_1.real)("ai_predicted_value"), // LTV predetto
    aiRecommendations: (0, pg_core_1.jsonb)("ai_recommendations"), // Suggerimenti AI per vendita
    // Timestamps e metadati
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    // Indici esistenti
    tenantStatusScoreCreatedIdx: (0, pg_core_1.index)("crm_leads_tenant_status_score_created_idx").on(table.tenantId, table.status, table.leadScore, table.createdAt),
    personIdIdx: (0, pg_core_1.index)("crm_leads_person_id_idx").on(table.personId),
    tenantIdIdx: (0, pg_core_1.index)("crm_leads_tenant_id_idx").on(table.tenantId),
    // ==================== NUOVI INDICI PER GTM & TRACKING ====================
    gtmClientIdx: (0, pg_core_1.index)("crm_leads_gtm_client_idx").on(table.gtmClientId),
    gtmSessionIdx: (0, pg_core_1.index)("crm_leads_gtm_session_idx").on(table.gtmSessionId),
    originStoreIdx: (0, pg_core_1.index)("crm_leads_origin_store_idx").on(table.originStoreId),
    // ==================== INDICI PER RICERCA E FILTRAGGIO ====================
    emailIdx: (0, pg_core_1.index)("crm_leads_email_idx").on(table.email),
    phoneIdx: (0, pg_core_1.index)("crm_leads_phone_idx").on(table.phone),
    fiscalCodeIdx: (0, pg_core_1.index)("crm_leads_fiscal_code_idx").on(table.fiscalCode),
    vatNumberIdx: (0, pg_core_1.index)("crm_leads_vat_number_idx").on(table.vatNumber),
    // ==================== INDICI PER PERFORMANCE QUERIES ====================
    campaignStatusIdx: (0, pg_core_1.index)("crm_leads_campaign_status_idx").on(table.campaignId, table.status),
    ownerStatusIdx: (0, pg_core_1.index)("crm_leads_owner_status_idx").on(table.ownerUserId, table.status),
    engagementScoreIdx: (0, pg_core_1.index)("crm_leads_engagement_score_idx").on(table.engagementScore),
    conversionDateIdx: (0, pg_core_1.index)("crm_leads_conversion_date_idx").on(table.conversionDate),
    // ==================== INDICI COMPOSITI PER ANALYTICS ====================
    tenantOriginStoreIdx: (0, pg_core_1.index)("crm_leads_tenant_origin_store_idx").on(table.tenantId, table.originStoreId),
    tenantCampaignIdx: (0, pg_core_1.index)("crm_leads_tenant_campaign_idx").on(table.tenantId, table.campaignId),
    tenantLifecycleIdx: (0, pg_core_1.index)("crm_leads_tenant_lifecycle_idx").on(table.tenantId, table.lifecycleStage),
}));
// ==================== LEAD STATUSES - Custom stati lead per campagna (categorie fisse, nomi personalizzabili) ====================
exports.leadStatuses = exports.w3suiteSchema.table("lead_statuses", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(), // Internal unique key
    displayName: (0, pg_core_1.varchar)("display_name", { length: 100 }).notNull(), // User-facing label
    category: (0, exports.leadStatusCategoryEnum)("category").notNull(), // new, working, qualified, converted, disqualified, on_hold
    color: (0, pg_core_1.varchar)("color", { length: 60 }).notNull(), // HSL format: hsl(210, 100%, 60%)
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false), // System default statuses cannot be deleted
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("lead_statuses_tenant_id_idx").on(table.tenantId),
    campaignIdIdx: (0, pg_core_1.index)("lead_statuses_campaign_id_idx").on(table.campaignId),
    campaignCategoryIdx: (0, pg_core_1.index)("lead_statuses_campaign_category_idx").on(table.campaignId, table.category),
    campaignNameUniq: (0, pg_core_1.uniqueIndex)("lead_statuses_campaign_name_uniq").on(table.campaignId, table.name),
}));
// ==================== LEAD STATUS HISTORY - Audit trail cambio stato ====================
exports.leadStatusHistory = exports.w3suiteSchema.table("lead_status_history", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id),
    leadId: (0, pg_core_1.uuid)("lead_id").notNull().references(() => exports.crmLeads.id, { onDelete: 'cascade' }),
    oldStatusId: (0, pg_core_1.uuid)("old_status_id").references(() => exports.leadStatuses.id),
    newStatusId: (0, pg_core_1.uuid)("new_status_id").notNull().references(() => exports.leadStatuses.id),
    oldStatusName: (0, pg_core_1.varchar)("old_status_name", { length: 100 }), // Snapshot for history
    newStatusName: (0, pg_core_1.varchar)("new_status_name", { length: 100 }).notNull(),
    notes: (0, pg_core_1.text)("notes"),
    changedBy: (0, pg_core_1.varchar)("changed_by").notNull().references(() => exports.users.id),
    changedAt: (0, pg_core_1.timestamp)("changed_at").defaultNow(),
}, (table) => ({
    leadIdIdx: (0, pg_core_1.index)("lead_status_history_lead_id_idx").on(table.leadId),
    tenantIdIdx: (0, pg_core_1.index)("lead_status_history_tenant_id_idx").on(table.tenantId),
    changedAtIdx: (0, pg_core_1.index)("lead_status_history_changed_at_idx").on(table.changedAt),
}));
// ==================== CRM FUNNELS - Customer Journey Orchestration ====================
// Funnel rappresenta la customer journey strategica che contiene multiple pipelines
exports.crmFunnels = exports.w3suiteSchema.table("crm_funnels", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Funnel Identity
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    color: (0, pg_core_1.varchar)("color", { length: 7 }).default('#3b82f6'), // Primary color for funnel visualization
    icon: (0, pg_core_1.varchar)("icon", { length: 50 }), // Lucide icon name
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    // Journey Configuration
    pipelineOrder: (0, pg_core_1.text)("pipeline_order").array(), // Array di pipeline IDs nell'ordine del journey
    expectedDurationDays: (0, pg_core_1.smallint)("expected_duration_days"), // Durata media attesa del journey completo
    // AI Journey Orchestration
    aiOrchestrationEnabled: (0, pg_core_1.boolean)("ai_orchestration_enabled").default(false).notNull(),
    aiJourneyInsights: (0, pg_core_1.jsonb)("ai_journey_insights"), // AI-generated insights: bottlenecks, optimizations, predictions
    aiNextBestActionRules: (0, pg_core_1.jsonb)("ai_next_best_action_rules"), // Rules per AI routing tra pipeline
    aiScoringWeights: (0, pg_core_1.jsonb)("ai_scoring_weights"), // Pesi per lead scoring contestuali al funnel
    // Analytics & Metrics
    totalLeads: (0, pg_core_1.integer)("total_leads").default(0).notNull(),
    conversionRate: (0, pg_core_1.real)("conversion_rate").default(0), // Conversion rate end-to-end
    avgJourneyDurationDays: (0, pg_core_1.real)("avg_journey_duration_days"), // Durata media reale del journey
    dropoffRate: (0, pg_core_1.real)("dropoff_rate"), // Percentuale di abbandono
    // Metadata
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_funnels_tenant_id_idx").on(table.tenantId),
    tenantActiveIdx: (0, pg_core_1.index)("crm_funnels_tenant_active_idx").on(table.tenantId, table.isActive),
}));
exports.insertCrmFunnelSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmFunnels).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    totalLeads: true,
    conversionRate: true,
    avgJourneyDurationDays: true,
    dropoffRate: true
});
// CRM Funnel Workflows - Many-to-many: Funnel <-> Workflow Templates (for AI orchestration across pipelines)
exports.crmFunnelWorkflows = exports.w3suiteSchema.table("crm_funnel_workflows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    funnelId: (0, pg_core_1.uuid)("funnel_id").notNull().references(() => exports.crmFunnels.id, { onDelete: 'cascade' }),
    workflowTemplateId: (0, pg_core_1.uuid)("workflow_template_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    executionMode: (0, exports.workflowExecutionModeEnum)("execution_mode").default('manual').notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    assignedBy: (0, pg_core_1.varchar)("assigned_by").notNull().references(() => exports.users.id),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => ({
    funnelWorkflowUniq: (0, pg_core_1.uniqueIndex)("crm_funnel_workflows_funnel_workflow_uniq").on(table.tenantId, table.funnelId, table.workflowTemplateId),
    tenantIdIdx: (0, pg_core_1.index)("crm_funnel_workflows_tenant_id_idx").on(table.tenantId),
    funnelIdIdx: (0, pg_core_1.index)("crm_funnel_workflows_funnel_id_idx").on(table.funnelId),
    workflowTemplateIdIdx: (0, pg_core_1.index)("crm_funnel_workflows_workflow_template_id_idx").on(table.workflowTemplateId),
}));
exports.insertCrmFunnelWorkflowSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmFunnelWorkflows).omit({
    id: true,
    tenantId: true,
    assignedAt: true
});
// CRM Pipelines - Sales processes
exports.crmPipelines = exports.w3suiteSchema.table("crm_pipelines", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    funnelId: (0, pg_core_1.uuid)("funnel_id").references(() => exports.crmFunnels.id, { onDelete: 'set null' }), // Appartiene a un funnel
    funnelStageOrder: (0, pg_core_1.smallint)("funnel_stage_order"), // Ordine della pipeline nel funnel (1=prima, 2=seconda, etc)
    isBrandTemplate: (0, pg_core_1.boolean)("is_brand_template").default(false),
    brandPipelineId: (0, pg_core_1.uuid)("brand_pipeline_id"),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    domain: (0, exports.crmPipelineDomainEnum)("domain").notNull(),
    driverId: (0, pg_core_1.uuid)("driver_id").references(() => public_1.drivers.id),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    stagesConfig: (0, pg_core_1.jsonb)("stages_config").notNull(), // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_pipelines_tenant_id_idx").on(table.tenantId),
    funnelIdIdx: (0, pg_core_1.index)("crm_pipelines_funnel_id_idx").on(table.funnelId),
    tenantFunnelIdx: (0, pg_core_1.index)("crm_pipelines_tenant_funnel_idx").on(table.tenantId, table.funnelId),
}));
// CRM Pipeline Settings - Settings dedicati per pipeline
exports.crmPipelineSettings = exports.w3suiteSchema.table("crm_pipeline_settings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().unique().references(() => exports.crmPipelines.id),
    enabledChannels: (0, pg_core_1.text)("enabled_channels").array(), // ['sms','whatsapp','email']
    contactRules: (0, pg_core_1.jsonb)("contact_rules"), // {max_attempts_per_day, quiet_hours, sla_hours}
    workflowIds: (0, pg_core_1.text)("workflow_ids").array(),
    customStatusNames: (0, pg_core_1.jsonb)("custom_status_names"), // {new:'Primo Contatto', in_progress:'Lavorazione'}
    // 🎯 Hierarchical RBAC: Parent Access (Team/Users with pipeline visibility)
    assignedTeams: (0, pg_core_1.text)("assigned_teams").array().default([]), // Team IDs with CRM/Sales department
    assignedUsers: (0, pg_core_1.text)("assigned_users").array().default([]), // Optional: Individual users (in addition to teams)
    pipelineAdmins: (0, pg_core_1.text)("pipeline_admins").array().default([]), // Users with full pipeline settings access
    // 🎯 Hierarchical RBAC: Child Permissions (Operational - only for users with parent access)
    // Deal Management Permission
    dealManagementMode: (0, exports.pipelinePermissionModeEnum)("deal_management_mode").default('all'),
    dealManagementUsers: (0, pg_core_1.text)("deal_management_users").array().default([]), // Used when mode='custom'
    // Deal Creation Permission
    dealCreationMode: (0, exports.pipelinePermissionModeEnum)("deal_creation_mode").default('all'),
    dealCreationUsers: (0, pg_core_1.text)("deal_creation_users").array().default([]), // Used when mode='custom'
    // State Modification Permission
    stateModificationMode: (0, exports.pipelinePermissionModeEnum)("state_modification_mode").default('all'),
    stateModificationUsers: (0, pg_core_1.text)("state_modification_users").array().default([]), // Used when mode='custom'
    // Deal Deletion Permission
    dealDeletionMode: (0, exports.pipelineDeletionModeEnum)("deal_deletion_mode").default('admins'),
    dealDeletionUsers: (0, pg_core_1.text)("deal_deletion_users").array().default([]), // Reserved for future use
    // 🔔 Notification Preferences (Pipeline-level)
    notifyOnStageChange: (0, pg_core_1.boolean)("notify_on_stage_change").default(true), // Notify when deal changes stage
    notifyOnDealRotten: (0, pg_core_1.boolean)("notify_on_deal_rotten").default(true), // Notify when deal becomes stale
    notifyOnDealWon: (0, pg_core_1.boolean)("notify_on_deal_won").default(true), // Notify when deal is won
    notifyOnDealLost: (0, pg_core_1.boolean)("notify_on_deal_lost").default(true), // Notify when deal is lost
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// CRM Pipeline Stage Playbooks - Regole contatto per stage
exports.crmPipelineStagePlaybooks = exports.w3suiteSchema.table("crm_pipeline_stage_playbooks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().references(() => exports.crmPipelines.id),
    stageName: (0, pg_core_1.varchar)("stage_name", { length: 100 }).notNull(),
    allowedChannels: (0, pg_core_1.text)("allowed_channels").array(),
    maxAttemptsPerDay: (0, pg_core_1.smallint)("max_attempts_per_day"),
    slaHours: (0, pg_core_1.smallint)("sla_hours"),
    quietHoursStart: (0, pg_core_1.varchar)("quiet_hours_start", { length: 5 }),
    quietHoursEnd: (0, pg_core_1.varchar)("quiet_hours_end", { length: 5 }),
    nextBestActionJson: (0, pg_core_1.jsonb)("next_best_action_json"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    pipelineStageUniq: (0, pg_core_1.uniqueIndex)("crm_pipeline_stage_playbooks_pipeline_stage_uniq").on(table.pipelineId, table.stageName),
}));
// CRM Pipeline Workflows - Many-to-many: Pipeline <-> Workflow Templates (RBAC: admin + marketing)
exports.crmPipelineWorkflows = exports.w3suiteSchema.table("crm_pipeline_workflows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().references(() => exports.crmPipelines.id, { onDelete: 'cascade' }),
    workflowTemplateId: (0, pg_core_1.uuid)("workflow_template_id").notNull().references(() => exports.workflowTemplates.id, { onDelete: 'cascade' }),
    executionMode: (0, exports.workflowExecutionModeEnum)("execution_mode").default('manual').notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    assignedBy: (0, pg_core_1.varchar)("assigned_by").notNull().references(() => exports.users.id),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
}, (table) => ({
    pipelineWorkflowUniq: (0, pg_core_1.uniqueIndex)("crm_pipeline_workflows_pipeline_workflow_uniq").on(table.pipelineId, table.workflowTemplateId),
    pipelineIdIdx: (0, pg_core_1.index)("crm_pipeline_workflows_pipeline_id_idx").on(table.pipelineId),
    workflowTemplateIdIdx: (0, pg_core_1.index)("crm_pipeline_workflows_workflow_template_id_idx").on(table.workflowTemplateId),
}));
// CRM Pipeline Stages - Stati personalizzati per pipeline con categorie fisse
exports.crmPipelineStages = exports.w3suiteSchema.table("crm_pipeline_stages", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().references(() => exports.crmPipelines.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(), // Nome custom stage (es: "Primo Contatto")
    category: (0, exports.crmPipelineStageCategoryEnum)("category").notNull(), // Categoria fissa: starter, progress, etc.
    orderIndex: (0, pg_core_1.smallint)("order_index").notNull(), // Ordinamento visuale
    color: (0, pg_core_1.varchar)("color", { length: 7 }), // Hex color (es: "#ff6900")
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    requiredFields: (0, pg_core_1.text)("required_fields").array(), // Campi obbligatori per avanzare (best practice validation)
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    pipelineStageNameUniq: (0, pg_core_1.uniqueIndex)("crm_pipeline_stages_pipeline_name_uniq").on(table.pipelineId, table.name),
    pipelineOrderIdx: (0, pg_core_1.index)("crm_pipeline_stages_pipeline_order_idx").on(table.pipelineId, table.orderIndex),
}));
// CRM Deals - Opportunities in pipeline
exports.crmDeals = exports.w3suiteSchema.table("crm_deals", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id"),
    storeId: (0, pg_core_1.uuid)("store_id").notNull(),
    ownerUserId: (0, pg_core_1.varchar)("owner_user_id").notNull(),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().references(() => exports.crmPipelines.id),
    stage: (0, pg_core_1.varchar)("stage", { length: 100 }).notNull(),
    status: (0, exports.crmDealStatusEnum)("status").default('open'),
    leadId: (0, pg_core_1.uuid)("lead_id").references(() => exports.crmLeads.id),
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    sourceChannel: (0, exports.crmInboundChannelEnum)("source_channel"), // INBOUND: Inherited from lead
    personId: (0, pg_core_1.uuid)("person_id").notNull(), // Propagated from lead for identity tracking
    customerId: (0, pg_core_1.uuid)("customer_id"),
    // ==================== OUTBOUND CHANNEL TRACKING ====================
    preferredContactChannel: (0, exports.crmOutboundChannelEnum)("preferred_contact_channel"), // Primary contact method
    lastContactChannel: (0, exports.crmOutboundChannelEnum)("last_contact_channel"), // Last used outbound channel
    lastContactDate: (0, pg_core_1.timestamp)("last_contact_date"), // When last contacted
    contactHistory: (0, pg_core_1.jsonb)("contact_history"), // Array of {channel, date, outcome}
    contactChannelsUsed: (0, pg_core_1.text)("contact_channels_used").array(), // All channels tried
    estimatedValue: (0, pg_core_1.real)("estimated_value"),
    probability: (0, pg_core_1.smallint)("probability").default(0), // 0-100
    driverId: (0, pg_core_1.uuid)("driver_id").references(() => public_1.drivers.id),
    agingDays: (0, pg_core_1.smallint)("aging_days").default(0),
    wonAt: (0, pg_core_1.timestamp)("won_at"),
    lostAt: (0, pg_core_1.timestamp)("lost_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantPipelineStageStatusIdx: (0, pg_core_1.index)("crm_deals_tenant_pipeline_stage_status_idx").on(table.tenantId, table.pipelineId, table.stage, table.status),
    personIdIdx: (0, pg_core_1.index)("crm_deals_person_id_idx").on(table.personId),
    tenantIdIdx: (0, pg_core_1.index)("crm_deals_tenant_id_idx").on(table.tenantId),
}));
// CRM Interactions - Contact logs audit trail
exports.crmInteractions = exports.w3suiteSchema.table("crm_interactions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(), // 'lead', 'deal', 'customer'
    entityId: (0, pg_core_1.uuid)("entity_id").notNull(),
    channel: (0, pg_core_1.varchar)("channel", { length: 50 }),
    direction: (0, exports.crmInteractionDirectionEnum)("direction"),
    outcome: (0, pg_core_1.text)("outcome"),
    durationSeconds: (0, pg_core_1.integer)("duration_seconds"),
    performedByUserId: (0, pg_core_1.uuid)("performed_by_user_id"),
    notes: (0, pg_core_1.text)("notes"),
    payload: (0, pg_core_1.jsonb)("payload"),
    occurredAt: (0, pg_core_1.timestamp)("occurred_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    entityTypeEntityIdOccurredIdx: (0, pg_core_1.index)("crm_interactions_entity_type_entity_id_occurred_idx").on(table.entityType, table.entityId, table.occurredAt),
    tenantIdIdx: (0, pg_core_1.index)("crm_interactions_tenant_id_idx").on(table.tenantId),
}));
// CRM Tasks - Activities e to-do
exports.crmTasks = exports.w3suiteSchema.table("crm_tasks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }), // 'lead', 'deal', 'customer'
    entityId: (0, pg_core_1.uuid)("entity_id"),
    assignedToUserId: (0, pg_core_1.uuid)("assigned_to_user_id"),
    taskType: (0, exports.crmTaskTypeEnum)("task_type").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    dueDate: (0, pg_core_1.timestamp)("due_date"),
    status: (0, exports.crmTaskStatusEnum)("status").default('pending'),
    priority: (0, exports.crmTaskPriorityEnum)("priority").default('medium'),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantAssignedStatusDueIdx: (0, pg_core_1.index)("crm_tasks_tenant_assigned_status_due_idx").on(table.tenantId, table.assignedToUserId, table.status, table.dueDate),
    tenantIdIdx: (0, pg_core_1.index)("crm_tasks_tenant_id_idx").on(table.tenantId),
}));
// CRM Customers - B2B/B2C converted customers
exports.crmCustomers = exports.w3suiteSchema.table("crm_customers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    personId: (0, pg_core_1.uuid)("person_id").notNull(), // Identity tracking across lead → deal → customer
    customerType: (0, exports.crmCustomerTypeEnum)("customer_type").notNull(),
    // B2C Fields (persona fisica)
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    fiscalCode: (0, pg_core_1.text)("fiscal_code"), // Codice Fiscale (16 caratteri)
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    birthDate: (0, pg_core_1.date)("birth_date"),
    addresses: (0, pg_core_1.jsonb)("addresses"), // JSONB array of addresses { type, street, city, zip, province, country }
    // B2B Fields (azienda)
    companyName: (0, pg_core_1.varchar)("company_name", { length: 255 }),
    legalForm: (0, exports.crmLegalFormEnum)("legal_form"),
    vatNumber: (0, pg_core_1.text)("vat_number"), // Partita IVA (IT + 11 cifre)
    pecEmail: (0, pg_core_1.text)("pec_email"), // Email certificata PEC
    sdiCode: (0, pg_core_1.varchar)("sdi_code", { length: 7 }), // Codice SDI fatturazione elettronica (7 char alphanumeric)
    atecoCode: (0, pg_core_1.varchar)("ateco_code", { length: 20 }), // Codice attività economica
    primaryContactName: (0, pg_core_1.varchar)("primary_contact_name", { length: 200 }), // Nome referente principale per B2B
    sedi: (0, pg_core_1.jsonb)("sedi"), // JSONB array of locations { type, address, city, zip, province }
    secondaryContacts: (0, pg_core_1.jsonb)("secondary_contacts"), // JSONB array [{ name, role, email, phone }]
    companySize: (0, pg_core_1.varchar)("company_size", { length: 50 }), // 'micro' (1-9), 'small' (10-49), 'medium' (50-249), 'large' (250+)
    industry: (0, pg_core_1.varchar)("industry", { length: 255 }), // Settore industriale
    decisionMakers: (0, pg_core_1.jsonb)("decision_makers"), // JSONB array [{ name, role, email, phone, department }]
    parentCompanyId: (0, pg_core_1.uuid)("parent_company_id"), // Self-reference per holding/gruppi aziendali
    // Common fields
    sourceDealId: (0, pg_core_1.uuid)("source_deal_id").references(() => exports.crmDeals.id),
    convertedAt: (0, pg_core_1.timestamp)("converted_at"),
    status: (0, pg_core_1.text)("status").default('prospect'), // 'active', 'inactive', 'prospect'
    notes: (0, pg_core_1.text)("notes"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }),
    updatedBy: (0, pg_core_1.varchar)("updated_by", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantPersonIdIdx: (0, pg_core_1.index)("crm_customers_tenant_person_id_idx").on(table.tenantId, table.personId),
    tenantTypeStatusIdx: (0, pg_core_1.index)("crm_customers_tenant_type_status_idx").on(table.tenantId, table.customerType, table.status),
    tenantIdIdx: (0, pg_core_1.index)("crm_customers_tenant_id_idx").on(table.tenantId),
}));
// ==================== CRM PERSON CONSENTS - GDPR AUDIT TRAIL ====================
// Enterprise-grade consent tracking with full audit trail across lead → deal → customer lifecycle
exports.crmPersonConsents = exports.w3suiteSchema.table("crm_person_consents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    personId: (0, pg_core_1.uuid)("person_id").notNull(), // Same person_id across lead/deal/customer for unified consent tracking
    // Consent details
    consentType: (0, exports.crmConsentTypeEnum)("consent_type").notNull(), // 'privacy_policy', 'marketing', 'profiling', 'third_party'
    status: (0, exports.crmConsentStatusEnum)("status").notNull(), // 'granted', 'denied', 'withdrawn', 'pending'
    // Timestamps for audit trail
    grantedAt: (0, pg_core_1.timestamp)("granted_at"), // When consent was granted
    withdrawnAt: (0, pg_core_1.timestamp)("withdrawn_at"), // When consent was withdrawn (if applicable)
    expiresAt: (0, pg_core_1.timestamp)("expires_at"), // Optional expiry date for consent
    // Source tracking - where consent originated
    source: (0, pg_core_1.varchar)("source", { length: 100 }), // 'campaign', 'customer_modal', 'api', 'web_form', 'import'
    sourceEntityType: (0, pg_core_1.varchar)("source_entity_type", { length: 50 }), // 'lead', 'deal', 'customer', 'campaign'
    sourceEntityId: (0, pg_core_1.uuid)("source_entity_id"), // ID of the source entity (campaign_id, lead_id, etc.)
    campaignId: (0, pg_core_1.uuid)("campaign_id").references(() => exports.crmCampaigns.id), // If originated from a campaign
    // Audit fields - who made the change
    updatedBy: (0, pg_core_1.varchar)("updated_by", { length: 255 }), // User ID who last updated this consent
    updatedByName: (0, pg_core_1.varchar)("updated_by_name", { length: 255 }), // User name for display
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }), // IP address of consent action (IPv4/IPv6)
    userAgent: (0, pg_core_1.text)("user_agent"), // Browser/device info
    // Change log - complete history of all modifications
    auditTrail: (0, pg_core_1.jsonb)("audit_trail"), // Array of { timestamp, action, status, user, reason, metadata }
    // Additional metadata
    consentMethod: (0, pg_core_1.varchar)("consent_method", { length: 100 }), // 'checkbox', 'toggle', 'api', 'double_opt_in'
    language: (0, pg_core_1.varchar)("language", { length: 10 }), // Language code when consent was given (it, en, etc.)
    notes: (0, pg_core_1.text)("notes"), // Optional notes about this consent
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    // Primary lookup index - get all consents for a person
    tenantPersonIdx: (0, pg_core_1.index)("crm_person_consents_tenant_person_idx").on(table.tenantId, table.personId),
    // Consent type lookup - find all people with specific consent type
    tenantTypeStatusIdx: (0, pg_core_1.index)("crm_person_consents_tenant_type_status_idx").on(table.tenantId, table.consentType, table.status),
    // Campaign attribution - which campaigns generated consents
    campaignIdx: (0, pg_core_1.index)("crm_person_consents_campaign_idx").on(table.campaignId),
    // Expiry tracking - find expiring consents
    expiresAtIdx: (0, pg_core_1.index)("crm_person_consents_expires_at_idx").on(table.expiresAt),
    // Audit tracking - who modified consents
    updatedByIdx: (0, pg_core_1.index)("crm_person_consents_updated_by_idx").on(table.updatedBy),
    // Composite unique constraint - one consent type per person (latest record wins)
    tenantPersonTypeUniq: (0, pg_core_1.uniqueIndex)("crm_person_consents_tenant_person_type_uniq").on(table.tenantId, table.personId, table.consentType),
    // Tenant isolation
    tenantIdIdx: (0, pg_core_1.index)("crm_person_consents_tenant_id_idx").on(table.tenantId),
}));
// CRM Orders - Sales transactions (mock data until POS integration)
exports.crmOrders = exports.w3suiteSchema.table("crm_orders", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    customerId: (0, pg_core_1.uuid)("customer_id").notNull().references(() => exports.crmCustomers.id),
    orderNumber: (0, pg_core_1.varchar)("order_number", { length: 100 }).notNull(),
    orderDate: (0, pg_core_1.timestamp)("order_date").notNull(),
    totalAmount: (0, pg_core_1.numeric)("total_amount", { precision: 12, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default('EUR'),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).notNull().default('completed'),
    paymentMethod: (0, pg_core_1.varchar)("payment_method", { length: 100 }),
    paymentStatus: (0, pg_core_1.varchar)("payment_status", { length: 50 }).default('paid'),
    shippingAddress: (0, pg_core_1.jsonb)("shipping_address"),
    billingAddress: (0, pg_core_1.jsonb)("billing_address"),
    items: (0, pg_core_1.jsonb)("items").notNull(),
    discountAmount: (0, pg_core_1.numeric)("discount_amount", { precision: 12, scale: 2 }).default('0'),
    taxAmount: (0, pg_core_1.numeric)("tax_amount", { precision: 12, scale: 2 }).default('0'),
    shippingAmount: (0, pg_core_1.numeric)("shipping_amount", { precision: 12, scale: 2 }).default('0'),
    notes: (0, pg_core_1.text)("notes"),
    storeId: (0, pg_core_1.uuid)("store_id"),
    channelType: (0, pg_core_1.varchar)("channel_type", { length: 50 }),
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }),
    updatedBy: (0, pg_core_1.varchar)("updated_by", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantCustomerDateIdx: (0, pg_core_1.index)("crm_orders_tenant_customer_date_idx").on(table.tenantId, table.customerId, table.orderDate),
    tenantOrderNumberUniq: (0, pg_core_1.uniqueIndex)("crm_orders_tenant_order_number_uniq").on(table.tenantId, table.orderNumber),
    tenantIdIdx: (0, pg_core_1.index)("crm_orders_tenant_id_idx").on(table.tenantId),
}));
// CRM Customer Documents - Document management with Object Storage
exports.crmCustomerDocuments = exports.w3suiteSchema.table("crm_customer_documents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)("customer_id").notNull().references(() => exports.crmCustomers.id, { onDelete: 'cascade' }),
    // Document metadata
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 100 }).notNull(), // 'Contratti', 'Fatture', 'Documenti', 'Preventivi', 'Altro'
    fileType: (0, pg_core_1.varchar)("file_type", { length: 50 }).notNull(), // pdf, jpg, png, docx, etc.
    fileSize: (0, pg_core_1.integer)("file_size").notNull(), // bytes
    // Object Storage reference
    objectPath: (0, pg_core_1.varchar)("object_path", { length: 500 }).notNull(), // path in object storage
    // Version tracking
    version: (0, pg_core_1.integer)("version").default(1),
    previousVersionId: (0, pg_core_1.uuid)("previous_version_id"),
    // Metadata
    description: (0, pg_core_1.text)("description"),
    tags: (0, pg_core_1.jsonb)("tags"), // Array of tags
    // Audit
    uploadedBy: (0, pg_core_1.varchar)("uploaded_by", { length: 255 }).notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantCustomerIdx: (0, pg_core_1.index)("crm_customer_documents_tenant_customer_idx").on(table.tenantId, table.customerId),
    categoryIdx: (0, pg_core_1.index)("crm_customer_documents_category_idx").on(table.category),
    tenantIdIdx: (0, pg_core_1.index)("crm_customer_documents_tenant_id_idx").on(table.tenantId),
}));
// CRM Customer Notes - Internal team notes with tags and pinning
exports.crmCustomerNotes = exports.w3suiteSchema.table("crm_customer_notes", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)("customer_id").notNull().references(() => exports.crmCustomers.id, { onDelete: 'cascade' }),
    // Note content
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    tags: (0, pg_core_1.jsonb)("tags").default('[]'), // Array of tag strings
    // Organization
    isPinned: (0, pg_core_1.boolean)("is_pinned").default(false),
    // Audit
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }).notNull().references(() => exports.users.id),
    updatedBy: (0, pg_core_1.varchar)("updated_by", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantCustomerIdx: (0, pg_core_1.index)("crm_customer_notes_tenant_customer_idx").on(table.tenantId, table.customerId),
    pinnedIdx: (0, pg_core_1.index)("crm_customer_notes_pinned_idx").on(table.isPinned),
    createdAtIdx: (0, pg_core_1.index)("crm_customer_notes_created_at_idx").on(table.createdAt),
    tenantIdIdx: (0, pg_core_1.index)("crm_customer_notes_tenant_id_idx").on(table.tenantId),
}));
// CRM Campaign Pipeline Links - N:N relationships
exports.crmCampaignPipelineLinks = exports.w3suiteSchema.table("crm_campaign_pipeline_links", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull().references(() => exports.crmPipelines.id),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    campaignPipelineUniq: (0, pg_core_1.uniqueIndex)("crm_campaign_pipeline_links_campaign_pipeline_uniq").on(table.campaignId, table.pipelineId),
}));
// CRM Lead Attributions - Multi-touch attribution
exports.crmLeadAttributions = exports.w3suiteSchema.table("crm_lead_attributions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    leadId: (0, pg_core_1.uuid)("lead_id").notNull().references(() => exports.crmLeads.id),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id),
    touchpointOrder: (0, pg_core_1.smallint)("touchpoint_order").notNull(),
    attributionWeight: (0, pg_core_1.real)("attribution_weight"),
    occurredAt: (0, pg_core_1.timestamp)("occurred_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    leadTouchpointIdx: (0, pg_core_1.index)("crm_lead_attributions_lead_touchpoint_idx").on(table.leadId, table.touchpointOrder),
}));
// CRM Source Mappings - External ID mapping
exports.crmSourceMappings = exports.w3suiteSchema.table("crm_source_mappings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    sourceType: (0, exports.crmSourceTypeEnum)("source_type").notNull(),
    externalId: (0, pg_core_1.varchar)("external_id", { length: 255 }).notNull(),
    legalEntityId: (0, pg_core_1.uuid)("legal_entity_id"),
    storeId: (0, pg_core_1.uuid)("store_id"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantSourceExternalUniq: (0, pg_core_1.uniqueIndex)("crm_source_mappings_tenant_source_external_uniq").on(table.tenantId, table.sourceType, table.externalId),
    tenantIdIdx: (0, pg_core_1.index)("crm_source_mappings_tenant_id_idx").on(table.tenantId),
}));
// CRM Email Templates
exports.crmEmailTemplates = exports.w3suiteSchema.table("crm_email_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    subject: (0, pg_core_1.varchar)("subject", { length: 500 }),
    bodyHtml: (0, pg_core_1.text)("body_html"),
    bodyText: (0, pg_core_1.text)("body_text"),
    variables: (0, pg_core_1.jsonb)("variables"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_email_templates_tenant_id_idx").on(table.tenantId),
}));
// CRM SMS Templates
exports.crmSmsTemplates = exports.w3suiteSchema.table("crm_sms_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    body: (0, pg_core_1.text)("body"), // max 160 char validated in app
    variables: (0, pg_core_1.jsonb)("variables"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_sms_templates_tenant_id_idx").on(table.tenantId),
}));
// CRM WhatsApp Templates
exports.crmWhatsappTemplates = exports.w3suiteSchema.table("crm_whatsapp_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    templateId: (0, pg_core_1.varchar)("template_id", { length: 255 }), // WhatsApp approved template ID
    language: (0, pg_core_1.varchar)("language", { length: 5 }),
    headerText: (0, pg_core_1.text)("header_text"),
    bodyText: (0, pg_core_1.text)("body_text"),
    footerText: (0, pg_core_1.text)("footer_text"),
    buttons: (0, pg_core_1.jsonb)("buttons"),
    variables: (0, pg_core_1.jsonb)("variables"),
    isApproved: (0, pg_core_1.boolean)("is_approved").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_whatsapp_templates_tenant_id_idx").on(table.tenantId),
}));
// CRM Customer Segments
exports.crmCustomerSegments = exports.w3suiteSchema.table("crm_customer_segments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    filterRules: (0, pg_core_1.jsonb)("filter_rules"),
    calculatedCount: (0, pg_core_1.integer)("calculated_count").default(0),
    isDynamic: (0, pg_core_1.boolean)("is_dynamic").default(true),
    lastCalculatedAt: (0, pg_core_1.timestamp)("last_calculated_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_customer_segments_tenant_id_idx").on(table.tenantId),
}));
// CRM Automation Rules
exports.crmAutomationRules = exports.w3suiteSchema.table("crm_automation_rules", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    triggerEvent: (0, pg_core_1.varchar)("trigger_event", { length: 255 }).notNull(),
    conditions: (0, pg_core_1.jsonb)("conditions"),
    actions: (0, pg_core_1.jsonb)("actions"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    executionCount: (0, pg_core_1.integer)("execution_count").default(0),
    lastExecutedAt: (0, pg_core_1.timestamp)("last_executed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_automation_rules_tenant_id_idx").on(table.tenantId),
}));
// CRM Saved Views
exports.crmSavedViews = exports.w3suiteSchema.table("crm_saved_views", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    viewName: (0, pg_core_1.varchar)("view_name", { length: 255 }).notNull(),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(),
    filters: (0, pg_core_1.jsonb)("filters"),
    sortConfig: (0, pg_core_1.jsonb)("sort_config"),
    columnsConfig: (0, pg_core_1.jsonb)("columns_config"),
    isShared: (0, pg_core_1.boolean)("is_shared").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => ({
    tenantUserIdx: (0, pg_core_1.index)("crm_saved_views_tenant_user_idx").on(table.tenantId, table.userId),
}));
// ==================== UTM TRACKING & ANALYTICS TABLES ====================
// CRM Campaign UTM Links - Generated UTM links for campaign channels
exports.crmCampaignUtmLinks = exports.w3suiteSchema.table("crm_campaign_utm_links", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id, { onDelete: 'cascade' }),
    channelId: (0, pg_core_1.varchar)("channel_id", { length: 100 }).notNull(), // 'facebook_ads', 'instagram', 'google_ads', etc.
    channelName: (0, pg_core_1.varchar)("channel_name", { length: 200 }).notNull(), // Human-readable name
    generatedUrl: (0, pg_core_1.text)("generated_url").notNull(), // Full UTM link
    utmSource: (0, pg_core_1.varchar)("utm_source", { length: 255 }).notNull(),
    utmMedium: (0, pg_core_1.varchar)("utm_medium", { length: 255 }).notNull(),
    utmCampaign: (0, pg_core_1.varchar)("utm_campaign", { length: 255 }).notNull(),
    // Analytics tracking
    clicks: (0, pg_core_1.integer)("clicks").default(0),
    uniqueClicks: (0, pg_core_1.integer)("unique_clicks").default(0),
    conversions: (0, pg_core_1.integer)("conversions").default(0),
    revenue: (0, pg_core_1.real)("revenue").default(0),
    lastClickedAt: (0, pg_core_1.timestamp)("last_clicked_at"),
    lastConversionAt: (0, pg_core_1.timestamp)("last_conversion_at"),
    // Metadata
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_campaign_utm_links_tenant_id_idx").on(table.tenantId),
    campaignIdIdx: (0, pg_core_1.index)("crm_campaign_utm_links_campaign_id_idx").on(table.campaignId),
    channelIdIdx: (0, pg_core_1.index)("crm_campaign_utm_links_channel_id_idx").on(table.channelId),
    campaignChannelUniq: (0, pg_core_1.uniqueIndex)("crm_campaign_utm_links_campaign_channel_uniq").on(table.campaignId, table.channelId),
}));
// CRM Lead Notifications - Real-time notifications for high-priority leads
exports.crmLeadNotifications = exports.w3suiteSchema.table("crm_lead_notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    leadId: (0, pg_core_1.uuid)("lead_id").notNull().references(() => exports.crmLeads.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }), // Recipient
    // Notification content
    notificationType: (0, pg_core_1.varchar)("notification_type", { length: 100 }).notNull(), // 'hot_lead', 'high_score', 'ai_insight', 'conversion_ready'
    priority: (0, exports.notificationPriorityEnum)("priority").default('medium').notNull(), // low, medium, high, critical
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Additional data (leadScore, aiInsights, etc.)
    // Actions
    actionUrl: (0, pg_core_1.varchar)("action_url", { length: 500 }), // Deep link to lead detail
    actionLabel: (0, pg_core_1.varchar)("action_label", { length: 100 }), // "View Lead", "Contact Now"
    // Status
    isRead: (0, pg_core_1.boolean)("is_read").default(false).notNull(),
    readAt: (0, pg_core_1.timestamp)("read_at"),
    dismissedAt: (0, pg_core_1.timestamp)("dismissed_at"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("crm_lead_notifications_tenant_id_idx").on(table.tenantId),
    leadIdIdx: (0, pg_core_1.index)("crm_lead_notifications_lead_id_idx").on(table.leadId),
    userIdIdx: (0, pg_core_1.index)("crm_lead_notifications_user_id_idx").on(table.userId),
    userUnreadIdx: (0, pg_core_1.index)("crm_lead_notifications_user_unread_idx").on(table.userId, table.isRead),
    createdAtIdx: (0, pg_core_1.index)("crm_lead_notifications_created_at_idx").on(table.createdAt.desc()),
}));
// GTM Event Log - Audit trail for GTM events sent
exports.gtmEventLog = exports.w3suiteSchema.table("gtm_event_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    leadId: (0, pg_core_1.uuid)("lead_id").references(() => exports.crmLeads.id, { onDelete: 'cascade' }), // Optional: linked to lead
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id), // Store context for tracking IDs
    // Event details
    eventType: (0, pg_core_1.varchar)("event_type", { length: 100 }).notNull(), // 'lead_created', 'lead_converted', 'deal_won', 'form_submit'
    eventName: (0, pg_core_1.varchar)("event_name", { length: 255 }).notNull(), // GTM event name
    eventData: (0, pg_core_1.jsonb)("event_data").notNull(), // Full event payload
    // Tracking IDs
    ga4MeasurementId: (0, pg_core_1.varchar)("ga4_measurement_id", { length: 50 }), // GA4 Measurement ID
    googleAdsConversionId: (0, pg_core_1.varchar)("google_ads_conversion_id", { length: 50 }), // Google Ads Conversion ID
    googleAdsConversionLabel: (0, pg_core_1.varchar)("google_ads_conversion_label", { length: 100 }), // Google Ads Conversion Label
    facebookPixelId: (0, pg_core_1.varchar)("facebook_pixel_id", { length: 50 }), // Facebook Pixel ID
    // Enhanced Conversions
    enhancedConversionData: (0, pg_core_1.jsonb)("enhanced_conversion_data"), // Hashed email/phone/address for Enhanced Conversions
    userAgent: (0, pg_core_1.text)("user_agent"), // Client user agent
    clientIpAddress: (0, pg_core_1.varchar)("client_ip_address", { length: 45 }), // Client IP for geo-targeting
    // Response tracking
    success: (0, pg_core_1.boolean)("success").default(false).notNull(),
    httpStatusCode: (0, pg_core_1.smallint)("http_status_code"), // HTTP response code
    responseBody: (0, pg_core_1.jsonb)("response_body"), // API response
    errorMessage: (0, pg_core_1.text)("error_message"), // Error details if failed
    // Timing
    responseTimeMs: (0, pg_core_1.integer)("response_time_ms"), // Response time in milliseconds
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: (0, pg_core_1.index)("gtm_event_log_tenant_id_idx").on(table.tenantId),
    leadIdIdx: (0, pg_core_1.index)("gtm_event_log_lead_id_idx").on(table.leadId),
    storeIdIdx: (0, pg_core_1.index)("gtm_event_log_store_id_idx").on(table.storeId),
    eventTypeIdx: (0, pg_core_1.index)("gtm_event_log_event_type_idx").on(table.eventType),
    successIdx: (0, pg_core_1.index)("gtm_event_log_success_idx").on(table.success),
    createdAtIdx: (0, pg_core_1.index)("gtm_event_log_created_at_idx").on(table.createdAt.desc()),
}));
// ==================== CRM INSERT SCHEMAS ====================
exports.insertCrmPersonIdentitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPersonIdentities).omit({
    id: true,
    createdAt: true
});
exports.insertCrmCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCampaigns).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    totalLeads: true,
    totalDeals: true,
    totalRevenue: true
});
exports.insertCrmLeadSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmLeads).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertLeadStatusSchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadStatuses).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertLeadStatusHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadStatusHistory).omit({
    id: true,
    changedAt: true
});
exports.insertCrmPipelineSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPipelines).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmPipelineSettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPipelineSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmPipelineStagePlaybookSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPipelineStagePlaybooks).omit({
    id: true,
    createdAt: true
});
exports.insertCrmPipelineWorkflowSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPipelineWorkflows).omit({
    id: true,
    assignedAt: true
});
exports.insertCrmPipelineStageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmPipelineStages).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmDealSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmDeals).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    agingDays: true
});
exports.insertCrmInteractionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmInteractions).omit({
    id: true,
    createdAt: true
});
exports.insertCrmTaskSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmTasks).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmCustomerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCustomers).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmOrders).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmCampaignPipelineLinkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCampaignPipelineLinks).omit({
    id: true,
    createdAt: true
});
exports.insertCrmLeadAttributionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmLeadAttributions).omit({
    id: true,
    createdAt: true
});
exports.insertCrmSourceMappingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmSourceMappings).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmEmailTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmEmailTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmSmsTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmSmsTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmWhatsappTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmWhatsappTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmCustomerSegmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCustomerSegments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    calculatedCount: true
});
exports.insertCrmAutomationRuleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmAutomationRules).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    executionCount: true
});
exports.insertCrmSavedViewSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmSavedViews).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== UTM TRACKING & ANALYTICS INSERT SCHEMAS ====================
exports.insertCrmCampaignUtmLinkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCampaignUtmLinks).omit({
    id: true,
    clicks: true,
    uniqueClicks: true,
    conversions: true,
    revenue: true,
    lastClickedAt: true,
    lastConversionAt: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmLeadNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmLeadNotifications).omit({
    id: true,
    isRead: true,
    readAt: true,
    dismissedAt: true,
    createdAt: true
});
exports.insertGtmEventLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gtmEventLog).omit({
    id: true,
    success: true,
    httpStatusCode: true,
    responseBody: true,
    errorMessage: true,
    responseTimeMs: true,
    createdAt: true
});
// ==================== CUSTOMER 360° INSERT SCHEMAS ====================
exports.insertCrmCustomerDocumentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCustomerDocuments).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCrmCustomerNoteSchema = (0, drizzle_zod_1.createInsertSchema)(exports.crmCustomerNotes).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== VOIP SYSTEM (7 TABLES - FINAL SPEC) ====================
// 1) voip_trunks - Trunk SIP per store/tenant (READ-ONLY, synced from edgvoip)
exports.voipTrunks = exports.w3suiteSchema.table("voip_trunks", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    // Sync metadata (edgvoip is source of truth)
    edgvoipTrunkId: (0, pg_core_1.varchar)("edgvoip_trunk_id", { length: 255 }).unique(), // External trunk ID from edgvoip
    syncSource: (0, pg_core_1.varchar)("sync_source", { length: 20 }).default('edgvoip').notNull(), // Always 'edgvoip'
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at"), // Last webhook sync timestamp
    // Trunk configuration (synced from edgvoip)
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    provider: (0, pg_core_1.varchar)("provider", { length: 100 }), // Telecom Italia, Vodafone, etc.
    host: (0, pg_core_1.varchar)("host", { length: 255 }), // SIP proxy hostname
    port: (0, pg_core_1.integer)("port").default(5060),
    protocol: (0, exports.voipProtocolEnum)("protocol").default('udp'), // udp|tcp|tls
    didRange: (0, pg_core_1.varchar)("did_range", { length: 100 }), // +39 02 1234xxxx
    maxChannels: (0, pg_core_1.integer)("max_channels").default(10).notNull(),
    currentChannels: (0, pg_core_1.integer)("current_channels").default(0).notNull(),
    status: (0, exports.voipTrunkStatusEnum)("status").default('active').notNull(),
    // AI Voice Agent configuration (synced from edgvoip)
    aiAgentEnabled: (0, pg_core_1.boolean)("ai_agent_enabled").default(false).notNull(),
    aiAgentRef: (0, pg_core_1.varchar)("ai_agent_ref", { length: 100 }), // Reference to aiAgentsRegistry (e.g. "customer-care-voice")
    aiTimePolicy: (0, pg_core_1.jsonb)("ai_time_policy"), // Business hours JSON: {monday: {start: "09:00", end: "18:00"}, ...}
    aiFailoverExtension: (0, pg_core_1.varchar)("ai_failover_extension", { length: 20 }), // Extension to fallback when AI unavailable
    // edgvoip AI Config Sync tracking
    edgvoipAiSyncedAt: (0, pg_core_1.timestamp)("edgvoip_ai_synced_at"), // Last successful AI config sync with edgvoip
    edgvoipAiSyncStatus: (0, pg_core_1.varchar)("edgvoip_ai_sync_status", { length: 50 }), // success|error|pending|none
    edgvoipAiSyncError: (0, pg_core_1.text)("edgvoip_ai_sync_error"), // Last sync error message if any
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_trunks_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_trunks_store_idx").on(table.storeId),
    (0, pg_core_1.index)("voip_trunks_edgvoip_id_idx").on(table.edgvoipTrunkId),
    (0, pg_core_1.uniqueIndex)("voip_trunks_tenant_store_name_unique").on(table.tenantId, table.storeId, table.name),
]);
// 2) voip_extensions - Interni del tenant (1:1 con users)
exports.voipExtensions = exports.w3suiteSchema.table("voip_extensions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }), // ACTUAL DB: VARCHAR not UUID! 1:1 relationship
    domainId: (0, pg_core_1.uuid)("domain_id").notNull(), // ACTUAL DB: domain_id (references voip_domains)
    extension: (0, pg_core_1.varchar)("extension", { length: 20 }).notNull(), // ACTUAL DB: extension number (1001, 1002, etc.)
    sipUsername: (0, pg_core_1.varchar)("sip_username", { length: 100 }).notNull(), // ACTUAL DB: SIP auth username
    sipPassword: (0, pg_core_1.text)("sip_password").notNull(), // ACTUAL DB: SIP password (encrypted at rest)
    displayName: (0, pg_core_1.varchar)("display_name", { length: 255 }), // ACTUAL DB: display name
    email: (0, pg_core_1.varchar)("email", { length: 255 }), // ACTUAL DB: email
    // FreeSWITCH Best Practice Fields
    sipServer: (0, pg_core_1.varchar)("sip_server", { length: 255 }).default('sip.edgvoip.it'), // SIP server hostname
    sipPort: (0, pg_core_1.integer)("sip_port").default(5060), // SIP port (5060 for UDP, 5061 for TLS)
    wsPort: (0, pg_core_1.integer)("ws_port").default(7443), // WebSocket port for WebRTC (edgvoip uses 7443)
    transport: (0, pg_core_1.varchar)("transport", { length: 20 }).default('WSS'), // UDP|TCP|TLS|WS|WSS
    // Caller ID Configuration
    callerIdName: (0, pg_core_1.varchar)("caller_id_name", { length: 100 }), // Outbound caller ID name
    callerIdNumber: (0, pg_core_1.varchar)("caller_id_number", { length: 50 }), // Outbound caller ID number (E.164)
    // Codec Configuration (comma-separated, priority order)
    allowedCodecs: (0, pg_core_1.varchar)("allowed_codecs", { length: 255 }).default('OPUS,G722,PCMU,PCMA'), // Video codecs available: VP8,VP9,H264
    // Security & Authentication
    authRealm: (0, pg_core_1.varchar)("auth_realm", { length: 255 }), // SIP authentication realm (default: domain)
    registrationExpiry: (0, pg_core_1.integer)("registration_expiry").default(3600), // Registration TTL in seconds (default: 1 hour)
    maxConcurrentCalls: (0, pg_core_1.integer)("max_concurrent_calls").default(4), // Call limit per extension
    // Call Features
    voicemailEnabled: (0, pg_core_1.boolean)("voicemail_enabled").default(true).notNull(), // ACTUAL DB: voicemail flag
    voicemailEmail: (0, pg_core_1.varchar)("voicemail_email", { length: 255 }), // ACTUAL DB: voicemail email
    voicemailPin: (0, pg_core_1.varchar)("voicemail_pin", { length: 20 }), // Voicemail access PIN
    recordingEnabled: (0, pg_core_1.boolean)("recording_enabled").default(false).notNull(), // ACTUAL DB: recording flag
    dndEnabled: (0, pg_core_1.boolean)("dnd_enabled").default(false).notNull(), // ACTUAL DB: DND flag
    forwardOnBusy: (0, pg_core_1.varchar)("forward_on_busy", { length: 100 }), // ACTUAL DB: forward on busy
    forwardOnNoAnswer: (0, pg_core_1.varchar)("forward_on_no_answer", { length: 100 }), // ACTUAL DB: forward on no answer
    forwardUnconditional: (0, pg_core_1.varchar)("forward_unconditional", { length: 100 }), // ACTUAL DB: unconditional forward
    // Sync Metadata (for edgvoip API integration)
    edgvoipExtensionId: (0, pg_core_1.varchar)("edgvoip_extension_id", { length: 100 }), // External PBX extension ID
    lastSyncAt: (0, pg_core_1.timestamp)("last_sync_at"), // Last successful sync with edgvoip
    syncStatus: (0, pg_core_1.varchar)("sync_status", { length: 50 }).default('pending'), // pending|synced|failed
    syncErrorMessage: (0, pg_core_1.text)("sync_error_message"), // Last sync error if any
    status: (0, exports.voipExtensionStatusEnum)("status").default('active').notNull(), // ACTUAL DB: status enum
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_extensions_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_extensions_user_idx").on(table.userId),
    (0, pg_core_1.index)("voip_extensions_domain_idx").on(table.domainId), // ACTUAL DB: domain index
    (0, pg_core_1.index)("voip_extensions_sync_status_idx").on(table.syncStatus),
    (0, pg_core_1.uniqueIndex)("voip_extensions_domain_extension_unique").on(table.domainId, table.extension), // ACTUAL DB: unique extension per domain
    (0, pg_core_1.uniqueIndex)("voip_extensions_domain_sip_username_unique").on(table.domainId, table.sipUsername), // ACTUAL DB: unique sip_username per domain
    (0, pg_core_1.uniqueIndex)("voip_extensions_user_unique").on(table.userId), // ACTUAL DB: conditional unique on user_id
    (0, pg_core_1.uniqueIndex)("voip_extensions_edgvoip_id_unique").on(table.tenantId, table.edgvoipExtensionId), // For webhook upsert on (tenant_id, edgvoip_extension_id)
]);
exports.insertVoipExtensionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voipExtensions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastSyncAt: true,
    syncErrorMessage: true
}).extend({
    userId: zod_1.z.string().optional(), // ACTUAL DB: VARCHAR, optional (1:1 with users)
    domainId: zod_1.z.string().uuid("Invalid domain ID"),
    extension: zod_1.z.string().regex(/^\d{3,6}$/, "Extension must be 3-6 digits"),
    sipUsername: zod_1.z.string().min(1, "SIP username is required"),
    sipPassword: zod_1.z.string().min(16, "SIP password must be at least 16 characters"), // Auto-generated, 16+ chars
    transport: zod_1.z.enum(['UDP', 'TCP', 'TLS', 'WS', 'WSS']).optional(),
    allowedCodecs: zod_1.z.string().optional(),
    callerIdNumber: zod_1.z.string().regex(/^\+\d{7,15}$/, "Must be E.164 format").optional(),
    status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional(),
    syncStatus: zod_1.z.enum(['pending', 'synced', 'failed']).optional(),
});
exports.updateVoipExtensionSchema = exports.insertVoipExtensionSchema.omit({
    tenantId: true,
    userId: true,
    domainId: true,
    extension: true,
    sipPassword: true // Password changes via dedicated endpoint
}).partial();
// 3.1) voip_extension_store_access - Junction table: which extensions can call from which stores
exports.voipExtensionStoreAccess = exports.w3suiteSchema.table("voip_extension_store_access", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    extensionId: (0, pg_core_1.uuid)("extension_id").notNull().references(() => exports.voipExtensions.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").notNull().references(() => exports.stores.id, { onDelete: 'cascade' }),
    canCallOutbound: (0, pg_core_1.boolean)("can_call_outbound").default(true).notNull(), // Can make outbound calls from this store
    canReceiveInbound: (0, pg_core_1.boolean)("can_receive_inbound").default(true).notNull(), // Can receive inbound calls to this store's DIDs
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_ext_store_access_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_ext_store_access_extension_idx").on(table.extensionId),
    (0, pg_core_1.index)("voip_ext_store_access_store_idx").on(table.storeId),
    (0, pg_core_1.uniqueIndex)("voip_ext_store_access_unique").on(table.extensionId, table.storeId), // Prevent duplicates
]);
exports.insertVoipExtensionStoreAccessSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voipExtensionStoreAccess).omit({
    id: true,
    createdAt: true,
    updatedAt: true
}).extend({
    extensionId: zod_1.z.string().uuid("Invalid extension ID"),
    storeId: zod_1.z.string().uuid("Invalid store ID"),
});
exports.updateVoipExtensionStoreAccessSchema = exports.insertVoipExtensionStoreAccessSchema.omit({ tenantId: true, extensionId: true, storeId: true }).partial();
// 7) voip_cdr - Mirror CDR per report KPI
exports.voipCdrs = exports.w3suiteSchema.table("voip_cdrs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }), // Deducibile da DID/ext
    sipDomain: (0, pg_core_1.varchar)("sip_domain", { length: 255 }).notNull(), // Per correlazione multi-tenant
    callId: (0, pg_core_1.varchar)("call_id", { length: 255 }).notNull(), // ID chiamata PBX
    direction: (0, exports.voipCallDirectionEnum)("direction").notNull(), // in|out
    fromUri: (0, pg_core_1.varchar)("from_uri", { length: 100 }).notNull(), // E.164 o ext
    toUri: (0, pg_core_1.varchar)("to_uri", { length: 100 }).notNull(), // E.164 o ext
    didE164: (0, pg_core_1.varchar)("did_e164", { length: 50 }), // DID coinvolto (if inbound)
    extNumber: (0, pg_core_1.varchar)("ext_number", { length: 20 }), // Interno coinvolto (if present)
    startTs: (0, pg_core_1.timestamp)("start_ts").notNull(),
    answerTs: (0, pg_core_1.timestamp)("answer_ts"),
    endTs: (0, pg_core_1.timestamp)("end_ts"),
    billsec: (0, pg_core_1.integer)("billsec").default(0).notNull(), // Secondi fatturati
    disposition: (0, exports.voipCallDispositionEnum)("disposition").notNull(), // ANSWERED|NO_ANSWER|BUSY|FAILED
    recordingUrl: (0, pg_core_1.varchar)("recording_url", { length: 500 }), // Link registrazione
    metaJson: (0, pg_core_1.jsonb)("meta_json"), // Extra (codec, mos, cause codes)
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_cdrs_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_cdrs_store_idx").on(table.storeId),
    (0, pg_core_1.index)("voip_cdrs_sip_domain_idx").on(table.sipDomain),
    (0, pg_core_1.index)("voip_cdrs_call_id_idx").on(table.callId),
    (0, pg_core_1.index)("voip_cdrs_start_ts_idx").on(table.startTs),
    (0, pg_core_1.index)("voip_cdrs_did_idx").on(table.didE164),
    (0, pg_core_1.index)("voip_cdrs_ext_idx").on(table.extNumber),
]);
exports.insertVoipCdrSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voipCdrs).omit({
    id: true,
    createdAt: true
}).extend({
    sipDomain: zod_1.z.string().regex(/^[a-zA-Z0-9.-]+\.[a-z]{2,}$/, "Invalid SIP domain format"),
    direction: zod_1.z.enum(['inbound', 'outbound', 'internal']),
    disposition: zod_1.z.enum(['answered', 'no_answer', 'busy', 'failed', 'voicemail']),
    startTs: zod_1.z.coerce.date(),
    answerTs: zod_1.z.coerce.date().optional().nullable(),
    endTs: zod_1.z.coerce.date().optional().nullable(),
});
// 4) contact_policies - Policy minime di contatto in JSON
exports.contactPolicies = exports.w3suiteSchema.table("contact_policies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    scopeType: (0, pg_core_1.varchar)("scope_type", { length: 50 }).notNull(), // tenant|store|did|ext
    scopeRef: (0, pg_core_1.varchar)("scope_ref", { length: 255 }).notNull(), // ID di riferimento (store_id, e164, ext_number)
    rulesJson: (0, pg_core_1.jsonb)("rules_json").notNull(), // {open: "09:00", close: "18:00", fallback: "voicemail", announcements: [...]}
    active: (0, pg_core_1.boolean)("active").default(true).notNull(),
    label: (0, pg_core_1.varchar)("label", { length: 255 }), // "Orari Roma"
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("contact_policies_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("contact_policies_scope_idx").on(table.scopeType, table.scopeRef),
    (0, pg_core_1.uniqueIndex)("contact_policies_scope_unique").on(table.scopeType, table.scopeRef),
]);
exports.insertContactPolicySchema = (0, drizzle_zod_1.createInsertSchema)(exports.contactPolicies).omit({
    id: true,
    createdAt: true,
    updatedAt: true
}).extend({
    scopeType: zod_1.z.enum(['tenant', 'store', 'did', 'ext']),
    scopeRef: zod_1.z.string().min(1, "Scope reference is required"),
    rulesJson: zod_1.z.object({}).passthrough(), // Accept any JSON object
});
exports.updateContactPolicySchema = exports.insertContactPolicySchema.omit({ tenantId: true, scopeType: true, scopeRef: true }).partial();
// 6) voip_activity_log - Audit e provisioning/log applicativo
exports.voipActivityLog = exports.w3suiteSchema.table("voip_activity_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    actor: (0, pg_core_1.varchar)("actor", { length: 255 }).notNull(), // user:<id> o system:w3-provisioner
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(), // create|update|delete|provision|sync
    targetType: (0, pg_core_1.varchar)("target_type", { length: 50 }).notNull(), // trunk|did|ext|route|policy
    targetId: (0, pg_core_1.varchar)("target_id", { length: 255 }).notNull(), // ID dell'oggetto bersaglio
    status: (0, pg_core_1.varchar)("status", { length: 50 }).notNull(), // ok|fail
    detailsJson: (0, pg_core_1.jsonb)("details_json"), // Payload/diff/esito chiamate API verso PBX
    ts: (0, pg_core_1.timestamp)("ts").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_activity_log_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_activity_log_actor_idx").on(table.actor),
    (0, pg_core_1.index)("voip_activity_log_target_idx").on(table.targetType, table.targetId),
    (0, pg_core_1.index)("voip_activity_log_ts_idx").on(table.ts),
]);
exports.insertVoipActivityLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voipActivityLog).omit({
    id: true,
    ts: true
}).extend({
    action: zod_1.z.enum(['create', 'update', 'delete', 'provision', 'sync']),
    targetType: zod_1.z.enum(['trunk', 'did', 'ext', 'route', 'policy']),
    status: zod_1.z.enum(['ok', 'fail']),
});
// 7) voip_ai_sessions - AI Voice Agent Call Sessions Tracking
exports.voipAiSessions = exports.w3suiteSchema.table("voip_ai_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }),
    trunkId: (0, pg_core_1.uuid)("trunk_id").references(() => exports.voipTrunks.id, { onDelete: 'set null' }),
    cdrId: (0, pg_core_1.uuid)("cdr_id").references(() => exports.voipCdrs.id, { onDelete: 'set null' }), // Link to CDR for full call details
    callId: (0, pg_core_1.varchar)("call_id", { length: 255 }).notNull(), // FreeSWITCH call UUID
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }).notNull(), // OpenAI Realtime session ID
    aiAgentRef: (0, pg_core_1.varchar)("ai_agent_ref", { length: 100 }).notNull(), // Which AI agent handled the call
    callerNumber: (0, pg_core_1.varchar)("caller_number", { length: 50 }), // Caller's phone number
    didNumber: (0, pg_core_1.varchar)("did_number", { length: 50 }), // DID called
    startTs: (0, pg_core_1.timestamp)("start_ts").notNull(), // Session start
    endTs: (0, pg_core_1.timestamp)("end_ts"), // Session end
    durationSeconds: (0, pg_core_1.integer)("duration_seconds"), // Total session duration
    transcript: (0, pg_core_1.text)("transcript"), // Full conversation transcript
    actionsTaken: (0, pg_core_1.jsonb)("actions_taken"), // [{action: "create_ticket", params: {...}, result: {...}}]
    transferredTo: (0, pg_core_1.varchar)("transferred_to", { length: 50 }), // Extension if transferred to human
    transferReason: (0, pg_core_1.varchar)("transfer_reason", { length: 255 }), // Why transferred (customer_request, ai_escalation, error)
    sentiment: (0, pg_core_1.varchar)("sentiment", { length: 50 }), // positive, neutral, negative
    satisfactionScore: (0, pg_core_1.integer)("satisfaction_score"), // 1-5 if customer provided feedback
    errorOccurred: (0, pg_core_1.boolean)("error_occurred").default(false).notNull(),
    errorDetails: (0, pg_core_1.jsonb)("error_details"), // Error stack if any
    costUsd: (0, pg_core_1.decimal)("cost_usd", { precision: 10, scale: 4 }), // OpenAI API cost tracking
    tokensUsed: (0, pg_core_1.integer)("tokens_used"), // Total tokens consumed
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional session data
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("voip_ai_sessions_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("voip_ai_sessions_store_idx").on(table.storeId),
    (0, pg_core_1.index)("voip_ai_sessions_call_id_idx").on(table.callId),
    (0, pg_core_1.index)("voip_ai_sessions_start_ts_idx").on(table.startTs),
    (0, pg_core_1.index)("voip_ai_sessions_ai_agent_idx").on(table.aiAgentRef),
    (0, pg_core_1.uniqueIndex)("voip_ai_sessions_session_id_unique").on(table.sessionId),
]);
exports.insertVoipAiSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.voipAiSessions).omit({
    id: true,
    createdAt: true
}).extend({
    callId: zod_1.z.string().min(1, "Call ID is required"),
    sessionId: zod_1.z.string().min(1, "Session ID is required"),
    aiAgentRef: zod_1.z.string().min(1, "AI agent reference is required"),
});
// ==================== UTM TRACKING SYSTEM ====================
// UTM Links - Auto-generated UTM tracking links for campaigns
exports.utmLinks = exports.w3suiteSchema.table("utm_links", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    campaignId: (0, pg_core_1.uuid)("campaign_id").notNull().references(() => exports.crmCampaigns.id, { onDelete: 'cascade' }),
    channel: (0, pg_core_1.varchar)("channel", { length: 100 }).notNull(), // facebook_ads, instagram, google_ads, email, whatsapp
    fullUrl: (0, pg_core_1.text)("full_url").notNull(), // Complete URL with UTM parameters
    utmSource: (0, pg_core_1.varchar)("utm_source", { length: 255 }).notNull(),
    utmMedium: (0, pg_core_1.varchar)("utm_medium", { length: 255 }).notNull(),
    utmCampaign: (0, pg_core_1.varchar)("utm_campaign", { length: 255 }).notNull(),
    utmContent: (0, pg_core_1.varchar)("utm_content", { length: 255 }),
    utmTerm: (0, pg_core_1.varchar)("utm_term", { length: 255 }),
    clicksCount: (0, pg_core_1.integer)("clicks_count").default(0).notNull(),
    uniqueClicksCount: (0, pg_core_1.integer)("unique_clicks_count").default(0).notNull(),
    conversionsCount: (0, pg_core_1.integer)("conversions_count").default(0).notNull(),
    conversionValue: (0, pg_core_1.real)("conversion_value").default(0),
    lastClickedAt: (0, pg_core_1.timestamp)("last_clicked_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("utm_links_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("utm_links_campaign_idx").on(table.campaignId),
    (0, pg_core_1.index)("utm_links_channel_idx").on(table.channel),
    (0, pg_core_1.uniqueIndex)("utm_links_campaign_channel_unique").on(table.campaignId, table.channel),
]);
exports.insertUtmLinkSchema = (0, drizzle_zod_1.createInsertSchema)(exports.utmLinks).omit({
    id: true,
    clicksCount: true,
    uniqueClicksCount: true,
    conversionsCount: true,
    conversionValue: true,
    lastClickedAt: true,
    createdAt: true,
    updatedAt: true
});
// UTM Short URLs - Short URL system for UTM links
exports.utmShortUrls = exports.w3suiteSchema.table("utm_short_urls", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    utmLinkId: (0, pg_core_1.uuid)("utm_link_id").notNull().references(() => exports.utmLinks.id, { onDelete: 'cascade' }),
    shortCode: (0, pg_core_1.varchar)("short_code", { length: 20 }).notNull().unique(), // abc123
    fullShortUrl: (0, pg_core_1.varchar)("full_short_url", { length: 255 }).notNull(), // w3s.io/abc123 (placeholder domain)
    targetUrl: (0, pg_core_1.text)("target_url").notNull(), // Full UTM URL to redirect to
    clicksCount: (0, pg_core_1.integer)("clicks_count").default(0).notNull(),
    uniqueClicksCount: (0, pg_core_1.integer)("unique_clicks_count").default(0).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    lastClickedAt: (0, pg_core_1.timestamp)("last_clicked_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("utm_short_urls_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("utm_short_urls_utm_link_idx").on(table.utmLinkId),
    (0, pg_core_1.index)("utm_short_urls_short_code_idx").on(table.shortCode),
    (0, pg_core_1.uniqueIndex)("utm_short_urls_short_code_unique").on(table.shortCode),
]);
exports.insertUtmShortUrlSchema = (0, drizzle_zod_1.createInsertSchema)(exports.utmShortUrls).omit({
    id: true,
    clicksCount: true,
    uniqueClicksCount: true,
    lastClickedAt: true,
    createdAt: true
});
// Lead Touchpoints - Detailed touchpoint events for multi-touch attribution
exports.leadTouchpoints = exports.w3suiteSchema.table("lead_touchpoints", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    leadId: (0, pg_core_1.uuid)("lead_id").notNull().references(() => exports.crmLeads.id, { onDelete: 'cascade' }),
    utmLinkId: (0, pg_core_1.uuid)("utm_link_id").references(() => exports.utmLinks.id, { onDelete: 'set null' }),
    touchpointType: (0, pg_core_1.varchar)("touchpoint_type", { length: 50 }).notNull(), // utm_click, form_view, email_open, page_view
    touchedAt: (0, pg_core_1.timestamp)("touched_at").notNull().defaultNow(),
    userAgent: (0, pg_core_1.text)("user_agent"),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    deviceType: (0, pg_core_1.varchar)("device_type", { length: 50 }), // mobile, desktop, tablet
    os: (0, pg_core_1.varchar)("os", { length: 100 }), // iOS, Android, Windows, macOS
    browser: (0, pg_core_1.varchar)("browser", { length: 100 }),
    referrer: (0, pg_core_1.text)("referrer"),
    country: (0, pg_core_1.varchar)("country", { length: 100 }),
    city: (0, pg_core_1.varchar)("city", { length: 100 }),
    latitude: (0, pg_core_1.real)("latitude"),
    longitude: (0, pg_core_1.real)("longitude"),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }),
    convertedToLead: (0, pg_core_1.boolean)("converted_to_lead").default(false),
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional touchpoint data
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("lead_touchpoints_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("lead_touchpoints_lead_idx").on(table.leadId),
    (0, pg_core_1.index)("lead_touchpoints_utm_link_idx").on(table.utmLinkId),
    (0, pg_core_1.index)("lead_touchpoints_touched_at_idx").on(table.touchedAt),
    (0, pg_core_1.index)("lead_touchpoints_session_idx").on(table.sessionId),
]);
exports.insertLeadTouchpointSchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadTouchpoints).omit({
    id: true,
    createdAt: true
});
// ==================== WORKFLOW EXECUTION QUEUE SYSTEM ====================
// Workflow Execution Queue - Track manual workflow approvals and execution requests
exports.workflowExecutionQueue = exports.w3suiteSchema.table("workflow_execution_queue", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Workflow identification
    workflowId: (0, pg_core_1.uuid)("workflow_id").notNull(), // References workflow template
    workflowName: (0, pg_core_1.varchar)("workflow_name", { length: 255 }).notNull(),
    workflowCategory: (0, pg_core_1.varchar)("workflow_category", { length: 100 }), // engagement, automation, scoring, etc.
    // Entity reference
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(), // deal, lead, customer, campaign
    entityId: (0, pg_core_1.varchar)("entity_id", { length: 255 }).notNull(),
    entityName: (0, pg_core_1.varchar)("entity_name", { length: 255 }),
    entityStage: (0, pg_core_1.varchar)("entity_stage", { length: 100 }),
    entityPipeline: (0, pg_core_1.varchar)("entity_pipeline", { length: 255 }),
    entityValue: (0, pg_core_1.decimal)("entity_value", { precision: 10, scale: 2 }),
    // Request details
    requestedBy: (0, pg_core_1.varchar)("requested_by").notNull().references(() => exports.users.id),
    requestedByName: (0, pg_core_1.varchar)("requested_by_name", { length: 255 }),
    requestedAt: (0, pg_core_1.timestamp)("requested_at").notNull().defaultNow(),
    reason: (0, pg_core_1.text)("reason"), // Why this workflow is being requested
    // Approval details
    requiresApproval: (0, pg_core_1.boolean)("requires_approval").default(true).notNull(),
    approvedBy: (0, pg_core_1.varchar)("approved_by").references(() => exports.users.id),
    approvedByName: (0, pg_core_1.varchar)("approved_by_name", { length: 255 }),
    approvedAt: (0, pg_core_1.timestamp)("approved_at"),
    rejectedBy: (0, pg_core_1.varchar)("rejected_by").references(() => exports.users.id),
    rejectedByName: (0, pg_core_1.varchar)("rejected_by_name", { length: 255 }),
    rejectedAt: (0, pg_core_1.timestamp)("rejected_at"),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    // Execution tracking
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(), // pending, approved, rejected, executing, completed, failed
    priority: (0, pg_core_1.varchar)("priority", { length: 20 }).default('medium').notNull(), // low, medium, high, critical
    executionId: (0, pg_core_1.uuid)("execution_id"), // Link to workflowExecutions once started
    // Performance & SLA
    estimatedDuration: (0, pg_core_1.integer)("estimated_duration"), // Estimated duration in seconds
    slaDeadline: (0, pg_core_1.timestamp)("sla_deadline"), // When this should be processed by
    // Dependencies
    dependencies: (0, pg_core_1.text)("dependencies").array().default((0, drizzle_orm_1.sql) `'{}'::text[]`), // Other workflow IDs that must complete first
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("workflow_queue_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("workflow_queue_entity_idx").on(table.entityType, table.entityId),
    (0, pg_core_1.index)("workflow_queue_status_idx").on(table.status),
    (0, pg_core_1.index)("workflow_queue_priority_idx").on(table.priority),
    (0, pg_core_1.index)("workflow_queue_requested_by_idx").on(table.requestedBy),
    (0, pg_core_1.index)("workflow_queue_sla_idx").on(table.slaDeadline),
]);
exports.insertWorkflowExecutionQueueSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowExecutionQueue).omit({
    id: true,
    createdAt: true,
    updatedAt: true
}).extend({
    entityType: zod_1.z.enum(['deal', 'lead', 'customer', 'campaign']),
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'executing', 'completed', 'failed']),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
});
// Workflow Manual Executions - High-level tracking of manual workflow runs
exports.workflowManualExecutions = exports.w3suiteSchema.table("workflow_manual_executions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Link to queue entry if came from approval queue
    queueId: (0, pg_core_1.uuid)("queue_id").references(() => exports.workflowExecutionQueue.id, { onDelete: 'set null' }),
    // Workflow & Entity
    workflowId: (0, pg_core_1.uuid)("workflow_id").notNull(),
    workflowName: (0, pg_core_1.varchar)("workflow_name", { length: 255 }).notNull(),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(),
    entityId: (0, pg_core_1.varchar)("entity_id", { length: 255 }).notNull(),
    entitySnapshot: (0, pg_core_1.jsonb)("entity_snapshot"), // Entity state at execution time
    // Execution tracking
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('pending').notNull(), // pending, running, completed, failed, cancelled
    executedBy: (0, pg_core_1.varchar)("executed_by").notNull().references(() => exports.users.id),
    executedByName: (0, pg_core_1.varchar)("executed_by_name", { length: 255 }),
    // Timing
    startedAt: (0, pg_core_1.timestamp)("started_at").notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    durationMs: (0, pg_core_1.integer)("duration_ms"),
    // Results
    outputData: (0, pg_core_1.jsonb)("output_data").default({}),
    errorMessage: (0, pg_core_1.text)("error_message"),
    errorDetails: (0, pg_core_1.jsonb)("error_details"),
    // Metadata
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("manual_executions_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("manual_executions_entity_idx").on(table.entityType, table.entityId),
    (0, pg_core_1.index)("manual_executions_workflow_idx").on(table.workflowId),
    (0, pg_core_1.index)("manual_executions_status_idx").on(table.status),
    (0, pg_core_1.index)("manual_executions_executed_by_idx").on(table.executedBy),
    (0, pg_core_1.index)("manual_executions_started_idx").on(table.startedAt),
]);
exports.insertWorkflowManualExecutionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.workflowManualExecutions).omit({
    id: true,
    createdAt: true,
    startedAt: true
}).extend({
    entityType: zod_1.z.enum(['deal', 'lead', 'customer', 'campaign']),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
});
// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) TABLES ====================
// 1) wmsCategories - Product categories (Brand-Tenant hybrid architecture)
exports.wmsCategories = exports.w3suiteSchema.table("wms_categories", {
    // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    id: (0, pg_core_1.varchar)("id", { length: 100 }).notNull(),
    // Brand/Tenant hybrid tracking
    source: (0, exports.productSourceEnum)("source").default('tenant').notNull(), // brand | tenant
    brandCategoryId: (0, pg_core_1.varchar)("brand_category_id", { length: 100 }), // Reference to Brand master category
    isBrandSynced: (0, pg_core_1.boolean)("is_brand_synced").default(false).notNull(),
    // Product type hierarchy - Links category to top-level product type
    productType: (0, exports.productTypeEnum)("product_type").default('PHYSICAL').notNull(), // PHYSICAL | VIRTUAL | SERVICE | CANVAS
    // Category hierarchy (self-referencing for multi-level trees)
    parentCategoryId: (0, pg_core_1.varchar)("parent_category_id", { length: 100 }), // FK to wmsCategories.id for hierarchical structure
    // Category info
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    descrizione: (0, pg_core_1.text)("descrizione"),
    icona: (0, pg_core_1.varchar)("icona", { length: 100 }), // Icon name or emoji
    ordine: (0, pg_core_1.integer)("ordine").default(0).notNull(), // Display order
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    modifiedBy: (0, pg_core_1.varchar)("modified_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.tenantId, table.id] }),
    (0, pg_core_1.uniqueIndex)("wms_categories_tenant_nome_parent_unique").on(table.tenantId, table.nome, table.parentCategoryId), // Prevent sibling dupes
    (0, pg_core_1.index)("wms_categories_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("wms_categories_source_idx").on(table.source),
    (0, pg_core_1.index)("wms_categories_brand_id_idx").on(table.brandCategoryId),
    (0, pg_core_1.index)("wms_categories_product_type_idx").on(table.tenantId, table.productType), // Filter categories by product type
    (0, pg_core_1.index)("wms_categories_parent_idx").on(table.tenantId, table.parentCategoryId), // Tree queries
]);
// Zod schemas for wmsCategories
exports.insertCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.wmsCategories).omit({
    tenantId: true, // Auto-set from session
    id: true, // Auto-generated UUID
    source: true, // Always 'tenant' for user-created categories
    isBrandSynced: true, // Always false for user-created categories
    brandCategoryId: true, // Only set by Brand
    isActive: true, // Defaults to true
    archivedAt: true, // Set only on soft-delete
    createdBy: true, // Auto-set from user session
    modifiedBy: true, // Auto-set from user session
    createdAt: true, // Auto-set on creation
    updatedAt: true, // Auto-set on creation/update
}).extend({
    productType: zod_1.z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
    parentCategoryId: zod_1.z.string().max(100).optional(),
    nome: zod_1.z.string().min(1, "Nome categoria obbligatorio").max(255),
    descrizione: zod_1.z.string().optional(),
    icona: zod_1.z.string().max(100).optional(),
    ordine: zod_1.z.coerce.number().int().default(0),
});
exports.updateCategorySchema = exports.insertCategorySchema.partial();
// 2) wmsProductTypes - Product types within categories (Brand-Tenant hybrid architecture)
exports.wmsProductTypes = exports.w3suiteSchema.table("wms_product_types", {
    // Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    id: (0, pg_core_1.varchar)("id", { length: 100 }).notNull(),
    // Brand/Tenant hybrid tracking
    source: (0, exports.productSourceEnum)("source").default('tenant').notNull(), // brand | tenant
    brandTypeId: (0, pg_core_1.varchar)("brand_type_id", { length: 100 }), // Reference to Brand master type
    isBrandSynced: (0, pg_core_1.boolean)("is_brand_synced").default(false).notNull(),
    // Foreign key to category (REQUIRED - every type must belong to a category)
    categoryId: (0, pg_core_1.varchar)("category_id", { length: 100 }).notNull(), // FK to wmsCategories.id
    // Type info
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    descrizione: (0, pg_core_1.text)("descrizione"),
    ordine: (0, pg_core_1.integer)("ordine").default(0).notNull(), // Display order within category
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    modifiedBy: (0, pg_core_1.varchar)("modified_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.primaryKey)({ columns: [table.tenantId, table.id] }),
    (0, pg_core_1.uniqueIndex)("wms_types_tenant_category_nome_unique").on(table.tenantId, table.categoryId, table.nome),
    (0, pg_core_1.index)("wms_types_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("wms_types_category_idx").on(table.categoryId),
    (0, pg_core_1.index)("wms_types_source_idx").on(table.source),
    (0, pg_core_1.index)("wms_types_brand_id_idx").on(table.brandTypeId),
    // Composite FK: wms_product_types → wms_categories
    (0, pg_core_1.foreignKey)({
        columns: [table.tenantId, table.categoryId],
        foreignColumns: [exports.wmsCategories.tenantId, exports.wmsCategories.id],
    }).onDelete('restrict'),
]);
// 3) products - Master product definition (Brand-Tenant hybrid architecture)
exports.products = exports.w3suiteSchema.table("products", {
    // CRITICAL: Composite PK (tenantId, id) allows identical ID across tenants (Brand push requirement)
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    id: (0, pg_core_1.varchar)("id", { length: 100 }).notNull(), // e.g., "PROD-UUID" or Brand-generated ID
    // Brand/Tenant hybrid tracking
    source: (0, exports.productSourceEnum)("source").default('tenant').notNull(), // brand | tenant
    brandProductId: (0, pg_core_1.varchar)("brand_product_id", { length: 100 }), // Reference to Brand master product
    isBrandSynced: (0, pg_core_1.boolean)("is_brand_synced").default(false).notNull(), // Auto-update when Brand modifies
    // Core product info
    sku: (0, pg_core_1.varchar)("sku", { length: 100 }).notNull(), // Unique per tenant
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(), // Nome/Modello prodotto
    model: (0, pg_core_1.varchar)("model", { length: 255 }), // Modello specifico (es: "iPhone 15 Pro Max")
    description: (0, pg_core_1.text)("description"), // Descrizione dettagliata
    notes: (0, pg_core_1.text)("notes"), // Note aggiuntive
    brand: (0, pg_core_1.varchar)("brand", { length: 100 }), // Marca (es: "Apple", "Samsung")
    ean: (0, pg_core_1.varchar)("ean", { length: 13 }), // EAN-13 barcode
    memory: (0, pg_core_1.varchar)("memory", { length: 50 }), // Memoria (es: "128GB", "256GB", "512GB") - PHYSICAL only
    color: (0, pg_core_1.varchar)("color", { length: 50 }), // Colore (es: "Nero", "Bianco", "Blu Titanio") - PHYSICAL only
    imageUrl: (0, pg_core_1.varchar)("image_url", { length: 512 }), // URL immagine prodotto
    // Product categorization & status
    categoryId: (0, pg_core_1.varchar)("category_id", { length: 100 }), // FK to wmsCategories.id (optional)
    typeId: (0, pg_core_1.varchar)("type_id", { length: 100 }), // FK to wmsProductTypes.id (optional)
    type: (0, exports.productTypeEnum)("type").notNull(), // PHYSICAL | VIRTUAL | SERVICE | CANVAS
    status: (0, exports.productStatusEnum)("status").default('active').notNull(), // active | inactive | discontinued | draft
    condition: (0, exports.productConditionEnum)("condition"), // new | used | refurbished | demo (required for PHYSICAL only)
    isSerializable: (0, pg_core_1.boolean)("is_serializable").default(false).notNull(), // Track at item-level if true
    serialType: (0, exports.serialTypeEnum)("serial_type"), // Tipo seriale: imei | iccid | mac_address | other (required if isSerializable=true)
    monthlyFee: (0, pg_core_1.numeric)("monthly_fee", { precision: 10, scale: 2 }), // Canone mensile €/mese (required if type=CANVAS)
    // Validity period (for time-limited products, promotions, seasonal items)
    validFrom: (0, pg_core_1.date)("valid_from"), // Start date of validity (optional)
    validTo: (0, pg_core_1.date)("valid_to"), // End date of validity - auto-archive when expires (optional)
    // Physical properties (for PHYSICAL type)
    weight: (0, pg_core_1.numeric)("weight", { precision: 10, scale: 3 }), // kg
    dimensions: (0, pg_core_1.jsonb)("dimensions"), // { length, width, height } in cm
    // Attachments (PDF, photos, technical sheets)
    attachments: (0, pg_core_1.jsonb)("attachments").default([]), // Array of { id, name, url, type, size }
    // Stock management
    quantityAvailable: (0, pg_core_1.integer)("quantity_available").default(0).notNull(),
    quantityReserved: (0, pg_core_1.integer)("quantity_reserved").default(0).notNull(),
    reorderPoint: (0, pg_core_1.integer)("reorder_point").default(0).notNull(), // Min stock level before reorder
    warehouseLocation: (0, pg_core_1.varchar)("warehouse_location", { length: 100 }), // Default storage location
    unitOfMeasure: (0, pg_core_1.varchar)("unit_of_measure", { length: 20 }).default('pz').notNull(), // pz, kg, m, etc.
    // Status & lifecycle
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(), // Soft delete
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    modifiedBy: (0, pg_core_1.varchar)("modified_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    // Composite PK for cross-tenant identical IDs (Brand push requirement)
    (0, pg_core_1.primaryKey)({ columns: [table.tenantId, table.id] }),
    // Uniqueness constraints
    (0, pg_core_1.uniqueIndex)("products_tenant_sku_unique").on(table.tenantId, table.sku),
    // Performance indexes (tenant_id first for RLS)
    (0, pg_core_1.index)("products_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("products_tenant_source_idx").on(table.tenantId, table.source),
    (0, pg_core_1.index)("products_tenant_type_idx").on(table.tenantId, table.type),
    (0, pg_core_1.index)("products_tenant_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("products_tenant_active_idx").on(table.tenantId, table.isActive),
    (0, pg_core_1.index)("products_ean_idx").on(table.ean),
    (0, pg_core_1.index)("products_brand_product_id_idx").on(table.brandProductId),
    // Composite FK: products → wms_categories
    (0, pg_core_1.foreignKey)({
        columns: [table.tenantId, table.categoryId],
        foreignColumns: [exports.wmsCategories.tenantId, exports.wmsCategories.id],
    }).onDelete('restrict'),
    // Composite FK: products → wms_product_types
    (0, pg_core_1.foreignKey)({
        columns: [table.tenantId, table.typeId],
        foreignColumns: [exports.wmsProductTypes.tenantId, exports.wmsProductTypes.id],
    }).onDelete('restrict'),
]);
// Base schema without refine (needed for update schema .partial())
const baseProductSchema = (0, drizzle_zod_1.createInsertSchema)(exports.products).omit({
    tenantId: true, // Auto-set from session
    id: true, // Auto-generated UUID
    createdAt: true, // Auto-set on creation
    updatedAt: true, // Auto-set on creation/update
    archivedAt: true, // Set only on soft-delete
    createdBy: true, // Auto-set from user session
    modifiedBy: true // Auto-set from user session
}).extend({
    sku: zod_1.z.string().min(1, "SKU è obbligatorio").max(100),
    name: zod_1.z.string().min(1, "Descrizione è obbligatoria").max(255),
    model: zod_1.z.string().max(255).optional(),
    notes: zod_1.z.string().optional(),
    brand: zod_1.z.string().max(100).optional(),
    imageUrl: zod_1.z.string().max(512).url("URL immagine non valido").or(zod_1.z.literal('')).optional(),
    type: zod_1.z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
    status: zod_1.z.enum(['active', 'inactive', 'discontinued', 'draft']).optional(),
    condition: zod_1.z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
    serialType: zod_1.z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
    monthlyFee: zod_1.z.coerce.number().min(0, "Canone deve essere maggiore o uguale a 0").optional(),
    source: zod_1.z.enum(['brand', 'tenant']).optional(),
    ean: zod_1.z.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(zod_1.z.literal('')).optional(),
    memory: zod_1.z.string().max(50, "Memoria troppo lunga").optional(),
    color: zod_1.z.string().max(50, "Colore troppo lungo").optional(),
    categoryId: zod_1.z.string().max(100).optional(),
    typeId: zod_1.z.string().max(100).optional(),
    validFrom: zod_1.z.coerce.date().optional(),
    validTo: zod_1.z.coerce.date().optional(),
});
// Insert schema with conditional validation
exports.insertProductSchema = baseProductSchema
    .refine((data) => {
    // Validation Rule: serialType is required if isSerializable is true
    if (data.isSerializable && !data.serialType) {
        return false;
    }
    return true;
}, {
    message: "Tipo seriale è obbligatorio quando il prodotto è serializzabile",
    path: ["serialType"],
})
    .refine((data) => {
    // Validation Rule: monthlyFee is required if type is CANVAS
    if (data.type === 'CANVAS') {
        if (!data.monthlyFee || data.monthlyFee <= 0) {
            return false;
        }
    }
    return true;
}, {
    message: "Canone mensile obbligatorio per prodotti di tipo CANVAS",
    path: ["monthlyFee"],
})
    .refine((data) => {
    // Validation Rule: condition is required if type is PHYSICAL
    if (data.type === 'PHYSICAL' && !data.condition) {
        return false;
    }
    return true;
}, {
    message: "Condizioni prodotto sono obbligatorie per prodotti di tipo PHYSICAL",
    path: ["condition"],
})
    .refine((data) => {
    // Validation Rule: validTo must be >= validFrom if both are provided
    if (data.validFrom && data.validTo) {
        const from = new Date(data.validFrom);
        const to = new Date(data.validTo);
        if (to < from) {
            return false;
        }
    }
    return true;
}, {
    message: "Data di fine validità deve essere successiva alla data di inizio",
    path: ["validTo"],
});
// Update schema (partial of base, not refined schema)
exports.updateProductSchema = baseProductSchema.partial();
// 2) product_items - Individual serializable product items tracking
exports.productItems = exports.w3suiteSchema.table("product_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    productId: (0, pg_core_1.varchar)("product_id", { length: 100 }).notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }),
    // Item condition & status
    condition: (0, exports.productConditionEnum)("condition").default('new').notNull(), // new | used | refurbished | demo
    logisticStatus: (0, exports.productLogisticStatusEnum)("logistic_status").default('in_stock').notNull(), // 13 states
    // Lifecycle tracking
    orderId: (0, pg_core_1.uuid)("order_id"), // FK to orders table (future)
    customerId: (0, pg_core_1.uuid)("customer_id"), // FK to customers table
    // Additional info
    notes: (0, pg_core_1.text)("notes"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("product_items_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("product_items_tenant_product_idx").on(table.tenantId, table.productId),
    (0, pg_core_1.index)("product_items_tenant_status_idx").on(table.tenantId, table.logisticStatus),
    (0, pg_core_1.index)("product_items_store_idx").on(table.storeId),
    (0, pg_core_1.index)("product_items_customer_idx").on(table.customerId),
]);
exports.insertProductItemSchema = (0, drizzle_zod_1.createInsertSchema)(exports.productItems).omit({
    id: true,
    tenantId: true, // Auto-set from session context
    createdAt: true,
    updatedAt: true
}).extend({
    condition: zod_1.z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
    logisticStatus: zod_1.z.enum([
        'in_stock', 'reserved', 'preparing', 'shipping', 'delivered',
        'customer_return', 'doa_return', 'in_service', 'supplier_return',
        'in_transfer', 'lost', 'damaged', 'internal_use'
    ]).optional(),
});
exports.updateProductItemSchema = exports.insertProductItemSchema.partial().omit({
    createdAt: true // Never modifiable
});
// 3) product_serials - IMEI/ICCID/MAC address tracking
exports.productSerials = exports.w3suiteSchema.table("product_serials", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    productItemId: (0, pg_core_1.uuid)("product_item_id").notNull().references(() => exports.productItems.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Serial identification
    serialType: (0, exports.serialTypeEnum)("serial_type").notNull(), // imei | iccid | mac_address | other
    serialValue: (0, pg_core_1.varchar)("serial_value", { length: 100 }).notNull(),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    // CRITICAL: Tenant-scoped serial uniqueness
    (0, pg_core_1.uniqueIndex)("product_serials_tenant_value_unique").on(table.tenantId, table.serialValue),
    (0, pg_core_1.index)("product_serials_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("product_serials_item_idx").on(table.productItemId),
    (0, pg_core_1.index)("product_serials_type_idx").on(table.serialType),
]);
exports.insertProductSerialSchema = (0, drizzle_zod_1.createInsertSchema)(exports.productSerials).omit({
    id: true,
    tenantId: true,
    createdAt: true
}).extend({
    serialType: zod_1.z.enum(['imei', 'iccid', 'mac_address', 'other']),
    serialValue: zod_1.z.string().min(1, "Valore seriale è obbligatorio").max(100),
});
// 4) wms_inventory_adjustments - Stock reconciliation audit trail
exports.wmsInventoryAdjustments = exports.w3suiteSchema.table("wms_inventory_adjustments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.varchar)("product_id", { length: 100 }).notNull(),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }),
    // Reconciliation data
    expectedCount: (0, pg_core_1.integer)("expected_count").notNull(),
    actualCount: (0, pg_core_1.integer)("actual_count").notNull(),
    discrepancy: (0, pg_core_1.integer)("discrepancy").notNull(), // actualCount - expectedCount
    adjustmentType: (0, pg_core_1.varchar)("adjustment_type", { length: 20 }).notNull(), // 'surplus' | 'shortage'
    // Metadata
    notes: (0, pg_core_1.text)("notes"),
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)("wms_inv_adj_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("wms_inv_adj_product_idx").on(table.productId),
    (0, pg_core_1.index)("wms_inv_adj_store_idx").on(table.storeId),
    (0, pg_core_1.index)("wms_inv_adj_type_idx").on(table.adjustmentType),
    (0, pg_core_1.index)("wms_inv_adj_created_idx").on(table.createdAt),
]);
exports.insertInventoryAdjustmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.wmsInventoryAdjustments).omit({
    id: true,
    tenantId: true,
    createdAt: true
});
// 5) wms_stock_movements - Operational stock movements (purchases, sales, transfers)
exports.wmsStockMovements = exports.w3suiteSchema.table("wms_stock_movements", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Movement classification
    movementType: (0, exports.stockMovementTypeEnum)("movement_type").notNull(), // purchase_in, sale_out, return_in, transfer, adjustment, damaged
    movementDirection: (0, exports.stockMovementDirectionEnum)("movement_direction").notNull(), // inbound | outbound
    // Product reference
    productId: (0, pg_core_1.varchar)("product_id", { length: 100 }).notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    productItemId: (0, pg_core_1.uuid)("product_item_id").references(() => exports.productItems.id, { onDelete: 'set null' }), // For serialized items
    productBatchId: (0, pg_core_1.uuid)("product_batch_id").references(() => exports.productBatches.id, { onDelete: 'set null' }), // For batch tracking
    // Location tracking
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }), // Current store context
    sourceStoreId: (0, pg_core_1.uuid)("source_store_id").references(() => exports.stores.id, { onDelete: 'set null' }), // For transfers OUT
    destinationStoreId: (0, pg_core_1.uuid)("destination_store_id").references(() => exports.stores.id, { onDelete: 'set null' }), // For transfers IN
    warehouseLocation: (0, pg_core_1.varchar)("warehouse_location", { length: 100 }), // Shelf/zone location
    // Quantity tracking
    quantityDelta: (0, pg_core_1.integer)("quantity_delta").notNull(), // Signed: positive for inbound, negative for outbound
    // External references
    referenceType: (0, pg_core_1.varchar)("reference_type", { length: 50 }), // 'order', 'return', 'adjustment', 'purchase_order'
    referenceId: (0, pg_core_1.varchar)("reference_id", { length: 100 }), // External ID (orderId, adjustmentId, etc.)
    externalParty: (0, pg_core_1.varchar)("external_party", { length: 255 }), // Supplier name, customer name, etc.
    // Timestamps
    occurredAt: (0, pg_core_1.timestamp)("occurred_at").defaultNow().notNull(), // When movement happened
    // Audit trail
    notes: (0, pg_core_1.text)("notes"),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Extensibility for custom data
    createdBy: (0, pg_core_1.varchar)("created_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => [
    // Performance indexes
    (0, pg_core_1.index)("wms_stock_mov_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("wms_stock_mov_tenant_product_occurred_idx").on(table.tenantId, table.productId, table.occurredAt.desc()),
    (0, pg_core_1.index)("wms_stock_mov_tenant_store_occurred_idx").on(table.tenantId, table.storeId, table.occurredAt.desc()),
    (0, pg_core_1.index)("wms_stock_mov_tenant_type_occurred_idx").on(table.tenantId, table.movementType, table.occurredAt.desc()),
    (0, pg_core_1.index)("wms_stock_mov_direction_idx").on(table.movementDirection),
    (0, pg_core_1.index)("wms_stock_mov_batch_idx").on(table.productBatchId),
    (0, pg_core_1.index)("wms_stock_mov_item_idx").on(table.productItemId),
    // Prevent duplicate postings for same reference
    (0, pg_core_1.uniqueIndex)("wms_stock_mov_reference_unique").on(table.referenceType, table.referenceId, table.movementDirection).where((0, drizzle_orm_1.sql) `reference_type IS NOT NULL AND reference_id IS NOT NULL`),
]);
exports.insertStockMovementSchema = (0, drizzle_zod_1.createInsertSchema)(exports.wmsStockMovements).omit({
    id: true,
    tenantId: true,
    createdAt: true
}).extend({
    movementType: zod_1.z.enum(['purchase_in', 'sale_out', 'return_in', 'transfer', 'adjustment', 'damaged']),
    movementDirection: zod_1.z.enum(['inbound', 'outbound']),
    quantityDelta: zod_1.z.number().int().refine((val) => val !== 0, "Quantity delta non può essere zero"),
    productId: zod_1.z.string().uuid("Product ID deve essere UUID valido"),
    occurredAt: zod_1.z.string().datetime().or(zod_1.z.date()).optional(), // ISO string or Date object
});
// 6) product_item_status_history - Audit trail for logistic status changes
exports.productItemStatusHistory = exports.w3suiteSchema.table("product_item_status_history", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    productItemId: (0, pg_core_1.uuid)("product_item_id").notNull().references(() => exports.productItems.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    // Status transition
    fromStatus: (0, exports.productLogisticStatusEnum)("from_status"),
    toStatus: (0, exports.productLogisticStatusEnum)("to_status").notNull(),
    // Change metadata
    changedAt: (0, pg_core_1.timestamp)("changed_at").defaultNow().notNull(),
    changedBy: (0, pg_core_1.varchar)("changed_by").references(() => exports.users.id),
    changedByName: (0, pg_core_1.varchar)("changed_by_name", { length: 255 }),
    notes: (0, pg_core_1.text)("notes"),
    // Optional order reference
    referenceOrderId: (0, pg_core_1.uuid)("reference_order_id"), // FK to orders table (future)
}, (table) => [
    (0, pg_core_1.index)("item_history_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("item_history_tenant_item_changed_idx").on(table.tenantId, table.productItemId, table.changedAt.desc()),
    (0, pg_core_1.index)("item_history_changed_by_idx").on(table.changedBy),
]);
exports.insertProductItemStatusHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.productItemStatusHistory).omit({
    id: true,
    changedAt: true
}).extend({
    toStatus: zod_1.z.enum([
        'in_stock', 'reserved', 'preparing', 'shipping', 'delivered',
        'customer_return', 'doa_return', 'in_service', 'supplier_return',
        'in_transfer', 'lost', 'damaged', 'internal_use'
    ]),
});
// 5) product_batches - Non-serializable product batch tracking
exports.productBatches = exports.w3suiteSchema.table("product_batches", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    productId: (0, pg_core_1.varchar)("product_id", { length: 100 }).notNull().references(() => exports.products.id, { onDelete: 'cascade' }),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'set null' }),
    // Batch info
    batchNumber: (0, pg_core_1.varchar)("batch_number", { length: 100 }).notNull(),
    initialQuantity: (0, pg_core_1.integer)("initial_quantity").default(0).notNull(), // Original quantity (for KPI: usedQuantity calculation)
    quantity: (0, pg_core_1.integer)("quantity").default(0).notNull(), // Current quantity
    reserved: (0, pg_core_1.integer)("reserved").default(0).notNull(), // Reserved quantity
    warehouseLocation: (0, pg_core_1.varchar)("warehouse_location", { length: 100 }),
    supplier: (0, pg_core_1.varchar)("supplier", { length: 255 }), // Supplier name
    notes: (0, pg_core_1.text)("notes"), // Additional batch notes
    // Batch lifecycle
    receivedDate: (0, pg_core_1.date)("received_date"),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    status: (0, exports.productBatchStatusEnum)("status").default('available').notNull(), // available | reserved | damaged | expired
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    // Unique batch per product per store
    (0, pg_core_1.uniqueIndex)("product_batches_tenant_product_store_batch_unique").on(table.tenantId, table.productId, table.storeId, table.batchNumber),
    (0, pg_core_1.index)("product_batches_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("product_batches_tenant_product_idx").on(table.tenantId, table.productId),
    (0, pg_core_1.index)("product_batches_store_idx").on(table.storeId),
    (0, pg_core_1.index)("product_batches_status_idx").on(table.status),
    (0, pg_core_1.index)("product_batches_expiry_idx").on(table.expiryDate),
]);
exports.insertProductBatchSchema = (0, drizzle_zod_1.createInsertSchema)(exports.productBatches).omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true
}).extend({
    batchNumber: zod_1.z.string().min(1, "Numero lotto è obbligatorio").max(100),
    initialQuantity: zod_1.z.number().int().min(0, "Quantità iniziale deve essere positiva").optional(), // Auto-set to quantity if omitted
    quantity: zod_1.z.number().int().min(0, "Quantità deve essere positiva"),
    reserved: zod_1.z.number().int().min(0, "Quantità riservata deve essere positiva").optional(),
    status: zod_1.z.enum(['available', 'reserved', 'damaged', 'expired']).optional(),
    supplier: zod_1.z.string().max(255, "Nome fornitore troppo lungo").optional(),
    notes: zod_1.z.string().optional(),
});
// 7) wms_warehouse_locations - Structured warehouse location management
exports.wmsWarehouseLocations = exports.w3suiteSchema.table("wms_warehouse_locations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.tenants.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)("store_id").references(() => exports.stores.id, { onDelete: 'cascade' }),
    // Location identification
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(), // "A-12-5" (zone-aisle-shelf)
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(), // "Warehouse A - Aisle 12 - Shelf 5"
    // Hierarchical structure
    zone: (0, pg_core_1.varchar)("zone", { length: 50 }), // "A", "B", "Cold Storage"
    aisle: (0, pg_core_1.varchar)("aisle", { length: 20 }), // "12"
    shelf: (0, pg_core_1.varchar)("shelf", { length: 20 }), // "5"
    level: (0, pg_core_1.integer)("level").default(0), // Floor level: 0=ground, 1=first, etc.
    // Capacity management
    capacity: (0, pg_core_1.integer)("capacity").default(0).notNull(), // Max items
    currentOccupancy: (0, pg_core_1.integer)("current_occupancy").default(0).notNull(), // Current items
    // Location characteristics
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    locationType: (0, pg_core_1.varchar)("location_type", { length: 50 }).default('shelf'), // shelf | pallet | bin | floor
    // Optional metadata (temperature control, hazmat, dimensions, etc.)
    metadata: (0, pg_core_1.jsonb)("metadata"),
    notes: (0, pg_core_1.text)("notes"),
    // Audit
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    // Unique code per tenant per store
    (0, pg_core_1.uniqueIndex)("wms_locations_tenant_store_code_unique").on(table.tenantId, table.storeId, table.code),
    (0, pg_core_1.index)("wms_locations_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("wms_locations_tenant_store_idx").on(table.tenantId, table.storeId),
    (0, pg_core_1.index)("wms_locations_zone_idx").on(table.zone),
    (0, pg_core_1.index)("wms_locations_active_idx").on(table.isActive),
    (0, pg_core_1.index)("wms_locations_type_idx").on(table.locationType),
]);
exports.insertWarehouseLocationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.wmsWarehouseLocations).omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
    currentOccupancy: true // Auto-calculated
}).extend({
    code: zod_1.z.string().min(1, "Codice location è obbligatorio").max(50),
    name: zod_1.z.string().min(1, "Nome location è obbligatorio").max(255),
    zone: zod_1.z.string().max(50, "Zona troppo lunga").optional(),
    aisle: zod_1.z.string().max(20, "Corridoio troppo lungo").optional(),
    shelf: zod_1.z.string().max(20, "Scaffale troppo lungo").optional(),
    level: zod_1.z.number().int().min(0, "Livello deve essere >= 0").optional(),
    capacity: zod_1.z.number().int().min(0, "Capacità deve essere positiva").optional(),
    isActive: zod_1.z.boolean().optional(),
    locationType: zod_1.z.enum(['shelf', 'pallet', 'bin', 'floor']).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    notes: zod_1.z.string().optional(),
});
