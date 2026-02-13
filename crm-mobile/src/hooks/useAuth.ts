import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import * as authApi from '../api/auth';
import { getErrorMessage } from '../api/client';
import {
  PortalLoginRequest,
  PortalPasswordResetRequest,
  PortalPasswordResetConfirmRequest,
  PortalPasswordChangeRequest,
} from '../types/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const {
    contact,
    isAuthenticated,
    isHydrated,
    setAuth,
    setContact,
    clear,
  } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: PortalLoginRequest) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data.contact, data.access, data.refresh);
      queryClient.clear();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
    onError: () => {
      // Still clear local state even if API call fails
      clear();
      queryClient.clear();
    },
  });

  // Get current user query
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: (data) => {
      setContact(data.contact);
    },
  });

  // Password reset request mutation
  const passwordResetMutation = useMutation({
    mutationFn: (data: PortalPasswordResetRequest) => authApi.requestPasswordReset(data),
  });

  // Password reset confirm mutation
  const passwordResetConfirmMutation = useMutation({
    mutationFn: (data: PortalPasswordResetConfirmRequest) =>
      authApi.confirmPasswordReset(data),
  });

  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: (data: PortalPasswordChangeRequest) => authApi.changePassword(data),
  });

  const login = useCallback(
    async (credentials: PortalLoginRequest) => {
      try {
        await loginMutation.mutateAsync(credentials);
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Logout should always succeed from user perspective
    }
  }, [logoutMutation]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      try {
        await passwordResetMutation.mutateAsync({ email });
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [passwordResetMutation]
  );

  const confirmPasswordReset = useCallback(
    async (token: string, newPassword: string) => {
      try {
        await passwordResetConfirmMutation.mutateAsync({
          token,
          new_password: newPassword,
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [passwordResetConfirmMutation]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await passwordChangeMutation.mutateAsync({
          current_password: currentPassword,
          new_password: newPassword,
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    },
    [passwordChangeMutation]
  );

  return {
    // State
    contact,
    isAuthenticated,
    isHydrated,
    isLoading:
      loginMutation.isPending ||
      logoutMutation.isPending ||
      meQuery.isLoading,

    // Actions
    login,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,

    // Mutation states for UI feedback
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isResettingPassword: passwordResetMutation.isPending,
    isConfirmingReset: passwordResetConfirmMutation.isPending,
    isChangingPassword: passwordChangeMutation.isPending,
  };
}
