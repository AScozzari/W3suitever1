-- Migration: Change secondary_supervisor_users (array) to secondary_supervisor_user (single varchar)
-- Date: 2025-10-01
-- Reason: Simplify secondary supervisor to single optional user instead of array

-- Add new column first for safe data migration
ALTER TABLE w3suite.teams ADD COLUMN IF NOT EXISTS secondary_supervisor_user varchar;

-- Migrate first value from old array if present (extract first element)
UPDATE w3suite.teams
SET secondary_supervisor_user = NULLIF((secondary_supervisor_users)[1], '')
WHERE secondary_supervisor_user IS NULL AND secondary_supervisor_users IS NOT NULL;

-- Add foreign key constraint AFTER data migration (with ON DELETE SET NULL for data integrity)
ALTER TABLE w3suite.teams
  ADD CONSTRAINT teams_secondary_supervisor_user_fkey
  FOREIGN KEY (secondary_supervisor_user) REFERENCES w3suite.users(id)
  ON DELETE SET NULL;

-- Drop old column (if it existed)
ALTER TABLE w3suite.teams DROP COLUMN IF EXISTS secondary_supervisor_users;
