-- Migration: Fix supplier code unique constraint to be tenant-scoped
-- Date: 2025-11-17
-- Author: Deploy Center System

-- Drop existing global unique constraint on code
ALTER TABLE w3suite.suppliers DROP CONSTRAINT IF EXISTS suppliers_code_unique;

-- Add tenant-scoped unique constraint on (tenant_id, code)
ALTER TABLE w3suite.suppliers ADD CONSTRAINT suppliers_tenant_code_unique UNIQUE (tenant_id, code);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS suppliers_tenant_code_idx_new ON w3suite.suppliers(tenant_id, code);
