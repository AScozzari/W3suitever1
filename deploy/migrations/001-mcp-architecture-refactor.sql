-- MCP Architecture Refactor Migration
-- This migration separates concerns between action_configurations (operative) and mcp_tool_settings (query MCP)
-- All tools end up in action_definitions as the unified catalog

-- ============================================
-- STEP 1: ALTER action_definitions
-- Add tenant_id (nullable), exposed_via_mcp, source tracking
-- ============================================

-- Add new columns to action_definitions
ALTER TABLE w3suite.action_definitions 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exposed_via_mcp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_table VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS mcp_input_schema JSONB,
  ADD COLUMN IF NOT EXISTS query_template_id UUID REFERENCES w3suite.mcp_query_templates(id),
  ADD COLUMN IF NOT EXISTS variable_config JSONB;

-- Create index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_action_definitions_tenant ON w3suite.action_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_action_definitions_exposed ON w3suite.action_definitions(exposed_via_mcp);
CREATE INDEX IF NOT EXISTS idx_action_definitions_source ON w3suite.action_definitions(source_table, source_id);

-- Add RLS policy for action_definitions (conditional: NULL tenant_id = global, else RLS)
ALTER TABLE w3suite.action_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS action_definitions_tenant_policy ON w3suite.action_definitions;
CREATE POLICY action_definitions_tenant_policy ON w3suite.action_definitions
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, tenant_id)
  )
  WITH CHECK (
    tenant_id IS NULL 
    OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, tenant_id)
  );

-- ============================================
-- STEP 2: ALTER mcp_tool_settings
-- Add query_template_id, variable_config, make action_config_id nullable
-- ============================================

-- Add new columns
ALTER TABLE w3suite.mcp_tool_settings
  ADD COLUMN IF NOT EXISTS query_template_id UUID REFERENCES w3suite.mcp_query_templates(id),
  ADD COLUMN IF NOT EXISTS variable_config JSONB,
  ADD COLUMN IF NOT EXISTS tool_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tool_description TEXT,
  ADD COLUMN IF NOT EXISTS input_schema JSONB;

-- Make action_config_id nullable
ALTER TABLE w3suite.mcp_tool_settings
  ALTER COLUMN action_config_id DROP NOT NULL;

-- Add CHECK constraint: one of action_config_id or query_template_id must be set
ALTER TABLE w3suite.mcp_tool_settings
  DROP CONSTRAINT IF EXISTS check_tool_source;
ALTER TABLE w3suite.mcp_tool_settings
  ADD CONSTRAINT check_tool_source CHECK (
    action_config_id IS NOT NULL OR query_template_id IS NOT NULL
  );

-- Create index for query template
CREATE INDEX IF NOT EXISTS idx_mcp_tool_settings_template ON w3suite.mcp_tool_settings(query_template_id);

-- ============================================
-- STEP 3: ALTER mcp_tool_permissions
-- Change FK from action_config_id to action_definition_id
-- ============================================

-- Add new column
ALTER TABLE w3suite.mcp_tool_permissions
  ADD COLUMN IF NOT EXISTS action_definition_id UUID;

-- We'll populate this after backfill, then drop the old column

-- ============================================
-- STEP 4: BACKFILL - Migrate query tools from action_configurations to mcp_tool_settings
-- ============================================

-- For each query tool in action_configurations, ensure there's a corresponding mcp_tool_settings
-- This updates existing mcp_tool_settings records with query_template_id
UPDATE w3suite.mcp_tool_settings mts
SET 
  query_template_id = ac.query_template_id,
  tool_name = ac.action_name,
  tool_description = ac.description,
  input_schema = ac.mcp_input_schema
FROM w3suite.action_configurations ac
WHERE mts.action_config_id = ac.id
  AND ac.action_category = 'query'
  AND ac.query_template_id IS NOT NULL;

-- ============================================
-- STEP 5: BACKFILL - Update action_definitions with exposure info
-- ============================================

-- Mark query tools as exposed_via_mcp based on mcp_tool_settings
UPDATE w3suite.action_definitions ad
SET 
  exposed_via_mcp = true,
  mcp_input_schema = ac.mcp_input_schema,
  query_template_id = ac.query_template_id
FROM w3suite.action_configurations ac
WHERE ad.action_id = ac.action_id
  AND ac.action_category = 'query'
  AND EXISTS (
    SELECT 1 FROM w3suite.mcp_tool_settings mts 
    WHERE mts.action_config_id = ac.id 
      AND mts.exposed_via_mcp = true
  );

-- Mark operative tools as exposed if they have mcp_tool_settings with exposed_via_mcp = true
UPDATE w3suite.action_definitions ad
SET exposed_via_mcp = true
FROM w3suite.action_configurations ac
WHERE ad.action_id = ac.action_id
  AND ac.action_category = 'operative'
  AND EXISTS (
    SELECT 1 FROM w3suite.mcp_tool_settings mts 
    WHERE mts.action_config_id = ac.id 
      AND mts.exposed_via_mcp = true
  );

-- ============================================
-- STEP 6: BACKFILL mcp_tool_permissions with action_definition_id
-- ============================================

UPDATE w3suite.mcp_tool_permissions mtp
SET action_definition_id = ad.id
FROM w3suite.action_configurations ac
JOIN w3suite.action_definitions ad ON ad.action_id = ac.action_id
WHERE mtp.action_config_id = ac.id;

-- ============================================
-- STEP 7: Add FK constraint for action_definition_id (after backfill)
-- ============================================

ALTER TABLE w3suite.mcp_tool_permissions
  ADD CONSTRAINT mcp_tool_permissions_action_definition_fkey 
  FOREIGN KEY (action_definition_id) 
  REFERENCES w3suite.action_definitions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mcp_tool_permissions_definition ON w3suite.mcp_tool_permissions(action_definition_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check action_definitions has new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'w3suite' AND table_name = 'action_definitions'
ORDER BY ordinal_position;

-- Check mcp_tool_settings has new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'w3suite' AND table_name = 'mcp_tool_settings'
ORDER BY ordinal_position;

-- Count exposed tools
SELECT action_category, exposed_via_mcp, COUNT(*) 
FROM w3suite.action_definitions 
GROUP BY action_category, exposed_via_mcp;
