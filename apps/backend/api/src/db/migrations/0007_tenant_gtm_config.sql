-- Tenant GTM Configuration Table (Mixed RLS pattern)
-- tenant_id = NULL → Global container config (Container ID)
-- tenant_id = UUID → Tenant-specific config (API Secret for Measurement Protocol)

CREATE TABLE IF NOT EXISTS w3suite.tenant_gtm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES w3suite.tenants(id) ON DELETE CASCADE,
  
  -- GTM Container (set on global row with tenant_id = NULL)
  container_id VARCHAR(50),
  
  -- GA4 Configuration (per tenant for Measurement Protocol)
  ga4_measurement_id VARCHAR(50),
  ga4_api_secret_encrypted TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Unique constraint: only one config per tenant (or one global with NULL)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_gtm_config_tenant_unique 
  ON w3suite.tenant_gtm_config(tenant_id) 
  WHERE tenant_id IS NOT NULL;

-- Allow only one global row (tenant_id = NULL)
CREATE UNIQUE INDEX IF NOT EXISTS tenant_gtm_config_global_unique 
  ON w3suite.tenant_gtm_config((tenant_id IS NULL)) 
  WHERE tenant_id IS NULL;

-- Index for active configs
CREATE INDEX IF NOT EXISTS tenant_gtm_config_active_idx 
  ON w3suite.tenant_gtm_config(is_active);

-- RLS Policy (Mixed RLS pattern: global rows visible to all, tenant rows only to that tenant)
ALTER TABLE w3suite.tenant_gtm_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to global config (tenant_id IS NULL) OR own tenant config
CREATE POLICY tenant_gtm_config_select ON w3suite.tenant_gtm_config
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Policy: Tenant can only INSERT/UPDATE/DELETE their own config (tenant_id must match)
-- Global config (tenant_id IS NULL) can only be modified via Brand Interface (no RLS context)
CREATE POLICY tenant_gtm_config_write ON w3suite.tenant_gtm_config
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Note: Global row (tenant_id = NULL) writes are handled by Brand Interface API
-- which bypasses RLS (no app.tenant_id set) and checks super_admin role at API level

-- Add comment for documentation
COMMENT ON TABLE w3suite.tenant_gtm_config IS 
  'Centralized GTM configuration. Global row (tenant_id=NULL) stores Container ID. Tenant rows store encrypted API secrets for Measurement Protocol.';
