// Port Isolation Security Tests
// Verifies complete separation between W3 Suite (5000) and Brand Interface (5001)

import { describe, test, expect } from '@jest/globals';
import fetch from 'node-fetch';

const W3_SUITE_URL = 'http://localhost:5000';
const BRAND_INTERFACE_URL = 'http://localhost:5001';

describe('Port Isolation Security Tests', () => {
  
  describe('W3 Suite (Port 5000) Isolation', () => {
    
    test('should reject /brandinterface paths with 404', async () => {
      const response = await fetch(`${W3_SUITE_URL}/brandinterface/login`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('not_found');
      expect(data.message).toContain('Resource not found on W3 Suite');
      expect(data.hint).toContain('port 5001');
    });
    
    test('should reject /brand-api paths with 404', async () => {
      const response = await fetch(`${W3_SUITE_URL}/brand-api/health`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('not_found');
    });
    
    test('should accept W3 Suite API paths', async () => {
      const response = await fetch(`${W3_SUITE_URL}/api/auth/session`);
      // Should return 401 (unauthorized) not 404
      expect(response.status).not.toBe(404);
    });
    
    test('should have correct CSP headers', async () => {
      const response = await fetch(W3_SUITE_URL);
      const csp = response.headers.get('content-security-policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
    });
    
    test('should have HSTS header', async () => {
      const response = await fetch(W3_SUITE_URL);
      const hsts = response.headers.get('strict-transport-security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=31536000');
    });
    
    test('should have X-Frame-Options deny', async () => {
      const response = await fetch(W3_SUITE_URL);
      const xFrame = response.headers.get('x-frame-options');
      expect(xFrame).toBe('DENY');
    });
  });
  
  describe('Brand Interface (Port 5001) Isolation', () => {
    
    test('should serve /brandinterface paths', async () => {
      const response = await fetch(`${BRAND_INTERFACE_URL}/brandinterface/login`);
      expect(response.status).toBe(200);
      
      const html = await response.text();
      expect(html).toContain('Brand Interface HQ');
      expect(html).not.toContain('W3 Suite');
    });
    
    test('should serve /brand-api health check', async () => {
      const response = await fetch(`${BRAND_INTERFACE_URL}/brand-api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('Brand Interface API');
    });
    
    test('should NOT serve W3 Suite API paths', async () => {
      const response = await fetch(`${BRAND_INTERFACE_URL}/api/stores`);
      expect(response.status).toBe(404);
    });
    
    test('should have more restrictive CSP', async () => {
      const response = await fetch(BRAND_INTERFACE_URL);
      const csp = response.headers.get('content-security-policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("frame-src 'none'");
    });
    
    test('should have X-Frame-Options sameorigin', async () => {
      const response = await fetch(BRAND_INTERFACE_URL);
      const xFrame = response.headers.get('x-frame-options');
      expect(xFrame).toBe('SAMEORIGIN');
    });
  });
  
  describe('Cross-Origin Isolation', () => {
    
    test('W3 Suite should not allow Brand Interface origin by default', async () => {
      const response = await fetch(`${W3_SUITE_URL}/api/stores`, {
        headers: {
          'Origin': 'http://localhost:5001'
        }
      });
      
      const allowOrigin = response.headers.get('access-control-allow-origin');
      expect(allowOrigin).not.toBe('http://localhost:5001');
    });
    
    test('Brand Interface should not allow W3 Suite API calls by default', async () => {
      const response = await fetch(`${BRAND_INTERFACE_URL}/brand-api/health`, {
        headers: {
          'Origin': 'http://localhost:5000'
        }
      });
      
      const allowOrigin = response.headers.get('access-control-allow-origin');
      // Brand Interface only allows its own origin by default
      expect(allowOrigin).not.toBe('http://localhost:5000');
    });
  });
  
  describe('Rate Limiting', () => {
    
    test('W3 Suite should rate limit login attempts', async () => {
      // Make 6 login attempts (limit is 5)
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          fetch(`${W3_SUITE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
          })
        );
      }
      
      const responses = await Promise.all(attempts);
      const lastResponse = responses[5];
      
      expect(lastResponse.status).toBe(429); // Too Many Requests
      const data = await lastResponse.json();
      expect(data.message || data.error).toContain('Too many');
    });
    
    test('Brand Interface should have stricter rate limits', async () => {
      // Make 4 login attempts (Brand limit is 3)
      const attempts = [];
      for (let i = 0; i < 4; i++) {
        attempts.push(
          fetch(`${BRAND_INTERFACE_URL}/brand-api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
          })
        );
      }
      
      const responses = await Promise.all(attempts);
      const lastResponse = responses[3];
      
      expect(lastResponse.status).toBe(429);
      const data = await lastResponse.json();
      expect(data.message || data.error).toContain('Too many');
    });
  });
  
  describe('JWT Secret Isolation', () => {
    
    test('W3 Suite and Brand Interface should use different JWT secrets', () => {
      const w3Secret = process.env.JWT_SECRET || 'w3suite-dev-secret-2025';
      const brandSecret = process.env.BRAND_JWT_SECRET || 'brand-dev-secret-2025';
      
      expect(w3Secret).not.toBe(brandSecret);
    });
  });
});

// Run tests
if (require.main === module) {
  console.log('🧪 Running Port Isolation Security Tests...');
  console.log('Make sure both servers are running on ports 5000 and 5001');
}