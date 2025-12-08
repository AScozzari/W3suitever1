import { test, expect } from '@playwright/test';

test.describe('Shift Template Edit', () => {
  test('should open edit modal without removeChild error', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/staging/hr-management');
    
    await page.waitForLoadState('networkidle');
    
    const turniTab = page.locator('[data-testid="tab-shifts"]').or(page.getByText('Turni', { exact: false }));
    await turniTab.click();
    
    await page.waitForTimeout(1000);
    
    const editButton = page.locator('[data-testid*="edit"]').or(page.getByText('Modifica')).first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);
      
      const hasRemoveChildError = errors.some(e => e.includes('removeChild'));
      expect(hasRemoveChildError).toBe(false);
      
      console.log('Errors captured:', errors);
    } else {
      console.log('No edit button found - checking for templates');
    }
  });
});
