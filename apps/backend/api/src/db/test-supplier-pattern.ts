// ============================================================================
// W3 SUITE SUPPLIER PATTERN - END-TO-END TESTING
// Comprehensive test suite for Brand Base + Tenant Override Pattern
// ============================================================================

import { db, setTenantContext } from '../core/db';
import { sql } from 'drizzle-orm';
import { storage } from '../core/storage';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

class SupplierPatternTester {
  private results: TestResult[] = [];
  private testTenant1 = '00000000-0000-0000-0000-000000000001';
  private testTenant2 = '00000000-0000-0000-0000-000000000002';
  private testUserId = 'test-user-id';

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting comprehensive supplier pattern testing...\n');

    try {
      await this.setupTestData();
      await this.testTenantIsolation();
      await this.testPrecedenceRules();
      await this.testSecurityConstraints();
      await this.testUnionLogic();
      await this.cleanupTestData();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  private async setupTestData(): Promise<void> {
    console.log('🏗️  Setting up test data...');

    try {
      // Create test brand suppliers (in main suppliers table)
      await db.execute(sql`
        INSERT INTO w3suite.suppliers (
          origin, tenant_id, code, name, supplier_type, 
          country_id, created_by, status
        ) VALUES 
        ('brand', NULL, 'BRAND001', 'Brand Supplier 1', 'distributore', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'),
        ('brand', NULL, 'BRAND002', 'Brand Supplier 2', 'produttore', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'),
        ('brand', NULL, 'SHARED001', 'Shared Code Supplier', 'servizi', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active')
        ON CONFLICT (code) DO NOTHING;
      `);

      // Create test tenant suppliers (in supplier_overrides table)
      await db.execute(sql`
        INSERT INTO w3suite.supplier_overrides (
          origin, tenant_id, code, name, supplier_type, 
          country_id, created_by, status
        ) VALUES 
        ('tenant', ${this.testTenant1}, 'TENANT1_001', 'Tenant 1 Supplier 1', 'distributore', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'),
        ('tenant', ${this.testTenant1}, 'SHARED001', 'Tenant 1 Override Shared', 'logistica', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'),
        ('tenant', ${this.testTenant2}, 'TENANT2_001', 'Tenant 2 Supplier 1', 'produttore', 
         (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active')
        ON CONFLICT (tenant_id, code) DO NOTHING;
      `);

      console.log('✅ Test data created successfully');
      
    } catch (error) {
      console.error('❌ Failed to setup test data:', error);
      throw error;
    }
  }

  private async testTenantIsolation(): Promise<void> {
    console.log('\n🔒 Testing tenant isolation...');

    try {
      // Test tenant 1 can only see their suppliers + brand suppliers
      const tenant1Suppliers = await storage.getSuppliersByTenant(this.testTenant1);
      const tenant1Codes = tenant1Suppliers.map(s => s.code);
      
      const hasTenant1Code = tenant1Codes.includes('TENANT1_001');
      const hasNoBadTenant2Code = !tenant1Codes.includes('TENANT2_001');
      const hasBrandCode = tenant1Codes.includes('BRAND001');
      
      this.results.push({
        passed: hasTenant1Code && hasNoBadTenant2Code && hasBrandCode,
        message: 'Tenant 1 isolation test',
        details: {
          tenant1Codes,
          hasTenant1Code,
          hasNoBadTenant2Code,
          hasBrandCode
        }
      });

      // Test tenant 2 can only see their suppliers + brand suppliers
      const tenant2Suppliers = await storage.getSuppliersByTenant(this.testTenant2);
      const tenant2Codes = tenant2Suppliers.map(s => s.code);
      
      const hasTenant2Code = tenant2Codes.includes('TENANT2_001');
      const hasNoBadTenant1Code = !tenant2Codes.includes('TENANT1_001');
      const hasBrandCode2 = tenant2Codes.includes('BRAND002');
      
      this.results.push({
        passed: hasTenant2Code && hasNoBadTenant1Code && hasBrandCode2,
        message: 'Tenant 2 isolation test',
        details: {
          tenant2Codes,
          hasTenant2Code,
          hasNoBadTenant1Code,
          hasBrandCode2
        }
      });

      console.log(`✅ Tenant isolation tests completed`);
      
    } catch (error) {
      this.results.push({
        passed: false,
        message: 'Tenant isolation test failed',
        details: error
      });
    }
  }

  private async testPrecedenceRules(): Promise<void> {
    console.log('\n⚡ Testing precedence rules...');

    try {
      // Test that tenant supplier overrides brand supplier with same code
      const tenant1Suppliers = await storage.getSuppliersByTenant(this.testTenant1);
      const sharedCodeSupplier = tenant1Suppliers.find(s => s.code === 'SHARED001');
      
      const isFromTenantOverride = sharedCodeSupplier?.origin === 'tenant';
      const hasCorrectName = sharedCodeSupplier?.name === 'Tenant 1 Override Shared';
      
      this.results.push({
        passed: isFromTenantOverride && hasCorrectName,
        message: 'Precedence rule test - tenant overrides brand',
        details: {
          sharedCodeSupplier,
          isFromTenantOverride,
          hasCorrectName
        }
      });

      // Test that tenant 2 sees the brand version (no override)
      const tenant2Suppliers = await storage.getSuppliersByTenant(this.testTenant2);
      const sharedCodeForTenant2 = tenant2Suppliers.find(s => s.code === 'SHARED001');
      
      const isFromBrand = sharedCodeForTenant2?.origin === 'brand';
      const hasBrandName = sharedCodeForTenant2?.name === 'Shared Code Supplier';
      
      this.results.push({
        passed: isFromBrand && hasBrandName,
        message: 'Precedence rule test - brand visible when no tenant override',
        details: {
          sharedCodeForTenant2,
          isFromBrand,
          hasBrandName
        }
      });

      console.log(`✅ Precedence rule tests completed`);
      
    } catch (error) {
      this.results.push({
        passed: false,
        message: 'Precedence rule test failed',
        details: error
      });
    }
  }

  private async testSecurityConstraints(): Promise<void> {
    console.log('\n🛡️  Testing security constraints...');

    try {
      // Test that we cannot create tenant supplier in main suppliers table
      let securityViolationBlocked = false;
      
      try {
        await db.execute(sql`
          INSERT INTO w3suite.suppliers (
            origin, tenant_id, code, name, supplier_type, 
            country_id, created_by, status
          ) VALUES (
            'tenant', ${this.testTenant1}, 'SECURITY_TEST', 'Should Not Work', 'distributore',
            (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'
          );
        `);
      } catch (error) {
        securityViolationBlocked = true;
      }

      this.results.push({
        passed: securityViolationBlocked,
        message: 'Security constraint test - tenant suppliers blocked in main table',
        details: { securityViolationBlocked }
      });

      // Test that we cannot create brand supplier in overrides table
      let brandInOverrideBlocked = false;
      
      try {
        await db.execute(sql`
          INSERT INTO w3suite.supplier_overrides (
            origin, tenant_id, code, name, supplier_type, 
            country_id, created_by, status
          ) VALUES (
            'brand', ${this.testTenant1}, 'BRAND_SECURITY_TEST', 'Should Not Work', 'distributore',
            (SELECT id FROM public.countries WHERE code = 'IT' LIMIT 1), ${this.testUserId}, 'active'
          );
        `);
      } catch (error) {
        brandInOverrideBlocked = true;
      }

      this.results.push({
        passed: brandInOverrideBlocked,
        message: 'Security constraint test - brand suppliers blocked in overrides table',
        details: { brandInOverrideBlocked }
      });

      console.log(`✅ Security constraint tests completed`);
      
    } catch (error) {
      this.results.push({
        passed: false,
        message: 'Security constraint test failed',
        details: error
      });
    }
  }

  private async testUnionLogic(): Promise<void> {
    console.log('\n🔗 Testing union logic...');

    try {
      // Test that getSuppliersByTenant returns correct combination
      const tenant1Suppliers = await storage.getSuppliersByTenant(this.testTenant1);
      
      // Should have: TENANT1_001, SHARED001 (tenant override), BRAND001, BRAND002
      // Should NOT have: TENANT2_001
      const expectedCodes = ['TENANT1_001', 'SHARED001', 'BRAND001', 'BRAND002'];
      const actualCodes = tenant1Suppliers.map(s => s.code).sort();
      const expectedCodesSet = new Set(expectedCodes);
      
      const hasAllExpected = expectedCodes.every(code => actualCodes.includes(code));
      const hasNoTenant2Code = !actualCodes.includes('TENANT2_001');
      const correctCount = tenant1Suppliers.length >= expectedCodes.length;
      
      this.results.push({
        passed: hasAllExpected && hasNoTenant2Code && correctCount,
        message: 'Union logic test - correct supplier combination',
        details: {
          actualCodes,
          expectedCodes,
          hasAllExpected,
          hasNoTenant2Code,
          correctCount,
          actualCount: tenant1Suppliers.length
        }
      });

      // Test sorting (tenant suppliers should come first)
      const firstSupplier = tenant1Suppliers[0];
      const tenantSuppliersFirst = tenant1Suppliers.filter(s => s.origin === 'tenant').length > 0 &&
                                   tenant1Suppliers.findIndex(s => s.origin === 'tenant') < 
                                   tenant1Suppliers.findIndex(s => s.origin === 'brand');
      
      this.results.push({
        passed: tenantSuppliersFirst,
        message: 'Union logic test - tenant suppliers sorted first',
        details: {
          firstSupplier,
          tenantSuppliersFirst,
          supplierOrigins: tenant1Suppliers.map(s => ({ code: s.code, origin: s.origin }))
        }
      });

      console.log(`✅ Union logic tests completed`);
      
    } catch (error) {
      this.results.push({
        passed: false,
        message: 'Union logic test failed',
        details: error
      });
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');

    try {
      // Clean up test suppliers
      await db.execute(sql`
        DELETE FROM w3suite.suppliers 
        WHERE code IN ('BRAND001', 'BRAND002', 'SHARED001', 'SECURITY_TEST')
        AND created_by = ${this.testUserId};
      `);

      await db.execute(sql`
        DELETE FROM w3suite.supplier_overrides 
        WHERE code IN ('TENANT1_001', 'TENANT2_001', 'SHARED001', 'BRAND_SECURITY_TEST')
        AND created_by = ${this.testUserId};
      `);

      console.log('✅ Test data cleaned up successfully');
      
    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error);
    }
  }

  private printResults(): void {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} Test ${index + 1}: ${result.message}`);
      
      if (!result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Supplier pattern is working correctly.');
      console.log('🔐 Tenant isolation and precedence rules are properly implemented.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Review and fix issues before deployment.`);
    }
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SupplierPatternTester();
  
  tester.runAllTests().then(() => {
    console.log('\n✨ Testing complete!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });
}

export { SupplierPatternTester };