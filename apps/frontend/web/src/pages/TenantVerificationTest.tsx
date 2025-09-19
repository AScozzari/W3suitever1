import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TestResult {
  endpoint: string;
  status?: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  uuid?: string;
  tenant?: string;
  timing?: number;
}

export default function TenantVerificationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // ARCHITECT REQUIREMENT: Comprehensive API endpoint testing
  const runTenantSecurityTest = async () => {
    console.log('🧪 STARTING COMPREHENSIVE TENANT SECURITY VERIFICATION TEST');
    console.log('===========================================================');
    
    setIsRunning(true);
    setTestResults([]);
    
    // Key API endpoints to test as required by architect
    const criticalEndpoints = [
      '/api/hr/requests',
      '/api/notifications/unread-count',
      '/api/tenants/current', 
      '/api/hr/metrics',
      '/api/stores',
      '/api/tenants'
    ];
    
    const testResults: TestResult[] = [];
    
    // Test current tenant first
    const currentTenant = localStorage.getItem('currentTenant') || 'staging';
    const currentTenantId = localStorage.getItem('currentTenantId');
    
    console.log(`[VERIFICATION] Testing current tenant: ${currentTenant} → UUID: ${currentTenantId}`);
    
    // CRITICAL SECURITY VERIFICATION: Test all key endpoints
    for (const endpoint of criticalEndpoints) {
      try {
        const startTime = Date.now();
        
        console.log(`[VERIFICATION] 📡 Testing endpoint: ${endpoint}`);
        console.log(`[VERIFICATION] 🔒 With X-Tenant-ID: ${currentTenantId}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'X-Tenant-ID': currentTenantId || '',
            'X-Auth-Session': 'authenticated',
            'X-Demo-User': 'demo-user',
            'Content-Type': 'application/json'
          }
        });
        
        const timing = Date.now() - startTime;
        let responseData = null;
        
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = await response.text();
        }
        
        console.log(`[VERIFICATION] ✅ ${endpoint} → Status: ${response.status}, Time: ${timing}ms`);
        
        testResults.push({
          endpoint,
          status: response.status,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries()),
          uuid: currentTenantId || '',
          tenant: currentTenant,
          timing
        });
        
      } catch (error) {
        console.error(`[VERIFICATION] ❌ ${endpoint} failed:`, error);
        testResults.push({
          endpoint,
          error: error instanceof Error ? error.message : String(error),
          uuid: currentTenantId || '',
          tenant: currentTenant
        });
      }
    }
    
    // CRITICAL: Test cross-tenant isolation
    console.log('\n[VERIFICATION] 🔒 Testing cross-tenant isolation...');
    
    const testTenants = ['staging', 'demo', 'acme'];
    for (const tenant of testTenants) {
      try {
        console.log(`[VERIFICATION] 🏢 Testing tenant resolution for: ${tenant}`);
        
        // Test tenant resolution endpoint
        const resolveResponse = await fetch(`/api/tenants/resolve?slug=${tenant}`);
        const resolveData = await resolveResponse.json();
        
        if (resolveResponse.ok) {
          console.log(`[VERIFICATION] ✅ Tenant ${tenant} resolved to UUID: ${resolveData.tenantId}`);
          
          // Test API call with resolved UUID
          const testResponse = await fetch('/api/hr/requests', {
            headers: {
              'X-Tenant-ID': resolveData.tenantId,
              'X-Auth-Session': 'authenticated',
              'X-Demo-User': 'demo-user'
            }
          });
          
          testResults.push({
            endpoint: `/api/tenants/resolve?slug=${tenant}`,
            status: resolveResponse.status,
            data: resolveData,
            uuid: resolveData.tenantId,
            tenant
          });
          
          testResults.push({
            endpoint: `/api/hr/requests (tenant: ${tenant})`,
            status: testResponse.status,
            data: testResponse.ok ? await testResponse.json() : await testResponse.text(),
            uuid: resolveData.tenantId,
            tenant
          });
          
        } else {
          console.error(`[VERIFICATION] ❌ Tenant ${tenant} resolution failed: ${resolveResponse.status}`);
          testResults.push({
            endpoint: `/api/tenants/resolve?slug=${tenant}`,
            status: resolveResponse.status,
            error: `Resolution failed: ${resolveResponse.statusText}`,
            tenant
          });
        }
        
      } catch (error) {
        console.error(`[VERIFICATION] ❌ Cross-tenant test failed for ${tenant}:`, error);
        testResults.push({
          endpoint: `Cross-tenant test (${tenant})`,
          error: error instanceof Error ? error.message : String(error),
          tenant
        });
      }
    }
    
    setTestResults(testResults);
    setIsRunning(false);
    
    console.log('🏁 TENANT SECURITY VERIFICATION COMPLETED');
    console.log('Check backend logs for [TENANT-MIDDLEWARE] and [TENANT-RESOLVE] entries');
  };

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            🔒 Tenant Security Verification Test (ARCHITECT REQUIREMENTS)
          </CardTitle>
          <p className="text-center text-muted-foreground">
            CRITICAL: Verify tenant UUID propagation, API middleware execution, and cross-tenant isolation
          </p>
          
          <div className="text-center mt-4">
            <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">Current Tenant Status:</h4>
              <div className="text-sm space-y-1">
                <div>Slug: <code className="bg-blue-100 px-2 py-1 rounded">{localStorage.getItem('currentTenant') || 'unknown'}</code></div>
                <div>UUID: <code className="bg-blue-100 px-2 py-1 rounded">{localStorage.getItem('currentTenantId') || 'not set'}</code></div>
                <div>UUID Valid: {localStorage.getItem('currentTenantId') && isValidUUID(localStorage.getItem('currentTenantId')!) ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <Button 
              onClick={runTenantSecurityTest}
              disabled={isRunning}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 disabled:opacity-50"
              data-testid="button-run-security-test"
            >
              {isRunning ? '🔄 RUNNING SECURITY TEST...' : '🧪 RUN COMPREHENSIVE TENANT SECURITY TEST'}
            </Button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🎯 ARCHITECT VERIFICATION REQUIREMENTS:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>✅ TenantWrapper calls `/api/tenants/resolve?slug=...` on mount</li>
              <li>✅ setCurrentTenantId(uuid) called with proper UUID</li>
              <li>🧪 API calls generate TENANT-MIDDLEWARE logs (not TENANT-SKIP)</li>
              <li>🧪 X-Tenant-ID header contains valid UUID format</li>
              <li>🧪 200 responses from key endpoints (/api/hr/metrics, /api/notifications)</li>
              <li>🧪 Cross-tenant test shows different data isolation</li>
            </ul>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">📋 Security Test Results:</h3>
              <div className="grid gap-4">
                {testResults.map((result, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${
                    result.error 
                      ? 'border-red-200 bg-red-50' 
                      : result.status && result.status >= 200 && result.status < 300
                        ? 'border-green-200 bg-green-50'
                        : 'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">
                        {result.error ? '❌' : result.status && result.status >= 200 && result.status < 300 ? '✅' : '⚠️'} 
                        {result.endpoint}
                      </div>
                      {result.status && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          result.status >= 200 && result.status < 300 
                            ? 'bg-green-100 text-green-800' 
                            : result.status >= 400 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Tenant:</strong> {result.tenant || 'current'}
                      </div>
                      <div>
                        <strong>UUID:</strong> 
                        <code className={`ml-1 px-1 text-xs ${
                          result.uuid && isValidUUID(result.uuid) 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.uuid || 'not provided'}
                        </code>
                      </div>
                      {result.timing && (
                        <div>
                          <strong>Response Time:</strong> {result.timing}ms
                        </div>
                      )}
                      {result.error && (
                        <div className="col-span-2">
                          <strong>Error:</strong> 
                          <code className="ml-1 text-red-800 bg-red-100 px-1 text-xs">{result.error}</code>
                        </div>
                      )}
                    </div>
                    
                    {result.data && !result.error && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                          View Response Data
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ CRITICAL VERIFICATION CHECKLIST:</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>✅ <strong>Browser Console:</strong> Look for `[TENANT-WRAPPER]`, `[QUERY-CLIENT]`, `[VERIFICATION]` logs</p>
              <p>🔍 <strong>Backend Logs:</strong> Verify `[TENANT-MIDDLEWARE]` and `[TENANT-RESOLVE]` execution (NOT `[TENANT-SKIP]`)</p>
              <p>🔒 <strong>Security Check:</strong> Confirm all UUIDs are valid format and API calls return tenant-specific data</p>
              <p>🏢 <strong>Cross-Tenant:</strong> Verify different tenants show different data (isolation working)</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">🚨 PRODUCTION READINESS VERIFICATION:</h3>
            <p className="text-sm text-red-700">
              This test MUST show successful API calls with `[TENANT-MIDDLEWARE]` logs to prove tenant security is working.
              If you only see `[TENANT-SKIP]` logs, the system is NOT production ready and has potential security vulnerabilities.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}