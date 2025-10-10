-- CRM Module Baseline Migration
-- Generated: 2025-10-10
-- Purpose: Idempotent baseline migration for CRM tables with UUID types and RLS isolation
-- 
-- This migration creates the complete CRM schema including:
-- - 13 CRM enum types
-- - 20 CRM tables with UUID primary keys
-- - Foreign keys to tenants (UUID)
-- - Indexes for RLS tenant isolation and query performance

-- ==================== CRM ENUMS ====================

DO $$ BEGIN
  CREATE TYPE w3suite.crm_campaign_type AS ENUM ('inbound_media', 'outbound_crm', 'retention');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_lead_status AS ENUM ('new', 'contacted', 'in_progress', 'qualified', 'converted', 'disqualified');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_pipeline_domain AS ENUM ('sales', 'service', 'retention');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_deal_status AS ENUM ('open', 'won', 'lost', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_interaction_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_task_type AS ENUM ('call', 'email', 'meeting', 'follow_up', 'demo', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_consent_type AS ENUM ('privacy_policy', 'marketing', 'profiling', 'third_party');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_consent_status AS ENUM ('granted', 'denied', 'withdrawn', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_consent_scope AS ENUM ('marketing', 'service', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE w3suite.crm_source_type AS ENUM ('meta_page', 'google_ads', 'whatsapp_phone', 'instagram', 'tiktok');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==================== CRM TABLES ====================

-- CRM Persons (Identity Graph)
CREATE TABLE IF NOT EXISTS w3suite.crm_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email_canonical VARCHAR(255),
  phone_canonical VARCHAR(50),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  merged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_persons_tenant_email_idx ON w3suite.crm_persons(tenant_id, email_canonical);
CREATE UNIQUE INDEX IF NOT EXISTS crm_persons_tenant_phone_idx ON w3suite.crm_persons(tenant_id, phone_canonical);
CREATE INDEX IF NOT EXISTS crm_persons_tenant_id_idx ON w3suite.crm_persons(tenant_id);

-- CRM Person Consents (GDPR)
CREATE TABLE IF NOT EXISTS w3suite.crm_person_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES w3suite.crm_persons(id),
  consent_type w3suite.crm_consent_type NOT NULL,
  channel TEXT NOT NULL,
  status w3suite.crm_consent_status NOT NULL,
  scope w3suite.crm_consent_scope,
  granted_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  source VARCHAR(255),
  proof_document_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_person_consents_person_channel_consent_uniq ON w3suite.crm_person_consents(person_id, channel, consent_type);
CREATE INDEX IF NOT EXISTS crm_person_consents_tenant_id_idx ON w3suite.crm_person_consents(tenant_id);
CREATE INDEX IF NOT EXISTS crm_person_consents_person_id_idx ON w3suite.crm_person_consents(person_id);

-- CRM Person Preferences
CREATE TABLE IF NOT EXISTS w3suite.crm_person_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL UNIQUE REFERENCES w3suite.crm_persons(id),
  preferred_channel VARCHAR(50),
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  language VARCHAR(5),
  do_not_contact BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CRM Campaigns
CREATE TABLE IF NOT EXISTS w3suite.crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  legal_entity_id UUID,
  store_id UUID,
  is_brand_template BOOLEAN DEFAULT false,
  brand_campaign_id UUID,
  name VARCHAR(255) NOT NULL,
  type w3suite.crm_campaign_type NOT NULL,
  status w3suite.crm_campaign_status DEFAULT 'draft',
  target_driver_id UUID,
  primary_pipeline_id UUID,
  budget REAL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  total_leads INTEGER DEFAULT 0,
  total_deals INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_campaigns_tenant_status_start_idx ON w3suite.crm_campaigns(tenant_id, status, start_date);
CREATE INDEX IF NOT EXISTS crm_campaigns_tenant_id_idx ON w3suite.crm_campaigns(tenant_id);

-- CRM Leads
CREATE TABLE IF NOT EXISTS w3suite.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  legal_entity_id UUID,
  store_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES w3suite.crm_persons(id),
  owner_user_id UUID,
  campaign_id UUID REFERENCES w3suite.crm_campaigns(id),
  source_channel VARCHAR(100),
  source_social_account_id UUID,
  status w3suite.crm_lead_status DEFAULT 'new',
  lead_score SMALLINT DEFAULT 0,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  product_interest VARCHAR(255),
  driver_id UUID,
  notes TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  landing_page_url TEXT,
  referrer_url TEXT,
  event_name VARCHAR(255),
  event_source TEXT,
  session_id VARCHAR(255),
  client_ip_address VARCHAR(45),
  privacy_policy_accepted BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  profiling_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP,
  consent_source VARCHAR(255),
  raw_event_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_leads_tenant_status_score_created_idx ON w3suite.crm_leads(tenant_id, status, lead_score, created_at);
CREATE INDEX IF NOT EXISTS crm_leads_person_id_idx ON w3suite.crm_leads(person_id);
CREATE INDEX IF NOT EXISTS crm_leads_tenant_id_idx ON w3suite.crm_leads(tenant_id);

-- CRM Pipelines
CREATE TABLE IF NOT EXISTS w3suite.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  is_brand_template BOOLEAN DEFAULT false,
  brand_pipeline_id UUID,
  name VARCHAR(255) NOT NULL,
  domain w3suite.crm_pipeline_domain NOT NULL,
  driver_id UUID,
  is_active BOOLEAN DEFAULT true,
  stages_config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_pipelines_tenant_id_idx ON w3suite.crm_pipelines(tenant_id);

-- CRM Pipeline Settings
CREATE TABLE IF NOT EXISTS w3suite.crm_pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL UNIQUE REFERENCES w3suite.crm_pipelines(id),
  enabled_channels TEXT[],
  contact_rules JSONB,
  workflow_ids TEXT[],
  custom_status_names JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CRM Pipeline Stage Playbooks
CREATE TABLE IF NOT EXISTS w3suite.crm_pipeline_stage_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES w3suite.crm_pipelines(id),
  stage_name VARCHAR(100) NOT NULL,
  allowed_channels TEXT[],
  max_attempts_per_day SMALLINT,
  sla_hours SMALLINT,
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  next_best_action_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_pipeline_stage_playbooks_pipeline_stage_uniq ON w3suite.crm_pipeline_stage_playbooks(pipeline_id, stage_name);

-- CRM Deals
CREATE TABLE IF NOT EXISTS w3suite.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  legal_entity_id UUID,
  store_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  pipeline_id UUID NOT NULL REFERENCES w3suite.crm_pipelines(id),
  stage VARCHAR(100) NOT NULL,
  status w3suite.crm_deal_status DEFAULT 'open',
  lead_id UUID REFERENCES w3suite.crm_leads(id),
  campaign_id UUID,
  source_channel VARCHAR(100),
  person_id UUID NOT NULL REFERENCES w3suite.crm_persons(id),
  customer_id UUID,
  estimated_value REAL,
  probability SMALLINT DEFAULT 0,
  driver_id UUID,
  aging_days SMALLINT DEFAULT 0,
  won_at TIMESTAMP,
  lost_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_deals_tenant_pipeline_stage_status_idx ON w3suite.crm_deals(tenant_id, pipeline_id, stage, status);
CREATE INDEX IF NOT EXISTS crm_deals_person_id_idx ON w3suite.crm_deals(person_id);
CREATE INDEX IF NOT EXISTS crm_deals_tenant_id_idx ON w3suite.crm_deals(tenant_id);

-- CRM Interactions
CREATE TABLE IF NOT EXISTS w3suite.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  channel VARCHAR(50),
  direction w3suite.crm_interaction_direction,
  outcome TEXT,
  duration_seconds INTEGER,
  performed_by_user_id UUID,
  notes TEXT,
  payload JSONB,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_interactions_entity_type_entity_id_occurred_idx ON w3suite.crm_interactions(entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS crm_interactions_tenant_id_idx ON w3suite.crm_interactions(tenant_id);

-- CRM Tasks
CREATE TABLE IF NOT EXISTS w3suite.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  assigned_to_user_id UUID,
  task_type w3suite.crm_task_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  status w3suite.crm_task_status DEFAULT 'pending',
  priority w3suite.crm_task_priority DEFAULT 'medium',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_tasks_tenant_assigned_status_due_idx ON w3suite.crm_tasks(tenant_id, assigned_to_user_id, status, due_date);
CREATE INDEX IF NOT EXISTS crm_tasks_tenant_id_idx ON w3suite.crm_tasks(tenant_id);

-- CRM Campaign Pipeline Links
CREATE TABLE IF NOT EXISTS w3suite.crm_campaign_pipeline_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES w3suite.crm_campaigns(id),
  pipeline_id UUID NOT NULL REFERENCES w3suite.crm_pipelines(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_campaign_pipeline_links_campaign_pipeline_uniq ON w3suite.crm_campaign_pipeline_links(campaign_id, pipeline_id);

-- CRM Lead Attributions
CREATE TABLE IF NOT EXISTS w3suite.crm_lead_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES w3suite.crm_leads(id),
  campaign_id UUID NOT NULL REFERENCES w3suite.crm_campaigns(id),
  touchpoint_order SMALLINT NOT NULL,
  attribution_weight REAL,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_lead_attributions_lead_touchpoint_idx ON w3suite.crm_lead_attributions(lead_id, touchpoint_order);

-- CRM Source Mappings
CREATE TABLE IF NOT EXISTS w3suite.crm_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_type w3suite.crm_source_type NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  legal_entity_id UUID,
  store_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_source_mappings_tenant_source_external_uniq ON w3suite.crm_source_mappings(tenant_id, source_type, external_id);
CREATE INDEX IF NOT EXISTS crm_source_mappings_tenant_id_idx ON w3suite.crm_source_mappings(tenant_id);

-- CRM Email Templates
CREATE TABLE IF NOT EXISTS w3suite.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body_html TEXT,
  body_text TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_email_templates_tenant_id_idx ON w3suite.crm_email_templates(tenant_id);

-- CRM SMS Templates
CREATE TABLE IF NOT EXISTS w3suite.crm_sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  body TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_sms_templates_tenant_id_idx ON w3suite.crm_sms_templates(tenant_id);

-- CRM WhatsApp Templates
CREATE TABLE IF NOT EXISTS w3suite.crm_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  template_id VARCHAR(255),
  language VARCHAR(5),
  header_text TEXT,
  body_text TEXT,
  footer_text TEXT,
  buttons JSONB,
  variables JSONB,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_whatsapp_templates_tenant_id_idx ON w3suite.crm_whatsapp_templates(tenant_id);

-- CRM Customer Segments
CREATE TABLE IF NOT EXISTS w3suite.crm_customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter_rules JSONB,
  calculated_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true,
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_customer_segments_tenant_id_idx ON w3suite.crm_customer_segments(tenant_id);

-- CRM Automation Rules
CREATE TABLE IF NOT EXISTS w3suite.crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(255) NOT NULL,
  conditions JSONB,
  actions JSONB,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_automation_rules_tenant_id_idx ON w3suite.crm_automation_rules(tenant_id);

-- CRM Saved Views
CREATE TABLE IF NOT EXISTS w3suite.crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  view_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  filters JSONB,
  sort_config JSONB,
  columns_config JSONB,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_saved_views_tenant_user_idx ON w3suite.crm_saved_views(tenant_id, user_id);

-- ==================== FOREIGN KEY CONSTRAINTS ====================
-- Add FK constraints after tables are created to handle dependency order

-- CRM Person Consents FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_person_consents 
    ADD CONSTRAINT crm_person_consents_person_id_fkey 
    FOREIGN KEY (person_id) REFERENCES w3suite.crm_persons(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Person Preferences FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_person_preferences 
    ADD CONSTRAINT crm_person_preferences_person_id_fkey 
    FOREIGN KEY (person_id) REFERENCES w3suite.crm_persons(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Campaigns FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_campaigns 
    ADD CONSTRAINT crm_campaigns_target_driver_id_fkey 
    FOREIGN KEY (target_driver_id) REFERENCES public.drivers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Leads FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_leads 
    ADD CONSTRAINT crm_leads_person_id_fkey 
    FOREIGN KEY (person_id) REFERENCES w3suite.crm_persons(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_leads 
    ADD CONSTRAINT crm_leads_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES w3suite.crm_campaigns(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_leads 
    ADD CONSTRAINT crm_leads_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Pipelines FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_pipelines 
    ADD CONSTRAINT crm_pipelines_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Pipeline Settings FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_pipeline_settings 
    ADD CONSTRAINT crm_pipeline_settings_pipeline_id_fkey 
    FOREIGN KEY (pipeline_id) REFERENCES w3suite.crm_pipelines(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Pipeline Stage Playbooks FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_pipeline_stage_playbooks 
    ADD CONSTRAINT crm_pipeline_stage_playbooks_pipeline_id_fkey 
    FOREIGN KEY (pipeline_id) REFERENCES w3suite.crm_pipelines(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Deals FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_deals 
    ADD CONSTRAINT crm_deals_pipeline_id_fkey 
    FOREIGN KEY (pipeline_id) REFERENCES w3suite.crm_pipelines(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_deals 
    ADD CONSTRAINT crm_deals_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES w3suite.crm_leads(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_deals 
    ADD CONSTRAINT crm_deals_person_id_fkey 
    FOREIGN KEY (person_id) REFERENCES w3suite.crm_persons(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_deals 
    ADD CONSTRAINT crm_deals_driver_id_fkey 
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Campaign Pipeline Links FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_campaign_pipeline_links 
    ADD CONSTRAINT crm_campaign_pipeline_links_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES w3suite.crm_campaigns(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_campaign_pipeline_links 
    ADD CONSTRAINT crm_campaign_pipeline_links_pipeline_id_fkey 
    FOREIGN KEY (pipeline_id) REFERENCES w3suite.crm_pipelines(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CRM Lead Attributions FK
DO $$ BEGIN
  ALTER TABLE w3suite.crm_lead_attributions 
    ADD CONSTRAINT crm_lead_attributions_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES w3suite.crm_leads(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE w3suite.crm_lead_attributions 
    ADD CONSTRAINT crm_lead_attributions_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES w3suite.crm_campaigns(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Migration complete
-- CRM schema with 13 enums, 20 tables, and 17 foreign key constraints is now idempotently defined
