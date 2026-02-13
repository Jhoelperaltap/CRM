import axios from 'axios';
import { login, logout, verify2FA, refreshToken } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth Functions', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      tokens: null,
      tempToken: null,
      requires2FA: false,
      _hasHydrated: true,
    });
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store user', async () => {
      const mockResponse = {
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: {
            id: '123',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await login('test@example.com', 'password123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        { email: 'test@example.com', password: 'password123' },
        { withCredentials: true }
      );

      expect(result).toEqual(mockResponse.data);
      expect(useAuthStore.getState().user).toEqual(mockResponse.data.user);
    });

    it('should handle 2FA requirement', async () => {
      const mockResponse = {
        data: {
          requires_2fa: true,
          temp_token: 'temp-2fa-token',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse.data);
      expect(useAuthStore.getState().tempToken).toBe('temp-2fa-token');
      expect(useAuthStore.getState().requires2FA).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should throw error on failed login', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(login('test@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA and store user', async () => {
      const mockResponse = {
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: {
            id: '123',
            email: 'test@example.com',
          },
        },
      };

      // Set up 2FA state
      useAuthStore.getState().setTempToken('temp-token');
      useAuthStore.getState().setRequires2FA(true);

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await verify2FA('temp-token', '123456');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/2fa/verify/'),
        { temp_token: 'temp-token', code: '123456' },
        { withCredentials: true }
      );

      expect(result).toEqual(mockResponse.data);
      expect(useAuthStore.getState().user).toEqual(mockResponse.data.user);
      expect(useAuthStore.getState().tempToken).toBeNull();
      expect(useAuthStore.getState().requires2FA).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout and clear store', async () => {
      // Set up authenticated state
      useAuthStore.getState().setUser({ id: '123' } as never);
      useAuthStore.getState().setTokens({ access: 'a', refresh: 'r' });

      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      await logout();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout/'),
        { refresh: 'r' },
        { withCredentials: true }
      );

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().tokens).toBeNull();
    });

    it('should clear store even if server call fails', async () => {
      useAuthStore.getState().setUser({ id: '123' } as never);

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await logout();

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      useAuthStore.getState().setTokens({ access: 'old-access', refresh: 'refresh' });

      const mockResponse = {
        data: {
          access: 'new-access',
          refresh: 'new-refresh',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await refreshToken();

      expect(result).toBe(true);
      expect(useAuthStore.getState().tokens).toEqual({
        access: 'new-access',
        refresh: 'new-refresh',
      });
    });

    it('should return false and clear store on refresh failure', async () => {
      useAuthStore.getState().setTokens({ access: 'old-access', refresh: 'refresh' });
      useAuthStore.getState().setUser({ id: '123' } as never);

      mockedAxios.post.mockRejectedValueOnce(new Error('Token expired'));

      const result = await refreshToken();

      expect(result).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().tokens).toBeNull();
    });
  });
});
