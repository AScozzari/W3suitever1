// ============================================================================
// W3 SUITE SUPPLIER TABLES - CRITICAL SECURITY RLS SETUP
// TypeScript script to apply Row Level Security for Brand Base + Tenant Override Pattern
// ============================================================================

import { db } from '../core/db';
import { sql } from 'drizzle-orm';

/**
 * CRITICAL SECURITY: Setup RLS for W3 Suite supplier tables
 * Ensures proper tenant isolation and prevents unauthorized access
 */
export async function setupW3SuiteSupplierRLS() {
  console.log('🔒 Setting up W3 Suite Supplier RLS Security...\n');

  try {
    // Apply critical RLS policies for supplier tables
    await db.execute(sql`
      -- ==================== SUPPLIERS TABLE (Brand-Managed) ====================

      -- Enable RLS on suppliers table
      ALTER TABLE w3suite.suppliers ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS suppliers_brand_read_all ON w3suite.suppliers;
      DROP POLICY IF EXISTS suppliers_tenant_isolation ON w3suite.suppliers;
      DROP POLICY IF EXISTS suppliers_brand_no_modify ON w3suite.suppliers;

      -- Policy for brand suppliers (origin='brand', tenantId=NULL)
      -- These are visible to all tenants but READ-ONLY
      CREATE POLICY suppliers_brand_read_all ON w3suite.suppliers
        FOR SELECT
        USING (origin = 'brand' AND tenant_id IS NULL);

      -- Policy for tenant suppliers in main suppliers table (if any exist)  
      -- These should be migrated to supplier_overrides
      CREATE POLICY suppliers_tenant_isolation ON w3suite.suppliers
        FOR ALL
        USING (
          origin = 'tenant' AND 
          tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
        WITH CHECK (
          origin = 'tenant' AND 
          tenant_id = current_setting('app.current_tenant_id', true)::uuid
        );

      -- CRITICAL: Prevent tenants from modifying brand suppliers
      CREATE POLICY suppliers_brand_no_modify ON w3suite.suppliers
        FOR INSERT, UPDATE, DELETE
        USING (false)  -- No tenant can modify brand suppliers
        WITH CHECK (false);

      -- ==================== SUPPLIER_OVERRIDES TABLE (Tenant-Specific) ====================

      -- Enable RLS on supplier_overrides table
      ALTER TABLE w3suite.supplier_overrides ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS supplier_overrides_tenant_isolation ON w3suite.supplier_overrides;
      DROP POLICY IF EXISTS supplier_overrides_origin_check ON w3suite.supplier_overrides;

      -- Policy for strict tenant isolation
      -- Only allow access to suppliers owned by current tenant
      CREATE POLICY supplier_overrides_tenant_isolation ON w3suite.supplier_overrides
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      -- Additional security: ensure origin is always 'tenant' for this table
      CREATE POLICY supplier_overrides_origin_check ON w3suite.supplier_overrides
        FOR INSERT, UPDATE
        WITH CHECK (origin = 'tenant');
    `);

    console.log('✅ RLS policies created for supplier tables');

    // Create validation function and triggers
    await db.execute(sql`
      -- ==================== ADDITIONAL SECURITY CONSTRAINTS ====================

      -- Function to validate supplier operations
      CREATE OR REPLACE FUNCTION w3suite.validate_supplier_operation()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Ensure brand suppliers cannot be modified through supplier_overrides
        IF TG_TABLE_NAME = 'supplier_overrides' AND NEW.origin != 'tenant' THEN
          RAISE EXCEPTION 'Only tenant suppliers allowed in supplier_overrides table';
        END IF;
        
        -- Ensure tenant suppliers have valid tenant_id
        IF NEW.origin = 'tenant' AND NEW.tenant_id IS NULL THEN
          RAISE EXCEPTION 'Tenant suppliers must have valid tenant_id';
        END IF;
        
        -- Ensure brand suppliers have NULL tenant_id
        IF NEW.origin = 'brand' AND NEW.tenant_id IS NOT NULL THEN
          RAISE EXCEPTION 'Brand suppliers cannot have tenant_id';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop existing triggers if they exist
      DROP TRIGGER IF EXISTS validate_suppliers_operation ON w3suite.suppliers;
      DROP TRIGGER IF EXISTS validate_supplier_overrides_operation ON w3suite.supplier_overrides;

      -- Apply validation trigger to both tables
      CREATE TRIGGER validate_suppliers_operation
        BEFORE INSERT OR UPDATE ON w3suite.suppliers
        FOR EACH ROW EXECUTE FUNCTION w3suite.validate_supplier_operation();

      CREATE TRIGGER validate_supplier_overrides_operation
        BEFORE INSERT OR UPDATE ON w3suite.supplier_overrides
        FOR EACH ROW EXECUTE FUNCTION w3suite.validate_supplier_operation();
    `);

    console.log('✅ Validation triggers created');

    // Verify RLS setup
    const rlsStatus = await db.execute(sql`
      SELECT 
          schemaname, 
          tablename, 
          rowsecurity as rls_enabled,
          (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'w3suite' AND tablename = pg_policies.tablename) as policy_count
      FROM pg_tables 
      WHERE schemaname = 'w3suite' 
      AND tablename IN ('suppliers', 'supplier_overrides')
      ORDER BY tablename;
    `);

    console.log('\n📊 W3 Suite Supplier RLS Status:');
    console.log('=================================');
    
    for (const row of rlsStatus.rows) {
      console.log(`  🔒 ${row.schemaname}.${row.tablename}: RLS ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}, ${row.policy_count} policies`);
    }

    // Show detailed policy information
    const policies = await db.execute(sql`
      SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          cmd,
          qual,
          with_check
      FROM pg_policies 
      WHERE schemaname = 'w3suite' 
      AND tablename IN ('suppliers', 'supplier_overrides')
      ORDER BY tablename, policyname;
    `);

    console.log('\n📋 Detailed Policy Information:');
    console.log('================================');
    
    for (const policy of policies.rows) {
      console.log(`  📝 ${policy.tablename}.${policy.policyname}:`);
      console.log(`     Command: ${policy.cmd}`);
      console.log(`     Qualifier: ${policy.qual || 'N/A'}`);
      console.log(`     With Check: ${policy.with_check || 'N/A'}\n`);
    }

    console.log('🎉 W3 Suite Supplier RLS setup completed successfully!');
    console.log('🔐 Supplier tables are now secured with proper RLS policies');

  } catch (error) {
    console.error('❌ W3 Suite Supplier RLS setup failed:', error);
    throw error;
  }
}

/**
 * CRITICAL SECURITY: Setup RLS for WMS (Warehouse Management System) tables
 * Ensures proper tenant isolation for all product-related tables
 */
export async function setupW3SuiteWMSRLS() {
  console.log('🔒 Setting up W3 Suite WMS RLS Security...\n');

  try {
    await db.execute(sql`
      -- ==================== WMS TABLES RLS SETUP ====================

      -- 1) products table
      ALTER TABLE w3suite.products ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS products_tenant_isolation ON w3suite.products;
      CREATE POLICY products_tenant_isolation ON w3suite.products
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      -- 2) product_items table
      ALTER TABLE w3suite.product_items ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS product_items_tenant_isolation ON w3suite.product_items;
      CREATE POLICY product_items_tenant_isolation ON w3suite.product_items
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      -- 3) product_serials table
      ALTER TABLE w3suite.product_serials ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS product_serials_tenant_isolation ON w3suite.product_serials;
      CREATE POLICY product_serials_tenant_isolation ON w3suite.product_serials
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      -- 4) product_item_status_history table
      ALTER TABLE w3suite.product_item_status_history ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS product_item_status_history_tenant_isolation ON w3suite.product_item_status_history;
      CREATE POLICY product_item_status_history_tenant_isolation ON w3suite.product_item_status_history
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

      -- 5) product_batches table
      ALTER TABLE w3suite.product_batches ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS product_batches_tenant_isolation ON w3suite.product_batches;
      CREATE POLICY product_batches_tenant_isolation ON w3suite.product_batches
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    `);

    console.log('✅ RLS policies created for WMS tables');

    // Verify RLS setup
    const rlsStatus = await db.execute(sql`
      SELECT 
          schemaname, 
          tablename, 
          rowsecurity as rls_enabled,
          (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'w3suite' AND tablename = pg_policies.tablename) as policy_count
      FROM pg_tables 
      WHERE schemaname = 'w3suite' 
      AND tablename IN ('products', 'product_items', 'product_serials', 'product_item_status_history', 'product_batches')
      ORDER BY tablename;
    `);

    console.log('\n📊 W3 Suite WMS RLS Status:');
    console.log('=================================');
    
    for (const row of rlsStatus.rows) {
      console.log(`  🔒 ${row.schemaname}.${row.tablename}: RLS ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}, ${row.policy_count} policies`);
    }

    console.log('\n🎉 W3 Suite WMS RLS setup completed successfully!');
    console.log('🔐 WMS tables are now secured with proper RLS policies');

  } catch (error) {
    console.error('❌ W3 Suite WMS RLS setup failed:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.all([
    setupW3SuiteSupplierRLS(),
    setupW3SuiteWMSRLS()
  ]).then(() => {
    console.log('✨ W3 Suite RLS setup complete (Suppliers + WMS)!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}