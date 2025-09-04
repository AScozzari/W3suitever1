-- W3 Suite - RBAC Default Permissions
-- Migration: 202409041805_rbac_default_permissions.sql
-- Module: rbac
-- Action: default_permissions

-- ==================== DEFAULT PERMISSIONS ====================

-- Core module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('core.tenant.read', 'Read Tenant Info', 'View tenant information and settings', 'core', 'tenant'),
('core.tenant.write', 'Manage Tenant', 'Modify tenant settings and configuration', 'core', 'tenant'),
('core.legal_entity.read', 'Read Legal Entities', 'View legal entity information', 'core', 'tenant'),
('core.legal_entity.write', 'Manage Legal Entities', 'Create and modify legal entities', 'core', 'tenant'),
('core.strategic_group.read', 'Read Strategic Groups', 'View strategic group information', 'core', 'tenant'),
('core.strategic_group.write', 'Manage Strategic Groups', 'Create and modify strategic groups', 'core', 'tenant'),
('core.store.read', 'Read Stores', 'View store information', 'core', 'tenant'),
('core.store.write', 'Manage Stores', 'Create and modify stores', 'core', 'tenant'),
('core.user.read', 'Read Users', 'View user information within tenant', 'core', 'tenant'),
('core.user.write', 'Manage Users', 'Invite and manage users within tenant', 'core', 'tenant');

-- CRM module permissions  
INSERT INTO permissions (code, name, description, module, scope) VALUES
('crm.lead.read', 'Read Leads', 'View lead information', 'crm', 'store'),
('crm.lead.write', 'Manage Leads', 'Create and modify leads', 'crm', 'store'),
('crm.customer.read', 'Read Customers', 'View customer information', 'crm', 'store'),
('crm.customer.write', 'Manage Customers', 'Create and modify customer data', 'crm', 'store'),
('crm.campaign.read', 'Read Campaigns', 'View marketing campaigns', 'crm', 'tenant'),
('crm.campaign.write', 'Manage Campaigns', 'Create and modify campaigns', 'crm', 'tenant'),
('crm.inbox.read', 'Read Inbox', 'View messages and communications', 'crm', 'store'),
('crm.inbox.write', 'Manage Inbox', 'Send and manage communications', 'crm', 'store');

-- POS (Cassa) module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('pos.sale.read', 'Read Sales', 'View sales transactions', 'pos', 'store'),
('pos.sale.write', 'Process Sales', 'Create and modify sales transactions', 'pos', 'store'),
('pos.product.read', 'Read Products', 'View product catalog', 'pos', 'store'),
('pos.product.write', 'Manage Products', 'Create and modify products', 'pos', 'store'),
('pos.payment.read', 'Read Payments', 'View payment information', 'pos', 'store'),
('pos.payment.write', 'Process Payments', 'Handle payment transactions', 'pos', 'store'),
('pos.refund.read', 'Read Refunds', 'View refund information', 'pos', 'store'),
('pos.refund.write', 'Process Refunds', 'Handle refund transactions', 'pos', 'store');

-- Magazzino (Inventory) module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('inventory.product.read', 'Read Inventory', 'View inventory levels and products', 'inventory', 'store'),
('inventory.product.write', 'Manage Inventory', 'Modify inventory levels and products', 'inventory', 'store'),
('inventory.movement.read', 'Read Stock Movements', 'View inventory movements', 'inventory', 'store'),
('inventory.movement.write', 'Manage Stock Movements', 'Create and modify stock movements', 'inventory', 'store'),
('inventory.transfer.read', 'Read Transfers', 'View inventory transfers between stores', 'inventory', 'tenant'),
('inventory.transfer.write', 'Manage Transfers', 'Create and process inventory transfers', 'inventory', 'tenant'),
('inventory.supplier.read', 'Read Suppliers', 'View supplier information', 'inventory', 'tenant'),
('inventory.supplier.write', 'Manage Suppliers', 'Create and modify supplier data', 'inventory', 'tenant');

-- Analytics module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('analytics.sales.read', 'Read Sales Analytics', 'View sales reports and analytics', 'analytics', 'store'),
('analytics.inventory.read', 'Read Inventory Analytics', 'View inventory reports and analytics', 'analytics', 'store'),
('analytics.customer.read', 'Read Customer Analytics', 'View customer behavior analytics', 'analytics', 'store'),
('analytics.financial.read', 'Read Financial Analytics', 'View financial reports', 'analytics', 'tenant'),
('analytics.export.read', 'Export Analytics', 'Export reports and data', 'analytics', 'tenant');

-- Settings module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('settings.store.read', 'Read Store Settings', 'View store configuration', 'settings', 'store'),
('settings.store.write', 'Manage Store Settings', 'Modify store configuration', 'settings', 'store'),
('settings.tenant.read', 'Read Tenant Settings', 'View tenant configuration', 'settings', 'tenant'),
('settings.tenant.write', 'Manage Tenant Settings', 'Modify tenant configuration', 'settings', 'tenant'),
('settings.billing.read', 'Read Billing', 'View billing and subscription info', 'settings', 'tenant'),
('settings.billing.write', 'Manage Billing', 'Modify billing and subscription', 'settings', 'tenant');

-- HR module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('hr.employee.read', 'Read Employees', 'View employee information', 'hr', 'tenant'),
('hr.employee.write', 'Manage Employees', 'Create and modify employee data', 'hr', 'tenant'),
('hr.schedule.read', 'Read Schedules', 'View work schedules', 'hr', 'store'),
('hr.schedule.write', 'Manage Schedules', 'Create and modify work schedules', 'hr', 'store'),
('hr.payroll.read', 'Read Payroll', 'View payroll information', 'hr', 'tenant'),
('hr.payroll.write', 'Manage Payroll', 'Process payroll and compensation', 'hr', 'tenant');

-- CMS module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('cms.page.read', 'Read Pages', 'View website pages and content', 'cms', 'tenant'),
('cms.page.write', 'Manage Pages', 'Create and modify website pages', 'cms', 'tenant'),
('cms.form.read', 'Read Forms', 'View forms and submissions', 'cms', 'tenant'),
('cms.form.write', 'Manage Forms', 'Create and modify forms', 'cms', 'tenant'),
('cms.publish.write', 'Publish Content', 'Publish content to live site', 'cms', 'tenant');

-- Gare (Tenders) module permissions
INSERT INTO permissions (code, name, description, module, scope) VALUES
('gare.tender.read', 'Read Tenders', 'View tender information', 'gare', 'tenant'),
('gare.tender.write', 'Manage Tenders', 'Create and modify tenders', 'gare', 'tenant'),
('gare.bid.read', 'Read Bids', 'View bid information', 'gare', 'tenant'),
('gare.bid.write', 'Manage Bids', 'Submit and modify bids', 'gare', 'tenant');

-- ==================== DEFAULT ROLE PERMISSIONS ====================

-- Super Admin role (global access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'super_admin', id FROM permissions WHERE is_active = true;

-- Tenant Admin role (full tenant access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'tenant_admin', id FROM permissions 
WHERE module IN ('core', 'crm', 'pos', 'inventory', 'analytics', 'settings', 'hr', 'cms', 'gare') 
AND is_active = true;

-- Store Manager role (store management access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'store_manager', id FROM permissions 
WHERE code IN (
    'core.store.read', 'core.store.write', 'core.user.read',
    'crm.lead.read', 'crm.lead.write', 'crm.customer.read', 'crm.customer.write', 'crm.inbox.read', 'crm.inbox.write',
    'pos.sale.read', 'pos.sale.write', 'pos.product.read', 'pos.product.write', 'pos.payment.read', 'pos.payment.write', 'pos.refund.read', 'pos.refund.write',
    'inventory.product.read', 'inventory.product.write', 'inventory.movement.read', 'inventory.movement.write',
    'analytics.sales.read', 'analytics.inventory.read', 'analytics.customer.read',
    'settings.store.read', 'settings.store.write',
    'hr.employee.read', 'hr.schedule.read', 'hr.schedule.write'
) AND is_active = true;

-- Sales Associate role (point of sale access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'sales_associate', id FROM permissions 
WHERE code IN (
    'core.store.read',
    'crm.lead.read', 'crm.customer.read', 'crm.customer.write',
    'pos.sale.read', 'pos.sale.write', 'pos.product.read', 'pos.payment.read', 'pos.payment.write', 'pos.refund.read',
    'inventory.product.read',
    'analytics.sales.read'
) AND is_active = true;

-- Inventory Manager role (warehouse management)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'inventory_manager', id FROM permissions 
WHERE code IN (
    'core.store.read',
    'inventory.product.read', 'inventory.product.write', 'inventory.movement.read', 'inventory.movement.write', 'inventory.transfer.read', 'inventory.transfer.write', 'inventory.supplier.read', 'inventory.supplier.write',
    'analytics.inventory.read',
    'pos.product.read', 'pos.product.write'
) AND is_active = true;

-- Marketing Manager role (CRM and campaigns)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'marketing_manager', id FROM permissions 
WHERE code IN (
    'core.tenant.read',
    'crm.lead.read', 'crm.lead.write', 'crm.customer.read', 'crm.customer.write', 'crm.campaign.read', 'crm.campaign.write', 'crm.inbox.read', 'crm.inbox.write',
    'analytics.customer.read', 'analytics.sales.read',
    'cms.page.read', 'cms.page.write', 'cms.form.read', 'cms.form.write', 'cms.publish.write'
) AND is_active = true;

-- Accountant role (financial access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'accountant', id FROM permissions 
WHERE code IN (
    'core.tenant.read', 'core.legal_entity.read',
    'pos.sale.read', 'pos.payment.read', 'pos.refund.read',
    'analytics.sales.read', 'analytics.financial.read', 'analytics.export.read',
    'settings.billing.read'
) AND is_active = true;

-- Viewer role (read-only access)
INSERT INTO role_permissions (role, permission_id) 
SELECT 'viewer', id FROM permissions 
WHERE code LIKE '%.read' AND is_active = true;

-- Migration completed successfully