#!/usr/bin/env node

/**
 * Test script per verificare PDC Analyzer API endpoints
 */

const API_BASE = 'http://localhost:5000/api/pdc';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Headers per simulare autenticazione development
const headers = {
  'Cookie': 'session-auth=authenticated; demo-user=admin-user',
  'X-Tenant-ID': TENANT_ID,
  'X-Auth-Session': 'authenticated'
};

// Test 1: Create a new session
async function testCreateSession() {
  console.log('\n📝 TEST 1: Creating new session...');
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionName: 'Test Session ' + new Date().toISOString()
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('❌ Failed to create session:', data);
      return null;
    }
    
    if (!data.id) {
      console.error('❌ Invalid response structure:', data);
      return null;
    }
    
    console.log('✅ Session created:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return null;
  }
}

// Test 2: Upload PDF
async function testUploadPDF(sessionId) {
  console.log('\n📤 TEST 2: Uploading PDF...');
  try {
    // Create a mock PDF content
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 >>\nstartxref\n%%EOF');
    
    const formData = new FormData();
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    formData.append('pdf', blob, 'test.pdf');
    
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/upload`, {
      method: 'POST',
      headers: {
        'Cookie': 'session-auth=authenticated; demo-user=admin-user',
        'X-Tenant-ID': TENANT_ID,
        'X-Auth-Session': 'authenticated'
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to upload PDF:', data);
      return false;
    }
    console.log('✅ PDF uploaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error uploading PDF:', error);
    return false;
  }
}

// Test 3: Get sessions list
async function testGetSessions() {
  console.log('\n📋 TEST 3: Getting sessions list...');
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      headers
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to get sessions:', data);
      return [];
    }
    // La risposta è direttamente un array
    console.log(`✅ Found ${data.length} sessions`);
    return data;
  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    return [];
  }
}

// Test 4: Delete session
async function testDeleteSession(sessionId) {
  console.log(`\n🗑️ TEST 4: Deleting session ${sessionId}...`);
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to delete session:', data);
      return false;
    }
    console.log('✅ Session deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting PDC Analyzer API Tests');
  console.log('================================');
  
  // Create session
  const sessionId = await testCreateSession();
  if (!sessionId) {
    console.log('\n❌ Cannot continue tests without session');
    process.exit(1);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Upload PDF (commented out for now as we need proper FormData handling in Node.js)
  // await testUploadPDF(sessionId);
  console.log('\n⚠️ PDF upload test skipped (requires FormData polyfill for Node.js)');
  
  // Get sessions
  await testGetSessions();
  
  // Delete session
  const deleted = await testDeleteSession(sessionId);
  
  // Verify deletion
  const sessionsAfter = await testGetSessions();
  const stillExists = sessionsAfter.some(s => s.id === sessionId);
  
  if (!stillExists && deleted) {
    console.log('\n✅ ALL TESTS PASSED!');
  } else if (stillExists) {
    console.log('\n❌ Session still exists after delete!');
  } else {
    console.log('\n⚠️ Tests completed with warnings');
  }
}

// Run tests
runTests().catch(console.error);