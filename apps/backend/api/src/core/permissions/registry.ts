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
    },
    requests: {
      create: 'hr.requests.create',
      view_self: 'hr.requests.view.self',
      view_all: 'hr.requests.view.all',
      approve: 'hr.requests.approve',
      comment: 'hr.requests.comment',
      delete: 'hr.requests.delete'
    }
  },

  // ==================== TASK MANAGEMENT ====================
  task: {
    read: 'task.read',
    create: 'task.create',
    update: 'task.update',
    delete: 'task.delete',
    assign: 'task.assign',
    comment: 'task.comment',
    timeLog: 'task.time-log'
  },

  taskTemplate: {
    read: 'task-template.read',
    create: 'task-template.create',
    update: 'task-template.update',
    delete: 'task-template.delete'
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
  },

  // ==================== LOGS ====================
  logs: {
    read: 'logs.read',
    write: 'logs.write'
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    read: 'notifications.read',
    manage: 'notifications.manage',
    create: 'notifications.create',
    markRead: 'notifications.markRead',
    bulkActions: 'notifications.bulkActions',
    delete: 'notifications.delete'
  },

  // ==================== AI SYSTEM ====================
  ai: {
    settings: {
      view: 'ai.settings.view',
      manage: 'ai.settings.manage',
      configure: 'ai.settings.configure'
    },
    usage: {
      view: 'ai.usage.view',
      analytics: 'ai.usage.analytics',
      export: 'ai.usage.export'
    },
    chat: {
      use: 'ai.chat.use',
      create: 'ai.chat.create',
      history: 'ai.chat.history'
    },
    conversations: {
      view: 'ai.conversations.view',
      create: 'ai.conversations.create',
      delete: 'ai.conversations.delete',
      manage: 'ai.conversations.manage'
    },
    documents: {
      analyze: 'ai.documents.analyze',
      process: 'ai.documents.process'
    },
    financial: {
      forecast: 'ai.financial.forecast',
      analyze: 'ai.financial.analyze'
    },
    search: {
      web: 'ai.search.web',
      internal: 'ai.search.internal'
    },
    training: {
      view: 'ai.training.view',
      create: 'ai.training.create',
      validate: 'ai.training.validate',
      url: 'ai.training.url',
      media: 'ai.training.media'
    },
    admin: {
      keys: 'ai.admin.keys',
      monitor: 'ai.admin.monitor',
      configure: 'ai.admin.configure'
    }
  },

  // ==================== MCP (MODEL CONTEXT PROTOCOL) ====================
  mcp: {
    read: 'mcp.read',
    write: 'mcp.write',
    delete: 'mcp.delete',
    execute: 'mcp.execute',
    servers: {
      view: 'mcp.servers.view',
      create: 'mcp.servers.create',
      update: 'mcp.servers.update',
      delete: 'mcp.servers.delete',
      configure: 'mcp.servers.configure'
    },
    credentials: {
      view: 'mcp.credentials.view',
      create: 'mcp.credentials.create',
      update: 'mcp.credentials.update',
      revoke: 'mcp.credentials.revoke'
    },
    tools: {
      view: 'mcp.tools.view',
      execute: 'mcp.tools.execute',
      test: 'mcp.tools.test'
    }
  },

  // ==================== WEBHOOKS ====================
  webhooks: {
    receive: {
      all: 'webhooks.receive.*',
      stripe: 'webhooks.receive.stripe',
      twilio: 'webhooks.receive.twilio',
      github: 'webhooks.receive.github',
      custom: 'webhooks.receive.custom'
    },
    manage: {
      view: 'webhooks.manage.view',
      create: 'webhooks.manage.create',
      edit: 'webhooks.manage.edit',
      delete: 'webhooks.manage.delete',
      configure: 'webhooks.manage.configure'
    },
    events: {
      view: 'webhooks.events.view',
      retry: 'webhooks.events.retry',
      delete: 'webhooks.events.delete'
    },
    signatures: {
      view: 'webhooks.signatures.view',
      create: 'webhooks.signatures.create',
      edit: 'webhooks.signatures.edit',
      delete: 'webhooks.signatures.delete'
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
    permissions: getAllPermissions() // Tutti i permessi (include AI e Webhooks)
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
      // AI Basic access for Directors
      PERMISSIONS.ai.settings.view,
      PERMISSIONS.ai.usage.view,
      PERMISSIONS.ai.usage.analytics,
      PERMISSIONS.ai.chat.use,
      PERMISSIONS.ai.conversations.view,
      // Webhooks - View only for monitoring
      PERMISSIONS.webhooks.events.view,
      PERMISSIONS.webhooks.manage.view,
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
      PERMISSIONS.settings.view,
      // Notifications
      PERMISSIONS.notifications.read,
      PERMISSIONS.notifications.markRead,
      PERMISSIONS.notifications.manage
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
      PERMISSIONS.hr.leave.request,
      // Notifications
      PERMISSIONS.notifications.read,
      PERMISSIONS.notifications.markRead
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
      PERMISSIONS.hr.timesheet.view,
      // Notifications
      PERMISSIONS.notifications.read,
      PERMISSIONS.notifications.markRead
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

// ==================== PERMISSION DESCRIPTIONS ====================
// Descrizioni in italiano per ogni permesso (usate dalla UI RBAC con tooltip)

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  // Dashboard
  'dashboard.view': 'Visualizza la dashboard principale con panoramica delle metriche',
  'dashboard.analytics': 'Accedi ai report analitici e grafici della dashboard',
  'dashboard.export': 'Esporta i dati della dashboard in formato Excel/PDF',
  
  // CRM - Leads
  'crm.leads.view': 'Visualizza la lista dei lead nel CRM',
  'crm.leads.create': 'Crea nuovi lead nel sistema CRM',
  'crm.leads.edit': 'Modifica le informazioni dei lead esistenti',
  'crm.leads.delete': 'Elimina lead dal sistema',
  'crm.leads.assign': 'Assegna lead ad altri utenti o team',
  'crm.leads.export': 'Esporta la lista dei lead in formato Excel/CSV',
  
  // CRM - Customers
  'crm.customers.view': 'Visualizza la lista dei clienti',
  'crm.customers.create': 'Crea nuovi clienti nel CRM',
  'crm.customers.edit': 'Modifica le informazioni dei clienti',
  'crm.customers.delete': 'Elimina clienti dal sistema',
  'crm.customers.export': 'Esporta la lista dei clienti in formato Excel/CSV',
  
  // CRM - Deals
  'crm.deals.view': 'Visualizza le opportunità di vendita (deals)',
  'crm.deals.create': 'Crea nuove opportunità di vendita',
  'crm.deals.edit': 'Modifica le opportunità di vendita esistenti',
  'crm.deals.delete': 'Elimina opportunità dal sistema',
  'crm.deals.approve': 'Approva opportunità di vendita',
  
  // Cassa - Transactions
  'cassa.transactions.view': 'Visualizza le transazioni di cassa',
  'cassa.transactions.create': 'Crea nuove transazioni di vendita',
  'cassa.transactions.void': 'Annulla transazioni di cassa',
  'cassa.transactions.refund': 'Effettua rimborsi ai clienti',
  
  // Cassa - Shifts
  'cassa.shifts.open': 'Apri turni di cassa',
  'cassa.shifts.close': 'Chiudi turni di cassa',
  'cassa.shifts.reconcile': 'Riconcilia i turni di cassa con contanti fisici',
  'cassa.shifts.report': 'Genera report dei turni di cassa',
  
  // Cassa - Drawer
  'cassa.drawer.manage': 'Gestisci il cassetto della cassa',
  'cassa.drawer.adjust': 'Aggiusta il saldo del cassetto della cassa',
  
  // Magazzino - Products
  'magazzino.products.view': 'Visualizza il catalogo prodotti',
  'magazzino.products.create': 'Crea nuovi prodotti nel magazzino',
  'magazzino.products.edit': 'Modifica le informazioni dei prodotti',
  'magazzino.products.delete': 'Elimina prodotti dal catalogo',
  
  // Magazzino - Stock
  'magazzino.stock.view': 'Visualizza le giacenze di magazzino',
  'magazzino.stock.adjust': 'Aggiusta le quantità di magazzino',
  'magazzino.stock.transfer': 'Trasferisci scorte tra magazzini',
  'magazzino.stock.count': 'Esegui inventario fisico',
  
  // Magazzino - Orders
  'magazzino.orders.view': 'Visualizza gli ordini di magazzino',
  'magazzino.orders.create': 'Crea nuovi ordini di riapprovvigionamento',
  'magazzino.orders.approve': 'Approva ordini di magazzino',
  'magazzino.orders.receive': 'Ricevi merce dagli ordini',
  
  // Gare - Bids
  'gare.bids.view': 'Visualizza le gare d\'appalto',
  'gare.bids.create': 'Crea nuove gare d\'appalto',
  'gare.bids.edit': 'Modifica le gare esistenti',
  'gare.bids.submit': 'Invia offerte per le gare',
  'gare.bids.approve': 'Approva gare d\'appalto',
  'gare.bids.delete': 'Elimina gare dal sistema',
  
  // Gare - Documents
  'gare.documents.upload': 'Carica documenti per le gare',
  'gare.documents.view': 'Visualizza i documenti delle gare',
  'gare.documents.sign': 'Firma digitalmente i documenti di gara',
  'gare.documents.validate': 'Valida i documenti caricati',
  
  // Gare - Scoring
  'gare.scoring.evaluate': 'Valuta le offerte ricevute',
  'gare.scoring.override': 'Sovrascrivi le valutazioni automatiche',
  
  // HR - Employees
  'hr.employees.view': 'Visualizza la lista dei dipendenti',
  'hr.employees.create': 'Crea nuovi dipendenti nel sistema HR',
  'hr.employees.edit': 'Modifica le informazioni dei dipendenti',
  'hr.employees.onboard': 'Gestisci l\'onboarding dei nuovi dipendenti',
  'hr.employees.offboard': 'Gestisci l\'offboarding dei dipendenti in uscita',
  
  // HR - Payroll
  'hr.payroll.view': 'Visualizza i cedolini paga',
  'hr.payroll.process': 'Elabora i pagamenti degli stipendi',
  'hr.payroll.approve': 'Approva i cedolini paga',
  'hr.payroll.export': 'Esporta i dati delle buste paga',
  
  // HR - Timesheet
  'hr.timesheet.view': 'Visualizza i fogli ore dei dipendenti',
  'hr.timesheet.edit': 'Modifica i fogli ore',
  'hr.timesheet.approve': 'Approva i fogli ore dei dipendenti',
  'hr.timesheet.report': 'Genera report sulle ore lavorate',
  
  // HR - Leave
  'hr.leave.view': 'Visualizza le richieste di ferie e permessi',
  'hr.leave.request': 'Richiedi ferie o permessi',
  'hr.leave.approve': 'Approva richieste di ferie e permessi',
  
  // HR - Requests
  'hr.requests.create': 'Crea nuove richieste HR (ferie, rimborsi, etc.)',
  'hr.requests.view.self': 'Visualizza le proprie richieste HR',
  'hr.requests.view.all': 'Visualizza tutte le richieste HR del team',
  'hr.requests.approve': 'Approva richieste HR dei dipendenti',
  'hr.requests.comment': 'Commenta sulle richieste HR',
  'hr.requests.delete': 'Elimina richieste HR',
  
  // Task Management
  'task.read': 'Visualizza le attività assegnate',
  'task.create': 'Crea nuove attività',
  'task.update': 'Modifica le attività esistenti',
  'task.delete': 'Elimina attività',
  'task.assign': 'Assegna attività ad altri utenti',
  'task.comment': 'Commenta sulle attività',
  'task.time-log': 'Registra il tempo speso sulle attività',
  
  // Task Templates
  'task-template.read': 'Visualizza i template di attività',
  'task-template.create': 'Crea nuovi template di attività',
  'task-template.update': 'Modifica i template esistenti',
  'task-template.delete': 'Elimina template di attività',
  
  // Finance - Invoices
  'finance.invoices.view': 'Visualizza le fatture',
  'finance.invoices.create': 'Crea nuove fatture',
  'finance.invoices.edit': 'Modifica le fatture esistenti',
  'finance.invoices.approve': 'Approva le fatture',
  'finance.invoices.void': 'Annulla fatture emesse',
  
  // Finance - Payments
  'finance.payments.view': 'Visualizza i pagamenti',
  'finance.payments.process': 'Elabora pagamenti in entrata e uscita',
  'finance.payments.reconcile': 'Riconcilia i pagamenti con gli estratti conto',
  
  // Finance - Reports
  'finance.reports.view': 'Visualizza i report finanziari',
  'finance.reports.generate': 'Genera nuovi report finanziari',
  'finance.reports.export': 'Esporta i report finanziari',
  
  // Finance - Budget
  'finance.budget.view': 'Visualizza i budget aziendali',
  'finance.budget.manage': 'Gestisci i budget dei dipartimenti',
  'finance.budget.approve': 'Approva i budget proposti',
  
  // Marketing - Campaigns
  'marketing.campaigns.view': 'Visualizza le campagne marketing',
  'marketing.campaigns.create': 'Crea nuove campagne marketing',
  'marketing.campaigns.edit': 'Modifica le campagne esistenti',
  'marketing.campaigns.launch': 'Lancia campagne marketing',
  'marketing.campaigns.analyze': 'Analizza le performance delle campagne',
  
  // Marketing - Content
  'marketing.content.view': 'Visualizza i contenuti marketing',
  'marketing.content.create': 'Crea nuovi contenuti',
  'marketing.content.edit': 'Modifica i contenuti esistenti',
  'marketing.content.publish': 'Pubblica contenuti marketing',
  
  // Marketing - Social
  'marketing.social.view': 'Visualizza i post social media',
  'marketing.social.post': 'Pubblica sui social media',
  'marketing.social.schedule': 'Programma post social',
  'marketing.social.analyze': 'Analizza le performance sui social',
  
  // CMS - Pages
  'cms.pages.view': 'Visualizza le pagine del sito web',
  'cms.pages.create': 'Crea nuove pagine web',
  'cms.pages.edit': 'Modifica le pagine esistenti',
  'cms.pages.publish': 'Pubblica pagine sul sito',
  'cms.pages.delete': 'Elimina pagine dal sito',
  
  // CMS - Media
  'cms.media.view': 'Visualizza la libreria media',
  'cms.media.upload': 'Carica nuovi file media (immagini, video)',
  'cms.media.manage': 'Gestisci i file media esistenti',
  
  // Settings - General
  'settings.view': 'Accedi alla sezione impostazioni',
  
  // Settings - Organization
  'settings.organization.view': 'Visualizza le impostazioni aziendali',
  'settings.organization.edit': 'Modifica le informazioni aziendali',
  'settings.organization.manage': 'Gestisci la configurazione organizzativa',
  
  // Settings - Users
  'settings.users.view': 'Visualizza la lista degli utenti',
  'settings.users.create': 'Crea nuovi utenti nel sistema',
  'settings.users.edit': 'Modifica le informazioni degli utenti',
  'settings.users.delete': 'Elimina utenti dal sistema',
  'settings.users.suspend': 'Sospendi temporaneamente gli utenti',
  
  // Settings - Roles
  'settings.roles.view': 'Visualizza i ruoli RBAC',
  'settings.roles.create': 'Crea nuovi ruoli personalizzati',
  'settings.roles.edit': 'Modifica i permessi dei ruoli',
  'settings.roles.delete': 'Elimina ruoli dal sistema',
  'settings.roles.assign': 'Assegna ruoli agli utenti',
  
  // Settings - Integrations
  'settings.integrations.view': 'Visualizza le integrazioni configurate',
  'settings.integrations.manage': 'Configura integrazioni esterne (Stripe, Twilio, etc.)',
  
  // Settings - Billing
  'settings.billing.view': 'Visualizza le informazioni di fatturazione',
  'settings.billing.manage': 'Gestisci il piano di abbonamento e i pagamenti',
  
  // Reports
  'reports.view': 'Visualizza i report aziendali',
  'reports.generate': 'Genera nuovi report',
  'reports.export': 'Esporta i report in Excel/PDF',
  'reports.schedule': 'Programma l\'invio automatico dei report',
  
  // System - Audit
  'system.audit.view': 'Visualizza i log di audit del sistema',
  'system.audit.export': 'Esporta i log di audit',
  
  // System - Debug
  'system.debug.view': 'Accedi alle informazioni di debug',
  'system.debug.execute': 'Esegui comandi di debug avanzati',
  
  // Logs
  'logs.read': 'Leggi i log di sistema',
  'logs.write': 'Scrivi nei log di sistema',
  
  // Notifications
  'notifications.read': 'Visualizza le notifiche',
  'notifications.manage': 'Gestisci le impostazioni di notifica',
  'notifications.create': 'Crea nuove notifiche',
  'notifications.markRead': 'Segna le notifiche come lette',
  'notifications.bulkActions': 'Esegui azioni di massa sulle notifiche',
  'notifications.delete': 'Elimina notifiche',
  
  // AI - Settings
  'ai.settings.view': 'Visualizza le impostazioni AI',
  'ai.settings.manage': 'Gestisci la configurazione AI',
  'ai.settings.configure': 'Configura i parametri avanzati AI',
  
  // AI - Usage
  'ai.usage.view': 'Visualizza l\'utilizzo dei servizi AI',
  'ai.usage.analytics': 'Analizza le metriche di utilizzo AI',
  'ai.usage.export': 'Esporta i report di utilizzo AI',
  
  // AI - Chat
  'ai.chat.use': 'Usa l\'assistente AI per la chat',
  'ai.chat.create': 'Crea nuove conversazioni AI',
  'ai.chat.history': 'Visualizza la cronologia delle chat AI',
  
  // AI - Conversations
  'ai.conversations.view': 'Visualizza le conversazioni AI',
  'ai.conversations.create': 'Crea nuove conversazioni AI',
  'ai.conversations.delete': 'Elimina conversazioni AI',
  'ai.conversations.manage': 'Gestisci le conversazioni AI del team',
  
  // AI - Documents
  'ai.documents.analyze': 'Analizza documenti con AI (estrazione dati)',
  'ai.documents.process': 'Elabora documenti con AI',
  
  // AI - Financial
  'ai.financial.forecast': 'Genera previsioni finanziarie con AI',
  'ai.financial.analyze': 'Analizza dati finanziari con AI',
  
  // AI - Search
  'ai.search.web': 'Usa la ricerca web potenziata da AI',
  'ai.search.internal': 'Cerca nei documenti interni con AI',
  
  // AI - Training
  'ai.training.view': 'Visualizza i dati di training AI',
  'ai.training.create': 'Crea nuovi dataset di training',
  'ai.training.validate': 'Valida i dati di training',
  'ai.training.url': 'Importa dati da URL per training',
  'ai.training.media': 'Carica media per training AI',
  
  // AI - Admin
  'ai.admin.keys': 'Gestisci le chiavi API dei servizi AI',
  'ai.admin.monitor': 'Monitora le performance dei servizi AI',
  'ai.admin.configure': 'Configura i provider AI (OpenAI, etc.)',
  
  // MCP - General
  'mcp.read': 'Visualizza le configurazioni MCP',
  'mcp.write': 'Modifica le configurazioni MCP',
  'mcp.delete': 'Elimina configurazioni MCP',
  'mcp.execute': 'Esegui operazioni MCP',
  
  // MCP - Servers
  'mcp.servers.view': 'Visualizza i server MCP configurati',
  'mcp.servers.create': 'Crea nuovi server MCP',
  'mcp.servers.update': 'Aggiorna server MCP esistenti',
  'mcp.servers.delete': 'Elimina server MCP',
  'mcp.servers.configure': 'Configura i parametri dei server MCP',
  
  // MCP - Credentials
  'mcp.credentials.view': 'Visualizza le credenziali MCP',
  'mcp.credentials.create': 'Crea nuove credenziali MCP',
  'mcp.credentials.update': 'Aggiorna credenziali esistenti',
  'mcp.credentials.revoke': 'Revoca credenziali MCP',
  
  // MCP - Tools
  'mcp.tools.view': 'Visualizza gli strumenti MCP disponibili',
  'mcp.tools.execute': 'Esegui strumenti MCP',
  'mcp.tools.test': 'Testa gli strumenti MCP',
  
  // Webhooks - Receive
  'webhooks.receive.*': 'Ricevi webhook da tutti i provider',
  'webhooks.receive.stripe': 'Ricevi webhook da Stripe',
  'webhooks.receive.twilio': 'Ricevi webhook da Twilio',
  'webhooks.receive.github': 'Ricevi webhook da GitHub',
  'webhooks.receive.custom': 'Ricevi webhook personalizzati',
  
  // Webhooks - Manage
  'webhooks.manage.view': 'Visualizza i webhook configurati',
  'webhooks.manage.create': 'Crea nuovi webhook',
  'webhooks.manage.edit': 'Modifica webhook esistenti',
  'webhooks.manage.delete': 'Elimina webhook',
  'webhooks.manage.configure': 'Configura i parametri dei webhook',
  
  // Webhooks - Events
  'webhooks.events.view': 'Visualizza gli eventi webhook ricevuti',
  'webhooks.events.retry': 'Riprova l\'elaborazione di eventi falliti',
  'webhooks.events.delete': 'Elimina eventi webhook',
  
  // Webhooks - Signatures
  'webhooks.signatures.view': 'Visualizza le firme di validazione webhook',
  'webhooks.signatures.create': 'Crea nuove firme di validazione',
  'webhooks.signatures.edit': 'Modifica le firme esistenti',
  'webhooks.signatures.delete': 'Elimina firme di validazione'
};

// Helper per ottenere la descrizione di un permesso
export function getPermissionDescription(permission: string): string {
  return PERMISSION_DESCRIPTIONS[permission] || 'Permesso di sistema';
}