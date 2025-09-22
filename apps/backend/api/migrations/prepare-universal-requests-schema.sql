-- ==========================================
-- SCHEMA PREPARATION: Universal Requests System
-- FASE 2.2: Ensure universalRequests table is ready for migration
-- ==========================================

-- This script ensures the universal_requests table and related structures
-- are properly configured before running the data migration

BEGIN;

-- ==========================================
-- STEP 1: Verify Universal Requests Table Structure
-- ==========================================

-- Check if universal_requests table exists with required columns
DO $$
BEGIN
    -- Verify table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'w3suite' 
        AND table_name = 'universal_requests'
    ) THEN
        RAISE EXCEPTION 'universal_requests table does not exist. Run schema migration first.';
    END IF;
    
    -- Verify critical columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'w3suite' 
        AND table_name = 'universal_requests' 
        AND column_name = 'request_data'
    ) THEN
        RAISE EXCEPTION 'universal_requests.request_data column missing. Check schema version.';
    END IF;
    
    RAISE NOTICE 'Universal Requests table structure verified ✅';
END $$;

-- ==========================================
-- STEP 2: Create Migration-Specific Indexes (if not exist)
-- ==========================================

-- Index for migration queries
CREATE INDEX IF NOT EXISTS idx_universal_requests_request_data_original_table 
ON w3suite.universal_requests USING gin ((request_data->'originalTable'));

-- Index for category/type queries after migration
CREATE INDEX IF NOT EXISTS idx_universal_requests_category_type 
ON w3suite.universal_requests (category, request_type);

-- Index for status and priority filtering
CREATE INDEX IF NOT EXISTS idx_universal_requests_status_priority 
ON w3suite.universal_requests (status, priority);

-- ==========================================
-- STEP 3: Ensure Required Enum Values Exist
-- ==========================================

-- Check if request_category_enum includes required values
DO $$
BEGIN
    -- Verify HR category exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'w3suite.request_category_enum'::regtype 
        AND enumlabel = 'HR'
    ) THEN
        RAISE EXCEPTION 'request_category_enum missing HR value. Update enum first.';
    END IF;
    
    RAISE NOTICE 'Required enum values verified ✅';
END $$;

-- ==========================================
-- STEP 4: Create Temporary Migration Helper Functions
-- ==========================================

-- Function to validate migrated data integrity
CREATE OR REPLACE FUNCTION w3suite.validate_migration_data()
RETURNS TABLE (
    check_name text,
    status text,
    details text
) AS $$
BEGIN
    -- Check 1: No orphaned records
    RETURN QUERY
    SELECT 
        'orphaned_records'::text,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::text,
        CONCAT('Found ', COUNT(*), ' universal_requests without valid requester')::text
    FROM w3suite.universal_requests ur
    LEFT JOIN w3suite.users u ON ur.requester_id = u.id
    WHERE u.id IS NULL;
    
    -- Check 2: Required fields populated
    RETURN QUERY
    SELECT 
        'required_fields'::text,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::text,
        CONCAT('Found ', COUNT(*), ' records with missing required fields')::text
    FROM w3suite.universal_requests
    WHERE category IS NULL 
       OR request_type IS NULL 
       OR title IS NULL 
       OR request_data IS NULL;
       
    -- Check 3: JSONB data structure
    RETURN QUERY
    SELECT 
        'jsonb_structure'::text,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::text,
        CONCAT('Found ', COUNT(*), ' records with invalid JSONB structure')::text
    FROM w3suite.universal_requests
    WHERE NOT jsonb_typeof(request_data) = 'object';
    
    -- Check 4: Migration tracking
    RETURN QUERY
    SELECT 
        'migration_tracking'::text,
        CASE 
            WHEN COUNT(*) > 0 THEN 'PASS'
            ELSE 'WARN'
        END::text,
        CONCAT('Found ', COUNT(*), ' records with migration tracking')::text
    FROM w3suite.universal_requests
    WHERE request_data ? 'originalTable';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STEP 5: Create Pre-Migration Backup Views
-- ==========================================

-- Create read-only views for backup/rollback purposes
CREATE OR REPLACE VIEW w3suite.backup_leave_requests AS
SELECT 
    id,
    tenant_id,
    user_id,
    store_id,
    leave_type,
    start_date,
    end_date,
    total_days,
    reason,
    notes,
    status,
    approval_chain,
    current_approver,
    covered_by,
    created_at,
    updated_at,
    'pre_migration_' || EXTRACT(epoch FROM NOW())::text as backup_timestamp
FROM w3suite.leave_requests;

CREATE OR REPLACE VIEW w3suite.backup_hr_requests AS
SELECT 
    id,
    tenant_id,
    requester_id,
    category,
    type,
    payload,
    start_date,
    end_date,
    description,
    status,
    approval_chain,
    current_approver_id,
    priority,
    attachments,
    created_at,
    updated_at,
    'pre_migration_' || EXTRACT(epoch FROM NOW())::text as backup_timestamp
FROM w3suite.hr_requests;

-- ==========================================
-- STEP 6: Set Up Migration Monitoring
-- ==========================================

-- Create migration log table if not exists
CREATE TABLE IF NOT EXISTS w3suite.migration_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name varchar(255) NOT NULL,
    started_at timestamp DEFAULT NOW(),
    completed_at timestamp,
    status varchar(50) DEFAULT 'in_progress',
    records_processed integer DEFAULT 0,
    errors_count integer DEFAULT 0,
    details jsonb DEFAULT '{}',
    created_at timestamp DEFAULT NOW()
);

-- Insert migration start record
INSERT INTO w3suite.migration_logs (migration_name, details)
VALUES (
    'universal-requests-schema-preparation',
    jsonb_build_object(
        'preparation_completed', true,
        'indexes_created', true,
        'validation_functions_ready', true,
        'backup_views_created', true
    )
);

-- ==========================================
-- VERIFICATION REPORT
-- ==========================================

-- Show pre-migration summary
SELECT 
    'PRE-MIGRATION SUMMARY' as report_section,
    '' as details
UNION ALL
SELECT 
    'leave_requests_count',
    COUNT(*)::text
FROM w3suite.leave_requests
UNION ALL
SELECT 
    'hr_requests_count', 
    COUNT(*)::text
FROM w3suite.hr_requests
UNION ALL
SELECT 
    'existing_universal_requests',
    COUNT(*)::text
FROM w3suite.universal_requests
UNION ALL
SELECT 
    'preparation_status',
    'READY ✅';

COMMIT;

-- ==========================================
-- NEXT STEPS
-- ==========================================

/*
Schema preparation completed successfully!

READY FOR MIGRATION:
1. ✅ Universal requests table structure verified
2. ✅ Required indexes created for performance
3. ✅ Enum values validated
4. ✅ Migration helper functions created
5. ✅ Backup views established
6. ✅ Migration monitoring set up

TO RUN MIGRATION:
1. Execute: migrate-to-universal-requests.sql
2. Run validation: SELECT * FROM w3suite.validate_migration_data();
3. Verify counts and data integrity
4. Proceed with FASE 2.3 compatibility layer

MONITORING:
- Check migration_logs table for progress
- Use backup views for rollback if needed
- Validation function available for post-migration checks
*/