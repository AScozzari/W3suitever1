/**
 * Predefined Action Tags per Department
 * Used in workflow templates to identify what the workflow DOES
 * This helps Coverage Dashboard show which actions are covered per department
 * 
 * Routing Categories:
 * - 'operational': Turni, timbrature, straordinari - route based on active shift location
 * - 'administrative': Ferie, permessi, malattia - always route to home store supervisor
 */

export type RoutingCategory = 'operational' | 'administrative';

interface ActionTagDefinition {
  value: string;
  label: string;
  routingCategory: RoutingCategory;
}

export const DEPARTMENT_ACTION_TAGS = {
  hr: [
    { value: 'richiesta_ferie', label: 'Richiesta Ferie', routingCategory: 'administrative' },
    { value: 'richiesta_permessi', label: 'Richiesta Permessi', routingCategory: 'administrative' },
    { value: 'gestione_malattia', label: 'Gestione Malattia', routingCategory: 'administrative' },
    { value: 'cambio_turno', label: 'Cambio Turno', routingCategory: 'operational' },
    { value: 'straordinario', label: 'Richiesta Straordinario', routingCategory: 'operational' },
    { value: 'timbratura', label: 'Gestione Timbratura', routingCategory: 'operational' },
    { value: 'turno_extra', label: 'Turno Extra', routingCategory: 'operational' },
    { value: 'onboarding', label: 'Onboarding Dipendente', routingCategory: 'administrative' },
    { value: 'offboarding', label: 'Offboarding Dipendente', routingCategory: 'administrative' },
    { value: 'valutazione_performance', label: 'Valutazione Performance', routingCategory: 'administrative' },
    { value: 'formazione', label: 'Richiesta Formazione', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
  finance: [
    { value: 'rimborso_spese', label: 'Rimborso Spese', routingCategory: 'administrative' },
    { value: 'approvazione_budget', label: 'Approvazione Budget', routingCategory: 'administrative' },
    { value: 'gestione_fatture', label: 'Gestione Fatture', routingCategory: 'administrative' },
    { value: 'anticipo_contanti', label: 'Anticipo Contanti', routingCategory: 'administrative' },
    { value: 'nota_credito', label: 'Nota di Credito', routingCategory: 'administrative' },
    { value: 'pagamento_fornitore', label: 'Pagamento Fornitore', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
  operations: [
    { value: 'richiesta_acquisti', label: 'Richiesta Acquisti', routingCategory: 'administrative' },
    { value: 'gestione_inventario', label: 'Gestione Inventario', routingCategory: 'operational' },
    { value: 'manutenzione', label: 'Richiesta Manutenzione', routingCategory: 'administrative' },
    { value: 'ordine_materiale', label: 'Ordine Materiale', routingCategory: 'administrative' },
    { value: 'trasferimento_merce', label: 'Trasferimento Merce', routingCategory: 'operational' },
  ] as ActionTagDefinition[],
  support: [
    { value: 'ticket_supporto', label: 'Ticket Supporto', routingCategory: 'administrative' },
    { value: 'escalation', label: 'Escalation Problema', routingCategory: 'administrative' },
    { value: 'risoluzione_problema', label: 'Risoluzione Problema', routingCategory: 'administrative' },
    { value: 'assistenza_cliente', label: 'Assistenza Cliente', routingCategory: 'operational' },
    { value: 'reclamo', label: 'Gestione Reclamo', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
  crm: [
    { value: 'gestione_lead', label: 'Gestione Lead', routingCategory: 'administrative' },
    { value: 'qualifica_lead', label: 'Qualifica Lead', routingCategory: 'administrative' },
    { value: 'follow_up', label: 'Follow-up Cliente', routingCategory: 'administrative' },
    { value: 'nurturing', label: 'Nurturing Campagna', routingCategory: 'administrative' },
    { value: 'conversione_lead', label: 'Conversione Lead', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
  sales: [
    { value: 'approvazione_sconto', label: 'Approvazione Sconto', routingCategory: 'administrative' },
    { value: 'proposta_commerciale', label: 'Proposta Commerciale', routingCategory: 'administrative' },
    { value: 'chiusura_deal', label: 'Chiusura Deal', routingCategory: 'administrative' },
    { value: 'preventivo', label: 'Generazione Preventivo', routingCategory: 'administrative' },
    { value: 'contratto', label: 'Approvazione Contratto', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
  marketing: [
    { value: 'approvazione_campagna', label: 'Approvazione Campagna', routingCategory: 'administrative' },
    { value: 'richiesta_materiale', label: 'Richiesta Materiale Marketing', routingCategory: 'administrative' },
    { value: 'evento', label: 'Organizzazione Evento', routingCategory: 'administrative' },
    { value: 'pubblicazione_contenuto', label: 'Pubblicazione Contenuto', routingCategory: 'administrative' },
    { value: 'budget_campagna', label: 'Budget Campagna', routingCategory: 'administrative' },
  ] as ActionTagDefinition[],
} as const;

export type Department = keyof typeof DEPARTMENT_ACTION_TAGS;
export type ActionTag = typeof DEPARTMENT_ACTION_TAGS[Department][number]['value'];

export const ALL_DEPARTMENTS: Department[] = [
  'hr', 'finance', 'operations', 'support', 'crm', 'sales', 'marketing'
];

export function getActionTagsForDepartment(department: string): ActionTagDefinition[] {
  const deptKey = department.toLowerCase() as Department;
  return DEPARTMENT_ACTION_TAGS[deptKey] || [];
}

export function getAllActionTags(): { department: string; tags: ActionTagDefinition[] }[] {
  return ALL_DEPARTMENTS.map(dept => ({
    department: dept,
    tags: [...DEPARTMENT_ACTION_TAGS[dept]]
  }));
}

/**
 * Get routing category for an action tag
 * @returns 'operational' for shift-based routing, 'administrative' for home-store routing
 */
export function getRoutingCategory(actionTagValue: string): RoutingCategory {
  for (const dept of ALL_DEPARTMENTS) {
    const tag = DEPARTMENT_ACTION_TAGS[dept].find(t => t.value === actionTagValue);
    if (tag) {
      return tag.routingCategory;
    }
  }
  return 'administrative';
}

/**
 * Check if action tag requires shift-based routing
 */
export function isOperationalTag(actionTagValue: string): boolean {
  return getRoutingCategory(actionTagValue) === 'operational';
}

/**
 * Get all operational action tags (for shifts/timeclock related actions)
 */
export function getOperationalTags(): ActionTagDefinition[] {
  return ALL_DEPARTMENTS.flatMap(dept => 
    DEPARTMENT_ACTION_TAGS[dept].filter(t => t.routingCategory === 'operational')
  );
}

/**
 * Operational request categories - these route based on active shift location
 * All other categories route to home store supervisor
 */
export const OPERATIONAL_CATEGORIES = [
  'cambio_turno',       // Shift change request
  'straordinario',      // Overtime request
  'timbratura',         // Timeclock adjustment
  'turno_extra',        // Extra shift request
] as const;

/**
 * Check if a request category requires shift-based routing
 * @param category - The universal request category
 * @returns true if routing should check for active shift at different store
 */
export function isOperationalCategory(category: string): boolean {
  return OPERATIONAL_CATEGORIES.includes(category.toLowerCase() as any);
}
