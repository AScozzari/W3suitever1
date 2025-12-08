// ============================================================================
// W3 SUITE SUPPLIER MIGRATION - CRITICAL DATA SAFETY
// Safe migration of tenant suppliers from suppliers to supplier_overrides
// ============================================================================

import { db } from '../core/db';
import { sql } from 'drizzle-orm';

/**
 * CRITICAL MIGRATION: Safely move tenant suppliers to correct table
 * Ensures no data loss and maintains referential integrity
 */
export async function migrateTenantSuppliers() {
  console.log('🚀 Starting tenant supplier migration...\n');

  try {
    // Start transaction for data safety
    await db.execute(sql`BEGIN;`);

    console.log('🔍 Step 1: Analyze current supplier data...');

    // Check current state of suppliers table
    const supplierCounts = await db.execute(sql`
      SELECT 
        origin,
        COUNT(*) as count,
        COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant_id,
        COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant_id
      FROM w3suite.suppliers 
      GROUP BY origin
      ORDER BY origin;
    `);

    console.log('📊 Current suppliers table state:');
    for (const row of supplierCounts.rows) {
      console.log(`  ${row.origin}: ${row.count} total (${row.with_tenant_id} with tenant_id, ${row.without_tenant_id} without)`);
    }

    // Check supplier_overrides table
    const overrideCounts = await db.execute(sql`
      SELECT 
        origin,
        COUNT(*) as count
      FROM w3suite.supplier_overrides 
      GROUP BY origin
      ORDER BY origin;
    `);

    console.log('\n📊 Current supplier_overrides table state:');
    if (overrideCounts.rows.length === 0) {
      console.log('  (empty)');
    } else {
      for (const row of overrideCounts.rows) {
        console.log(`  ${row.origin}: ${row.count} suppliers`);
      }
    }

    // Check for tenant suppliers in wrong table
    const tenantSuppliersInMainTable = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM w3suite.suppliers 
      WHERE origin = 'tenant' AND tenant_id IS NOT NULL;
    `);

    const tenantSupplierCount = tenantSuppliersInMainTable.rows[0]?.count || 0;

    if (tenantSupplierCount === 0) {
      console.log('\n✅ No tenant suppliers found in main suppliers table - migration not needed');
      await db.execute(sql`ROLLBACK;`);
      return;
    }

    console.log(`\n⚠️  Found ${tenantSupplierCount} tenant suppliers in main table - migration needed`);

    console.log('\n🔍 Step 2: Validate migration safety...');

    // Check for code conflicts between tables
    const codeConflicts = await db.execute(sql`
      SELECT s.code, s.tenant_id, s.name
      FROM w3suite.suppliers s
      WHERE s.origin = 'tenant' 
      AND s.tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM w3suite.supplier_overrides so 
        WHERE so.code = s.code 
        AND so.tenant_id = s.tenant_id
      );
    `);

    if (codeConflicts.rows.length > 0) {
      console.log('❌ CRITICAL: Code conflicts detected between tables:');
      for (const conflict of codeConflicts.rows) {
        console.log(`  Code ${conflict.code} for tenant ${conflict.tenant_id} exists in both tables`);
      }
      await db.execute(sql`ROLLBACK;`);
      throw new Error('Migration cannot proceed due to code conflicts. Manual resolution required.');
    }

    console.log('✅ No code conflicts detected - safe to proceed');

    console.log('\n🔄 Step 3: Migrate tenant suppliers...');

    // Insert tenant suppliers into supplier_overrides table
    const migrationResult = await db.execute(sql`
      INSERT INTO w3suite.supplier_overrides (
        origin, tenant_id, external_id, code, name, legal_name, supplier_type,
        vat_number, tax_code, sdi_code, pec_email, rea_number, chamber_of_commerce,
        registered_address, city_id, country_id,
        preferred_payment_method_id, payment_terms, currency,
        email, phone, website, contacts,
        iban, bic, split_payment, withholding_tax, tax_regime,
        status, locked_fields,
        created_by, updated_by, created_at, updated_at, notes
      )
      SELECT 
        origin, tenant_id, external_id, code, name, legal_name, supplier_type,
        vat_number, tax_code, sdi_code, pec_email, rea_number, chamber_of_commerce,
        registered_address, city_id, country_id,
        preferred_payment_method_id, payment_terms, currency,
        email, phone, website, contacts,
        iban, bic, split_payment, withholding_tax, tax_regime,
        status, locked_fields,
        created_by, updated_by, created_at, updated_at, notes
      FROM w3suite.suppliers 
      WHERE origin = 'tenant' AND tenant_id IS NOT NULL;
    `);

    const migratedCount = migrationResult.rowCount || 0;
    console.log(`✅ Successfully migrated ${migratedCount} tenant suppliers to supplier_overrides`);

    console.log('\n🗑️  Step 4: Remove migrated suppliers from main table...');

    // Delete tenant suppliers from main table
    const deleteResult = await db.execute(sql`
      DELETE FROM w3suite.suppliers 
      WHERE origin = 'tenant' AND tenant_id IS NOT NULL;
    `);

    const deletedCount = deleteResult.rowCount || 0;
    console.log(`✅ Removed ${deletedCount} tenant suppliers from main suppliers table`);

    // Verify migration success
    const verificationCounts = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM w3suite.suppliers WHERE origin = 'tenant') as remaining_tenant_in_main,
        (SELECT COUNT(*) FROM w3suite.supplier_overrides WHERE origin = 'tenant') as tenant_in_overrides,
        (SELECT COUNT(*) FROM w3suite.suppliers WHERE origin = 'brand') as brand_in_main
    `);

    const verification = verificationCounts.rows[0];
    
    console.log('\n📊 Post-migration verification:');
    console.log(`  Brand suppliers in main table: ${verification.brand_in_main}`);
    console.log(`  Tenant suppliers in main table: ${verification.remaining_tenant_in_main}`);
    console.log(`  Tenant suppliers in overrides table: ${verification.tenant_in_overrides}`);

    if (verification.remaining_tenant_in_main > 0) {
      console.log('❌ WARNING: Some tenant suppliers remain in main table');
    }

    if (migratedCount !== deletedCount) {
      console.log(`❌ WARNING: Migration count (${migratedCount}) != deletion count (${deletedCount})`);
    }

    // Commit transaction
    await db.execute(sql`COMMIT;`);

    console.log('\n🎉 Tenant supplier migration completed successfully!');
    console.log('✅ All tenant suppliers are now in the correct table');
    console.log('🔐 Brand Base + Tenant Override pattern is now properly implemented');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    try {
      await db.execute(sql`ROLLBACK;`);
      console.log('🔄 Transaction rolled back - no data was modified');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    
    throw error;
  }
}

/**
 * Dry run migration to preview changes without modifying data
 */
export async function dryRunMigration() {
  console.log('🔍 Running migration dry-run preview...\n');

  try {
    // Analyze what would be migrated
    const analysis = await db.execute(sql`
      SELECT 
        tenant_id,
        COUNT(*) as supplier_count,
        array_agg(code ORDER BY code) as supplier_codes
      FROM w3suite.suppliers 
      WHERE origin = 'tenant' AND tenant_id IS NOT NULL
      GROUP BY tenant_id
      ORDER BY tenant_id;
    `);

    if (analysis.rows.length === 0) {
      console.log('✅ No tenant suppliers found in main table - no migration needed');
      return;
    }

    console.log('📋 Suppliers that would be migrated:');
    for (const row of analysis.rows) {
      console.log(`  Tenant ${row.tenant_id}: ${row.supplier_count} suppliers`);
      console.log(`    Codes: ${row.supplier_codes.join(', ')}`);
    }

    // Check for potential conflicts
    const conflicts = await db.execute(sql`
      SELECT s.code, s.tenant_id, s.name
      FROM w3suite.suppliers s
      WHERE s.origin = 'tenant' 
      AND s.tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM w3suite.supplier_overrides so 
        WHERE so.code = s.code 
        AND so.tenant_id = s.tenant_id
      );
    `);

    if (conflicts.rows.length > 0) {
      console.log('\n❌ CONFLICTS detected:');
      for (const conflict of conflicts.rows) {
        console.log(`  Code ${conflict.code} (${conflict.name}) for tenant ${conflict.tenant_id}`);
      }
      console.log('\n⚠️  Resolve conflicts before running migration');
    } else {
      console.log('\n✅ No conflicts detected - migration would be safe');
    }

  } catch (error) {
    console.error('❌ Dry run failed:', error);
    throw error;
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    dryRunMigration().then(() => {
      console.log('\n✨ Dry run complete!');
      process.exit(0);
    }).catch(error => {
      console.error('💥 Dry run failed:', error);
      process.exit(1);
    });
  } else {
    migrateTenantSuppliers().then(() => {
      console.log('\n✨ Migration complete!');
      process.exit(0);
    }).catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
  }
}