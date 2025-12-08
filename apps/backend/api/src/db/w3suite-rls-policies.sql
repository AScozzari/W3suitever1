-- ============================================================================
-- W3 SUITE SUPPLIER TABLES - CRITICAL SECURITY RLS POLICIES
-- Row Level Security for Brand Base + Tenant Override Pattern
-- ============================================================================

-- ==================== SUPPLIERS TABLE (Brand-Managed) ====================

-- Enable RLS on suppliers table
ALTER TABLE w3suite.suppliers ENABLE ROW LEVEL SECURITY;

-- Policy for brand suppliers (origin='brand', tenantId=NULL)
-- These are visible to all tenants but READ-ONLY
CREATE POLICY suppliers_brand_read_all ON w3suite.suppliers
  FOR SELECT
  USING (origin = 'brand' AND tenant_id IS NULL);

-- Policy for tenant suppliers in main suppliers table (if any exist)  
-- These should be migrated to supplier_overrides
CREATE POLICY suppliers_tenant_isolation ON w3suite.suppliers
  FOR ALL
  USING (
    origin = 'tenant' AND 
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    origin = 'tenant' AND 
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- CRITICAL: Prevent tenants from modifying brand suppliers
CREATE POLICY suppliers_brand_no_modify ON w3suite.suppliers
  FOR INSERT, UPDATE, DELETE
  USING (false)  -- No tenant can modify brand suppliers
  WITH CHECK (false);

-- ==================== SUPPLIER_OVERRIDES TABLE (Tenant-Specific) ====================

-- Enable RLS on supplier_overrides table
ALTER TABLE w3suite.supplier_overrides ENABLE ROW LEVEL SECURITY;

-- Policy for strict tenant isolation
-- Only allow access to suppliers owned by current tenant
CREATE POLICY supplier_overrides_tenant_isolation ON w3suite.supplier_overrides
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Additional security: ensure origin is always 'tenant' for this table
CREATE POLICY supplier_overrides_origin_check ON w3suite.supplier_overrides
  FOR INSERT, UPDATE
  WITH CHECK (origin = 'tenant');

-- ==================== ADDITIONAL SECURITY CONSTRAINTS ====================

-- Function to validate supplier operations
CREATE OR REPLACE FUNCTION w3suite.validate_supplier_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure brand suppliers cannot be modified through supplier_overrides
  IF TG_TABLE_NAME = 'supplier_overrides' AND NEW.origin != 'tenant' THEN
    RAISE EXCEPTION 'Only tenant suppliers allowed in supplier_overrides table';
  END IF;
  
  -- Ensure tenant suppliers have valid tenant_id
  IF NEW.origin = 'tenant' AND NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant suppliers must have valid tenant_id';
  END IF;
  
  -- Ensure brand suppliers have NULL tenant_id
  IF NEW.origin = 'brand' AND NEW.tenant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Brand suppliers cannot have tenant_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger to both tables
CREATE TRIGGER validate_suppliers_operation
  BEFORE INSERT OR UPDATE ON w3suite.suppliers
  FOR EACH ROW EXECUTE FUNCTION w3suite.validate_supplier_operation();

CREATE TRIGGER validate_supplier_overrides_operation
  BEFORE INSERT OR UPDATE ON w3suite.supplier_overrides
  FOR EACH ROW EXECUTE FUNCTION w3suite.validate_supplier_operation();

-- ==================== TASK ATTACHMENTS TABLE (Member-Only Access) ====================

-- Enable RLS on task_attachments table
ALTER TABLE w3suite.task_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS task_attachments_member_access ON w3suite.task_attachments;

-- Policy: Only task members can access attachments
-- Members are: task creator, assignees, or watchers
CREATE POLICY task_attachments_member_access ON w3suite.task_attachments
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (
      -- Task creator can access
      task_id IN (
        SELECT id FROM w3suite.tasks 
        WHERE creator_id = current_setting('app.current_user_id', true)
          AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
      )
      OR
      -- Task assignees and watchers can access
      task_id IN (
        SELECT task_id FROM w3suite.task_assignments 
        WHERE user_id = current_setting('app.current_user_id', true)
          AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
      )
      OR
      -- File uploader can access their own uploads
      uploaded_by = current_setting('app.current_user_id', true)
    )
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    AND (
      -- Only task members can upload attachments
      task_id IN (
        SELECT id FROM w3suite.tasks 
        WHERE creator_id = current_setting('app.current_user_id', true)
          AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
      )
      OR
      task_id IN (
        SELECT task_id FROM w3suite.task_assignments 
        WHERE user_id = current_setting('app.current_user_id', true)
          AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
      )
    )
  );

-- ==================== VERIFICATION QUERIES ====================

-- Verify RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'w3suite' AND tablename = pg_policies.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'w3suite' 
AND tablename IN ('suppliers', 'supplier_overrides')
ORDER BY tablename;

-- Show policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'w3suite' 
AND tablename IN ('suppliers', 'supplier_overrides')
ORDER BY tablename, policyname;

COMMIT;