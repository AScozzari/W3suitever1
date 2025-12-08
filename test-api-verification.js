#!/usr/bin/env node

/**
 * API Verification Test Script
 * Tests all W3 Suite APIs to ensure URL normalization is working correctly
 */

const REPLIT_URL = 'https://990d2e08-e877-47ab-86e4-4ab1ec4a5b18-00-a7zlal1jz3uk.worf.replit.dev';

// List of APIs to test
const APIs = {
  // Reference APIs
  'Reference - Legal Forms': '/api/reference/legal-forms',
  'Reference - Countries': '/api/reference/countries', 
  'Reference - Italian Cities': '/api/reference/italian-cities',
  'Reference - Commercial Areas': '/api/commercial-areas',
  
  // Entity APIs
  'Legal Entities': '/api/legal-entities',
  'Users': '/api/users',
  'Stores': '/api/stores',
  'Roles': '/api/roles',
  
  // Health Check
  'Tenants': '/api/tenants',
  'OAuth2 Discovery': '/.well-known/oauth-authorization-server'
};

// Development headers to simulate authenticated request
const headers = {
  'X-Tenant-ID': '00000000-0000-0000-0000-000000000001',
  'X-Auth-Session': 'authenticated',
  'X-Demo-User': 'admin@w3suite.com',
  'Accept': 'application/json'
};

async function testAPI(name, endpoint) {
  const url = `${REPLIT_URL}${endpoint}`;
  
  try {
    console.log(`\n📡 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
      
      if (Array.isArray(data)) {
        console.log(`   📊 Data: ${data.length} items`);
        if (data.length > 0) {
          console.log(`   📝 Sample: ${JSON.stringify(data[0]).substring(0, 100)}...`);
        }
      } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        console.log(`   📊 Data: Object with ${keys.length} keys`);
        console.log(`   🔑 Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
      
      return { name, endpoint, success: true, status: response.status };
    } else {
      console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
      
      let errorText = '';
      try {
        errorText = await response.text();
        console.log(`   ⚠️ Error: ${errorText.substring(0, 200)}`);
      } catch (e) {
        console.log(`   ⚠️ Could not read error response`);
      }
      
      return { name, endpoint, success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return { name, endpoint, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 W3 Suite API Verification Test');
  console.log('=' .repeat(50));
  console.log(`🔗 Testing against: ${REPLIT_URL}`);
  console.log(`🔑 Tenant ID: ${headers['X-Tenant-ID']}`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const [name, endpoint] of Object.entries(APIs)) {
    const result = await testAPI(name, endpoint);
    results.push(result);
    
    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n⚠️ Failed APIs:');
    failed.forEach(f => {
      console.log(`   - ${f.name} (${f.endpoint}): ${f.status || 'Network Error'}`);
    });
  }
  
  if (successful.length === results.length) {
    console.log('\n🎉 All APIs are working correctly!');
    console.log('✅ URL normalization is functioning properly');
    console.log('✅ Nginx routing is configured correctly');
  } else {
    console.log('\n⚠️ Some APIs are failing. Please check the logs above for details.');
  }
  
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});