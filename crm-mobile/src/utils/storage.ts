import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keys for secure storage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  // App lock settings
  APP_LOCK_ENABLED: 'app_lock_enabled',
  APP_LOCK_TYPE: 'app_lock_type', // 'biometric' | 'pin' | 'both'
  APP_PIN_HASH: 'app_pin_hash',
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

/**
 * Securely store a value
 * Falls back to in-memory storage on web
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Use localStorage on web (not as secure, but functional)
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/**
 * Retrieve a securely stored value
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

/**
 * Delete a securely stored value
 */
export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/**
 * Store auth tokens securely
 */
export async function storeAuthTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await Promise.all([
    setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

/**
 * Retrieve auth tokens
 */
export async function getAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
    getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Clear all auth data
 */
export async function clearAuthData(): Promise<void> {
  await Promise.all([
    deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
    deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
    deleteSecureItem(STORAGE_KEYS.USER_DATA),
  ]);
}

/**
 * Store user data
 */
export async function storeUserData(data: object): Promise<void> {
  await setSecureItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
}

/**
 * Retrieve user data
 */
export async function getUserData<T>(): Promise<T | null> {
  const data = await getSecureItem(STORAGE_KEYS.USER_DATA);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
