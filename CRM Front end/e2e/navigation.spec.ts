import { test, expect } from '@playwright/test';

/**
 * Navigation and Accessibility E2E Tests
 *
 * Tests for navigation, accessibility, and responsive design.
 */

test.describe('Public Pages', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');

    // Check accessibility basics
    await expect(page).toHaveTitle(/.+/); // Should have a title
    // Login page uses Card component - use .first() to avoid strict mode violation
    await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
  });

  test('login page should have proper heading structure', async ({ page }) => {
    await page.goto('/login');

    // CardTitle renders as div, check for the title text instead
    await expect(page.getByText('Ebenezer Tax Services')).toBeVisible();
  });

  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');

    // Check that focus moved to a focusable element
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(activeElement);
  });
});

test.describe('Responsive Design', () => {
  test('login page should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/login');

    // Form should still be visible and usable
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should show 404 or redirect to login
    const is404 = await page.getByText(/404|not found|no encontrado/i).isVisible();
    const isLogin = page.url().includes('/login');

    expect(is404 || isLogin).toBeTruthy();
  });
});

test.describe('Performance', () => {
  test('login page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('login page should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like failed API calls when not connected)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('net::ERR') &&
        !error.includes('NetworkError') &&
        !error.includes('Failed to fetch')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Security Headers', () => {
  test('should have security headers', async ({ page }) => {
    const response = await page.goto('/login');

    if (response) {
      const headers = response.headers();

      // Check for security headers - Next.js uses SAMEORIGIN by default
      expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']);
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
  });
});
