import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginResponse, TwoFactorRequiredResponse } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Login with email and password.
 *
 * SECURITY: JWT tokens are stored in httpOnly cookies by the server.
 * This prevents XSS attacks from stealing authentication tokens.
 * We only store the user profile locally for UI display.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse | TwoFactorRequiredResponse> {
  const response = await axios.post<LoginResponse | TwoFactorRequiredResponse>(
    `${API_BASE_URL}/auth/login/`,
    { email, password },
    { withCredentials: true } // Required for httpOnly cookies
  );

  const data = response.data;

  // 2FA required — store temp token and signal the UI
  if ("requires_2fa" in data && data.requires_2fa) {
    useAuthStore.getState().setTempToken(data.temp_token);
    useAuthStore.getState().setRequires2FA(true);
    return data;
  }

  // Normal login - httpOnly cookies are set automatically by browser
  const loginData = data as LoginResponse;

  // Store user profile only (NOT tokens - those are in httpOnly cookies)
  useAuthStore.getState().setUser(loginData.user as never);

  return loginData;
}

/**
 * Complete 2FA verification with TOTP code.
 * Tokens are set as httpOnly cookies by the server.
 */
export async function verify2FA(
  tempToken: string,
  code: string
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    `${API_BASE_URL}/auth/2fa/verify/`,
    { temp_token: tempToken, code },
    { withCredentials: true }
  );

  const { user } = response.data;

  // Store user profile only (tokens are in httpOnly cookies)
  useAuthStore.getState().setUser(user as never);

  // Clear 2FA state
  useAuthStore.getState().setTempToken(null);
  useAuthStore.getState().setRequires2FA(false);

  return response.data;
}

/**
 * Complete 2FA with recovery code.
 * Tokens are set as httpOnly cookies by the server.
 */
export async function verify2FARecovery(
  tempToken: string,
  recoveryCode: string
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    `${API_BASE_URL}/auth/2fa/recovery/`,
    { temp_token: tempToken, recovery_code: recoveryCode },
    { withCredentials: true }
  );

  const { user } = response.data;

  // Store user profile only (tokens are in httpOnly cookies)
  useAuthStore.getState().setUser(user as never);

  // Clear 2FA state
  useAuthStore.getState().setTempToken(null);
  useAuthStore.getState().setRequires2FA(false);

  return response.data;
}

/**
 * Refresh the access token.
 * The server reads the refresh token from httpOnly cookie and sets new cookies.
 */
export async function refreshToken(): Promise<boolean> {
  try {
    await axios.post(
      `${API_BASE_URL}/auth/refresh/`,
      {}, // Empty body - refresh token is in httpOnly cookie
      { withCredentials: true }
    );
    return true;
  } catch {
    useAuthStore.getState().clear();
    return false;
  }
}

/**
 * Logout - clears httpOnly cookies and local state.
 */
export async function logout(): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/auth/logout/`,
      {}, // Empty body - refresh token is in httpOnly cookie
      { withCredentials: true }
    );
  } catch {
    // Best-effort logout - continue even if server call fails
  }

  // Clear local state (user profile)
  useAuthStore.getState().clear();
}

/**
 * Check if the current session is valid by calling /auth/me/.
 * Useful for verifying cookie-based auth on page load.
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me/`, {
      withCredentials: true,
    });

    if (response.data) {
      useAuthStore.getState().setUser(response.data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
