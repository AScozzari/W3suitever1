/**
 * Predefined Action Tags per Department
 * Used in workflow templates to identify what the workflow DOES
 * This helps Coverage Dashboard show which actions are covered per department
 */

export const DEPARTMENT_ACTION_TAGS = {
  hr: [
    { value: 'richiesta_ferie', label: 'Richiesta Ferie' },
    { value: 'richiesta_permessi', label: 'Richiesta Permessi' },
    { value: 'gestione_malattia', label: 'Gestione Malattia' },
    { value: 'cambio_turno', label: 'Cambio Turno' },
    { value: 'straordinario', label: 'Richiesta Straordinario' },
    { value: 'onboarding', label: 'Onboarding Dipendente' },
    { value: 'offboarding', label: 'Offboarding Dipendente' },
    { value: 'valutazione_performance', label: 'Valutazione Performance' },
    { value: 'formazione', label: 'Richiesta Formazione' },
  ],
  finance: [
    { value: 'rimborso_spese', label: 'Rimborso Spese' },
    { value: 'approvazione_budget', label: 'Approvazione Budget' },
    { value: 'gestione_fatture', label: 'Gestione Fatture' },
    { value: 'anticipo_contanti', label: 'Anticipo Contanti' },
    { value: 'nota_credito', label: 'Nota di Credito' },
    { value: 'pagamento_fornitore', label: 'Pagamento Fornitore' },
  ],
  operations: [
    { value: 'richiesta_acquisti', label: 'Richiesta Acquisti' },
    { value: 'gestione_inventario', label: 'Gestione Inventario' },
    { value: 'manutenzione', label: 'Richiesta Manutenzione' },
    { value: 'ordine_materiale', label: 'Ordine Materiale' },
    { value: 'trasferimento_merce', label: 'Trasferimento Merce' },
  ],
  support: [
    { value: 'ticket_supporto', label: 'Ticket Supporto' },
    { value: 'escalation', label: 'Escalation Problema' },
    { value: 'risoluzione_problema', label: 'Risoluzione Problema' },
    { value: 'assistenza_cliente', label: 'Assistenza Cliente' },
    { value: 'reclamo', label: 'Gestione Reclamo' },
  ],
  crm: [
    { value: 'gestione_lead', label: 'Gestione Lead' },
    { value: 'qualifica_lead', label: 'Qualifica Lead' },
    { value: 'follow_up', label: 'Follow-up Cliente' },
    { value: 'nurturing', label: 'Nurturing Campagna' },
    { value: 'conversione_lead', label: 'Conversione Lead' },
  ],
  sales: [
    { value: 'approvazione_sconto', label: 'Approvazione Sconto' },
    { value: 'proposta_commerciale', label: 'Proposta Commerciale' },
    { value: 'chiusura_deal', label: 'Chiusura Deal' },
    { value: 'preventivo', label: 'Generazione Preventivo' },
    { value: 'contratto', label: 'Approvazione Contratto' },
  ],
  marketing: [
    { value: 'approvazione_campagna', label: 'Approvazione Campagna' },
    { value: 'richiesta_materiale', label: 'Richiesta Materiale Marketing' },
    { value: 'evento', label: 'Organizzazione Evento' },
    { value: 'pubblicazione_contenuto', label: 'Pubblicazione Contenuto' },
    { value: 'budget_campagna', label: 'Budget Campagna' },
  ],
  customer_service: [
    { value: 'ticket_cliente', label: 'Ticket Cliente' },
    { value: 'reclamo_cliente', label: 'Reclamo Cliente' },
    { value: 'rimborso_cliente', label: 'Rimborso Cliente' },
    { value: 'assistenza_post_vendita', label: 'Assistenza Post-Vendita' },
    { value: 'feedback_cliente', label: 'Feedback Cliente' },
  ],
  it: [
    { value: 'richiesta_accesso', label: 'Richiesta Accesso Sistema' },
    { value: 'nuovo_hardware', label: 'Richiesta Nuovo Hardware' },
    { value: 'problema_software', label: 'Problema Software' },
    { value: 'sicurezza_it', label: 'Segnalazione Sicurezza IT' },
    { value: 'configurazione_sistema', label: 'Configurazione Sistema' },
  ],
  wms: [
    { value: 'rettifica_inventario', label: 'Rettifica Inventario' },
    { value: 'trasferimento_magazzino', label: 'Trasferimento Magazzino' },
    { value: 'ricezione_merce', label: 'Ricezione Merce' },
    { value: 'spedizione', label: 'Approvazione Spedizione' },
    { value: 'inventario_fisico', label: 'Inventario Fisico' },
  ],
} as const;

export type Department = keyof typeof DEPARTMENT_ACTION_TAGS;
export type ActionTag = typeof DEPARTMENT_ACTION_TAGS[Department][number]['value'];

export const ALL_DEPARTMENTS: Department[] = [
  'hr', 'finance', 'sales', 'operations', 'support', 'crm', 'marketing', 'customer_service', 'it', 'wms'
];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  hr: 'Risorse Umane',
  finance: 'Finanza',
  operations: 'Operazioni',
  support: 'Supporto',
  crm: 'CRM',
  sales: 'Vendite',
  marketing: 'Marketing',
  customer_service: 'Assistenza Clienti',
  it: 'IT',
  wms: 'WMS',
};

export function getActionTagsForDepartment(department: string): { value: string; label: string }[] {
  const deptKey = department.toLowerCase() as Department;
  return DEPARTMENT_ACTION_TAGS[deptKey] ? [...DEPARTMENT_ACTION_TAGS[deptKey]] : [];
}

export function getActionTagLabel(value: string, department: string): string {
  const tags = getActionTagsForDepartment(department);
  const tag = tags.find(t => t.value === value);
  return tag?.label || value;
}

export function getAllActionTags(): { department: Department; label: string; tags: { value: string; label: string }[] }[] {
  return ALL_DEPARTMENTS.map(dept => ({
    department: dept,
    label: DEPARTMENT_LABELS[dept],
    tags: [...DEPARTMENT_ACTION_TAGS[dept]]
  }));
}
