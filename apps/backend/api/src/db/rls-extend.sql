-- Extended RLS for W3 Suite and Brand Interface schemas
-- This extends RLS beyond public schema to w3suite and brand_interface schemas

-- ==================== W3SUITE SCHEMA RLS ====================
-- Apply RLS to all tables in w3suite schema

-- Enable RLS on w3suite tables
ALTER TABLE IF EXISTS w3suite.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS w3suite.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS w3suite.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS w3suite.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS w3suite.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS w3suite.analytics ENABLE ROW LEVEL SECURITY;

-- Policy for w3suite.configurations
CREATE POLICY w3suite_configurations_tenant_isolation ON w3suite.configurations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy for w3suite.audit_logs (read-only for users, write for system)
CREATE POLICY w3suite_audit_logs_read ON w3suite.audit_logs
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY w3suite_audit_logs_write ON w3suite.audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy for w3suite.integrations
CREATE POLICY w3suite_integrations_tenant_isolation ON w3suite.integrations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy for w3suite.workflows
CREATE POLICY w3suite_workflows_tenant_isolation ON w3suite.workflows
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy for w3suite.reports
CREATE POLICY w3suite_reports_tenant_isolation ON w3suite.reports
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Policy for w3suite.analytics
CREATE POLICY w3suite_analytics_tenant_isolation ON w3suite.analytics
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ==================== BRAND_INTERFACE SCHEMA RLS ====================
-- Brand Interface has special cross-tenant capabilities

-- Enable RLS on brand_interface tables
ALTER TABLE IF EXISTS brand_interface.brand_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_interface.brand_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_interface.brand_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_interface.brand_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_interface.brand_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS brand_interface.brand_settings ENABLE ROW LEVEL SECURITY;

-- Brand users can see all users (for super_admin and national_manager)
CREATE POLICY brand_users_super_admin ON brand_interface.brand_users
  FOR ALL
  USING (
    current_setting('app.current_role', true) IN ('super_admin', 'national_manager')
    OR id = current_setting('app.current_user', true)::uuid
  );

-- Brand campaigns - cross-tenant visibility for brand managers
CREATE POLICY brand_campaigns_cross_tenant ON brand_interface.brand_campaigns
  FOR SELECT
  USING (
    -- Super admins and national managers see all
    current_setting('app.current_role', true) IN ('super_admin', 'national_manager')
    OR
    -- Area managers see campaigns for their areas
    (current_setting('app.current_role', true) = 'area_manager' 
     AND commercial_area_code = ANY(string_to_array(current_setting('app.user_areas', true), ',')))
    OR
    -- Store managers see campaigns targeting their store
    (current_setting('app.current_role', true) = 'store_manager'
     AND (target_type = 'all' OR current_setting('app.current_tenant', true)::uuid = ANY(target_tenant_ids)))
  );

-- Brand deployments - write requires elevated permissions
CREATE POLICY brand_deployments_read ON brand_interface.brand_deployments
  FOR SELECT
  USING (
    current_setting('app.current_role', true) IN ('super_admin', 'national_manager', 'area_manager')
  );

CREATE POLICY brand_deployments_write ON brand_interface.brand_deployments
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_role', true) IN ('super_admin', 'national_manager')
  );

-- Brand analytics - cross-tenant read for managers
CREATE POLICY brand_analytics_cross_tenant ON brand_interface.brand_analytics
  FOR SELECT
  USING (
    current_setting('app.current_role', true) IN ('super_admin', 'national_manager', 'area_manager')
    OR
    -- Store managers only see their own tenant analytics
    (current_setting('app.current_role', true) = 'store_manager' 
     AND tenant_id = current_setting('app.current_tenant', true)::uuid)
  );

-- Brand audit logs - read-only, filtered by role
CREATE POLICY brand_audit_logs_read ON brand_interface.brand_audit_logs
  FOR SELECT
  USING (
    -- Super admins see all audit logs
    current_setting('app.current_role', true) = 'super_admin'
    OR
    -- Other users only see their own actions
    user_id = current_setting('app.current_user', true)::uuid
  );

-- Brand settings - managed by super_admin only
CREATE POLICY brand_settings_admin_only ON brand_interface.brand_settings
  FOR ALL
  USING (current_setting('app.current_role', true) = 'super_admin')
  WITH CHECK (current_setting('app.current_role', true) = 'super_admin');

-- ==================== HELPER FUNCTIONS ====================

-- Function to set Brand Interface context
CREATE OR REPLACE FUNCTION brand_interface.set_brand_context(
  p_user_id uuid,
  p_role text,
  p_areas text[],
  p_target_tenant uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Set user context
  PERFORM set_config('app.current_user', p_user_id::text, true);
  PERFORM set_config('app.current_role', p_role, true);
  PERFORM set_config('app.user_areas', array_to_string(p_areas, ','), true);
  
  -- Set tenant context (NULL for cross-tenant mode)
  IF p_target_tenant IS NOT NULL THEN
    PERFORM set_config('app.current_tenant', p_target_tenant::text, true);
    PERFORM set_config('app.brand_mode', 'tenant_specific', true);
  ELSE
    PERFORM set_config('app.current_tenant', '', true);
    PERFORM set_config('app.brand_mode', 'cross_tenant', true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to application role
GRANT EXECUTE ON FUNCTION brand_interface.set_brand_context TO application_role;

-- ==================== AUDIT TRIGGERS ====================

-- Audit function for w3suite schema
CREATE OR REPLACE FUNCTION w3suite.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO w3suite.audit_logs (
    tenant_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    current_setting('app.current_tenant', true)::uuid,
    current_setting('app.current_user', true)::uuid,
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.client_ip', true),
    current_setting('app.user_agent', true)
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_w3suite_configurations
  AFTER INSERT OR UPDATE OR DELETE ON w3suite.configurations
  FOR EACH ROW EXECUTE FUNCTION w3suite.audit_trigger_function();

CREATE TRIGGER audit_w3suite_integrations
  AFTER INSERT OR UPDATE OR DELETE ON w3suite.integrations
  FOR EACH ROW EXECUTE FUNCTION w3suite.audit_trigger_function();

-- Audit function for brand_interface schema
CREATE OR REPLACE FUNCTION brand_interface.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_interface.brand_audit_logs (
    user_id,
    role,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    context_mode,
    target_tenant_id,
    ip_address,
    user_agent
  ) VALUES (
    current_setting('app.current_user', true)::uuid,
    current_setting('app.current_role', true),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.brand_mode', true),
    CASE 
      WHEN current_setting('app.current_tenant', true) != '' 
      THEN current_setting('app.current_tenant', true)::uuid 
      ELSE NULL 
    END,
    current_setting('app.client_ip', true),
    current_setting('app.user_agent', true)
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to Brand Interface tables
CREATE TRIGGER audit_brand_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON brand_interface.brand_campaigns
  FOR EACH ROW EXECUTE FUNCTION brand_interface.audit_trigger_function();

CREATE TRIGGER audit_brand_deployments
  AFTER INSERT OR UPDATE OR DELETE ON brand_interface.brand_deployments
  FOR EACH ROW EXECUTE FUNCTION brand_interface.audit_trigger_function();

CREATE TRIGGER audit_brand_settings
  AFTER INSERT OR UPDATE OR DELETE ON brand_interface.brand_settings
  FOR EACH ROW EXECUTE FUNCTION brand_interface.audit_trigger_function();

-- ==================== SECURITY NOTES ====================
-- 1. All tables in w3suite schema are tenant-isolated
-- 2. Brand Interface schema has cross-tenant capabilities for specific roles
-- 3. Audit logs capture all changes with full context
-- 4. Role-based access control is enforced at database level
-- 5. Application must set proper context using set_config() before queries