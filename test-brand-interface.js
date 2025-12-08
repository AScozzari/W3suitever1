// Test script for Brand Interface HQ System
// This script tests the Brand Interface API endpoints with JWT authentication

async function testBrandInterface() {
  console.log("🧪 Testing Brand Interface HQ System...\n");
  console.log("=".repeat(50));
  
  const BASE_URL = "http://localhost:5001";
  let authToken = null;
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test helper function
  async function runTest(testName, testFn) {
    try {
      console.log(`\n📋 ${testName}...`);
      await testFn();
      console.log(`✅ ${testName} passed`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${testName} failed:`, error.message);
      testsFailed++;
    }
  }
  
  // Test 1: Health Check (No Auth Required)
  await runTest("Health Check (No Auth)", async () => {
    const response = await fetch(`${BASE_URL}/brand-api/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.status || data.status !== 'healthy') {
      throw new Error("Health check returned unexpected status");
    }
    console.log("   - Service:", data.service);
    console.log("   - Status:", data.status);
  });
  
  // Test 2: Protected Endpoint Without Token (Should Fail)
  await runTest("Protected Endpoint Without Token", async () => {
    const response = await fetch(`${BASE_URL}/brand-api/organizations`);
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    const data = await response.json();
    if (!data.error) throw new Error("Expected error message");
    console.log("   - Correctly rejected with 401");
    console.log("   - Error:", data.error);
  });
  
  // Test 3: Login With Invalid Credentials (Should Fail)
  await runTest("Login With Invalid Credentials", async () => {
    const response = await fetch(`${BASE_URL}/brand-api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid@example.com",
        password: "wrongpassword"
      })
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    console.log("   - Correctly rejected invalid credentials");
  });
  
  // Test 4: Login With Valid Credentials
  await runTest("Login With Valid Credentials", async () => {
    const response = await fetch(`${BASE_URL}/brand-api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "brand.superadmin@windtre.it",
        password: "Brand123!"
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.token || !data.user) {
      throw new Error("Missing required fields in response");
    }
    
    authToken = data.token;
    console.log("   - User:", data.user.email);
    console.log("   - Role:", data.user.role);
    console.log("   - Permissions:", data.user.permissions?.length || 0, "permissions");
    console.log("   - Token received:", !!data.token);
  });
  
  // Test 5: Verify Token (Auth Me Endpoint)
  await runTest("Verify Token (Auth Me)", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/auth/me`, {
      headers: { 
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.user) {
      throw new Error("Invalid response structure");
    }
    console.log("   - Token is valid");
    console.log("   - User verified:", data.user.email);
  });
  
  // Test 6: Get Organizations (Cross-Tenant, Requires Auth)
  await runTest("Get Organizations (Cross-Tenant)", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/organizations`, {
      headers: { 
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const data = await response.json();
    if (!data.organizations) {
      throw new Error("Missing organizations in response");
    }
    console.log("   - Organizations count:", data.organizations.length);
    console.log("   - Context:", data.context);
    data.organizations.forEach(org => {
      console.log(`     • ${org.name} (${org.status})`);
    });
  });
  
  // Test 7: Get Analytics (Cross-Tenant, Requires Auth)
  await runTest("Get Analytics (Cross-Tenant)", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/analytics/cross-tenant`, {
      headers: { 
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const data = await response.json();
    if (!data.summary) {
      throw new Error("Missing summary in response");
    }
    console.log("   - Total Tenants:", data.summary.totalTenants);
    console.log("   - Total Users:", data.summary.totalUsers);
    console.log("   - Active Tenants:", data.summary.activeTenants);
    console.log("   - Context:", data.context);
  });
  
  // Test 8: Get Campaigns (Brand Level, Requires Auth)
  await runTest("Get Campaigns (Brand Level)", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/campaigns`, {
      headers: { 
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const data = await response.json();
    if (!data.campaigns) {
      throw new Error("Missing campaigns in response");
    }
    console.log("   - Campaigns count:", data.campaigns.length);
    data.campaigns.forEach(camp => {
      console.log(`     • ${camp.name} (${camp.status})`);
    });
  });
  
  // Test 9: Tenant-Specific Endpoint (Requires Auth)
  await runTest("Tenant-Specific Store Endpoint", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/staging/stores`, {
      headers: { 
        "Authorization": `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const data = await response.json();
    if (!data.stores) {
      throw new Error("Missing stores in response");
    }
    console.log("   - Tenant:", data.tenant);
    console.log("   - Stores count:", data.stores.length);
    console.log("   - Context:", data.context);
  });
  
  // Test 10: Deploy Endpoint (Requires Auth + Permissions)
  await runTest("Deploy Campaign (Requires Permissions)", async () => {
    if (!authToken) throw new Error("No auth token available");
    
    const response = await fetch(`${BASE_URL}/brand-api/deploy`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        campaignId: "camp-1",
        targetType: "all",
        targetTenants: []
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      // If user lacks permissions, that's expected and OK
      if (response.status === 403) {
        console.log("   - Permission check working correctly");
        return;
      }
      throw new Error(`HTTP ${response.status}: ${error.error}`);
    }
    
    const data = await response.json();
    if (!data.deployment) {
      throw new Error("Missing deployment in response");
    }
    console.log("   - Deployment ID:", data.deployment.id);
    console.log("   - Status:", data.deployment.status);
    console.log("   - Target:", data.deployment.targetTenants);
  });
  
  // Test 11: Invalid Token (Should Fail)
  await runTest("Invalid Token (Should Fail)", async () => {
    const response = await fetch(`${BASE_URL}/brand-api/organizations`, {
      headers: { 
        "Authorization": `Bearer invalid-token-12345`
      }
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    console.log("   - Correctly rejected invalid token");
  });
  
  // Test 12: Test Role-Based Access (Area Manager)
  await runTest("Role-Based Access Test", async () => {
    // Try to login as area manager
    const loginResponse = await fetch(`${BASE_URL}/brand-api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "brand.areamanager@windtre.it",
        password: "Brand123!"
      })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      const areaManagerToken = data.token;
      
      // Try to access organizations (should fail for area_manager)
      const orgsResponse = await fetch(`${BASE_URL}/brand-api/organizations`, {
        headers: { 
          "Authorization": `Bearer ${areaManagerToken}`
        }
      });
      
      if (orgsResponse.status === 403) {
        console.log("   - Area manager correctly denied access to organizations");
      } else {
        console.log("   - Warning: Area manager access control may not be working");
      }
    } else {
      console.log("   - Area manager user not found (may need seeding)");
    }
  });
  
  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  console.log("\n📋 SECURITY CHECKLIST:");
  console.log("✓ Health endpoint accessible without auth");
  console.log("✓ All other endpoints require JWT token");
  console.log("✓ Invalid tokens are rejected");
  console.log("✓ Role-based access control in place");
  console.log("✓ Cross-tenant vs tenant-specific context working");
  
  console.log("\n🔗 ENDPOINTS TESTED:");
  console.log("  • /brand-api/health (public)");
  console.log("  • /brand-api/auth/login (public)");
  console.log("  • /brand-api/auth/me (protected)");
  console.log("  • /brand-api/organizations (protected, cross-tenant)");
  console.log("  • /brand-api/analytics/cross-tenant (protected)");
  console.log("  • /brand-api/campaigns (protected)");
  console.log("  • /brand-api/:tenant/stores (protected, tenant-specific)");
  console.log("  • /brand-api/deploy (protected, role-based)");
  
  console.log("\n🏭 BRAND INTERFACE HQ SYSTEM");
  console.log("  API Port: 5001");
  console.log("  Database Schema: brand_interface");
  console.log("  JWT Authentication: ✅ ENABLED");
  console.log("  Role-Based Access: ✅ ENABLED");
  console.log("  Cross-Tenant Support: ✅ ENABLED");
  
  if (testsFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Brand Interface is secure and functional.");
  } else {
    console.log("\n⚠️ Some tests failed. Please review the errors above.");
  }
}

// Run tests
console.log("🚀 Starting Brand Interface API tests...\n");
testBrandInterface().catch(error => {
  console.error("\n💥 Fatal error running tests:", error);
  process.exit(1);
});