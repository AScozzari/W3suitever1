-- Migration: Fix branch_id FK constraint to point to deploy_center_branches
-- Previous migration incorrectly pointed to brand_branches instead of deploy_center_branches

-- Drop existing FK constraints
ALTER TABLE w3suite.tenants 
DROP CONSTRAINT IF EXISTS tenants_branch_id_fkey;

ALTER TABLE w3suite.stores 
DROP CONSTRAINT IF EXISTS stores_branch_id_fkey;

-- Add correct FK constraints pointing to deploy_center_branches
ALTER TABLE w3suite.tenants 
ADD CONSTRAINT tenants_branch_id_fkey 
FOREIGN KEY (branch_id) REFERENCES brand_interface.deploy_center_branches(id) ON DELETE SET NULL;

ALTER TABLE w3suite.stores 
ADD CONSTRAINT stores_branch_id_fkey 
FOREIGN KEY (branch_id) REFERENCES brand_interface.deploy_center_branches(id) ON DELETE SET NULL;

-- Update comments for documentation
COMMENT ON COLUMN w3suite.tenants.branch_id IS 'FK to brand_interface.deploy_center_branches - main branch for tenant deployments';
COMMENT ON COLUMN w3suite.stores.branch_id IS 'FK to brand_interface.deploy_center_branches - child branch for store-specific deployments (tenant-slug/store-code)';
