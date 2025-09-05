-- ============================================================================
-- W3 SUITE - ROW LEVEL SECURITY SETUP
-- Implementazione sicurezza enterprise per isolamento multitenant
-- ============================================================================

-- Funzione per abilitare RLS su tutte le tabelle con tenant_id
CREATE OR REPLACE FUNCTION enable_rls_for_table(table_name text) 
RETURNS void AS $$
BEGIN
  -- Abilita Row Level Security
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Crea policy per isolamento tenant
  EXECUTE format('CREATE POLICY IF NOT EXISTS tenant_isolation ON %I 
    USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
  
  -- Policy per inserimenti (stesso tenant)
  EXECUTE format('CREATE POLICY IF NOT EXISTS tenant_isolation_insert ON %I 
    FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
  
  -- Policy per aggiornamenti (stesso tenant)
  EXECUTE format('CREATE POLICY IF NOT EXISTS tenant_isolation_update ON %I 
    FOR UPDATE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
  
  -- Policy per cancellazioni (stesso tenant)
  EXECUTE format('CREATE POLICY IF NOT EXISTS tenant_isolation_delete ON %I 
    FOR DELETE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
    
  RAISE NOTICE 'RLS abilitato per tabella: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- APPLICAZIONE RLS A TUTTE LE TABELLE MULTITENANT
-- ============================================================================

-- Trova e applica RLS a tutte le tabelle con tenant_id
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'tenant_id'
        AND table_name NOT LIKE '%pg_%'
    LOOP
        PERFORM enable_rls_for_table(table_record.table_name);
    END LOOP;
END $$;

-- ============================================================================
-- FUNZIONI HELPER PER GESTIONE TENANT CONTEXT
-- ============================================================================

-- Funzione per settare il tenant corrente nella sessione
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere il tenant corrente
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICA STATO RLS
-- ============================================================================

-- Vista per monitorare stato RLS
CREATE OR REPLACE VIEW rls_status AS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = pg_policies.schemaname AND tablename = pg_policies.tablename) as policies_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Query di verifica
SELECT 'RLS Setup completato. Tabelle protette:' as status;
SELECT * FROM rls_status WHERE rls_enabled = true;