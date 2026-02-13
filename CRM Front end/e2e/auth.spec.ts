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

      // Check for form elements
      await expect(page.getByRole('heading', { name: /iniciar sesión|sign in|login/i })).toBeVisible();
      await expect(page.getByLabel(/email|correo/i)).toBeVisible();
      await expect(page.getByLabel(/password|contraseña/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /iniciar sesión|sign in|login/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.getByLabel(/email|correo/i).fill('invalid@example.com');
      await page.getByLabel(/password|contraseña/i).fill('wrongpassword');
      await page.getByRole('button', { name: /iniciar sesión|sign in|login/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|error|incorrecta|inválido/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.getByRole('button', { name: /iniciar sesión|sign in|login/i }).click();

      // Should show validation errors
      await expect(page.getByText(/required|requerido|obligatorio/i)).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.getByRole('link', { name: /forgot|olvidó|olvidaste|recuperar/i });
      await expect(forgotLink).toBeVisible();
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
      const data = await response.json();
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
