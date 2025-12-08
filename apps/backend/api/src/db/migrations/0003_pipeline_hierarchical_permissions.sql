-- Migration: 0003_pipeline_hierarchical_permissions
-- Description: Implement hierarchical RBAC for CRM Pipeline Settings
-- Date: 2025-11-08
--
-- Changes:
-- 1. Create permission mode enums for operational permissions
-- 2. Rename leadManagers → dealManagers (via data migration)
-- 3. Remove dealApprovers (obsolete)
-- 4. Add assignedUsers field (optional users beyond teams)
-- 5. Add mode-based operational permissions (dealManagement, dealCreation, stateModification, dealDeletion)

-- ==================== STEP 1: CREATE ENUMS ====================

-- Pipeline permission mode enum (all | admins | custom | none)
DO $$ BEGIN
  CREATE TYPE w3suite.pipeline_permission_mode AS ENUM ('all', 'admins', 'custom', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Pipeline deletion mode enum (admins | none) - subset of permission mode
DO $$ BEGIN
  CREATE TYPE w3suite.pipeline_deletion_mode AS ENUM ('admins', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==================== STEP 2: ADD NEW COLUMNS ====================

-- Add assignedUsers (individual users beyond team members)
ALTER TABLE w3suite.crm_pipeline_settings
  ADD COLUMN IF NOT EXISTS assigned_users text[] DEFAULT '{}';

-- Add Deal Management permission (replaces leadManagers with mode-based approach)
ALTER TABLE w3suite.crm_pipeline_settings
  ADD COLUMN IF NOT EXISTS deal_management_mode w3suite.pipeline_permission_mode DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS deal_management_users text[] DEFAULT '{}';

-- Add Deal Creation permission
ALTER TABLE w3suite.crm_pipeline_settings
  ADD COLUMN IF NOT EXISTS deal_creation_mode w3suite.pipeline_permission_mode DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS deal_creation_users text[] DEFAULT '{}';

-- Add State Modification permission
ALTER TABLE w3suite.crm_pipeline_settings
  ADD COLUMN IF NOT EXISTS state_modification_mode w3suite.pipeline_permission_mode DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS state_modification_users text[] DEFAULT '{}';

-- Add Deal Deletion permission (more restrictive, defaults to admins only)
ALTER TABLE w3suite.crm_pipeline_settings
  ADD COLUMN IF NOT EXISTS deal_deletion_mode w3suite.pipeline_deletion_mode DEFAULT 'admins',
  ADD COLUMN IF NOT EXISTS deal_deletion_users text[] DEFAULT '{}';

-- ==================== STEP 3: MIGRATE EXISTING DATA ====================

-- Migrate leadManagers → dealManagementUsers
-- If leadManagers exists and has users, set mode='custom' and copy users
-- Otherwise, keep default mode='all'
DO $$
BEGIN
  -- Check if lead_managers column exists before migration
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'w3suite' 
      AND table_name = 'crm_pipeline_settings' 
      AND column_name = 'lead_managers'
  ) THEN
    UPDATE w3suite.crm_pipeline_settings
    SET 
      deal_management_users = COALESCE(lead_managers, '{}'),
      deal_management_mode = CASE 
        WHEN lead_managers IS NOT NULL AND array_length(lead_managers, 1) > 0 
          THEN 'custom'::w3suite.pipeline_permission_mode
        ELSE 'all'::w3suite.pipeline_permission_mode
      END
    WHERE lead_managers IS NOT NULL;
  END IF;
END $$;

-- ==================== STEP 4: DROP OBSOLETE COLUMNS ====================

-- Remove obsolete leadManagers column (replaced by dealManagementMode + dealManagementUsers)
ALTER TABLE w3suite.crm_pipeline_settings
  DROP COLUMN IF EXISTS lead_managers;

-- Remove obsolete dealApprovers column (no longer needed in hierarchy)
ALTER TABLE w3suite.crm_pipeline_settings
  DROP COLUMN IF EXISTS deal_approvers;

-- ==================== MIGRATION COMPLETE ====================
-- New structure:
-- - assignedTeams[] + assignedUsers[] = Parent Access (who can view pipeline)
-- - pipelineAdmins[] = Full settings access
-- - dealManagementMode + dealManagementUsers[] = Who can manage deals
-- - dealCreationMode + dealCreationUsers[] = Who can create deals
-- - stateModificationMode + stateModificationUsers[] = Who can modify states
-- - dealDeletionMode + dealDeletionUsers[] = Who can delete deals
