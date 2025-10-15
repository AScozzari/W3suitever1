import { pgTable, index, varchar, jsonb, timestamp, uuid, unique, boolean, text, smallint, integer, uniqueIndex, foreignKey, pgView, bigint, doublePrecision, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const activityFeedActorType = pgEnum("activity_feed_actor_type", ['user', 'system', 'webhook'])
export const activityFeedCategory = pgEnum("activity_feed_category", ['TASK', 'WORKFLOW', 'HR', 'CRM', 'WEBHOOK', 'SYSTEM'])
export const activityFeedInteractionType = pgEnum("activity_feed_interaction_type", ['like', 'comment', 'share', 'bookmark', 'hide'])
export const activityFeedPriority = pgEnum("activity_feed_priority", ['low', 'normal', 'high'])
export const calendarEventCategory = pgEnum("calendar_event_category", ['sales', 'finance', 'hr', 'crm', 'support', 'operations', 'marketing'])
export const calendarEventStatus = pgEnum("calendar_event_status", ['tentative', 'confirmed', 'cancelled'])
export const calendarEventType = pgEnum("calendar_event_type", ['meeting', 'shift', 'time_off', 'overtime', 'training', 'deadline', 'other'])
export const calendarEventVisibility = pgEnum("calendar_event_visibility", ['private', 'team', 'store', 'area', 'tenant'])
export const channelType = pgEnum("channel_type", ['FRANCHISING', 'TOP_DEALER', 'DEALER'])
export const chatChannelType = pgEnum("chat_channel_type", ['team', 'dm', 'task_thread', 'general'])
export const chatInviteStatus = pgEnum("chat_invite_status", ['pending', 'accepted', 'declined'])
export const chatMemberRole = pgEnum("chat_member_role", ['owner', 'admin', 'member'])
export const chatNotificationPreference = pgEnum("chat_notification_preference", ['all', 'mentions', 'none'])
export const chatVisibility = pgEnum("chat_visibility", ['public', 'private'])
export const crmCustomerType = pgEnum("crm_customer_type", ['b2b', 'b2c'])
export const crmInboundChannel = pgEnum("crm_inbound_channel", ['landing_page', 'web_form', 'whatsapp_inbound', 'cold_call_inbound', 'linkedin_campaign', 'partner_referral', 'facebook', 'instagram', 'tiktok', 'youtube', 'twitter'])
export const crmLegalForm = pgEnum("crm_legal_form", ['ditta_individuale', 'snc', 'sas', 'srl', 'srls', 'spa', 'sapa', 'sc', 'societa_semplice', 'associazione', 'fondazione', 'cooperativa', 'altro'])
export const crmOutboundChannel = pgEnum("crm_outbound_channel", ['email', 'telegram', 'whatsapp', 'phone', 'linkedin', 'social_dm', 'sms'])
export const customerType = pgEnum("customer_type", ['b2c', 'b2b'])
export const department = pgEnum("department", ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing'])
export const driverType = pgEnum("driver_type", ['FISSO', 'MOBILE', 'ENERGIA', 'PROTEZIONE', 'ASSICURAZIONE'])
export const expenseCategory = pgEnum("expense_category", ['travel', 'meal', 'accommodation', 'transport', 'supplies', 'other'])
export const expensePaymentMethod = pgEnum("expense_payment_method", ['cash', 'credit_card', 'bank_transfer'])
export const expenseReportStatus = pgEnum("expense_report_status", ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'])
export const hrAnnouncementAudience = pgEnum("hr_announcement_audience", ['all', 'store', 'area', 'role', 'specific'])
export const hrAnnouncementPriority = pgEnum("hr_announcement_priority", ['low', 'medium', 'high', 'urgent'])
export const hrAnnouncementType = pgEnum("hr_announcement_type", ['policy', 'event', 'deadline', 'benefit', 'general'])
export const hrDocumentSource = pgEnum("hr_document_source", ['employee', 'hr', 'system'])
export const hrDocumentType = pgEnum("hr_document_type", ['payslip', 'contract', 'certificate', 'id_document', 'cv', 'evaluation', 'warning', 'other'])
export const leadRoutingConfidence = pgEnum("lead_routing_confidence", ['low', 'medium', 'high', 'very_high'])
export const leaveRequestStatus = pgEnum("leave_request_status", ['draft', 'pending', 'approved', 'rejected', 'cancelled'])
export const leaveType = pgEnum("leave_type", ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other'])
export const notificationCategory = pgEnum("notification_category", ['crm', 'finance', 'hr', 'sales', 'support', 'operations', 'marketing'])
export const notificationPriority = pgEnum("notification_priority", ['low', 'medium', 'high', 'critical'])
export const notificationStatus = pgEnum("notification_status", ['unread', 'read'])
export const notificationType = pgEnum("notification_type", ['system', 'security', 'data', 'custom'])
export const objectType = pgEnum("object_type", ['avatar', 'document', 'image', 'file'])
export const objectVisibility = pgEnum("object_visibility", ['public', 'private'])
export const outboundChannel = pgEnum("outbound_channel", ['email', 'phone', 'whatsapp', 'linkedin', 'sms'])
export const permMode = pgEnum("perm_mode", ['GRANT', 'REVOKE'])
export const permissionScope = pgEnum("permission_scope", ['system', 'tenant', 'rs', 'store'])
export const scopeType = pgEnum("scope_type", ['tenant', 'legal_entity', 'store'])
export const shiftPattern = pgEnum("shift_pattern", ['daily', 'weekly', 'monthly', 'custom'])
export const shiftStatus = pgEnum("shift_status", ['draft', 'published', 'in_progress', 'completed', 'cancelled'])
export const shiftType = pgEnum("shift_type", ['morning', 'afternoon', 'night', 'full_day', 'split', 'on_call'])
export const storeType = pgEnum("store_type", ['flagship', 'franchise', 'outlet', 'pop_up'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'suspended', 'cancelled', 'trial'])
export const supplierOrigin = pgEnum("supplier_origin", ['brand', 'tenant'])
export const supplierStatus = pgEnum("supplier_status", ['active', 'suspended', 'blocked'])
export const supplierType = pgEnum("supplier_type", ['distributore', 'produttore', 'servizi', 'logistica'])
export const tenantType = pgEnum("tenant_type", ['franchise', 'corporate', 'independent'])
export const timeTrackingStatus = pgEnum("time_tracking_status", ['active', 'completed', 'edited', 'disputed'])
export const trackingMethod = pgEnum("tracking_method", ['badge', 'nfc', 'app', 'gps', 'manual', 'biometric', 'qr'])
export const userRole = pgEnum("user_role", ['super_admin', 'tenant_admin', 'store_manager', 'cashier', 'user'])
export const userStatus = pgEnum("user_status", ['attivo', 'sospeso', 'off-boarding'])


export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const universalRequests = pgTable("universal_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	requestType: varchar("request_type", { length: 100 }).notNull(),
	requesterId: varchar("requester_id"),
	requestData: jsonb("request_data").notNull(),
	status: varchar({ length: 50 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const channels = pgTable("channels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("channels_code_key").on(table.code),
]);

export const brands = pgTable("brands", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 50 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("brands_code_key").on(table.code),
]);

export const drivers = pgTable("drivers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("drivers_code_key").on(table.code),
]);

export const italianCities = pgTable("italian_cities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	province: varchar({ length: 2 }).notNull(),
	provinceName: varchar("province_name", { length: 100 }).notNull(),
	region: varchar({ length: 100 }).notNull(),
	postalCode: varchar("postal_code", { length: 5 }).notNull(),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("italian_cities_name_province_key").on(table.name, table.province),
]);

export const legalForms = pgTable("legal_forms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	minCapital: varchar("min_capital", { length: 50 }),
	liability: varchar({ length: 50 }),
	active: boolean().default(true),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("legal_forms_code_key").on(table.code),
]);

export const countries = pgTable("countries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 3 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	active: boolean().default(true),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("countries_code_key").on(table.code),
]);

export const commercialAreas = pgTable("commercial_areas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("commercial_areas_code_key").on(table.code),
]);

export const italianCitiesBackup = pgTable("italian_cities_backup", {
	id: uuid(),
	name: varchar({ length: 100 }),
	province: varchar({ length: 2 }),
	provinceName: varchar("province_name", { length: 100 }),
	region: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 5 }),
	active: boolean(),
	createdAt: timestamp("created_at", { mode: 'string' }),
});

export const paymentMethods = pgTable("payment_methods", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	category: varchar({ length: 50 }).notNull(),
	requiresIban: boolean("requires_iban").default(false),
	requiresAuth: boolean("requires_auth").default(false),
	supportsBatching: boolean("supports_batching").default(false),
	countryCode: varchar("country_code", { length: 3 }),
	active: boolean().default(true),
	isDefault: boolean("is_default").default(false),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_methods_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_payment_methods_country").using("btree", table.countryCode.asc().nullsLast().op("text_ops")),
	unique("payment_methods_code_key").on(table.code),
]);

export const paymentMethodsConditions = pgTable("payment_methods_conditions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	days: smallint(),
	type: varchar({ length: 50 }).notNull(),
	calculation: varchar({ length: 50 }),
	active: boolean().default(true),
	isDefault: boolean("is_default").default(false),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_conditions_days").using("btree", table.days.asc().nullsLast().op("int2_ops")),
	index("idx_payment_conditions_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("payment_methods_conditions_code_key").on(table.code),
]);

export const aiTrainingSessions = pgTable("ai_training_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: varchar("user_id").notNull(),
	sessionType: varchar("session_type", { length: 50 }).notNull(),
	sessionStatus: varchar("session_status", { length: 50 }).default('active').notNull(),
	sourceUrl: text("source_url"),
	sourceFile: text("source_file"),
	contentType: varchar("content_type", { length: 100 }),
	totalChunks: integer("total_chunks").default(0),
	processedChunks: integer("processed_chunks").default(0),
	failedChunks: integer("failed_chunks").default(0),
	originalQuery: text("original_query"),
	originalResponse: text("original_response"),
	correctedResponse: text("corrected_response"),
	validationFeedback: jsonb("validation_feedback"),
	processingTimeMs: integer("processing_time_ms"),
	tokensProcessed: integer("tokens_processed").default(0),
	embeddingsCreated: integer("embeddings_created").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	contentExtracted: text("content_extracted"),
	metadata: jsonb(),
	processingError: text("processing_error"),
	tokenCount: integer("token_count"),
	aiResponse: text("ai_response"),
}, (table) => [
	index("ai_training_sessions_status_idx").using("btree", table.sessionStatus.asc().nullsLast().op("text_ops")),
	index("ai_training_sessions_tenant_user_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("ai_training_sessions_timestamp_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("ai_training_sessions_type_idx").using("btree", table.sessionType.asc().nullsLast().op("text_ops")),
]);

export const driverCategories = pgTable("driver_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	driverId: uuid("driver_id").notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	active: boolean().default(true),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("driver_categories_unique").using("btree", table.driverId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	index("idx_driver_categories_driver").using("btree", table.driverId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.driverId],
			foreignColumns: [drivers.id],
			name: "driver_categories_driver_id_fkey"
		}).onDelete("cascade"),
]);

export const driverTypologies = pgTable("driver_typologies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	categoryId: uuid("category_id").notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	active: boolean().default(true),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("driver_typologies_unique").using("btree", table.categoryId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	index("idx_driver_typologies_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [driverCategories.id],
			name: "driver_typologies_category_id_fkey"
		}).onDelete("cascade"),
]);

export const utmSources = pgTable("utm_sources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	iconUrl: text("icon_url"),
	isActive: boolean("is_active").default(true),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_utm_sources_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_utm_sources_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	unique("utm_sources_code_key").on(table.code),
]);

export const utmMediums = pgTable("utm_mediums", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	description: text(),
	applicableSources: jsonb("applicable_sources"),
	isActive: boolean("is_active").default(true),
	sortOrder: smallint("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_utm_mediums_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("utm_mediums_code_key").on(table.code),
]);
export const rlsStatus = pgView("rls_status", {	// TODO: failed to parse database type 'name'
	schemaname: unknown("schemaname"),
	// TODO: failed to parse database type 'name'
	tablename: unknown("tablename"),
	rlsEnabled: boolean("rls_enabled"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	policiesCount: bigint("policies_count", { mode: "number" }),
}).as(sql`SELECT schemaname, tablename, rowsecurity AS rls_enabled, ( SELECT count(*) AS count FROM pg_policies WHERE pg_policies.schemaname = pg_policies.schemaname AND pg_policies.tablename = pg_policies.tablename) AS policies_count FROM pg_tables WHERE schemaname = 'public'::name ORDER BY tablename`);

export const rlsStatusMultiSchema = pgView("rls_status_multi_schema", {	// TODO: failed to parse database type 'name'
	schemaname: unknown("schemaname"),
	// TODO: failed to parse database type 'name'
	tablename: unknown("tablename"),
	rlsEnabled: boolean("rls_enabled"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	policiesCount: bigint("policies_count", { mode: "number" }),
}).as(sql`SELECT schemaname, tablename, rowsecurity AS rls_enabled, ( SELECT count(*) AS count FROM pg_policies WHERE pg_policies.schemaname = pg_policies.schemaname AND pg_policies.tablename = pg_policies.tablename) AS policies_count FROM pg_tables WHERE schemaname = ANY (ARRAY['public'::name, 'brand_interface'::name]) ORDER BY schemaname, tablename`);

export const workflowSteps = pgView("workflow_steps", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	templateId: uuid("template_id"),
	nodeId: varchar("node_id", { length: 100 }),
	stepType: varchar("step_type", { length: 50 }),
	name: varchar({ length: 200 }),
	description: text(),
	actionId: uuid("action_id"),
	triggerId: uuid("trigger_id"),
	approverType: varchar("approver_type", { length: 50 }),
	approvers: text(),
	requiredApprovals: integer("required_approvals"),
	approvalMode: varchar("approval_mode", { length: 50 }),
	conditions: jsonb(),
	metadata: jsonb(),
	slaHours: integer("sla_hours"),
	escalationAfterHours: integer("escalation_after_hours"),
	escalationTo: text("escalation_to"),
	positionX: doublePrecision("position_x"),
	positionY: doublePrecision("position_y"),
	executionOrder: integer("execution_order"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}).as(sql`SELECT id, tenant_id, template_id, node_id, step_type, name, description, action_id, trigger_id, approver_type, approvers, required_approvals, approval_mode, conditions, metadata, sla_hours, escalation_after_hours, escalation_to, position_x, position_y, execution_order, created_at, updated_at FROM w3suite.workflow_steps`);

export const workflowInstances = pgView("workflow_instances", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	templateId: uuid("template_id"),
	instanceType: varchar("instance_type", { length: 100 }),
	instanceName: varchar("instance_name", { length: 200 }),
	referenceId: varchar("reference_id", { length: 200 }),
	currentStatus: varchar("current_status", { length: 50 }),
	currentStepId: uuid("current_step_id"),
	currentNodeId: varchar("current_node_id", { length: 100 }),
	currentAssignee: varchar("current_assignee"),
	assignedTeamId: uuid("assigned_team_id"),
	assignedUsers: text("assigned_users"),
	escalationLevel: integer("escalation_level"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }),
	context: jsonb(),
	workflowData: jsonb("workflow_data"),
	metadata: jsonb(),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}).as(sql`SELECT id, tenant_id, template_id, instance_type, instance_name, reference_id, current_status, current_step_id, current_node_id, current_assignee, assigned_team_id, assigned_users, escalation_level, started_at, completed_at, last_activity_at, context, workflow_data, metadata, created_by, updated_by, created_at, updated_at FROM w3suite.workflow_instances`);

export const tenants = pgView("tenants", {	id: uuid(),
	name: varchar({ length: 255 }),
	slug: varchar({ length: 100 }),
	subdomain: text(),
	settings: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT id, name, slug, NULL::text AS subdomain, settings, created_at, updated_at FROM w3suite.tenants`);

export const users = pgView("users", {	id: varchar(),
	email: varchar(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	tenantId: uuid("tenant_id"),
	isActive: boolean("is_active"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}).as(sql`SELECT id, email, first_name, last_name, tenant_id, is_system_admin AS is_active, created_at, updated_at FROM w3suite.users`);

export const roles = pgView("roles", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	name: varchar({ length: 100 }),
	description: text(),
	isSystem: boolean("is_system"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT id, tenant_id, name, description, is_system, created_at FROM w3suite.roles`);

export const teams = pgView("teams", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	name: varchar({ length: 200 }),
	description: text(),
	teamType: varchar("team_type", { length: 50 }),
	userMembers: text("user_members"),
	roleMembers: text("role_members"),
	primarySupervisor: varchar("primary_supervisor"),
	secondarySupervisors: text("secondary_supervisors"),
	requiredSupervisorPermission: varchar("required_supervisor_permission", { length: 200 }),
	scope: jsonb(),
	permissions: jsonb(),
	isActive: boolean("is_active"),
	autoAssignWorkflows: boolean("auto_assign_workflows"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
}).as(sql`SELECT id, tenant_id, name, description, team_type, user_members, role_members, primary_supervisor, secondary_supervisors, required_supervisor_permission, scope, permissions, is_active, auto_assign_workflows, created_at, updated_at, created_by, updated_by FROM w3suite.teams`);

export const stores = pgView("stores", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	legalEntityId: uuid("legal_entity_id"),
	code: varchar({ length: 50 }),
	nome: varchar({ length: 255 }),
	channelId: uuid("channel_id"),
	address: text(),
	citta: varchar({ length: 100 }),
	provincia: varchar({ length: 10 }),
	region: varchar({ length: 100 }),
	geo: jsonb(),
	status: varchar({ length: 50 }),
	openedAt: date("opened_at"),
	closedAt: date("closed_at"),
	billingOverrideId: uuid("billing_override_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	commercialAreaId: uuid("commercial_area_id"),
	cap: varchar({ length: 10 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 255 }),
	whatsapp1: varchar({ length: 20 }),
	whatsapp2: varchar({ length: 20 }),
	facebook: varchar({ length: 255 }),
	instagram: varchar({ length: 255 }),
	tiktok: varchar({ length: 255 }),
	googleMapsUrl: text("google_maps_url"),
	telegram: varchar({ length: 255 }),
}).as(sql`SELECT id, tenant_id, legal_entity_id, code, nome, channel_id, address, citta, provincia, region, geo, status, opened_at, closed_at, billing_override_id, created_at, updated_at, archived_at, commercial_area_id, cap, phone, email, whatsapp1, whatsapp2, facebook, instagram, tiktok, google_maps_url, telegram FROM w3suite.stores`);

export const legalEntities = pgView("legal_entities", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	nome: varchar({ length: 255 }),
	piva: varchar({ length: 50 }),
	billingProfileId: uuid("billing_profile_id"),
	stato: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	codiceFiscale: varchar({ length: 50 }),
	formaGiuridica: varchar({ length: 100 }),
	capitaleSociale: varchar({ length: 50 }),
	dataCostituzione: date(),
	indirizzo: text(),
	citta: varchar({ length: 100 }),
	provincia: varchar({ length: 10 }),
	cap: varchar({ length: 10 }),
	telefono: varchar({ length: 50 }),
	email: varchar({ length: 255 }),
	pec: varchar({ length: 255 }),
	rea: varchar({ length: 50 }),
	registroImprese: varchar({ length: 100 }),
	codice: varchar({ length: 20 }),
	logo: text(),
	codiceSdi: varchar({ length: 10 }),
	refAmminNome: varchar({ length: 100 }),
	refAmminCognome: varchar({ length: 100 }),
	refAmminEmail: varchar({ length: 255 }),
	refAmminCodiceFiscale: varchar({ length: 16 }),
	refAmminIndirizzo: text(),
	refAmminCitta: varchar({ length: 100 }),
	refAmminCap: varchar({ length: 10 }),
	refAmminPaese: varchar({ length: 100 }),
	note: text(),
}).as(sql`SELECT id, tenant_id, nome, piva, billing_profile_id, stato, created_at, updated_at, archived_at, "codiceFiscale", "formaGiuridica", "capitaleSociale", "dataCostituzione", indirizzo, citta, provincia, cap, telefono, email, pec, rea, "registroImprese", codice, logo, "codiceSDI", "refAmminNome", "refAmminCognome", "refAmminEmail", "refAmminCodiceFiscale", "refAmminIndirizzo", "refAmminCitta", "refAmminCap", "refAmminPaese", note FROM w3suite.legal_entities`);

export const notifications = pgView("notifications", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	type: text(),
	priority: text(),
	status: text(),
	title: text(),
	message: text(),
	data: jsonb(),
	url: text(),
	targetUserId: text("target_user_id"),
	targetRoles: text("target_roles"),
	broadcast: boolean(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT id, tenant_id, type, priority, status, title, message, data, url, target_user_id, target_roles, broadcast, created_at, expires_at FROM w3suite.notifications`);

export const workflowActions = pgView("workflow_actions", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	category: varchar({ length: 50 }),
	actionId: varchar("action_id", { length: 100 }),
	name: varchar({ length: 200 }),
	description: text(),
	requiredPermission: varchar("required_permission", { length: 200 }),
	constraints: jsonb(),
	actionType: varchar("action_type", { length: 50 }),
	priority: integer(),
	isActive: boolean("is_active"),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
}).as(sql`SELECT id, tenant_id, category, action_id, name, description, required_permission, constraints, action_type, priority, is_active, created_at, updated_at, created_by, updated_by FROM w3suite.workflow_actions`);

export const workflowTemplates = pgView("workflow_templates", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	name: varchar({ length: 200 }),
	description: text(),
	category: varchar({ length: 50 }),
	templateType: varchar("template_type", { length: 100 }),
	nodes: jsonb(),
	edges: jsonb(),
	viewport: jsonb(),
	isPublic: boolean("is_public"),
	version: integer(),
	isActive: boolean("is_active"),
	tags: text(),
	usageCount: integer("usage_count"),
	lastUsed: timestamp("last_used", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
}).as(sql`SELECT id, tenant_id, name, description, category, template_type, nodes, edges, viewport, is_public, version, is_active, tags, usage_count, last_used, created_at, updated_at, created_by, updated_by FROM w3suite.workflow_templates`);

export const workflowExecutions = pgView("workflow_executions", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	instanceId: uuid("instance_id"),
	stepId: uuid("step_id"),
	executionType: varchar("execution_type", { length: 50 }),
	executorId: varchar("executor_id"),
	automatedBy: varchar("automated_by", { length: 100 }),
	inputData: jsonb("input_data"),
	outputData: jsonb("output_data"),
	status: varchar({ length: 50 }),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: integer(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }),
}).as(sql`SELECT id, tenant_id, instance_id, step_id, execution_type, executor_id, automated_by, input_data, output_data, status, error_message, retry_count, started_at, completed_at, duration, metadata, created_at FROM w3suite.workflow_executions`);

export const workflowTriggers = pgView("workflow_triggers", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	category: varchar({ length: 50 }),
	triggerId: varchar("trigger_id", { length: 100 }),
	name: varchar({ length: 200 }),
	description: text(),
	requiredPermission: varchar("required_permission", { length: 200 }),
	triggerType: varchar("trigger_type", { length: 50 }),
	config: jsonb(),
	isAsync: boolean("is_async"),
	retryPolicy: jsonb("retry_policy"),
	timeout: integer(),
	isActive: boolean("is_active"),
	priority: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
}).as(sql`SELECT id, tenant_id, category, trigger_id, name, description, required_permission, trigger_type, config, is_async, retry_policy, timeout, is_active, priority, created_at, updated_at, created_by, updated_by FROM w3suite.workflow_triggers`);

export const teamWorkflowAssignments = pgView("team_workflow_assignments", {	id: uuid(),
	tenantId: uuid("tenant_id"),
	teamId: uuid("team_id"),
	templateId: uuid("template_id"),
	autoAssign: boolean("auto_assign"),
	priority: integer(),
	conditions: jsonb(),
	overrides: jsonb(),
	isActive: boolean("is_active"),
	validFrom: timestamp("valid_from", { mode: 'string' }),
	validTo: timestamp("valid_to", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdBy: varchar("created_by"),
	updatedBy: varchar("updated_by"),
}).as(sql`SELECT id, tenant_id, team_id, template_id, auto_assign, priority, conditions, overrides, is_active, valid_from, valid_to, created_at, updated_at, created_by, updated_by FROM w3suite.team_workflow_assignments`);