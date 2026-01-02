import { db } from '../core/db';
import { mcpQueryTemplates } from './schema/w3suite';
import { eq, sql } from 'drizzle-orm';

/**
 * MCP Query Templates - Template SQL per integrazioni con Claude/AI
 * Ogni template ha variabili {{variableName}} che vengono sostituite a runtime
 */
const MCP_QUERY_TEMPLATES = [
  // ==================== HR DEPARTMENT ====================
  {
    code: 'HR_EMPLOYEE_SHIFTS',
    name: 'Turni Dipendente',
    description: 'Recupera tutti i turni assegnati a un dipendente in un periodo specifico, con dettagli negozio e stato',
    department: 'hr' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  s.id AS shift_id,
  s.name AS shift_name,
  s.date AS shift_date,
  s.start_time,
  s.end_time,
  s.status AS shift_status,
  sa.status AS assignment_status,
  st.nome AS store_name,
  st.indirizzo AS store_address,
  u.full_name AS employee_name,
  ROUND(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600, 1) AS hours_scheduled
FROM w3suite.shifts s
INNER JOIN w3suite.shift_assignments sa ON sa.shift_id = s.id::text
INNER JOIN w3suite.users u ON u.id = sa.user_id
LEFT JOIN w3suite.stores st ON st.id = s.store_id
WHERE s.tenant_id = '{{tenantId}}'::uuid
  AND u.full_name ILIKE '%{{employeeName}}%'
  AND s.date >= '{{dateFrom}}'::date
  AND s.date <= '{{dateTo}}'::date
ORDER BY s.date ASC, s.start_time ASC;
`,
    availableVariables: ['tenantId', 'employeeName', 'dateFrom', 'dateTo', 'storeId'],
    requiredVariables: ['tenantId', 'employeeName', 'dateFrom', 'dateTo'],
    involvedTables: ['shifts', 'shift_assignments', 'users', 'stores'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'HR_VACATION_BALANCE',
    name: 'Saldo Ferie Dipendente',
    description: 'Calcola il saldo ferie rimanenti per un dipendente, considerando ferie approvate e in attesa',
    department: 'hr' as const,
    actionType: 'read' as const,
    sqlTemplate: `
WITH vacation_stats AS (
  SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    COUNT(CASE WHEN ur.category = 'vacation' AND ur.status = 'approved' THEN 1 END) AS approved_vacations,
    COUNT(CASE WHEN ur.category = 'vacation' AND ur.status = 'pending' THEN 1 END) AS pending_vacations,
    SUM(CASE 
      WHEN ur.category = 'vacation' AND ur.status = 'approved' 
      THEN EXTRACT(DAY FROM (ur.end_date - ur.start_date)) + 1 
      ELSE 0 
    END) AS days_used,
    SUM(CASE 
      WHEN ur.category = 'vacation' AND ur.status = 'pending' 
      THEN EXTRACT(DAY FROM (ur.end_date - ur.start_date)) + 1 
      ELSE 0 
    END) AS days_pending
  FROM w3suite.users u
  LEFT JOIN w3suite.universal_requests ur ON ur.requester_id = u.id
  WHERE u.tenant_id = '{{tenantId}}'::uuid
    AND u.full_name ILIKE '%{{employeeName}}%'
  GROUP BY u.id, u.full_name, u.email
)
SELECT 
  user_id,
  full_name,
  email,
  approved_vacations,
  pending_vacations,
  COALESCE(days_used, 0) AS days_used,
  COALESCE(days_pending, 0) AS days_pending,
  26 AS annual_allowance,
  26 - COALESCE(days_used, 0) AS days_remaining,
  26 - COALESCE(days_used, 0) - COALESCE(days_pending, 0) AS days_available
FROM vacation_stats;
`,
    availableVariables: ['tenantId', 'employeeName', 'year'],
    requiredVariables: ['tenantId', 'employeeName'],
    involvedTables: ['users', 'universal_requests'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'HR_PENDING_REQUESTS',
    name: 'Richieste HR in Attesa',
    description: 'Lista tutte le richieste HR (ferie, malattia, permessi) in attesa di approvazione per un supervisore',
    department: 'hr' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  ur.id AS request_id,
  ur.title,
  ur.category,
  ur.status,
  ur.start_date,
  ur.end_date,
  ur.notes,
  ur.created_at,
  u.full_name AS requester_name,
  u.email AS requester_email,
  st.nome AS store_name,
  EXTRACT(DAY FROM (ur.end_date - ur.start_date)) + 1 AS days_requested,
  AGE(NOW(), ur.created_at) AS waiting_time
FROM w3suite.universal_requests ur
INNER JOIN w3suite.users u ON u.id = ur.requester_id
LEFT JOIN w3suite.stores st ON st.id = ur.store_id
WHERE ur.tenant_id = '{{tenantId}}'::uuid
  AND ur.status = 'pending'
  AND ur.category IN ('vacation', 'sick', 'maternity_leave', 'matrimonio', 'legge_104', 'smart_working')
ORDER BY ur.created_at ASC;
`,
    availableVariables: ['tenantId', 'supervisorId', 'storeId', 'category'],
    requiredVariables: ['tenantId'],
    involvedTables: ['universal_requests', 'users', 'stores'],
    isActive: true,
    isSystemTemplate: true
  },
  
  // ==================== WMS DEPARTMENT ====================
  {
    code: 'WMS_STOCK_LEVEL',
    name: 'Livello Stock Prodotto',
    description: 'Recupera la giacenza attuale di un prodotto per tutti i magazzini o uno specifico',
    department: 'wms' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  pt.name AS product_type,
  w.name AS warehouse_name,
  wl.name AS location_name,
  i.quantity_on_hand,
  i.quantity_reserved,
  i.quantity_on_hand - i.quantity_reserved AS quantity_available,
  i.reorder_point,
  CASE 
    WHEN i.quantity_on_hand <= i.reorder_point THEN 'REORDER_NEEDED'
    WHEN i.quantity_on_hand <= i.reorder_point * 1.5 THEN 'LOW_STOCK'
    ELSE 'OK'
  END AS stock_status,
  i.last_counted_at,
  i.updated_at
FROM w3suite.inventory i
INNER JOIN w3suite.products p ON p.id = i.product_id
LEFT JOIN w3suite.product_types pt ON pt.id = p.product_type_id
LEFT JOIN w3suite.warehouses w ON w.id = i.warehouse_id
LEFT JOIN w3suite.warehouse_locations wl ON wl.id = i.location_id
WHERE i.tenant_id = '{{tenantId}}'::uuid
  AND (p.sku ILIKE '%{{productSku}}%' OR p.name ILIKE '%{{productName}}%')
ORDER BY i.quantity_on_hand ASC;
`,
    availableVariables: ['tenantId', 'productSku', 'productName', 'warehouseId', 'includeZeroStock'],
    requiredVariables: ['tenantId'],
    involvedTables: ['inventory', 'products', 'product_types', 'warehouses', 'warehouse_locations'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'WMS_LOW_STOCK_ALERT',
    name: 'Alert Prodotti Sotto Scorta',
    description: 'Identifica tutti i prodotti con giacenza sotto il punto di riordino',
    department: 'wms' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  p.barcode,
  w.name AS warehouse_name,
  i.quantity_on_hand,
  i.quantity_reserved,
  i.reorder_point,
  i.reorder_quantity,
  i.reorder_point - i.quantity_on_hand AS shortage_quantity,
  s.business_name AS supplier_name,
  s.email AS supplier_email,
  ROUND((i.quantity_on_hand::decimal / NULLIF(i.reorder_point, 0)) * 100, 1) AS stock_percentage
FROM w3suite.inventory i
INNER JOIN w3suite.products p ON p.id = i.product_id
LEFT JOIN w3suite.warehouses w ON w.id = i.warehouse_id
LEFT JOIN w3suite.suppliers s ON s.id = p.supplier_id
WHERE i.tenant_id = '{{tenantId}}'::uuid
  AND i.quantity_on_hand <= i.reorder_point
  AND i.is_active = true
ORDER BY (i.quantity_on_hand::decimal / NULLIF(i.reorder_point, 0)) ASC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'warehouseId', 'categoryId', 'limit'],
    requiredVariables: ['tenantId'],
    involvedTables: ['inventory', 'products', 'warehouses', 'suppliers'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'WMS_RECENT_MOVEMENTS',
    name: 'Movimenti Magazzino Recenti',
    description: 'Lista i movimenti di magazzino più recenti con filtri per tipo e prodotto',
    department: 'wms' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  m.id AS movement_id,
  m.movement_type,
  m.direction,
  m.quantity,
  m.reference_number,
  m.notes,
  m.created_at,
  p.sku,
  p.name AS product_name,
  w_from.name AS from_warehouse,
  w_to.name AS to_warehouse,
  u.full_name AS created_by_name,
  d.document_number AS related_document
FROM w3suite.inventory_movements m
INNER JOIN w3suite.products p ON p.id = m.product_id
LEFT JOIN w3suite.warehouses w_from ON w_from.id = m.from_warehouse_id
LEFT JOIN w3suite.warehouses w_to ON w_to.id = m.to_warehouse_id
LEFT JOIN w3suite.users u ON u.id = m.created_by
LEFT JOIN w3suite.documents d ON d.id = m.document_id
WHERE m.tenant_id = '{{tenantId}}'::uuid
  AND m.created_at >= '{{dateFrom}}'::timestamp
  AND m.created_at <= '{{dateTo}}'::timestamp
ORDER BY m.created_at DESC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'dateFrom', 'dateTo', 'movementType', 'productSku', 'warehouseId', 'limit'],
    requiredVariables: ['tenantId', 'dateFrom', 'dateTo'],
    involvedTables: ['inventory_movements', 'products', 'warehouses', 'users', 'documents'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'WMS_SEARCH_STORES',
    name: 'Cerca Magazzini e Punti Vendita',
    description: 'Cerca magazzini, punti vendita o uffici per nome, città o codice. Restituisce ID e dettagli completi.',
    department: 'wms' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  s.id AS store_id,
  s.nome AS store_name,
  s.code AS store_code,
  s.category,
  s.status,
  s.indirizzo AS address,
  s.citta AS city,
  s.provincia AS province,
  s.cap AS postal_code,
  s.telefono AS phone,
  s.email,
  s.has_warehouse,
  ca.name AS commercial_area_name,
  oe.name AS organization_entity_name
FROM w3suite.stores s
LEFT JOIN public.commercial_areas ca ON ca.id = s.commercial_area_id
LEFT JOIN w3suite.organization_entities oe ON oe.id = s.organization_entity_id
WHERE s.tenant_id = '{{tenantId}}'::uuid
  AND s.status = 'active'
  AND (
    s.nome ILIKE '%{{searchTerm}}%'
    OR s.code ILIKE '%{{searchTerm}}%'
    OR s.citta ILIKE '%{{searchTerm}}%'
    OR s.indirizzo ILIKE '%{{searchTerm}}%'
  )
ORDER BY 
  CASE WHEN s.nome ILIKE '{{searchTerm}}%' THEN 0 ELSE 1 END,
  s.nome ASC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'searchTerm', 'category', 'limit'],
    requiredVariables: ['tenantId', 'searchTerm'],
    involvedTables: ['stores', 'commercial_areas', 'organization_entities'],
    isActive: true,
    isSystemTemplate: true
  },
  
  // ==================== CRM DEPARTMENT ====================
  {
    code: 'CRM_LEAD_SEARCH',
    name: 'Ricerca Lead',
    description: 'Cerca lead per nome, email, telefono o azienda con dettagli completi',
    department: 'crm' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  l.id AS lead_id,
  l.first_name,
  l.last_name,
  l.email,
  l.phone,
  l.company_name,
  l.status,
  l.source_channel AS source,
  l.lead_score AS score,
  l.created_at,
  l.last_contact_date,
  u.full_name AS assigned_to_name
FROM w3suite.crm_leads l
LEFT JOIN w3suite.users u ON u.id = l.owner_user_id
WHERE l.tenant_id = '{{tenantId}}'::uuid
  AND (
    l.first_name ILIKE '%{{searchTerm}}%'
    OR l.last_name ILIKE '%{{searchTerm}}%'
    OR l.email ILIKE '%{{searchTerm}}%'
    OR l.phone ILIKE '%{{searchTerm}}%'
    OR l.company_name ILIKE '%{{searchTerm}}%'
  )
ORDER BY l.lead_score DESC NULLS LAST, l.created_at DESC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'searchTerm', 'status', 'source', 'limit'],
    requiredVariables: ['tenantId', 'searchTerm'],
    involvedTables: ['crm_leads', 'users'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'CRM_CUSTOMER_360',
    name: 'Vista 360° Cliente',
    description: 'Panoramica completa di un cliente: dati anagrafici, ordini, ticket, comunicazioni',
    department: 'crm' as const,
    actionType: 'read' as const,
    sqlTemplate: `
WITH customer_orders AS (
  SELECT 
    customer_id,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_spent,
    AVG(total_amount) AS avg_order_value,
    MAX(created_at) AS last_order_date
  FROM w3suite.orders
  WHERE tenant_id = '{{tenantId}}'::uuid
  GROUP BY customer_id
),
customer_tickets AS (
  SELECT 
    customer_id,
    COUNT(*) AS total_tickets,
    COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_tickets,
    MAX(created_at) AS last_ticket_date
  FROM w3suite.support_tickets
  WHERE tenant_id = '{{tenantId}}'::uuid
  GROUP BY customer_id
)
SELECT 
  c.id AS customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company_name,
  c.customer_type,
  c.status,
  c.created_at AS customer_since,
  COALESCE(o.total_orders, 0) AS total_orders,
  COALESCE(o.total_spent, 0) AS total_spent,
  COALESCE(o.avg_order_value, 0) AS avg_order_value,
  o.last_order_date,
  COALESCE(t.total_tickets, 0) AS total_tickets,
  COALESCE(t.open_tickets, 0) AS open_tickets,
  t.last_ticket_date,
  u.full_name AS account_manager
FROM w3suite.customers c
LEFT JOIN customer_orders o ON o.customer_id = c.id
LEFT JOIN customer_tickets t ON t.customer_id = c.id
LEFT JOIN w3suite.users u ON u.id = c.account_manager_id
WHERE c.tenant_id = '{{tenantId}}'::uuid
  AND (c.email ILIKE '%{{customerEmail}}%' OR c.id::text = '{{customerId}}');
`,
    availableVariables: ['tenantId', 'customerEmail', 'customerId'],
    requiredVariables: ['tenantId'],
    involvedTables: ['customers', 'orders', 'support_tickets', 'users'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'CRM_PIPELINE_STATUS',
    name: 'Stato Pipeline Vendite',
    description: 'Analisi dello stato corrente della pipeline vendite con valore per stage',
    department: 'crm' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  ps.name AS stage_name,
  ps.order_index AS stage_order,
  COUNT(d.id) AS deals_count,
  SUM(d.value) AS total_value,
  AVG(d.value) AS avg_deal_value,
  AVG(d.probability) AS avg_probability,
  SUM(d.value * d.probability / 100) AS weighted_value,
  AVG(EXTRACT(DAY FROM (NOW() - d.created_at))) AS avg_days_in_stage
FROM w3suite.pipeline_stages ps
LEFT JOIN w3suite.deals d ON d.pipeline_stage_id = ps.id AND d.status = 'open'
WHERE ps.tenant_id = '{{tenantId}}'::uuid
  AND ps.pipeline_id = '{{pipelineId}}'::uuid
GROUP BY ps.id, ps.name, ps.order_index
ORDER BY ps.order_index ASC;
`,
    availableVariables: ['tenantId', 'pipelineId', 'assignedTo', 'dateFrom', 'dateTo'],
    requiredVariables: ['tenantId', 'pipelineId'],
    involvedTables: ['pipeline_stages', 'deals'],
    isActive: true,
    isSystemTemplate: true
  },
  
  // ==================== SALES DEPARTMENT ====================
  {
    code: 'SALES_BY_STORE',
    name: 'Vendite per Negozio',
    description: 'Report vendite aggregato per negozio con confronto periodo precedente',
    department: 'sales' as const,
    actionType: 'read' as const,
    sqlTemplate: `
WITH current_period AS (
  SELECT 
    store_id,
    COUNT(*) AS transactions,
    SUM(total_amount) AS revenue,
    AVG(total_amount) AS avg_ticket,
    COUNT(DISTINCT customer_id) AS unique_customers
  FROM w3suite.orders
  WHERE tenant_id = '{{tenantId}}'::uuid
    AND created_at >= '{{dateFrom}}'::timestamp
    AND created_at <= '{{dateTo}}'::timestamp
  GROUP BY store_id
),
previous_period AS (
  SELECT 
    store_id,
    SUM(total_amount) AS revenue
  FROM w3suite.orders
  WHERE tenant_id = '{{tenantId}}'::uuid
    AND created_at >= ('{{dateFrom}}'::timestamp - INTERVAL '1 month')
    AND created_at <= ('{{dateTo}}'::timestamp - INTERVAL '1 month')
  GROUP BY store_id
)
SELECT 
  s.id AS store_id,
  s.nome AS store_name,
  s.indirizzo AS store_address,
  COALESCE(cp.transactions, 0) AS transactions,
  COALESCE(cp.revenue, 0) AS current_revenue,
  COALESCE(pp.revenue, 0) AS previous_revenue,
  COALESCE(cp.avg_ticket, 0) AS avg_ticket,
  COALESCE(cp.unique_customers, 0) AS unique_customers,
  CASE 
    WHEN pp.revenue > 0 
    THEN ROUND(((cp.revenue - pp.revenue) / pp.revenue) * 100, 1)
    ELSE 0 
  END AS growth_percentage
FROM w3suite.stores s
LEFT JOIN current_period cp ON cp.store_id = s.id
LEFT JOIN previous_period pp ON pp.store_id = s.id
WHERE s.tenant_id = '{{tenantId}}'::uuid
ORDER BY COALESCE(cp.revenue, 0) DESC;
`,
    availableVariables: ['tenantId', 'dateFrom', 'dateTo', 'storeId', 'regionId'],
    requiredVariables: ['tenantId', 'dateFrom', 'dateTo'],
    involvedTables: ['orders', 'stores'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'SALES_TOP_PRODUCTS',
    name: 'Prodotti Più Venduti',
    description: 'Classifica dei prodotti più venduti per quantità e fatturato',
    department: 'sales' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  c.name AS category_name,
  SUM(oi.quantity) AS total_quantity_sold,
  SUM(oi.quantity * oi.unit_price) AS total_revenue,
  COUNT(DISTINCT o.id) AS orders_count,
  AVG(oi.unit_price) AS avg_selling_price,
  COUNT(DISTINCT o.store_id) AS stores_selling
FROM w3suite.order_items oi
INNER JOIN w3suite.orders o ON o.id = oi.order_id
INNER JOIN w3suite.products p ON p.id = oi.product_id
LEFT JOIN w3suite.categories c ON c.id = p.category_id
WHERE o.tenant_id = '{{tenantId}}'::uuid
  AND o.created_at >= '{{dateFrom}}'::timestamp
  AND o.created_at <= '{{dateTo}}'::timestamp
  AND o.status = 'completed'
GROUP BY p.id, p.sku, p.name, c.name
ORDER BY total_revenue DESC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'dateFrom', 'dateTo', 'storeId', 'categoryId', 'limit'],
    requiredVariables: ['tenantId', 'dateFrom', 'dateTo'],
    involvedTables: ['order_items', 'orders', 'products', 'categories'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'SALES_AGENT_PERFORMANCE',
    name: 'Performance Agenti Vendita',
    description: 'Report performance degli agenti vendita con metriche chiave e ranking',
    department: 'sales' as const,
    actionType: 'read' as const,
    sqlTemplate: `
WITH agent_metrics AS (
  SELECT 
    o.created_by AS agent_id,
    COUNT(*) AS total_orders,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS avg_order_value,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    COUNT(DISTINCT DATE(o.created_at)) AS active_days
  FROM w3suite.orders o
  WHERE o.tenant_id = '{{tenantId}}'::uuid
    AND o.created_at >= '{{dateFrom}}'::timestamp
    AND o.created_at <= '{{dateTo}}'::timestamp
    AND o.status = 'completed'
  GROUP BY o.created_by
)
SELECT 
  u.id AS agent_id,
  u.full_name AS agent_name,
  u.email,
  s.nome AS primary_store,
  COALESCE(am.total_orders, 0) AS total_orders,
  COALESCE(am.total_revenue, 0) AS total_revenue,
  COALESCE(am.avg_order_value, 0) AS avg_order_value,
  COALESCE(am.unique_customers, 0) AS unique_customers,
  COALESCE(am.active_days, 0) AS active_days,
  CASE 
    WHEN am.active_days > 0 
    THEN ROUND(am.total_revenue / am.active_days, 2)
    ELSE 0 
  END AS revenue_per_day,
  RANK() OVER (ORDER BY COALESCE(am.total_revenue, 0) DESC) AS ranking
FROM w3suite.users u
LEFT JOIN agent_metrics am ON am.agent_id = u.id
LEFT JOIN w3suite.stores s ON s.id = u.store_id
WHERE u.tenant_id = '{{tenantId}}'::uuid
  AND u.role IN ('sales_agent', 'store_manager', 'agent')
ORDER BY COALESCE(am.total_revenue, 0) DESC
LIMIT {{limit}};
`,
    availableVariables: ['tenantId', 'dateFrom', 'dateTo', 'storeId', 'limit'],
    requiredVariables: ['tenantId', 'dateFrom', 'dateTo'],
    involvedTables: ['orders', 'users', 'stores'],
    isActive: true,
    isSystemTemplate: true
  },
  
  // ==================== OPERATIONS DEPARTMENT ====================
  {
    code: 'OPS_STORE_STATUS',
    name: 'Stato Operativo Negozi',
    description: 'Panoramica dello stato operativo di tutti i negozi: personale presente, turni attivi, criticità',
    department: 'operations' as const,
    actionType: 'read' as const,
    sqlTemplate: `
WITH store_shifts AS (
  SELECT 
    s.store_id,
    COUNT(*) AS total_shifts_today,
    COUNT(CASE WHEN sa.status = 'in_progress' THEN 1 END) AS active_shifts,
    COUNT(CASE WHEN sa.status = 'no_show' THEN 1 END) AS no_shows
  FROM w3suite.shifts s
  INNER JOIN w3suite.shift_assignments sa ON sa.shift_id = s.id::text
  WHERE s.date = CURRENT_DATE
    AND s.tenant_id = '{{tenantId}}'::uuid
  GROUP BY s.store_id
),
store_issues AS (
  SELECT 
    store_id,
    COUNT(*) AS open_issues
  FROM w3suite.universal_requests
  WHERE tenant_id = '{{tenantId}}'::uuid
    AND status = 'pending'
    AND category IN ('maintenance', 'urgent', 'incident')
  GROUP BY store_id
)
SELECT 
  st.id AS store_id,
  st.nome AS store_name,
  st.indirizzo AS address,
  st.telefono AS phone,
  st.is_active,
  COALESCE(ss.total_shifts_today, 0) AS planned_shifts,
  COALESCE(ss.active_shifts, 0) AS staff_present,
  COALESCE(ss.no_shows, 0) AS absences,
  COALESCE(si.open_issues, 0) AS pending_issues,
  CASE 
    WHEN ss.no_shows > 0 THEN 'CRITICAL'
    WHEN si.open_issues > 3 THEN 'WARNING'
    ELSE 'OK'
  END AS status
FROM w3suite.stores st
LEFT JOIN store_shifts ss ON ss.store_id = st.id
LEFT JOIN store_issues si ON si.store_id = st.id
WHERE st.tenant_id = '{{tenantId}}'::uuid
  AND st.is_active = true
ORDER BY 
  CASE WHEN ss.no_shows > 0 THEN 0 ELSE 1 END,
  COALESCE(si.open_issues, 0) DESC;
`,
    availableVariables: ['tenantId', 'regionId', 'date'],
    requiredVariables: ['tenantId'],
    involvedTables: ['stores', 'shifts', 'shift_assignments', 'universal_requests'],
    isActive: true,
    isSystemTemplate: true
  },
  {
    code: 'OPS_DAILY_SUMMARY',
    name: 'Riepilogo Giornaliero Operazioni',
    description: 'Riepilogo giornaliero delle operazioni: ordini, incassi, turni, criticità',
    department: 'operations' as const,
    actionType: 'read' as const,
    sqlTemplate: `
SELECT 
  '{{date}}'::date AS report_date,
  (SELECT COUNT(*) FROM w3suite.orders WHERE tenant_id = '{{tenantId}}'::uuid AND DATE(created_at) = '{{date}}'::date) AS total_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM w3suite.orders WHERE tenant_id = '{{tenantId}}'::uuid AND DATE(created_at) = '{{date}}'::date AND status = 'completed') AS total_revenue,
  (SELECT COUNT(DISTINCT store_id) FROM w3suite.orders WHERE tenant_id = '{{tenantId}}'::uuid AND DATE(created_at) = '{{date}}'::date) AS active_stores,
  (SELECT COUNT(*) FROM w3suite.shifts s INNER JOIN w3suite.shift_assignments sa ON sa.shift_id = s.id::text WHERE s.tenant_id = '{{tenantId}}'::uuid AND s.date = '{{date}}'::date) AS planned_shifts,
  (SELECT COUNT(*) FROM w3suite.shifts s INNER JOIN w3suite.shift_assignments sa ON sa.shift_id = s.id::text WHERE s.tenant_id = '{{tenantId}}'::uuid AND s.date = '{{date}}'::date AND sa.status = 'completed') AS completed_shifts,
  (SELECT COUNT(*) FROM w3suite.universal_requests WHERE tenant_id = '{{tenantId}}'::uuid AND DATE(created_at) = '{{date}}'::date) AS new_requests,
  (SELECT COUNT(*) FROM w3suite.universal_requests WHERE tenant_id = '{{tenantId}}'::uuid AND status = 'pending') AS pending_requests;
`,
    availableVariables: ['tenantId', 'date'],
    requiredVariables: ['tenantId', 'date'],
    involvedTables: ['orders', 'shifts', 'shift_assignments', 'universal_requests'],
    isActive: true,
    isSystemTemplate: true
  }
];

export async function seedMcpQueryTemplates() {
  console.log('🔧 Seeding MCP Query Templates...');
  
  try {
    for (const template of MCP_QUERY_TEMPLATES) {
      const existing = await db
        .select({ id: mcpQueryTemplates.id })
        .from(mcpQueryTemplates)
        .where(eq(mcpQueryTemplates.code, template.code))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(mcpQueryTemplates)
          .set({
            name: template.name,
            description: template.description,
            department: template.department,
            actionType: template.actionType,
            sqlTemplate: template.sqlTemplate,
            availableVariables: template.availableVariables,
            requiredVariables: template.requiredVariables,
            involvedTables: template.involvedTables,
            isActive: template.isActive,
            isSystemTemplate: template.isSystemTemplate,
            updatedAt: new Date()
          })
          .where(eq(mcpQueryTemplates.code, template.code));
        console.log(`  ✅ Updated: ${template.code}`);
      } else {
        await db.insert(mcpQueryTemplates).values(template);
        console.log(`  ✅ Created: ${template.code}`);
      }
    }
    
    console.log(`✅ MCP Query Templates seeded: ${MCP_QUERY_TEMPLATES.length} templates`);
    return { success: true, count: MCP_QUERY_TEMPLATES.length };
  } catch (error) {
    console.error('❌ Error seeding MCP Query Templates:', error);
    throw error;
  }
}

const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || '') || 
                     process.argv[1]?.includes('seed-mcp-query-templates');

if (isMainModule) {
  seedMcpQueryTemplates()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
