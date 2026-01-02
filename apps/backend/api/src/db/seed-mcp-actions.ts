import { db } from '../core/db';
import { actionConfigurations, mcpQueryTemplates } from './schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const STAGING_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const MCP_ACTIONS = [
  // ==================== HR DEPARTMENT ====================
  {
    actionId: 'mcp_hr_employee_shifts',
    actionName: 'Consulta Turni Dipendente',
    description: 'Query AI per recuperare i turni di un dipendente in un periodo specifico',
    department: 'hr',
    queryTemplateCode: 'HR_EMPLOYEE_SHIFTS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        employeeName: { type: 'string', description: 'Nome del dipendente da cercare' },
        dateFrom: { type: 'string', format: 'date', description: 'Data inizio periodo' },
        dateTo: { type: 'string', format: 'date', description: 'Data fine periodo' },
        storeId: { type: 'string', format: 'uuid', description: 'ID negozio (opzionale)' }
      },
      required: ['employeeName', 'dateFrom', 'dateTo']
    }
  },
  {
    actionId: 'mcp_hr_vacation_balance',
    actionName: 'Verifica Saldo Ferie',
    description: 'Query AI per calcolare il saldo ferie rimanenti di un dipendente',
    department: 'hr',
    queryTemplateCode: 'HR_VACATION_BALANCE',
    mcpInputSchema: {
      type: 'object',
      properties: {
        employeeName: { type: 'string', description: 'Nome del dipendente' },
        year: { type: 'integer', description: 'Anno di riferimento (default: corrente)' }
      },
      required: ['employeeName']
    }
  },
  {
    actionId: 'mcp_hr_pending_requests',
    actionName: 'Richieste HR in Attesa',
    description: 'Query AI per visualizzare tutte le richieste HR pendenti (ferie, malattia, permessi)',
    department: 'hr',
    queryTemplateCode: 'HR_PENDING_REQUESTS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', format: 'uuid', description: 'Filtra per negozio' },
        category: { type: 'string', enum: ['vacation', 'sick', 'maternity_leave', 'matrimonio', 'legge_104', 'smart_working'], description: 'Categoria richiesta' }
      },
      required: []
    }
  },
  {
    actionId: 'mcp_hr_list_shifts',
    actionName: 'Lista Turni',
    description: 'Query AI per elencare tutti i turni pianificati in un periodo',
    department: 'hr',
    queryTemplateCode: 'HR_LIST_SHIFTS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date', description: 'Data inizio periodo' },
        dateTo: { type: 'string', format: 'date', description: 'Data fine periodo' },
        storeId: { type: 'string', format: 'uuid', description: 'Filtra per negozio' },
        status: { type: 'string', description: 'Stato turno' }
      },
      required: ['dateFrom', 'dateTo']
    }
  },

  // ==================== WMS DEPARTMENT ====================
  {
    actionId: 'mcp_wms_stock_level',
    actionName: 'Verifica Giacenza Prodotto',
    description: 'Query AI per recuperare la giacenza attuale di un prodotto nei magazzini',
    department: 'wms',
    queryTemplateCode: 'WMS_STOCK_LEVEL',
    mcpInputSchema: {
      type: 'object',
      properties: {
        productSku: { type: 'string', description: 'SKU del prodotto' },
        productName: { type: 'string', description: 'Nome del prodotto' },
        warehouseId: { type: 'string', format: 'uuid', description: 'ID magazzino specifico' }
      },
      required: []
    }
  },
  {
    actionId: 'mcp_wms_low_stock_alert',
    actionName: 'Alert Prodotti Sotto Scorta',
    description: 'Query AI per identificare prodotti con giacenza sotto il punto di riordino',
    department: 'wms',
    queryTemplateCode: 'WMS_LOW_STOCK_ALERT',
    mcpInputSchema: {
      type: 'object',
      properties: {
        warehouseId: { type: 'string', format: 'uuid', description: 'Filtra per magazzino' },
        categoryId: { type: 'string', format: 'uuid', description: 'Filtra per categoria' },
        limit: { type: 'integer', default: 50, description: 'Numero massimo risultati' }
      },
      required: []
    }
  },
  {
    actionId: 'mcp_wms_recent_movements',
    actionName: 'Movimenti Magazzino Recenti',
    description: 'Query AI per visualizzare i movimenti di magazzino più recenti',
    department: 'wms',
    queryTemplateCode: 'WMS_RECENT_MOVEMENTS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date-time', description: 'Data/ora inizio' },
        dateTo: { type: 'string', format: 'date-time', description: 'Data/ora fine' },
        movementType: { type: 'string', description: 'Tipo movimento' },
        productSku: { type: 'string', description: 'Filtra per SKU prodotto' },
        limit: { type: 'integer', default: 100, description: 'Numero massimo risultati' }
      },
      required: ['dateFrom', 'dateTo']
    }
  },
  {
    actionId: 'mcp_wms_serial_lookup',
    actionName: 'Ricerca Seriale',
    description: 'Query AI per tracciare un prodotto tramite numero seriale',
    department: 'wms',
    queryTemplateCode: 'WMS_SERIAL_LOOKUP',
    mcpInputSchema: {
      type: 'object',
      properties: {
        serialNumber: { type: 'string', description: 'Numero seriale da cercare' }
      },
      required: ['serialNumber']
    }
  },
  {
    actionId: 'mcp_wms_search_stores',
    actionName: 'Cerca Magazzini e Punti Vendita',
    description: 'Query AI per cercare magazzini, punti vendita o uffici per nome, città o codice. Restituisce ID, indirizzo e dettagli completi. Usa questo tool per trovare l\'ID di un magazzino quando conosci solo il nome.',
    department: 'wms',
    queryTemplateCode: 'WMS_SEARCH_STORES',
    mcpInputSchema: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', description: 'Nome, città o codice del magazzino/punto vendita da cercare (es. "Bologna", "Milano Centrale", "MAG001")' },
        category: { type: 'string', enum: ['warehouse', 'sales_point', 'office'], description: 'Tipo: warehouse, sales_point, office' },
        limit: { type: 'integer', default: 10, description: 'Numero massimo risultati' }
      },
      required: ['searchTerm']
    }
  },

  // ==================== CRM DEPARTMENT ====================
  {
    actionId: 'mcp_crm_lead_search',
    actionName: 'Ricerca Lead',
    description: 'Query AI per cercare lead per nome, email, telefono o azienda',
    department: 'crm',
    queryTemplateCode: 'CRM_LEAD_SEARCH',
    mcpInputSchema: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', description: 'Termine di ricerca (nome, email, telefono, azienda)' },
        status: { type: 'string', description: 'Stato del lead' },
        assignedTo: { type: 'string', format: 'uuid', description: 'Assegnato a (user ID)' },
        limit: { type: 'integer', default: 20, description: 'Numero massimo risultati' }
      },
      required: ['searchTerm']
    }
  },
  {
    actionId: 'mcp_crm_customer_360',
    actionName: 'Vista 360° Cliente',
    description: 'Query AI per panoramica completa cliente: ordini, ticket, comunicazioni',
    department: 'crm',
    queryTemplateCode: 'CRM_CUSTOMER_360',
    mcpInputSchema: {
      type: 'object',
      properties: {
        customerEmail: { type: 'string', format: 'email', description: 'Email cliente' },
        customerId: { type: 'string', format: 'uuid', description: 'ID cliente' }
      },
      required: []
    }
  },
  {
    actionId: 'mcp_crm_pipeline_status',
    actionName: 'Stato Pipeline Vendite',
    description: 'Query AI per analisi dello stato corrente della pipeline con valore per stage',
    department: 'crm',
    queryTemplateCode: 'CRM_PIPELINE_STATUS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        pipelineId: { type: 'string', format: 'uuid', description: 'ID della pipeline' },
        assignedTo: { type: 'string', format: 'uuid', description: 'Filtra per agente' }
      },
      required: ['pipelineId']
    }
  },
  {
    actionId: 'mcp_crm_list_leads',
    actionName: 'Lista Lead',
    description: 'Query AI per elencare tutti i lead con filtri opzionali',
    department: 'crm',
    queryTemplateCode: 'CRM_LIST_LEADS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Stato del lead' },
        source: { type: 'string', description: 'Fonte del lead' },
        limit: { type: 'integer', default: 50, description: 'Numero massimo risultati' }
      },
      required: []
    }
  },

  // ==================== SALES DEPARTMENT ====================
  {
    actionId: 'mcp_sales_by_store',
    actionName: 'Vendite per Negozio',
    description: 'Query AI per report vendite aggregato per negozio con confronto periodo precedente',
    department: 'sales',
    queryTemplateCode: 'SALES_BY_STORE',
    mcpInputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date-time', description: 'Data inizio periodo' },
        dateTo: { type: 'string', format: 'date-time', description: 'Data fine periodo' },
        storeId: { type: 'string', format: 'uuid', description: 'Filtra per negozio specifico' }
      },
      required: ['dateFrom', 'dateTo']
    }
  },
  {
    actionId: 'mcp_sales_top_products',
    actionName: 'Prodotti Più Venduti',
    description: 'Query AI per classifica prodotti più venduti per quantità e fatturato',
    department: 'sales',
    queryTemplateCode: 'SALES_TOP_PRODUCTS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date-time', description: 'Data inizio periodo' },
        dateTo: { type: 'string', format: 'date-time', description: 'Data fine periodo' },
        categoryId: { type: 'string', format: 'uuid', description: 'Filtra per categoria' },
        limit: { type: 'integer', default: 20, description: 'Numero prodotti da mostrare' }
      },
      required: ['dateFrom', 'dateTo']
    }
  },
  {
    actionId: 'mcp_sales_agent_performance',
    actionName: 'Performance Agenti Vendita',
    description: 'Query AI per report performance agenti con metriche chiave e ranking',
    department: 'sales',
    queryTemplateCode: 'SALES_AGENT_PERFORMANCE',
    mcpInputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date-time', description: 'Data inizio periodo' },
        dateTo: { type: 'string', format: 'date-time', description: 'Data fine periodo' },
        storeId: { type: 'string', format: 'uuid', description: 'Filtra per negozio' },
        limit: { type: 'integer', default: 20, description: 'Numero agenti da mostrare' }
      },
      required: ['dateFrom', 'dateTo']
    }
  },

  // ==================== OPERATIONS DEPARTMENT ====================
  {
    actionId: 'mcp_ops_store_status',
    actionName: 'Stato Operativo Negozi',
    description: 'Query AI per panoramica stato operativo: personale, turni, criticità',
    department: 'operations',
    queryTemplateCode: 'OPS_STORE_STATUS',
    mcpInputSchema: {
      type: 'object',
      properties: {
        regionId: { type: 'string', format: 'uuid', description: 'Filtra per regione' },
        date: { type: 'string', format: 'date', description: 'Data di riferimento (default: oggi)' }
      },
      required: []
    }
  },
  {
    actionId: 'mcp_ops_daily_summary',
    actionName: 'Riepilogo Giornaliero',
    description: 'Query AI per riepilogo giornaliero: ordini, incassi, turni, criticità',
    department: 'operations',
    queryTemplateCode: 'OPS_DAILY_SUMMARY',
    mcpInputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date', description: 'Data del riepilogo' }
      },
      required: ['date']
    }
  }
];

export async function seedMcpActions() {
  console.log('🔧 Seeding MCP Actions for Staging tenant...');
  
  try {
    const templates = await db
      .select({ id: mcpQueryTemplates.id, code: mcpQueryTemplates.code })
      .from(mcpQueryTemplates)
      .where(eq(mcpQueryTemplates.isActive, true));
    
    const templateMap = new Map(templates.map(t => [t.code, t.id]));
    
    let created = 0;
    let updated = 0;
    
    for (const action of MCP_ACTIONS) {
      const queryTemplateId = templateMap.get(action.queryTemplateCode);
      
      if (!queryTemplateId) {
        console.log(`  ⚠️  Template not found: ${action.queryTemplateCode}`);
        continue;
      }
      
      const existing = await db
        .select({ id: actionConfigurations.id })
        .from(actionConfigurations)
        .where(and(
          eq(actionConfigurations.tenantId, STAGING_TENANT_ID),
          eq(actionConfigurations.actionId, action.actionId)
        ))
        .limit(1);
      
      const actionData = {
        tenantId: STAGING_TENANT_ID,
        department: action.department as any,
        actionId: action.actionId,
        actionName: action.actionName,
        description: action.description,
        requiresApproval: false,
        flowType: 'none' as const,
        teamScope: 'all' as const,
        actionCategory: 'query' as const,
        mcpActionType: 'read' as const,
        mcpInputSchema: action.mcpInputSchema,
        queryTemplateId: queryTemplateId,
        isActive: true,
        isCustomAction: false,
        priority: 50,
        slaHours: 24,
        escalationEnabled: false
      };
      
      if (existing.length > 0) {
        await db
          .update(actionConfigurations)
          .set({
            ...actionData,
            updatedAt: new Date()
          })
          .where(eq(actionConfigurations.id, existing[0].id));
        console.log(`  ✅ Updated: ${action.actionId}`);
        updated++;
      } else {
        await db.insert(actionConfigurations).values({
          id: uuidv4(),
          ...actionData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`  ✅ Created: ${action.actionId}`);
        created++;
      }
    }
    
    console.log(`✅ MCP Actions seeded: ${created} created, ${updated} updated`);
    return { success: true, created, updated };
  } catch (error) {
    console.error('❌ Error seeding MCP Actions:', error);
    throw error;
  }
}

const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') || 
                     process.argv[1]?.includes('seed-mcp-actions');

if (isMainModule) {
  seedMcpActions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
