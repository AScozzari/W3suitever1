// Permission Registry - Fonte di verità per tutti i permessi del sistema
// Organizzato per modulo > categoria > azione

export const PERMISSIONS = {
  // ==================== DASHBOARD ====================
  dashboard: {
    view: 'dashboard.view',
    analytics: 'dashboard.analytics',
    export: 'dashboard.export'
  },

  // ==================== CRM ====================
  crm: {
    leads: {
      view: 'crm.leads.view',
      create: 'crm.leads.create',
      edit: 'crm.leads.edit',
      delete: 'crm.leads.delete',
      assign: 'crm.leads.assign',
      export: 'crm.leads.export'
    },
    customers: {
      view: 'crm.customers.view',
      create: 'crm.customers.create',
      edit: 'crm.customers.edit',
      delete: 'crm.customers.delete',
      export: 'crm.customers.export'
    },
    deals: {
      view: 'crm.deals.view',
      create: 'crm.deals.create',
      edit: 'crm.deals.edit',
      delete: 'crm.deals.delete',
      approve: 'crm.deals.approve'
    }
  },

  // ==================== CASSA (POS) ====================
  cassa: {
    transactions: {
      view: 'cassa.transactions.view',
      create: 'cassa.transactions.create',
      void: 'cassa.transactions.void',
      refund: 'cassa.transactions.refund'
    },
    shifts: {
      open: 'cassa.shifts.open',
      close: 'cassa.shifts.close',
      reconcile: 'cassa.shifts.reconcile',
      report: 'cassa.shifts.report'
    },
    drawer: {
      manage: 'cassa.drawer.manage',
      adjust: 'cassa.drawer.adjust'
    }
  },

  // ==================== MAGAZZINO (INVENTORY) ====================
  magazzino: {
    products: {
      view: 'magazzino.products.view',
      create: 'magazzino.products.create',
      edit: 'magazzino.products.edit',
      delete: 'magazzino.products.delete'
    },
    stock: {
      view: 'magazzino.stock.view',
      adjust: 'magazzino.stock.adjust',
      transfer: 'magazzino.stock.transfer',
      count: 'magazzino.stock.count'
    },
    orders: {
      view: 'magazzino.orders.view',
      create: 'magazzino.orders.create',
      approve: 'magazzino.orders.approve',
      receive: 'magazzino.orders.receive'
    }
  },

  // ==================== GARE (BIDS) ====================
  gare: {
    bids: {
      view: 'gare.bids.view',
      create: 'gare.bids.create',
      edit: 'gare.bids.edit',
      submit: 'gare.bids.submit',
      approve: 'gare.bids.approve',
      delete: 'gare.bids.delete'
    },
    documents: {
      upload: 'gare.documents.upload',
      view: 'gare.documents.view',
      sign: 'gare.documents.sign',
      validate: 'gare.documents.validate'
    },
    scoring: {
      evaluate: 'gare.scoring.evaluate',
      override: 'gare.scoring.override'
    }
  },

  // ==================== HR ====================
  hr: {
    employees: {
      view: 'hr.employees.view',
      create: 'hr.employees.create',
      edit: 'hr.employees.edit',
      onboard: 'hr.employees.onboard',
      offboard: 'hr.employees.offboard'
    },
    payroll: {
      view: 'hr.payroll.view',
      process: 'hr.payroll.process',
      approve: 'hr.payroll.approve',
      export: 'hr.payroll.export'
    },
    timesheet: {
      view: 'hr.timesheet.view',
      edit: 'hr.timesheet.edit',
      approve: 'hr.timesheet.approve',
      report: 'hr.timesheet.report'
    },
    leave: {
      view: 'hr.leave.view',
      request: 'hr.leave.request',
      approve: 'hr.leave.approve'
    }
  },

  // ==================== FINANCE ====================
  finance: {
    invoices: {
      view: 'finance.invoices.view',
      create: 'finance.invoices.create',
      edit: 'finance.invoices.edit',
      approve: 'finance.invoices.approve',
      void: 'finance.invoices.void'
    },
    payments: {
      view: 'finance.payments.view',
      process: 'finance.payments.process',
      reconcile: 'finance.payments.reconcile'
    },
    reports: {
      view: 'finance.reports.view',
      generate: 'finance.reports.generate',
      export: 'finance.reports.export'
    },
    budget: {
      view: 'finance.budget.view',
      manage: 'finance.budget.manage',
      approve: 'finance.budget.approve'
    }
  },

  // ==================== MARKETING ====================
  marketing: {
    campaigns: {
      view: 'marketing.campaigns.view',
      create: 'marketing.campaigns.create',
      edit: 'marketing.campaigns.edit',
      launch: 'marketing.campaigns.launch',
      analyze: 'marketing.campaigns.analyze'
    },
    content: {
      view: 'marketing.content.view',
      create: 'marketing.content.create',
      edit: 'marketing.content.edit',
      publish: 'marketing.content.publish'
    },
    social: {
      view: 'marketing.social.view',
      post: 'marketing.social.post',
      schedule: 'marketing.social.schedule',
      analyze: 'marketing.social.analyze'
    }
  },

  // ==================== CMS ====================
  cms: {
    pages: {
      view: 'cms.pages.view',
      create: 'cms.pages.create',
      edit: 'cms.pages.edit',
      publish: 'cms.pages.publish',
      delete: 'cms.pages.delete'
    },
    media: {
      view: 'cms.media.view',
      upload: 'cms.media.upload',
      manage: 'cms.media.manage'
    }
  },

  // ==================== SETTINGS ====================
  settings: {
    view: 'settings.view',
    organization: {
      view: 'settings.organization.view',
      edit: 'settings.organization.edit',
      manage: 'settings.organization.manage'
    },
    users: {
      view: 'settings.users.view',
      create: 'settings.users.create',
      edit: 'settings.users.edit',
      delete: 'settings.users.delete',
      suspend: 'settings.users.suspend'
    },
    roles: {
      view: 'settings.roles.view',
      create: 'settings.roles.create',
      edit: 'settings.roles.edit',
      delete: 'settings.roles.delete',
      assign: 'settings.roles.assign'
    },
    integrations: {
      view: 'settings.integrations.view',
      manage: 'settings.integrations.manage'
    },
    billing: {
      view: 'settings.billing.view',
      manage: 'settings.billing.manage'
    }
  },

  // ==================== REPORTS ====================
  reports: {
    view: 'reports.view',
    generate: 'reports.generate',
    export: 'reports.export',
    schedule: 'reports.schedule'
  },

  // ==================== SYSTEM ====================
  system: {
    audit: {
      view: 'system.audit.view',
      export: 'system.audit.export'
    },
    debug: {
      view: 'system.debug.view',
      execute: 'system.debug.execute'
    }
  }
} as const;

// Tipo per tutti i permessi
export type Permission = string;

// Helper per ottenere tutti i permessi come array flat
export function getAllPermissions(): Permission[] {
  const perms: Permission[] = [];
  
  function traverse(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        perms.push(obj[key]);
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }
  
  traverse(PERMISSIONS);
  return perms;
}

// Template di ruoli con i loro permessi predefiniti
export const ROLE_TEMPLATES = {
  // ADMIN - Accesso completo al tenant
  admin: {
    code: 'admin',
    name: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità del sistema',
    permissions: getAllPermissions() // Tutti i permessi
  },

  // FINANCE - Gestione finanziaria e contabile
  finance: {
    code: 'finance',
    name: 'Finance',
    description: 'Gestione finanziaria, fatturazione e reportistica',
    permissions: [
      PERMISSIONS.dashboard.view,
      PERMISSIONS.dashboard.analytics,
      // Finance completo
      ...Object.values(PERMISSIONS.finance.invoices),
      ...Object.values(PERMISSIONS.finance.payments),
      ...Object.values(PERMISSIONS.finance.reports),
      ...Object.values(PERMISSIONS.finance.budget),
      // Cassa view only
      PERMISSIONS.cassa.transactions.view,
      PERMISSIONS.cassa.shifts.report,
      // Reports
      ...Object.values(PERMISSIONS.reports),
      // Settings view
      PERMISSIONS.settings.view,
      PERMISSIONS.settings.billing.view,
      PERMISSIONS.settings.billing.manage
    ]
  },

  // DIRETTORE - Gestione strategica e supervisione
  direttore: {
    code: 'direttore',
    name: 'Direttore',
    description: 'Supervisione e gestione strategica',
    permissions: [
      // Dashboard & Analytics
      PERMISSIONS.dashboard.view,
      PERMISSIONS.dashboard.analytics,
      PERMISSIONS.dashboard.export,
      // CRM completo
      ...Object.values(PERMISSIONS.crm.leads),
      ...Object.values(PERMISSIONS.crm.customers),
      ...Object.values(PERMISSIONS.crm.deals),
      // Cassa supervisione
      PERMISSIONS.cassa.transactions.view,
      PERMISSIONS.cassa.transactions.refund,
      PERMISSIONS.cassa.shifts.report,
      PERMISSIONS.cassa.shifts.reconcile,
      // Magazzino supervisione
      PERMISSIONS.magazzino.products.view,
      PERMISSIONS.magazzino.stock.view,
      PERMISSIONS.magazzino.orders.view,
      PERMISSIONS.magazzino.orders.approve,
      // HR supervisione
      PERMISSIONS.hr.employees.view,
      PERMISSIONS.hr.payroll.view,
      PERMISSIONS.hr.payroll.approve,
      PERMISSIONS.hr.timesheet.view,
      PERMISSIONS.hr.timesheet.approve,
      PERMISSIONS.hr.leave.approve,
      // Finance view
      PERMISSIONS.finance.invoices.view,
      PERMISSIONS.finance.reports.view,
      PERMISSIONS.finance.budget.view,
      // Marketing supervisione
      PERMISSIONS.marketing.campaigns.view,
      PERMISSIONS.marketing.campaigns.analyze,
      // Reports completo
      ...Object.values(PERMISSIONS.reports),
      // Settings organizzazione
      PERMISSIONS.settings.view,
      PERMISSIONS.settings.organization.view,
      PERMISSIONS.settings.users.view,
      PERMISSIONS.settings.roles.view
    ]
  },

  // STORE MANAGER - Gestione completa punto vendita
  store_manager: {
    code: 'store_manager',
    name: 'Store Manager',
    description: 'Gestione completa del punto vendita',
    permissions: [
      // Dashboard
      PERMISSIONS.dashboard.view,
      PERMISSIONS.dashboard.analytics,
      // CRM
      ...Object.values(PERMISSIONS.crm.leads),
      ...Object.values(PERMISSIONS.crm.customers),
      PERMISSIONS.crm.deals.view,
      PERMISSIONS.crm.deals.create,
      PERMISSIONS.crm.deals.edit,
      // Cassa completo
      ...Object.values(PERMISSIONS.cassa.transactions),
      ...Object.values(PERMISSIONS.cassa.shifts),
      ...Object.values(PERMISSIONS.cassa.drawer),
      // Magazzino
      ...Object.values(PERMISSIONS.magazzino.products),
      ...Object.values(PERMISSIONS.magazzino.stock),
      PERMISSIONS.magazzino.orders.view,
      PERMISSIONS.magazzino.orders.create,
      PERMISSIONS.magazzino.orders.receive,
      // HR team management
      PERMISSIONS.hr.employees.view,
      PERMISSIONS.hr.employees.edit,
      PERMISSIONS.hr.timesheet.view,
      PERMISSIONS.hr.timesheet.edit,
      PERMISSIONS.hr.leave.view,
      PERMISSIONS.hr.leave.request,
      // Reports store
      PERMISSIONS.reports.view,
      PERMISSIONS.reports.generate,
      // Settings limitato
      PERMISSIONS.settings.view
    ]
  },

  // STORE SPECIALIST - Operativo punto vendita
  store_specialist: {
    code: 'store_specialist',
    name: 'Store Specialist',
    description: 'Operazioni quotidiane del punto vendita',
    permissions: [
      // Dashboard base
      PERMISSIONS.dashboard.view,
      // CRM base
      PERMISSIONS.crm.leads.view,
      PERMISSIONS.crm.leads.create,
      PERMISSIONS.crm.leads.edit,
      PERMISSIONS.crm.customers.view,
      PERMISSIONS.crm.customers.create,
      PERMISSIONS.crm.customers.edit,
      PERMISSIONS.crm.deals.view,
      PERMISSIONS.crm.deals.create,
      // Cassa operativo
      PERMISSIONS.cassa.transactions.view,
      PERMISSIONS.cassa.transactions.create,
      PERMISSIONS.cassa.shifts.open,
      PERMISSIONS.cassa.shifts.close,
      // Magazzino base
      PERMISSIONS.magazzino.products.view,
      PERMISSIONS.magazzino.stock.view,
      PERMISSIONS.magazzino.stock.adjust,
      // HR self
      PERMISSIONS.hr.timesheet.view,
      PERMISSIONS.hr.timesheet.edit,
      PERMISSIONS.hr.leave.view,
      PERMISSIONS.hr.leave.request
    ]
  },

  // STUDENT - Accesso limitato per formazione
  student: {
    code: 'student',
    name: 'Student',
    description: 'Accesso limitato per formazione e apprendimento',
    permissions: [
      // Dashboard view only
      PERMISSIONS.dashboard.view,
      // CRM view only
      PERMISSIONS.crm.leads.view,
      PERMISSIONS.crm.customers.view,
      // Cassa view only
      PERMISSIONS.cassa.transactions.view,
      // Magazzino view only
      PERMISSIONS.magazzino.products.view,
      PERMISSIONS.magazzino.stock.view,
      // HR self view
      PERMISSIONS.hr.timesheet.view
    ]
  },

  // MARKETING - Gestione marketing e comunicazione
  marketing: {
    code: 'marketing',
    name: 'Marketing',
    description: 'Gestione campagne marketing e comunicazione',
    permissions: [
      // Dashboard
      PERMISSIONS.dashboard.view,
      PERMISSIONS.dashboard.analytics,
      // CRM per segmentazione
      PERMISSIONS.crm.leads.view,
      PERMISSIONS.crm.customers.view,
      PERMISSIONS.crm.leads.export,
      PERMISSIONS.crm.customers.export,
      // Marketing completo
      ...Object.values(PERMISSIONS.marketing.campaigns),
      ...Object.values(PERMISSIONS.marketing.content),
      ...Object.values(PERMISSIONS.marketing.social),
      // CMS completo
      ...Object.values(PERMISSIONS.cms.pages),
      ...Object.values(PERMISSIONS.cms.media),
      // Reports marketing
      PERMISSIONS.reports.view,
      PERMISSIONS.reports.generate,
      PERMISSIONS.reports.export,
      // Settings view
      PERMISSIONS.settings.view
    ]
  },

  // HR MANAGEMENT - Gestione risorse umane
  hr_management: {
    code: 'hr_management',
    name: 'HR Management',
    description: 'Gestione completa risorse umane',
    permissions: [
      // Dashboard & Analytics
      PERMISSIONS.dashboard.view,
      PERMISSIONS.dashboard.analytics,
      PERMISSIONS.dashboard.export,
      // HR completo
      ...Object.values(PERMISSIONS.hr.employees),
      ...Object.values(PERMISSIONS.hr.payroll),
      ...Object.values(PERMISSIONS.hr.timesheet),
      ...Object.values(PERMISSIONS.hr.leave),
      // CRM per gestione contatti dipendenti
      PERMISSIONS.crm.customers.view,
      PERMISSIONS.crm.customers.create,
      PERMISSIONS.crm.customers.edit,
      // Finance per stipendi
      PERMISSIONS.finance.payments.view,
      PERMISSIONS.finance.payments.process,
      PERMISSIONS.finance.reports.view,
      PERMISSIONS.finance.budget.view,
      // Reports HR
      ...Object.values(PERMISSIONS.reports),
      // Settings per gestione utenti
      PERMISSIONS.settings.view,
      PERMISSIONS.settings.users.view,
      PERMISSIONS.settings.users.create,
      PERMISSIONS.settings.users.edit,
      PERMISSIONS.settings.users.suspend,
      PERMISSIONS.settings.organization.view
    ]
  },

  // CUSTOM - Template vuoto per ruoli personalizzati
  custom: {
    code: 'custom',
    name: 'Custom',
    description: 'Ruolo personalizzato configurabile',
    permissions: [
      // Solo dashboard view di base
      PERMISSIONS.dashboard.view
    ]
  }
};

// Helper per ottenere i permessi di un template
export function getTemplatePermissions(templateCode: string): Permission[] {
  const template = ROLE_TEMPLATES[templateCode as keyof typeof ROLE_TEMPLATES];
  return template ? [...template.permissions] : [];
}

// Helper per verificare se un permesso esiste
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}