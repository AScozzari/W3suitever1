// ============================================================================
// W3 SUITE - RLS SETUP SCRIPT
// Script per configurare Row Level Security su tutte le tabelle multitenant
// ============================================================================

import { db } from '../core/db';
import { sql } from 'drizzle-orm';

/**
 * Configura Row Level Security per tutte le tabelle multitenant
 */
export async function setupRLS() {
  console.log('🔒 Setting up Row Level Security (RLS)...\n');

  try {
    // Esegue lo script SQL completo per RLS
    await db.execute(sql`
      -- ============================================================================
      -- FUNZIONE PER ABILITARE RLS SU TABELLE MULTITENANT
      -- ============================================================================

      CREATE OR REPLACE FUNCTION enable_rls_for_table(table_name text) 
      RETURNS void AS $$
      BEGIN
        -- Abilita Row Level Security
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        
        -- Drop policy esistenti se presenti
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON %I', table_name);
        
        -- Crea policy per isolamento tenant (SELECT)
        EXECUTE format('CREATE POLICY tenant_isolation ON %I 
          USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
        
        -- Policy per inserimenti (INSERT)
        EXECUTE format('CREATE POLICY tenant_isolation_insert ON %I 
          FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
        
        -- Policy per aggiornamenti (UPDATE)
        EXECUTE format('CREATE POLICY tenant_isolation_update ON %I 
          FOR UPDATE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
        
        -- Policy per cancellazioni (DELETE)
        EXECUTE format('CREATE POLICY tenant_isolation_delete ON %I 
          FOR DELETE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)', table_name);
          
        RAISE NOTICE 'RLS abilitato per tabella: %', table_name;
      END;
      $$ LANGUAGE plpgsql;

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
    `);

    console.log('✅ RLS functions created');

    // Trova tutte le tabelle con tenant_id e applica RLS
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND column_name = 'tenant_id'
      AND table_name NOT LIKE '%pg_%'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables with tenant_id column found');
      return;
    }

    console.log(`🔍 Found ${tablesResult.rows.length} tables with tenant_id column`);

    // Applica RLS a ogni tabella
    for (const row of tablesResult.rows) {
      const tableName = row.table_name as string;
      await db.execute(sql.raw(`SELECT enable_rls_for_table('${tableName}');`));
      console.log(`  ✅ RLS enabled for: ${tableName}`);
    }

    // Crea vista per monitoraggio stato RLS
    await db.execute(sql`
      CREATE OR REPLACE VIEW rls_status AS
      SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled,
          (SELECT COUNT(*) FROM pg_policies 
           WHERE schemaname = pg_policies.schemaname 
           AND tablename = pg_policies.tablename) as policies_count
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('✅ RLS monitoring view created');

    // Verifica finale
    const rlsStatus = await db.execute(sql`
      SELECT tablename, rls_enabled, policies_count 
      FROM rls_status 
      WHERE rls_enabled = true 
      ORDER BY tablename;
    `);

    console.log('\n📊 RLS Status Summary:');
    console.log('=======================');
    
    if (rlsStatus.rows.length === 0) {
      console.log('⚠️  No tables with RLS enabled found');
    } else {
      for (const row of rlsStatus.rows) {
        console.log(`  🔒 ${row.tablename}: RLS enabled, ${row.policies_count} policies`);
      }
    }

    console.log('\n🎉 Row Level Security setup completed successfully!');
    console.log('🔐 All multitenant tables are now secured with RLS policies');

  } catch (error) {
    console.error('❌ RLS setup failed:', error);
    throw error;
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  setupRLS().then(() => {
    console.log('✨ RLS setup complete!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}