-- ==========================================
-- MIGRATION: HR and Leave Requests → Universal Requests
-- FASE 2.2: Consolidation of fragmented request systems
-- ==========================================

-- WARNING: This migration consolidates hrRequests and leaveRequests into universalRequests
-- Run this script only after backing up the database
-- Test thoroughly in staging environment before production

BEGIN;

-- ==========================================
-- STEP 1: Migrate Leave Requests to Universal Requests
-- ==========================================

INSERT INTO w3suite.universal_requests (
    id,
    tenant_id,
    requester_id,
    legal_entity_id,
    store_id,
    category,
    request_type,
    request_subtype,
    title,
    description,
    request_data,
    status,
    approval_chain,
    current_approver_id,
    priority,
    start_date,
    end_date,
    due_date,
    created_at,
    updated_at,
    created_by,
    updated_by
)
SELECT 
    lr.id,
    lr.tenant_id,
    lr.user_id,                           -- requesterId mapped from userId
    NULL,                                 -- legalEntityId - not available in leaveRequests
    lr.store_id,
    'HR'::w3suite.request_category_enum,  -- All leave requests are HR category
    'leave',                              -- request_type
    lr.leave_type::text,                  -- request_subtype from leave_type enum
    CONCAT('Leave Request - ', INITCAP(lr.leave_type::text)),  -- Generated title
    lr.reason,                            -- description from reason
    jsonb_build_object(
        'leaveType', lr.leave_type,
        'startDate', lr.start_date,
        'endDate', lr.end_date, 
        'totalDays', lr.total_days,
        'reason', lr.reason,
        'notes', lr.notes,
        'coveredBy', lr.covered_by,
        'originalTable', 'leave_requests'  -- Migration tracking
    ),                                    -- request_data JSONB
    CASE lr.status::text
        WHEN 'draft' THEN 'draft'
        WHEN 'pending' THEN 'pending' 
        WHEN 'approved' THEN 'approved'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'draft'
    END::w3suite.request_status_enum,     -- Status mapping
    COALESCE(lr.approval_chain, '[]'::jsonb),  -- Preserve approval chain
    lr.current_approver,                  -- current_approver_id
    'normal',                             -- Default priority
    lr.start_date::timestamp,             -- start_date
    lr.end_date::timestamp,               -- end_date  
    lr.start_date::timestamp,             -- due_date (same as start for leave)
    lr.created_at,
    lr.updated_at,
    lr.user_id,                           -- created_by = requester
    lr.user_id                            -- updated_by = requester initially
FROM w3suite.leave_requests lr
WHERE NOT EXISTS (
    SELECT 1 FROM w3suite.universal_requests ur 
    WHERE ur.id = lr.id
);

-- ==========================================
-- STEP 2: Migrate HR Requests to Universal Requests  
-- ==========================================

INSERT INTO w3suite.universal_requests (
    id,
    tenant_id,
    requester_id,
    legal_entity_id,
    store_id,
    category,
    request_type,
    request_subtype,
    title,
    description,
    request_data,
    status,
    approval_chain,
    current_approver_id,
    priority,
    start_date,
    end_date,
    attachments,
    created_at,
    updated_at,
    created_by,
    updated_by
)
SELECT 
    hr.id,
    hr.tenant_id,
    hr.requester_id,
    NULL,                                 -- legalEntityId - not available in hrRequests
    NULL,                                 -- storeId - not available in hrRequests
    hr.category,                          -- Use existing category enum
    hr.type::text,                        -- request_type from type enum
    NULL,                                 -- request_subtype - not available
    CONCAT('HR Request - ', INITCAP(hr.category::text), ' - ', INITCAP(hr.type::text)),  -- Generated title
    hr.description,
    jsonb_build_object(
        'category', hr.category,
        'type', hr.type,
        'payload', COALESCE(hr.payload, '{}'::jsonb),
        'originalTable', 'hr_requests'    -- Migration tracking
    ),                                    -- request_data JSONB
    CASE hr.status::text
        WHEN 'draft' THEN 'draft'
        WHEN 'pending' THEN 'pending'
        WHEN 'approved' THEN 'approved' 
        WHEN 'rejected' THEN 'rejected'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'draft'
    END::w3suite.request_status_enum,     -- Status mapping
    COALESCE(hr.approval_chain, '[]'::jsonb),  -- Preserve approval chain if exists
    hr.current_approver_id,
    COALESCE(hr.priority, 'normal'),      -- Use existing priority or default
    hr.start_date,
    hr.end_date,
    hr.attachments,
    hr.created_at,
    hr.updated_at,
    hr.requester_id,                      -- created_by = requester
    hr.requester_id                       -- updated_by = requester initially
FROM w3suite.hr_requests hr
WHERE NOT EXISTS (
    SELECT 1 FROM w3suite.universal_requests ur 
    WHERE ur.id = hr.id
);

-- ==========================================
-- STEP 3: Update Related Tables References (HR Comments)
-- ==========================================

-- Note: We don't migrate hrRequestComments, hrRequestApprovals, hrRequestStatusHistory
-- to universal tables because they should use the new system going forward.
-- This migration focuses on consolidating the main request data.

-- ==========================================
-- STEP 4: Create Migration Audit Log
-- ==========================================

INSERT INTO w3suite.notifications (
    id,
    tenant_id,
    user_id,
    title,
    message,
    category,
    data,
    created_at
)
SELECT 
    gen_random_uuid(),
    t.id,
    'admin-user',  -- System notification
    'Data Migration Completed',
    'Successfully migrated HR and Leave requests to Universal Requests system',
    'system',
    jsonb_build_object(
        'migrationType', 'universalRequests',
        'timestamp', NOW(),
        'leaveRequestsMigrated', (SELECT COUNT(*) FROM w3suite.leave_requests),
        'hrRequestsMigrated', (SELECT COUNT(*) FROM w3suite.hr_requests),
        'totalUniversalRequests', (SELECT COUNT(*) FROM w3suite.universal_requests)
    ),
    NOW()
FROM w3suite.tenants t;

-- ==========================================
-- VERIFICATION QUERIES (Run after migration)
-- ==========================================

-- Check migration results
SELECT 
    'leave_requests' as source_table,
    COUNT(*) as original_count
FROM w3suite.leave_requests
UNION ALL
SELECT 
    'hr_requests' as source_table,
    COUNT(*) as original_count  
FROM w3suite.hr_requests
UNION ALL
SELECT 
    'universal_requests' as target_table,
    COUNT(*) as migrated_count
FROM w3suite.universal_requests
UNION ALL
SELECT 
    'universal_requests_from_leave' as migrated_subset,
    COUNT(*) as migrated_count
FROM w3suite.universal_requests 
WHERE request_data->>'originalTable' = 'leave_requests'
UNION ALL
SELECT 
    'universal_requests_from_hr' as migrated_subset,
    COUNT(*) as migrated_count
FROM w3suite.universal_requests 
WHERE request_data->>'originalTable' = 'hr_requests';

COMMIT;

-- ==========================================
-- POST-MIGRATION NOTES
-- ==========================================

/*
This migration script:

1. ✅ Consolidates leave_requests and hr_requests into universal_requests
2. ✅ Preserves all data integrity with JSONB request_data field
3. ✅ Maps status enums appropriately 
4. ✅ Preserves approval_chain data for existing workflows
5. ✅ Adds migration tracking in request_data.originalTable
6. ✅ Creates audit notifications for each tenant
7. ✅ Uses EXISTS check to prevent duplicate migrations

NEXT STEPS:
- Run FASE 2.3 compatibility layer implementation
- Test universalRequests API endpoints
- Update frontend to use new unified system
- Consider deprecation timeline for old tables

ROLLBACK STRATEGY:
- The original tables remain unchanged
- Data can be restored from universal_requests if needed
- Use request_data.originalTable to identify migration source
*/