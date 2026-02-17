import { useAuthStore } from '@/stores/auth-store';

/**
 * Auth Store Tests
 *
 * SECURITY NOTE: The auth store no longer stores JWT tokens.
 * Tokens are stored in httpOnly cookies to prevent XSS attacks.
 * The store only manages user profile and 2FA state.
 */
describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      tempToken: null,
      requires2FA: false,
      _hasHydrated: false,
    });
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should not require 2FA initially', () => {
      const { requires2FA } = useAuthStore.getState();
      expect(requires2FA).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user correctly', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        role: 'admin',
        role_slug: 'admin',
        is_admin: true,
        is_active: true,
      };

      useAuthStore.getState().setUser(mockUser as never);
      const { user } = useAuthStore.getState();

      expect(user).toEqual(mockUser);
    });

    it('should clear user when set to null', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };

      useAuthStore.getState().setUser(mockUser as never);
      useAuthStore.getState().setUser(null);

      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });
  });

  describe('2FA flow', () => {
    it('should set temp token for 2FA', () => {
      const tempToken = 'temp-2fa-token';

      useAuthStore.getState().setTempToken(tempToken);
      useAuthStore.getState().setRequires2FA(true);

      const state = useAuthStore.getState();
      expect(state.tempToken).toBe(tempToken);
      expect(state.requires2FA).toBe(true);
    });

    it('should clear 2FA state', () => {
      useAuthStore.getState().setTempToken('temp-token');
      useAuthStore.getState().setRequires2FA(true);

      useAuthStore.getState().setTempToken(null);
      useAuthStore.getState().setRequires2FA(false);

      const state = useAuthStore.getState();
      expect(state.tempToken).toBeNull();
      expect(state.requires2FA).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all auth state', () => {
      // Set up state
      useAuthStore.getState().setUser({ id: '123' } as never);
      useAuthStore.getState().setTempToken('temp');
      useAuthStore.getState().setRequires2FA(true);

      // Clear
      useAuthStore.getState().clear();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tempToken).toBeNull();
      expect(state.requires2FA).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no user', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return true when user exists', () => {
      useAuthStore.getState().setUser({ id: '123' } as never);
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });
  });

  describe('hydration', () => {
    it('should track hydration state', () => {
      expect(useAuthStore.getState()._hasHydrated).toBe(false);

      useAuthStore.getState().setHasHydrated(true);

      expect(useAuthStore.getState()._hasHydrated).toBe(true);
    });
  });
});
