-- Migration: Analytics Performance Optimization Indexes
-- Date: 2025-11-09
-- Description: Create composite indexes for CRM analytics queries optimization
--              Addresses critical performance bottlenecks identified in ANALYTICS_PERFORMANCE_ANALYSIS.md
--
-- CRITICAL: All indexes start with tenant_id for multi-tenant query optimization
--           Using CONCURRENTLY to avoid table locks in production
--
-- Expected performance improvement:
-- - Dashboard load: from 8-12s to 2-3s (-70%)
-- - ROI calculation: from 5s to 1.5s (-70%)
-- - Stage analytics: from 4s to 1s (-75%)

-- ====================================================================
-- P0 - CRITICAL INDEXES (Core Analytics Queries)
-- ====================================================================

-- Index 1: Core analytics query optimization (dashboard overview)
-- Query pattern: WHERE tenant_id = ? AND pipeline_id = ? AND created_at BETWEEN ? AND ? AND status IN (...)
-- Impact: Eliminates sequential scan on crm_deals (50k+ rows)
-- Covering index includes frequently accessed columns to avoid heap lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_deals_analytics_core
ON w3suite.crm_deals(tenant_id, pipeline_id, created_at, status)
INCLUDE (estimated_value, current_stage_id, lead_id, customer_id, won_at, lost_at, updated_at);

-- Index 2: Stage performance analytics
-- Query pattern: WHERE tenant_id = ? AND current_stage_id = ? AND created_at BETWEEN ?
-- Impact: Optimizes stage-level aggregations (COUNT, AVG time in stage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_deals_stage_analytics
ON w3suite.crm_deals(tenant_id, current_stage_id, created_at)
INCLUDE (status, estimated_value, updated_at);

-- Index 3: Foreign key JOIN optimization (lead_id, customer_id)
-- Query pattern: JOIN crm_leads ON d.lead_id = l.id JOIN crm_customers ON d.customer_id = c.id
-- Impact: Converts nested loop joins to hash joins for ROI calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_deals_foreign_keys
ON w3suite.crm_deals(tenant_id, lead_id, customer_id)
INCLUDE (status, estimated_value, pipeline_id);

-- Index 4: Funnel lookup optimization (pipelines)
-- Query pattern: WHERE tenant_id = ? AND funnel_id = ? AND is_active = true
-- Impact: Fast funnel pipeline resolution (used in all analytics CTEs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_pipelines_funnel_lookup
ON w3suite.crm_pipelines(tenant_id, funnel_id, is_active)
INCLUDE (id, name);

-- Index 5: Campaign attribution (ROI calculation)
-- Query pattern: JOIN crm_leads ON l.campaign_id = c.id WHERE l.tenant_id = ?
-- Impact: Optimizes marketing spend calculation (campaign → leads → deals chain)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_leads_campaign_attribution
ON w3suite.crm_leads(tenant_id, campaign_id)
INCLUDE (source, routing_type, id);

-- Index 6: Stage analytics (pipeline stages)
-- Query pattern: WHERE ps.tenant_id = ? AND ps.pipeline_id = ? ORDER BY order_index
-- Impact: Optimizes stage ordering and aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_pipeline_stages_analytics
ON w3suite.crm_pipeline_stages(tenant_id, pipeline_id, order_index)
INCLUDE (name, id);

-- ====================================================================
-- P1 - HIGH PRIORITY INDEXES (Customer Segmentation)
-- ====================================================================

-- Index 7: Customer segmentation
-- Query pattern: WHERE c.tenant_id = ? AND c.customer_type IN ('b2b', 'b2c')
-- Impact: Optimizes B2B/B2C filtering in analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_customers_segmentation
ON w3suite.crm_customers(tenant_id, customer_type)
INCLUDE (company_size, industry, id);

-- Index 8: Deal status filtering (common in all analytics)
-- Partial index for active deals only (excludes archived/deleted)
-- Impact: Smaller index size, faster scans for active deals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_deals_active_status
ON w3suite.crm_deals(tenant_id, status, created_at)
WHERE status NOT IN ('archived', 'deleted');

-- ====================================================================
-- STATISTICS UPDATE
-- ====================================================================

-- Force PostgreSQL to update statistics after index creation
-- This ensures the query planner uses the new indexes optimally
ANALYZE w3suite.crm_deals;
ANALYZE w3suite.crm_leads;
ANALYZE w3suite.crm_pipelines;
ANALYZE w3suite.crm_pipeline_stages;
ANALYZE w3suite.crm_customers;
ANALYZE w3suite.crm_campaigns;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Verify all indexes were created successfully
DO $$
DECLARE
  missing_indexes text[];
  idx_name text;
BEGIN
  missing_indexes := ARRAY[
    'idx_crm_deals_analytics_core',
    'idx_crm_deals_stage_analytics',
    'idx_crm_deals_foreign_keys',
    'idx_crm_pipelines_funnel_lookup',
    'idx_crm_leads_campaign_attribution',
    'idx_crm_pipeline_stages_analytics',
    'idx_crm_customers_segmentation',
    'idx_crm_deals_active_status'
  ];

  FOREACH idx_name IN ARRAY missing_indexes
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'w3suite' 
      AND indexname = idx_name
    ) THEN
      RAISE NOTICE 'WARNING: Index % was not created!', idx_name;
    ELSE
      RAISE NOTICE 'SUCCESS: Index % created successfully', idx_name;
    END IF;
  END LOOP;
END $$;

-- Display index sizes for monitoring
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_indexes
WHERE schemaname = 'w3suite'
AND indexname LIKE 'idx_crm_%'
ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC;
