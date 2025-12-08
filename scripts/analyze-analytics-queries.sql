-- ====================================================================
-- ANALYTICS QUERY PERFORMANCE ANALYSIS
-- Script per identificare bottleneck nelle query analytics del CRM
-- ====================================================================

-- Set tenant context per test (usa un tenant ID valido dal tuo DB)
SET LOCAL w3suite.current_tenant_id = '00000000-0000-0000-0000-000000000001';

-- ====================================================================
-- QUERY 1: /analytics/overview - KPI Dashboard
-- Questa è la query più critica, eseguita ogni volta che si apre la dashboard
-- ====================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
WITH funnel_pipelines AS (
  SELECT id FROM w3suite.crm_pipelines
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND funnel_id = 'test-funnel-id'  -- Sostituisci con ID valido
  AND is_active = true
),
funnel_deals AS (
  SELECT 
    d.*,
    c.customer_type
  FROM w3suite.crm_deals d
  LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
  WHERE d.pipeline_id IN (SELECT id FROM funnel_pipelines)
  AND d.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND d.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
)
SELECT
  COUNT(DISTINCT d.id)::int as total_leads,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status NOT IN ('won', 'lost'))::int as active_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'won')::int as won_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'lost')::int as lost_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('won', 'lost'))::int as closed_deals,
  COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as total_revenue,
  COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      COALESCE(d.won_at, d.lost_at, NOW()) - d.created_at
    )) / 86400
  ), 0)::float as avg_journey_duration_days
FROM funnel_deals d;

-- ====================================================================
-- QUERY 2: Campaign Attribution (Marketing Spend Analysis)
-- Query complessa con JOIN su campaigns per calcolare ROI
-- ====================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
WITH funnel_pipelines AS (
  SELECT id FROM w3suite.crm_pipelines
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND funnel_id = 'test-funnel-id'
  AND is_active = true
),
campaign_spend AS (
  SELECT COALESCE(SUM(cp.total_spend), 0)::float as total_marketing_spend
  FROM w3suite.crm_campaigns cp
  INNER JOIN w3suite.crm_leads l ON l.campaign_id = cp.id
  INNER JOIN w3suite.crm_deals d ON d.lead_id = l.id
  WHERE d.pipeline_id IN (SELECT id FROM funnel_pipelines)
  AND d.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND d.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
)
SELECT total_marketing_spend FROM campaign_spend;

-- ====================================================================
-- QUERY 3: Stage Performance (JOIN intensivo con aggregazioni)
-- ====================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
WITH funnel_pipelines AS (
  SELECT id, name FROM w3suite.crm_pipelines
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND funnel_id = 'test-funnel-id'
  AND is_active = true
),
pipeline_stages AS (
  SELECT ps.*, fp.name as pipeline_name
  FROM w3suite.crm_pipeline_stages ps
  INNER JOIN funnel_pipelines fp ON ps.pipeline_id = fp.id
  WHERE ps.tenant_id = '00000000-0000-0000-0000-000000000001'
)
SELECT
  ps.pipeline_name,
  ps.name as stage_name,
  ps.order_index,
  COUNT(d.id)::int as total_deals,
  AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400)::float as avg_time_in_stage_days,
  COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions,
  COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as dropoffs,
  COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as revenue
FROM w3suite.crm_deals d
INNER JOIN pipeline_stages ps ON d.current_stage_id = ps.id
WHERE d.tenant_id = '00000000-0000-0000-0000-000000000001'
AND d.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
GROUP BY ps.pipeline_name, ps.name, ps.order_index
ORDER BY ps.order_index;

-- ====================================================================
-- QUERY 4: Export Query (la più pesante, con tutti i dati)
-- ====================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
WITH funnel_pipelines AS (
  SELECT id, name FROM w3suite.crm_pipelines
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND funnel_id = 'test-funnel-id'
  AND is_active = true
),
pipeline_stages AS (
  SELECT ps.*, fp.name as pipeline_name
  FROM w3suite.crm_pipeline_stages ps
  INNER JOIN funnel_pipelines fp ON ps.pipeline_id = fp.id
  WHERE ps.tenant_id = '00000000-0000-0000-0000-000000000001'
),
deal_analytics AS (
  SELECT 
    ps.pipeline_name,
    ps.name as stage_name,
    ps.order_index as stage_order,
    COUNT(d.id)::int as deal_count,
    AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400)::float as avg_days_in_stage,
    COUNT(d.id) FILTER (WHERE d.status = 'won')::int as conversions,
    COUNT(d.id) FILTER (WHERE d.status = 'lost')::int as losses,
    COALESCE(SUM(d.estimated_value) FILTER (WHERE d.status = 'won'), 0)::float as revenue,
    l.source as lead_source,
    l.routing_type,
    c.customer_type
  FROM w3suite.crm_deals d
  LEFT JOIN pipeline_stages ps ON d.current_stage_id = ps.id
  LEFT JOIN w3suite.crm_leads l ON d.lead_id = l.id
  LEFT JOIN w3suite.crm_customers c ON d.customer_id = c.id
  WHERE d.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND d.pipeline_id IN (SELECT id FROM funnel_pipelines)
  AND d.created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  GROUP BY ps.pipeline_name, ps.name, ps.order_index, l.source, l.routing_type, c.customer_type
)
SELECT * FROM deal_analytics ORDER BY stage_order, pipeline_name;

-- ====================================================================
-- INDICI ATTUALMENTE MANCANTI (da verificare)
-- ====================================================================

-- Verifica esistenza indici compositi critici
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'w3suite'
AND tablename IN ('crm_deals', 'crm_leads', 'crm_pipelines', 'crm_pipeline_stages', 'crm_campaigns')
ORDER BY tablename, indexname;

-- ====================================================================
-- STATISTICHE TABELLE (per verificare se ANALYZE è necessario)
-- ====================================================================

SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'w3suite'
AND tablename LIKE 'crm_%'
ORDER BY n_live_tup DESC;

-- ====================================================================
-- RACCOMANDAZIONI INDICI (basate sull'analisi)
-- ====================================================================

/*
INDICI COMPOSITI CRITICI DA CREARE:

1. crm_deals - Query principali filtrano su (pipeline_id, tenant_id, created_at, status)
   CREATE INDEX CONCURRENTLY idx_crm_deals_pipeline_tenant_created_status 
   ON w3suite.crm_deals(pipeline_id, tenant_id, created_at, status);

2. crm_deals - JOIN frequente con current_stage_id
   CREATE INDEX CONCURRENTLY idx_crm_deals_current_stage 
   ON w3suite.crm_deals(current_stage_id, tenant_id) INCLUDE (status, estimated_value);

3. crm_deals - JOIN con lead_id e customer_id
   CREATE INDEX CONCURRENTLY idx_crm_deals_lead_customer 
   ON w3suite.crm_deals(lead_id, customer_id, tenant_id);

4. crm_pipelines - Filtro frequente su funnel_id + is_active
   CREATE INDEX CONCURRENTLY idx_crm_pipelines_funnel_active 
   ON w3suite.crm_pipelines(funnel_id, tenant_id, is_active);

5. crm_leads - JOIN con campaign_id
   CREATE INDEX CONCURRENTLY idx_crm_leads_campaign 
   ON w3suite.crm_leads(campaign_id, tenant_id);

6. crm_pipeline_stages - JOIN con pipeline_id
   CREATE INDEX CONCURRENTLY idx_crm_pipeline_stages_pipeline 
   ON w3suite.crm_pipeline_stages(pipeline_id, tenant_id, order_index);
*/
