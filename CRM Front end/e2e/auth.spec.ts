import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Critical user flows for login, logout, and session management.
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check for form elements - actual heading is "Ebenezer Tax Services"
      await expect(page.getByText(/ebenezer tax services/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Fill email but leave password empty to trigger validation
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation error for password
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show email validation error for invalid email', async ({ page }) => {
      await page.goto('/login');

      // Fill invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation error
      await expect(page.getByText(/valid email/i)).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect to login when accessing contacts', async ({ page }) => {
      await page.goto('/contacts');
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect to login when accessing cases', async ({ page }) => {
      await page.goto('/cases');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should show session timeout message when redirected', async ({ page }) => {
      await page.goto('/login?reason=session_timeout');

      await expect(page.getByText(/session|sesión|expiró|timeout/i)).toBeVisible();
    });

    test('should show session terminated message', async ({ page }) => {
      await page.goto('/login?reason=session_terminated');

      await expect(page.getByText(/session|sesión|terminada|terminated/i)).toBeVisible();
    });
  });
});

test.describe('Authenticated User', () => {
  // These tests require authentication - use test fixtures or API login
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Mock authentication or use a test account
    // For now, we'll skip these tests if not configured
    test.skip(!process.env.TEST_USER_EMAIL, 'Test user credentials not configured');

    // Login via API (faster than UI)
    const response = await page.request.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login/`,
      {
        data: {
          email: process.env.TEST_USER_EMAIL,
          password: process.env.TEST_USER_PASSWORD,
        },
      }
    );

    if (response.ok()) {
      // Store auth state
      await response.json();
      await page.goto('/');

      // Wait for redirect or dashboard to load
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display dashboard after login', async ({ page }) => {
    await page.goto('/');

    // Should show dashboard elements
    await expect(page.getByText(/dashboard|panel|inicio/i)).toBeVisible();
  });

  test('should show user profile in header', async ({ page }) => {
    await page.goto('/');

    // Look for user menu or avatar
    const userMenu = page.getByRole('button', { name: /profile|perfil|user|usuario/i });
    await expect(userMenu).toBeVisible();
  });

  test('should navigate to contacts', async ({ page }) => {
    await page.goto('/contacts');

    await expect(page.getByRole('heading', { name: /contacts|contactos/i })).toBeVisible();
  });

  test('should navigate to cases', async ({ page }) => {
    await page.goto('/cases');

    await expect(page.getByRole('heading', { name: /cases|casos/i })).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/');

    // Find and click logout
    const userMenu = page.getByRole('button', { name: /profile|perfil|user|usuario/i });
    await userMenu.click();

    const logoutButton = page.getByRole('menuitem', { name: /logout|cerrar sesión|salir/i });
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
