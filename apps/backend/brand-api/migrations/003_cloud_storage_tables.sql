-- Cloud Storage Management Tables for Brand Interface
-- Migration: 003_cloud_storage_tables.sql
-- Created: 2026-01-05

-- Create enum for storage providers
DO $$ BEGIN
    CREATE TYPE brand_interface.storage_provider AS ENUM ('aws_s3', 'google_cloud_storage', 'azure_blob', 'minio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Global Storage Configuration (single row for Brand-wide settings)
CREATE TABLE IF NOT EXISTS brand_interface.storage_global_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider brand_interface.storage_provider NOT NULL DEFAULT 'aws_s3',
    access_key_encrypted TEXT,
    secret_key_encrypted TEXT,
    bucket_name VARCHAR(255),
    region VARCHAR(50) DEFAULT 'eu-central-1',
    endpoint VARCHAR(500),
    versioning_enabled BOOLEAN DEFAULT true,
    encryption_enabled BOOLEAN DEFAULT true,
    encryption_type VARCHAR(50) DEFAULT 'AES256',
    cors_enabled BOOLEAN DEFAULT true,
    cors_allowed_origins TEXT[],
    lifecycle_rules JSONB DEFAULT '[]',
    signed_url_expiry_hours INTEGER DEFAULT 24,
    max_upload_size_mb INTEGER DEFAULT 100,
    total_allocated_bytes REAL DEFAULT 0,
    last_connection_test_at TIMESTAMP,
    connection_status VARCHAR(50) DEFAULT 'not_tested',
    connection_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    brand_tenant_id UUID NOT NULL REFERENCES brand_interface.brand_tenants(id)
);

-- Per-Tenant Storage Allocations
CREATE TABLE IF NOT EXISTS brand_interface.tenant_storage_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_slug VARCHAR(100),
    quota_bytes REAL NOT NULL DEFAULT 5368709120,
    used_bytes REAL DEFAULT 0,
    object_count INTEGER DEFAULT 0,
    alert_threshold_percent INTEGER DEFAULT 80,
    alert_email_sent BOOLEAN DEFAULT false,
    suspended BOOLEAN DEFAULT false,
    suspend_reason VARCHAR(500),
    max_upload_size_mb INTEGER,
    allowed_file_types TEXT[],
    features JSONB DEFAULT '{}',
    last_usage_update_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    brand_tenant_id UUID NOT NULL REFERENCES brand_interface.brand_tenants(id)
);

-- Storage Usage Logs (for analytics and billing)
CREATE TABLE IF NOT EXISTS brand_interface.storage_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    avg_storage_bytes REAL DEFAULT 0,
    peak_storage_bytes REAL DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    upload_bytes REAL DEFAULT 0,
    download_bytes REAL DEFAULT 0,
    delete_count INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    brand_tenant_id UUID NOT NULL REFERENCES brand_interface.brand_tenants(id)
);

-- Brand Assets (files pushed to tenants)
CREATE TABLE IF NOT EXISTS brand_interface.brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    object_key VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes REAL DEFAULT 0,
    category VARCHAR(100),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    pushed_to_tenants TEXT[],
    last_pushed_at TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    brand_tenant_id UUID NOT NULL REFERENCES brand_interface.brand_tenants(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_storage_allocations_tenant_id 
    ON brand_interface.tenant_storage_allocations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_storage_usage_logs_tenant_period 
    ON brand_interface.storage_usage_logs(tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_brand_assets_category 
    ON brand_interface.brand_assets(category);

CREATE INDEX IF NOT EXISTS idx_brand_assets_is_active 
    ON brand_interface.brand_assets(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE brand_interface.storage_global_config IS 'Global AWS S3 configuration for all tenants, managed by Brand Interface';
COMMENT ON TABLE brand_interface.tenant_storage_allocations IS 'Per-tenant storage quota allocations with usage tracking';
COMMENT ON TABLE brand_interface.storage_usage_logs IS 'Historical usage logs for analytics and cost estimation';
COMMENT ON TABLE brand_interface.brand_assets IS 'Brand assets (logos, templates) that can be pushed to tenants';
