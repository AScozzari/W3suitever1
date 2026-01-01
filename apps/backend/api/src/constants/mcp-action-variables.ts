/**
 * MCP Action Builder Variables
 * 
 * Definisce tutte le variabili disponibili per i template SQL
 * con mapping al database, tooltip e validazione
 */

export interface McpVariable {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'uuid' | 'array';
  table?: string;
  column?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  example?: string;
}

export interface VariableCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  variables: McpVariable[];
}

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'temporal',
    name: 'Temporali',
    icon: 'Calendar',
    color: '#3B82F6',
    description: 'Date, periodi e filtri temporali',
    variables: [
      {
        id: 'date_start',
        name: 'Data Inizio',
        description: 'Data di inizio periodo',
        tooltip: 'Formato YYYY-MM-DD. Usata per filtrare record a partire da questa data.',
        type: 'date',
        validation: { pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        example: '2025-01-01',
      },
      {
        id: 'date_end',
        name: 'Data Fine',
        description: 'Data di fine periodo',
        tooltip: 'Formato YYYY-MM-DD. Usata per filtrare record fino a questa data.',
        type: 'date',
        validation: { pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        example: '2025-12-31',
      },
      {
        id: 'year',
        name: 'Anno',
        description: 'Anno di riferimento',
        tooltip: 'Anno in formato YYYY (es. 2025). Usato per bilanci annuali, ferie, ecc.',
        type: 'number',
        validation: { min: 2000, max: 2100 },
        example: '2025',
      },
      {
        id: 'month',
        name: 'Mese',
        description: 'Mese di riferimento',
        tooltip: 'Mese numerico 1-12. Usato per report mensili.',
        type: 'number',
        validation: { min: 1, max: 12 },
        example: '6',
      },
      {
        id: 'quarter',
        name: 'Trimestre',
        description: 'Trimestre fiscale',
        tooltip: 'Trimestre 1-4. Q1=Gen-Mar, Q2=Apr-Giu, Q3=Lug-Set, Q4=Ott-Dic.',
        type: 'number',
        validation: { min: 1, max: 4 },
        example: '2',
      },
      {
        id: 'shift_date',
        name: 'Data Turno',
        description: 'Data specifica del turno',
        tooltip: 'Data del turno lavorativo da cercare o modificare.',
        type: 'date',
        table: 'w3suite.shifts',
        column: 'date',
        example: '2025-03-15',
      },
    ],
  },
  {
    id: 'people',
    name: 'Persone',
    icon: 'Users',
    color: '#8B5CF6',
    description: 'Dipendenti, clienti e utenti',
    variables: [
      {
        id: 'user_id',
        name: 'ID Utente',
        description: 'Identificativo utente sistema',
        tooltip: 'ID univoco utente (varchar). Usato per associare record a dipendenti specifici.',
        type: 'string',
        table: 'w3suite.users',
        column: 'id',
        example: 'user_abc123',
      },
      {
        id: 'employee_name',
        name: 'Nome Dipendente',
        description: 'Nome completo dipendente',
        tooltip: 'Cerca per nome parziale (case insensitive). Supporta ILIKE.',
        type: 'string',
        example: 'Mario Rossi',
      },
      {
        id: 'customer_id',
        name: 'ID Cliente',
        description: 'Identificativo cliente CRM',
        tooltip: 'UUID del cliente nel sistema CRM. Usato per associare ordini/trattative.',
        type: 'uuid',
        table: 'w3suite.crm_customers',
        column: 'id',
      },
      {
        id: 'customer_email',
        name: 'Email Cliente',
        description: 'Indirizzo email cliente',
        tooltip: 'Cerca cliente per email esatta.',
        type: 'string',
        table: 'w3suite.crm_customers',
        column: 'email',
        example: 'cliente@example.com',
      },
      {
        id: 'customer_phone',
        name: 'Telefono Cliente',
        description: 'Numero telefono cliente',
        tooltip: 'Cerca cliente per numero telefono.',
        type: 'string',
        table: 'w3suite.crm_customers',
        column: 'phone',
        example: '+39 333 1234567',
      },
      {
        id: 'lead_id',
        name: 'ID Lead',
        description: 'Identificativo lead CRM',
        tooltip: 'UUID del lead nel sistema CRM.',
        type: 'uuid',
        table: 'w3suite.crm_leads',
        column: 'id',
      },
      {
        id: 'owner_user_id',
        name: 'ID Proprietario',
        description: 'Utente assegnato/proprietario',
        tooltip: 'ID del commerciale o responsabile assegnato al record.',
        type: 'string',
        table: 'w3suite.crm_deals',
        column: 'owner_user_id',
      },
    ],
  },
  {
    id: 'location',
    name: 'Località',
    icon: 'MapPin',
    color: '#10B981',
    description: 'Negozi, magazzini e sedi',
    variables: [
      {
        id: 'store_id',
        name: 'ID Negozio',
        description: 'Identificativo punto vendita',
        tooltip: 'UUID del negozio. Limita i risultati a un punto vendita specifico.',
        type: 'uuid',
        table: 'w3suite.stores',
        column: 'id',
      },
      {
        id: 'store_code',
        name: 'Codice Negozio',
        description: 'Codice alfanumerico negozio',
        tooltip: 'Codice breve del negozio (es. MI01, RM02).',
        type: 'string',
        table: 'w3suite.stores',
        column: 'code',
        example: 'MI01',
      },
      {
        id: 'warehouse_id',
        name: 'ID Magazzino',
        description: 'Identificativo magazzino WMS',
        tooltip: 'UUID del magazzino per operazioni logistiche.',
        type: 'uuid',
        table: 'w3suite.wms_warehouses',
        column: 'id',
      },
      {
        id: 'department_id',
        name: 'ID Reparto',
        description: 'Identificativo reparto',
        tooltip: 'UUID del reparto organizzativo.',
        type: 'uuid',
        table: 'w3suite.departments',
        column: 'id',
      },
      {
        id: 'legal_entity_id',
        name: 'ID Entità Legale',
        description: 'Società/azienda del gruppo',
        tooltip: 'UUID della legal entity per filtri multi-azienda.',
        type: 'uuid',
        table: 'w3suite.legal_entities',
        column: 'id',
      },
    ],
  },
  {
    id: 'products',
    name: 'Prodotti',
    icon: 'Package',
    color: '#F59E0B',
    description: 'Articoli, SKU e inventario',
    variables: [
      {
        id: 'product_id',
        name: 'ID Prodotto',
        description: 'Identificativo prodotto master',
        tooltip: 'UUID del prodotto anagrafica. Usato per dettagli prodotto.',
        type: 'uuid',
        table: 'w3suite.products',
        column: 'id',
      },
      {
        id: 'product_sku',
        name: 'SKU Prodotto',
        description: 'Codice articolo univoco',
        tooltip: 'Stock Keeping Unit - codice identificativo prodotto.',
        type: 'string',
        table: 'w3suite.products',
        column: 'sku',
        example: 'PHONE-IP15-256',
      },
      {
        id: 'product_name',
        name: 'Nome Prodotto',
        description: 'Denominazione prodotto',
        tooltip: 'Cerca per nome parziale (case insensitive).',
        type: 'string',
        table: 'w3suite.products',
        column: 'name',
        example: 'iPhone 15 Pro',
      },
      {
        id: 'product_category',
        name: 'Categoria Prodotto',
        description: 'Categoria merceologica',
        tooltip: 'Filtra prodotti per categoria.',
        type: 'string',
        table: 'w3suite.products',
        column: 'category',
        example: 'Smartphone',
      },
      {
        id: 'product_item_id',
        name: 'ID Item Serializzato',
        description: 'Singolo pezzo con seriale',
        tooltip: 'UUID del singolo item serializzato (IMEI, SN, ecc.).',
        type: 'uuid',
        table: 'w3suite.product_items',
        column: 'id',
      },
      {
        id: 'serial_number',
        name: 'Numero Seriale',
        description: 'Seriale prodotto (IMEI/SN)',
        tooltip: 'Cerca per numero seriale esatto.',
        type: 'string',
        table: 'w3suite.product_items',
        column: 'serial_number',
        example: '353456789012345',
      },
    ],
  },
  {
    id: 'states',
    name: 'Stati',
    icon: 'Flag',
    color: '#EF4444',
    description: 'Status e condizioni',
    variables: [
      {
        id: 'lead_status',
        name: 'Stato Lead',
        description: 'Stato corrente del lead',
        tooltip: 'Enum: new, contacted, qualified, converted, lost.',
        type: 'string',
        table: 'w3suite.crm_leads',
        column: 'status',
        validation: { enum: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
      },
      {
        id: 'deal_status',
        name: 'Stato Trattativa',
        description: 'Stato della trattativa',
        tooltip: 'Enum: open, won, lost.',
        type: 'string',
        table: 'w3suite.crm_deals',
        column: 'status',
        validation: { enum: ['open', 'won', 'lost'] },
      },
      {
        id: 'deal_stage',
        name: 'Stage Pipeline',
        description: 'Stage nel funnel vendite',
        tooltip: 'Stage della pipeline (es. discovery, proposal, negotiation).',
        type: 'string',
        table: 'w3suite.crm_deals',
        column: 'stage',
      },
      {
        id: 'shift_status',
        name: 'Stato Turno',
        description: 'Stato del turno',
        tooltip: 'Enum: scheduled, in_progress, completed, cancelled.',
        type: 'string',
        table: 'w3suite.shifts',
        column: 'status',
        validation: { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
      },
      {
        id: 'leave_status',
        name: 'Stato Richiesta Ferie',
        description: 'Approvazione richiesta',
        tooltip: 'Enum: pending, approved, rejected, cancelled.',
        type: 'string',
        table: 'w3suite.leave_requests',
        column: 'status',
        validation: { enum: ['pending', 'approved', 'rejected', 'cancelled'] },
      },
      {
        id: 'document_status',
        name: 'Stato Documento WMS',
        description: 'Stato documento logistico',
        tooltip: 'Stato del DDT, rettifica o ordine WMS.',
        type: 'string',
        table: 'w3suite.wms_documents',
        column: 'status',
      },
      {
        id: 'is_active',
        name: 'Attivo',
        description: 'Flag record attivo',
        tooltip: 'true = attivo, false = archiviato/disattivato.',
        type: 'boolean',
        example: 'true',
      },
    ],
  },
  {
    id: 'quantity',
    name: 'Quantità',
    icon: 'Hash',
    color: '#06B6D4',
    description: 'Numeri e conteggi',
    variables: [
      {
        id: 'quantity',
        name: 'Quantità',
        description: 'Numero di pezzi',
        tooltip: 'Quantità generica (es. pezzi da movimentare).',
        type: 'number',
        validation: { min: 0 },
        example: '10',
      },
      {
        id: 'min_quantity',
        name: 'Quantità Minima',
        description: 'Soglia minima',
        tooltip: 'Filtra record con quantità >= questo valore.',
        type: 'number',
        validation: { min: 0 },
        example: '5',
      },
      {
        id: 'max_quantity',
        name: 'Quantità Massima',
        description: 'Soglia massima',
        tooltip: 'Filtra record con quantità <= questo valore.',
        type: 'number',
        validation: { min: 0 },
        example: '100',
      },
      {
        id: 'vacation_days',
        name: 'Giorni Ferie',
        description: 'Numero giorni ferie',
        tooltip: 'Giorni di ferie richiesti o disponibili.',
        type: 'number',
        table: 'w3suite.employee_balances',
        column: 'vacation_days_remaining',
        validation: { min: 0, max: 365 },
        example: '15',
      },
      {
        id: 'limit',
        name: 'Limite Risultati',
        description: 'Max record restituiti',
        tooltip: 'Limita il numero di record restituiti dalla query.',
        type: 'number',
        validation: { min: 1, max: 1000 },
        example: '50',
      },
      {
        id: 'offset',
        name: 'Offset',
        description: 'Salta N record',
        tooltip: 'Per paginazione: salta i primi N record.',
        type: 'number',
        validation: { min: 0 },
        example: '0',
      },
    ],
  },
  {
    id: 'values',
    name: 'Valori',
    icon: 'DollarSign',
    color: '#22C55E',
    description: 'Importi e valori monetari',
    variables: [
      {
        id: 'amount',
        name: 'Importo',
        description: 'Valore monetario',
        tooltip: 'Importo in EUR (es. valore ordine, trattativa).',
        type: 'number',
        example: '1500.00',
      },
      {
        id: 'min_amount',
        name: 'Importo Minimo',
        description: 'Valore minimo',
        tooltip: 'Filtra record con valore >= questo importo.',
        type: 'number',
        example: '100.00',
      },
      {
        id: 'max_amount',
        name: 'Importo Massimo',
        description: 'Valore massimo',
        tooltip: 'Filtra record con valore <= questo importo.',
        type: 'number',
        example: '10000.00',
      },
      {
        id: 'deal_value',
        name: 'Valore Trattativa',
        description: 'Estimated value della deal',
        tooltip: 'Valore stimato della trattativa in EUR.',
        type: 'number',
        table: 'w3suite.crm_deals',
        column: 'estimated_value',
        example: '5000.00',
      },
      {
        id: 'probability',
        name: 'Probabilità Chiusura',
        description: 'Percentuale probabilità',
        tooltip: 'Probabilità 0-100% di chiusura trattativa.',
        type: 'number',
        table: 'w3suite.crm_deals',
        column: 'probability',
        validation: { min: 0, max: 100 },
        example: '75',
      },
    ],
  },
  {
    id: 'aggregation',
    name: 'Aggregazione',
    icon: 'BarChart3',
    color: '#A855F7',
    description: 'Raggruppamenti e calcoli',
    variables: [
      {
        id: 'group_by',
        name: 'Raggruppa Per',
        description: 'Campo di raggruppamento',
        tooltip: 'Campo per GROUP BY (es. store_id, month, status).',
        type: 'string',
        validation: { enum: ['store_id', 'department_id', 'owner_user_id', 'status', 'month', 'year', 'category'] },
        example: 'store_id',
      },
      {
        id: 'order_by',
        name: 'Ordina Per',
        description: 'Campo ordinamento',
        tooltip: 'Campo per ORDER BY (es. created_at, amount).',
        type: 'string',
        example: 'created_at',
      },
      {
        id: 'order_direction',
        name: 'Direzione Ordine',
        description: 'ASC o DESC',
        tooltip: 'asc = crescente, desc = decrescente.',
        type: 'string',
        validation: { enum: ['asc', 'desc'] },
        example: 'desc',
      },
    ],
  },
  {
    id: 'output',
    name: 'Output',
    icon: 'FileOutput',
    color: '#6366F1',
    description: 'Formato e selezione campi',
    variables: [
      {
        id: 'fields',
        name: 'Campi Selezionati',
        description: 'Lista campi da restituire',
        tooltip: 'Array di nomi colonne da includere nel risultato.',
        type: 'array',
        example: '["id", "name", "status"]',
      },
      {
        id: 'include_totals',
        name: 'Includi Totali',
        description: 'Aggiunge riga totali',
        tooltip: 'Se true, aggiunge una riga con i totali aggregati.',
        type: 'boolean',
        example: 'true',
      },
      {
        id: 'include_metadata',
        name: 'Includi Metadata',
        description: 'Aggiunge info query',
        tooltip: 'Se true, include metadati come count totale, tempo esecuzione.',
        type: 'boolean',
        example: 'false',
      },
    ],
  },
  {
    id: 'comparison',
    name: 'Confronto',
    icon: 'GitCompare',
    color: '#EC4899',
    description: 'Operatori e condizioni',
    variables: [
      {
        id: 'search_term',
        name: 'Termine Ricerca',
        description: 'Testo da cercare',
        tooltip: 'Testo libero per ricerca ILIKE su più campi.',
        type: 'string',
        example: 'windtre',
      },
      {
        id: 'exact_match',
        name: 'Match Esatto',
        description: 'Ricerca esatta vs parziale',
        tooltip: 'Se true, cerca corrispondenza esatta. Se false, usa ILIKE.',
        type: 'boolean',
        example: 'false',
      },
      {
        id: 'include_archived',
        name: 'Includi Archiviati',
        description: 'Include record archiviati',
        tooltip: 'Se true, include anche i record con is_active = false.',
        type: 'boolean',
        example: 'false',
      },
    ],
  },
];

export function getVariableById(variableId: string): McpVariable | undefined {
  for (const category of VARIABLE_CATEGORIES) {
    const variable = category.variables.find(v => v.id === variableId);
    if (variable) return variable;
  }
  return undefined;
}

export function getVariablesByCategory(categoryId: string): McpVariable[] {
  const category = VARIABLE_CATEGORIES.find(c => c.id === categoryId);
  return category?.variables || [];
}

export function getAllVariableIds(): string[] {
  return VARIABLE_CATEGORIES.flatMap(c => c.variables.map(v => v.id));
}

export function generateMcpInputSchema(selectedVariables: string[]): Record<string, any> {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const varId of selectedVariables) {
    const variable = getVariableById(varId);
    if (!variable) continue;

    const prop: Record<string, any> = {
      description: variable.tooltip,
    };

    switch (variable.type) {
      case 'string':
      case 'uuid':
        prop.type = 'string';
        if (variable.validation?.pattern) prop.pattern = variable.validation.pattern;
        if (variable.validation?.enum) prop.enum = variable.validation.enum;
        break;
      case 'number':
        prop.type = 'number';
        if (variable.validation?.min !== undefined) prop.minimum = variable.validation.min;
        if (variable.validation?.max !== undefined) prop.maximum = variable.validation.max;
        break;
      case 'date':
        prop.type = 'string';
        prop.format = 'date';
        break;
      case 'boolean':
        prop.type = 'boolean';
        break;
      case 'array':
        prop.type = 'array';
        prop.items = { type: 'string' };
        break;
    }

    if (variable.example) {
      prop.examples = [variable.example];
    }

    properties[varId] = prop;

    if (variable.validation?.required) {
      required.push(varId);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
