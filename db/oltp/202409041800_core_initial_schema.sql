-- W3 Suite - Core Initial Schema with RLS
-- Migration: 202409041800_core_initial_schema.sql
-- Module: core
-- Action: initial_schema

-- Enable Row Level Security extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== SESSIONS TABLE ====================
-- (IMPORTANT) This table is mandatory for OAuth sessions, don't drop it.
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- ==================== USERS TABLE ====================
-- (IMPORTANT) This table is mandatory for OAuth, don't drop it.
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own record
CREATE POLICY user_access_own_record ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id', true)::VARCHAR);

-- ==================== MULTITENANT CORE TABLES ====================

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    features JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access tenants where they have roles
CREATE POLICY tenant_access_by_user_role ON tenants
    FOR ALL
    USING (
        id IN (
            SELECT tenant_id 
            FROM user_tenant_roles 
            WHERE user_id = current_setting('app.current_user_id', true)::VARCHAR
            AND is_active = true
        )
    );

-- Legal Entities table
CREATE TABLE IF NOT EXISTS legal_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(100),
    tax_id VARCHAR(50),
    vat_number VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_tenant ON legal_entities(tenant_id);

-- Enable RLS on legal_entities
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access based on tenant membership
CREATE POLICY legal_entities_tenant_access ON legal_entities
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenant_roles 
            WHERE user_id = current_setting('app.current_user_id', true)::VARCHAR
            AND is_active = true
        )
    );

-- Strategic Groups table
CREATE TABLE IF NOT EXISTS strategic_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategic_groups_tenant ON strategic_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_strategic_groups_legal_entity ON strategic_groups(legal_entity_id);

-- Enable RLS on strategic_groups
ALTER TABLE strategic_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access based on tenant membership
CREATE POLICY strategic_groups_tenant_access ON strategic_groups
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenant_roles 
            WHERE user_id = current_setting('app.current_user_id', true)::VARCHAR
            AND is_active = true
        )
    );

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    strategic_group_id UUID REFERENCES strategic_groups(id) ON DELETE SET NULL,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_store_code_tenant UNIQUE (code, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_strategic_group ON stores(strategic_group_id);
CREATE INDEX IF NOT EXISTS idx_stores_legal_entity ON stores(legal_entity_id);

-- Enable RLS on stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Access based on tenant membership and store assignment
CREATE POLICY stores_tenant_access ON stores
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenant_roles 
            WHERE user_id = current_setting('app.current_user_id', true)::VARCHAR
            AND is_active = true
            AND (store_id IS NULL OR store_id = stores.id)
        )
    );

-- ==================== RBAC TABLES ====================

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    scope VARCHAR(50) DEFAULT 'tenant', -- tenant, store, global
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);

-- Role Permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(100) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- User Tenant Roles table  
CREATE TABLE IF NOT EXISTS user_tenant_roles (
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user ON user_tenant_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_tenant ON user_tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_store ON user_tenant_roles(store_id);

-- Enable RLS on user_tenant_roles
ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own roles
CREATE POLICY user_tenant_roles_own_access ON user_tenant_roles
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::VARCHAR);

-- ==================== RLS HELPER FUNCTIONS ====================

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_id(user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT tenant_id 
        FROM user_tenant_roles 
        WHERE user_id = current_setting('app.current_user_id', true)::VARCHAR
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission in tenant
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id VARCHAR,
    p_tenant_id UUID,
    p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_tenant_roles utr
        JOIN role_permissions rp ON rp.role = utr.role
        JOIN permissions p ON p.id = rp.permission_id
        WHERE utr.user_id = p_user_id
        AND utr.tenant_id = p_tenant_id
        AND p.code = p_permission_code
        AND utr.is_active = true
        AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== AUDIT CONFIGURATION ====================

-- Enable audit for all tables (optional extension)
-- ALTER TABLE tenants ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';
-- ALTER TABLE legal_entities ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';
-- ALTER TABLE strategic_groups ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';
-- ALTER TABLE user_tenant_roles ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';

-- Migration completed successfully