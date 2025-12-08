import { getAllPermissions, PERMISSIONS } from '../core/permissions/registry';

/**
 * Italian Role Templates with Default Permissions
 * 
 * This defines the permission structure for each Italian role template.
 * All roles will have these permissions by default when created.
 */

export const ITALIAN_ROLE_TEMPLATES = {
  'Amministratore': {
    description: 'Accesso completo a tutte le funzionalità',
    isSystem: true,
    permissions: getAllPermissions() // All 215 permissions
  },
  
  'Store Manager': {
    description: 'Gestione completa del punto vendita',
    isSystem: true,
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.analytics',
      
      // CRM - Full access
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.edit',
      'crm.leads.assign',
      'crm.leads.export',
      'crm.customers.view',
      'crm.customers.create',
      'crm.customers.edit',
      'crm.customers.export',
      'crm.deals.view',
      'crm.deals.create',
      'crm.deals.edit',
      'crm.deals.approve',
      
      // Cassa (POS) - Full access
      'cassa.transactions.view',
      'cassa.transactions.create',
      'cassa.transactions.void',
      'cassa.transactions.refund',
      'cassa.shifts.open',
      'cassa.shifts.close',
      'cassa.shifts.reconcile',
      'cassa.shifts.report',
      'cassa.drawer.manage',
      'cassa.drawer.adjust',
      
      // Magazzino - Full access
      'magazzino.products.view',
      'magazzino.products.create',
      'magazzino.products.edit',
      'magazzino.stock.view',
      'magazzino.stock.adjust',
      'magazzino.stock.transfer',
      'magazzino.stock.count',
      'magazzino.orders.view',
      'magazzino.orders.create',
      'magazzino.orders.approve',
      
      // Marketing - View and basic actions
      'marketing.campaigns.view',
      'marketing.campaigns.create',
      'marketing.promotions.view',
      'marketing.promotions.create',
      
      // Analytics - Full access
      'analytics.sales.view',
      'analytics.revenue.view',
      'analytics.inventory.view',
      'analytics.customers.view',
      
      // Reports - Full access
      'reports.sales.view',
      'reports.inventory.view',
      'reports.financial.view',
      
      // Settings - Store level
      'settings.store.view',
      'settings.store.edit',
      'settings.users.view',
      'settings.users.create',
      'settings.users.edit',
      
      // Tasks
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.assign',
      
      // Workflows
      'workflows.view',
      'workflows.execute',
      
      // Notifications
      'notifications.view',
      'notifications.create',
    ]
  },
  
  'Area Manager': {
    description: 'Supervisione di più punti vendita',
    isSystem: true,
    permissions: [
      // Dashboard - Advanced analytics
      'dashboard.view',
      'dashboard.analytics',
      'dashboard.export',
      
      // CRM - Full multi-store access
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.edit',
      'crm.leads.assign',
      'crm.leads.export',
      'crm.customers.view',
      'crm.customers.create',
      'crm.customers.edit',
      'crm.customers.export',
      'crm.deals.view',
      'crm.deals.create',
      'crm.deals.edit',
      'crm.deals.approve',
      
      // Cassa - View only (supervision)
      'cassa.transactions.view',
      'cassa.shifts.report',
      
      // Magazzino - Full visibility
      'magazzino.products.view',
      'magazzino.stock.view',
      'magazzino.stock.transfer',
      'magazzino.orders.view',
      'magazzino.orders.approve',
      
      // Marketing - Full access
      'marketing.campaigns.view',
      'marketing.campaigns.create',
      'marketing.campaigns.edit',
      'marketing.promotions.view',
      'marketing.promotions.create',
      'marketing.promotions.edit',
      
      // Analytics - Advanced multi-store
      'analytics.sales.view',
      'analytics.revenue.view',
      'analytics.inventory.view',
      'analytics.customers.view',
      'analytics.performance.view',
      
      // Reports - Full access
      'reports.sales.view',
      'reports.inventory.view',
      'reports.financial.view',
      'reports.performance.view',
      
      // Settings - Area level
      'settings.area.view',
      'settings.area.edit',
      'settings.users.view',
      'settings.users.create',
      
      // Tasks - Full management
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.assign',
      'tasks.delete',
      
      // Workflows
      'workflows.view',
      'workflows.create',
      'workflows.execute',
    ]
  },
  
  'Finance': {
    description: 'Gestione finanziaria e reportistica',
    isSystem: true,
    permissions: [
      // Dashboard - Financial focus
      'dashboard.view',
      'dashboard.analytics',
      'dashboard.export',
      
      // Cassa - Full financial access
      'cassa.transactions.view',
      'cassa.shifts.report',
      'cassa.shifts.reconcile',
      
      // CRM - View for revenue tracking
      'crm.customers.view',
      'crm.deals.view',
      
      // Analytics - Financial
      'analytics.sales.view',
      'analytics.revenue.view',
      'analytics.financial.view',
      
      // Reports - Full financial access
      'reports.sales.view',
      'reports.financial.view',
      'reports.revenue.view',
      'reports.tax.view',
      
      // Invoicing & Billing
      'invoicing.view',
      'invoicing.create',
      'invoicing.export',
      'billing.view',
      'billing.manage',
      
      // Settings - Financial
      'settings.billing.view',
      'settings.billing.edit',
      'settings.payment.view',
      'settings.payment.edit',
    ]
  },
  
  'HR Manager': {
    description: 'Gestione risorse umane',
    isSystem: true,
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.analytics',
      
      // HR - Full access
      'hr.employees.view',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.employees.delete',
      'hr.contracts.view',
      'hr.contracts.create',
      'hr.contracts.edit',
      'hr.attendance.view',
      'hr.attendance.manage',
      'hr.payroll.view',
      'hr.payroll.process',
      'hr.benefits.view',
      'hr.benefits.manage',
      
      // Calendar - Team management
      'calendar.view',
      'calendar.create',
      'calendar.edit',
      'calendar.manage',
      
      // Tasks - Team assignment
      'tasks.view',
      'tasks.create',
      'tasks.assign',
      
      // Analytics - HR metrics
      'analytics.employees.view',
      'analytics.attendance.view',
      
      // Reports - HR
      'reports.employees.view',
      'reports.attendance.view',
      'reports.payroll.view',
      
      // Settings - Users
      'settings.users.view',
      'settings.users.create',
      'settings.users.edit',
    ]
  },
  
  'Marketing': {
    description: 'Gestione campagne e promozioni',
    isSystem: false,
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.analytics',
      
      // CRM - Lead generation
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.export',
      'crm.customers.view',
      'crm.customers.export',
      
      // Marketing - Full access
      'marketing.campaigns.view',
      'marketing.campaigns.create',
      'marketing.campaigns.edit',
      'marketing.campaigns.delete',
      'marketing.promotions.view',
      'marketing.promotions.create',
      'marketing.promotions.edit',
      'marketing.promotions.delete',
      'marketing.content.view',
      'marketing.content.create',
      'marketing.content.edit',
      
      // Analytics - Marketing metrics
      'analytics.campaigns.view',
      'analytics.customers.view',
      'analytics.engagement.view',
      
      // Reports - Marketing
      'reports.campaigns.view',
      'reports.engagement.view',
      'reports.roi.view',
      
      // CMS
      'cms.view',
      'cms.create',
      'cms.edit',
      
      // Tasks
      'tasks.view',
      'tasks.create',
    ]
  },
  
  'Sales Agent': {
    description: 'Agente di vendita',
    isSystem: false,
    permissions: [
      // Dashboard - Sales focus
      'dashboard.view',
      
      // CRM - Sales operations
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.edit',
      'crm.customers.view',
      'crm.customers.create',
      'crm.customers.edit',
      'crm.deals.view',
      'crm.deals.create',
      'crm.deals.edit',
      
      // Cassa - Basic transactions
      'cassa.transactions.view',
      'cassa.transactions.create',
      
      // Analytics - Personal performance
      'analytics.sales.view',
      
      // Reports - Personal
      'reports.sales.view',
      
      // Tasks
      'tasks.view',
      'tasks.create',
      
      // Calendar
      'calendar.view',
      'calendar.create',
      
      // Notifications
      'notifications.view',
    ]
  },
  
  'Cassiere': {
    description: 'Gestione cassa e vendite',
    isSystem: false,
    permissions: [
      // Dashboard - Basic view
      'dashboard.view',
      
      // Cassa - Full POS access
      'cassa.transactions.view',
      'cassa.transactions.create',
      'cassa.transactions.void',
      'cassa.transactions.refund',
      'cassa.shifts.open',
      'cassa.shifts.close',
      'cassa.shifts.report',
      'cassa.drawer.manage',
      
      // CRM - Basic customer lookup
      'crm.customers.view',
      
      // Magazzino - Product lookup
      'magazzino.products.view',
      'magazzino.stock.view',
      
      // Tasks
      'tasks.view',
      
      // Notifications
      'notifications.view',
    ]
  },
  
  'Magazziniere': {
    description: 'Gestione magazzino e inventario',
    isSystem: false,
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Magazzino - Full warehouse access
      'magazzino.products.view',
      'magazzino.products.create',
      'magazzino.products.edit',
      'magazzino.stock.view',
      'magazzino.stock.adjust',
      'magazzino.stock.transfer',
      'magazzino.stock.count',
      'magazzino.orders.view',
      'magazzino.orders.create',
      'magazzino.receiving.view',
      'magazzino.receiving.process',
      'magazzino.shipping.view',
      'magazzino.shipping.process',
      
      // Analytics - Inventory
      'analytics.inventory.view',
      
      // Reports - Inventory
      'reports.inventory.view',
      
      // Tasks
      'tasks.view',
      'tasks.create',
      
      // Notifications
      'notifications.view',
    ]
  },
  
  'Operatore': {
    description: 'Accesso limitato alle operazioni base',
    isSystem: false,
    permissions: [
      // Dashboard - View only
      'dashboard.view',
      
      // Basic view permissions
      'crm.customers.view',
      'magazzino.products.view',
      'magazzino.stock.view',
      
      // Tasks - View assigned
      'tasks.view',
      
      // Calendar
      'calendar.view',
      
      // Notifications
      'notifications.view',
    ]
  }
};

/**
 * Get permissions for a specific role template
 */
export function getRoleTemplatePermissions(roleName: string): string[] {
  const template = ITALIAN_ROLE_TEMPLATES[roleName as keyof typeof ITALIAN_ROLE_TEMPLATES];
  return template ? template.permissions : [];
}

/**
 * Get all Italian role templates
 */
export function getAllRoleTemplates() {
  return Object.entries(ITALIAN_ROLE_TEMPLATES).map(([name, config]) => ({
    name,
    ...config
  }));
}
