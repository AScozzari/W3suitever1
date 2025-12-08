import { test, expect } from '@playwright/test';

test.describe('HR Dashboard Security', () => {
  test('non-HR users cannot access HR dashboard', async ({ page }) => {
    // Mock employee user without HR permissions
    await page.route('/api/auth/session', route => {
      route.fulfill({
        json: { user: { id: '1', role: 'employee' } }
      });
    });
    
    await page.route('/api/auth/permissions', route => {
      route.fulfill({
        json: { permissions: ['employee:view'] } // No hr:manage
      });
    });
    
    // Attempt to access HR dashboard
    await page.goto('/staging/hr');
    
    // Should redirect to employee dashboard
    await expect(page).toHaveURL('/staging/employee/dashboard');
    
    // Should show access denied toast
    await expect(page.locator('[data-testid="toast-access-denied"]')).toBeVisible();
  });
  
  test('invalid tab parameters are sanitized', async ({ page }) => {
    await page.goto('/staging/employee/dashboard?tab=invalid&section=badvalue');
    
    // Should auto-correct to valid defaults
    await expect(page).toHaveURL('/staging/employee/dashboard?tab=overview');
  });
  
  test('tenant isolation maintained', async ({ page }) => {
    // Test cross-tenant access attempts
    await page.goto('/tenant1/hr');
    
    // Verify tenant headers are correct
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // Verify X-Tenant-ID header matches tenant context
    const apiRequest = requests.find(r => r.headers['x-tenant-id']);
    expect(apiRequest?.headers['x-tenant-id']).toBe('tenant1-uuid');
  });

  test('HR users can access HR dashboard', async ({ page }) => {
    // Mock HR user with appropriate permissions
    await page.route('/api/auth/session', route => {
      route.fulfill({
        json: { user: { id: '2', role: 'hr_manager' } }
      });
    });
    
    await page.route('/api/auth/permissions', route => {
      route.fulfill({
        json: { permissions: ['hr:manage', 'hr:view', 'employee:view'] }
      });
    });
    
    // Access HR dashboard
    await page.goto('/staging/hr');
    
    // Should stay on HR dashboard (no redirect)
    await expect(page).toHaveURL('/staging/hr');
    
    // Should not show access denied toast
    await expect(page.locator('[data-testid="toast-access-denied"]')).not.toBeVisible();
  });

  test('authentication required for protected routes', async ({ page }) => {
    // Mock unauthenticated user
    await page.route('/api/auth/session', route => {
      route.fulfill({
        status: 401,
        json: { error: 'Unauthorized' }
      });
    });
    
    // Try to access protected route
    await page.goto('/staging/employee/dashboard');
    
    // Should redirect to login
    await expect(page.url()).toContain('/login');
  });

  test('tenant resolution security', async ({ page }) => {
    // Mock tenant resolution API
    await page.route('/api/tenants/resolve*', route => {
      const url = new URL(route.request().url());
      const slug = url.searchParams.get('slug');
      
      if (slug === 'staging') {
        route.fulfill({
          json: { tenantId: '00000000-0000-0000-0000-000000000001', name: 'Staging Tenant' }
        });
      } else {
        route.fulfill({
          status: 404,
          json: { error: 'Tenant not found' }
        });
      }
    });
    
    // Test valid tenant resolution
    await page.goto('/staging/dashboard');
    
    // Wait for tenant resolution to complete
    await page.waitForTimeout(1000);
    
    // Should successfully load the dashboard
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({timeout: 10000});
  });

  test('role-based access control enforcement', async ({ page }) => {
    // Test different roles have different access levels
    const roles = [
      { role: 'employee', permissions: ['employee:view'], expectHRAccess: false },
      { role: 'manager', permissions: ['employee:view', 'leave:approve'], expectHRAccess: false },
      { role: 'hr_manager', permissions: ['hr:manage', 'hr:view', 'employee:view'], expectHRAccess: true },
      { role: 'admin', permissions: ['hr:manage', 'hr:view', 'employee:view', 'employee:manage'], expectHRAccess: true }
    ];
    
    for (const testRole of roles) {
      // Mock user with specific role
      await page.route('/api/auth/session', route => {
        route.fulfill({
          json: { user: { id: '1', role: testRole.role } }
        });
      });
      
      await page.route('/api/auth/permissions', route => {
        route.fulfill({
          json: { permissions: testRole.permissions }
        });
      });
      
      // Try to access HR dashboard
      await page.goto('/staging/hr');
      
      if (testRole.expectHRAccess) {
        // Should stay on HR dashboard
        await expect(page).toHaveURL('/staging/hr');
      } else {
        // Should redirect to employee dashboard
        await expect(page).toHaveURL('/staging/employee/dashboard');
      }
    }
  });

  test('toast notifications work correctly', async ({ page }) => {
    // Mock employee user (no HR access)
    await page.route('/api/auth/session', route => {
      route.fulfill({
        json: { user: { id: '1', role: 'employee' } }
      });
    });
    
    await page.route('/api/auth/permissions', route => {
      route.fulfill({
        json: { permissions: ['employee:view'] }
      });
    });
    
    // Access HR dashboard (should be denied)
    await page.goto('/staging/hr');
    
    // Should show access denied toast exactly once
    const toastLocator = page.locator('[data-testid="toast-access-denied"]');
    await expect(toastLocator).toBeVisible();
    
    // Verify toast text content
    await expect(toastLocator).toContainText('Access Denied');
    await expect(toastLocator).toContainText('You don\'t have permission to access HR management features');
    
    // Wait and verify toast doesn't duplicate
    await page.waitForTimeout(2000);
    const toastCount = await page.locator('[data-testid="toast-access-denied"]').count();
    expect(toastCount).toBeLessThanOrEqual(1);
  });
});

test.describe('Development Mode Behavior', () => {
  test('development mode provides demo permissions', async ({ page }) => {
    // In development mode, user should have full demo permissions
    await page.goto('/staging/hr');
    
    // Should successfully access HR dashboard in development
    await expect(page).toHaveURL('/staging/hr');
    
    // Should not show access denied toast in development
    await expect(page.locator('[data-testid="toast-access-denied"]')).not.toBeVisible();
  });
});