import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import {
  PortalLoginRequest,
  PortalLoginResponse,
  PortalMeResponse,
  PortalPasswordResetRequest,
  PortalPasswordResetConfirmRequest,
  PortalPasswordChangeRequest,
} from '../types/auth';

/**
 * Login with email and password
 */
export async function login(credentials: PortalLoginRequest): Promise<PortalLoginResponse> {
  const response = await apiClient.post<PortalLoginResponse>(
    API_ENDPOINTS.LOGIN,
    credentials
  );
  return response.data;
}

/**
 * Logout (for stateless JWT, this is mainly for client-side cleanup)
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(API_ENDPOINTS.LOGOUT);
  } catch {
    // Logout endpoint might fail, but we still want to clear local state
  }
}

/**
 * Get current user profile
 */
export async function getMe(): Promise<PortalMeResponse> {
  const response = await apiClient.get<PortalMeResponse>(API_ENDPOINTS.ME);
  return response.data;
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(
  data: PortalPasswordResetRequest
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.PASSWORD_RESET,
    data
  );
  return response.data;
}

/**
 * Confirm password reset with token
 */
export async function confirmPasswordReset(
  data: PortalPasswordResetConfirmRequest
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.PASSWORD_RESET_CONFIRM,
    data
  );
  return response.data;
}

/**
 * Change password (authenticated)
 */
export async function changePassword(
  data: PortalPasswordChangeRequest
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.PASSWORD_CHANGE,
    data
  );
  return response.data;
}
