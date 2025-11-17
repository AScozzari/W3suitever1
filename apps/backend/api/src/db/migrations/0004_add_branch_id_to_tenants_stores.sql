-- Migration: Add branch_id to tenants and stores for Deploy Center integration
-- This creates bidirectional link between w3suite entities and brand_interface branches

-- Add branch_id to tenants
ALTER TABLE w3suite.tenants 
ADD COLUMN branch_id UUID REFERENCES brand_interface.brand_branches(id) ON DELETE SET NULL;

-- Add branch_id to stores
ALTER TABLE w3suite.stores 
ADD COLUMN branch_id UUID REFERENCES brand_interface.brand_branches(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX idx_tenants_branch_id ON w3suite.tenants(branch_id);
CREATE INDEX idx_stores_branch_id ON w3suite.stores(branch_id);

-- Add comment for documentation
COMMENT ON COLUMN w3suite.tenants.branch_id IS 'FK to brand_interface.brand_branches - main branch for tenant deployments';
COMMENT ON COLUMN w3suite.stores.branch_id IS 'FK to brand_interface.brand_branches - child branch for store-specific deployments (tenant-slug/store-slug)';
