import { create } from 'zustand';
import { AuthStore, PortalContact } from '../types/auth';
import {
  storeAuthTokens,
  getAuthTokens,
  clearAuthData,
  storeUserData,
  getUserData,
} from '../utils/storage';

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  contact: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrated: false,

  // Actions
  setAuth: (contact, accessToken, refreshToken) => {
    // Store tokens and user data securely
    storeAuthTokens(accessToken, refreshToken);
    storeUserData(contact);

    set({
      contact,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    const currentRefreshToken = get().refreshToken;
    const newRefreshToken = refreshToken ?? currentRefreshToken;

    if (newRefreshToken) {
      storeAuthTokens(accessToken, newRefreshToken);
    }

    set({
      accessToken,
      refreshToken: newRefreshToken,
    });
  },

  setContact: (contact) => {
    storeUserData(contact);
    set({ contact });
  },

  clear: () => {
    clearAuthData();
    set({
      contact: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setHydrated: (hydrated) => {
    set({ isHydrated: hydrated });
  },
}));

/**
 * Hydrate the auth store from secure storage
 * Call this on app startup
 */
export async function hydrateAuthStore(): Promise<void> {
  try {
    const [tokens, userData] = await Promise.all([
      getAuthTokens(),
      getUserData<PortalContact>(),
    ]);

    if (tokens.accessToken && tokens.refreshToken && userData) {
      useAuthStore.setState({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        contact: userData,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      useAuthStore.setState({ isHydrated: true });
    }
  } catch (error) {
    console.error('Failed to hydrate auth store:', error);
    useAuthStore.setState({ isHydrated: true });
  }
}

// Selectors for common use cases
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectContact = (state: AuthStore) => state.contact;
export const selectAccessToken = (state: AuthStore) => state.accessToken;
export const selectIsHydrated = (state: AuthStore) => state.isHydrated;
export const selectContactName = (state: AuthStore) =>
  state.contact ? `${state.contact.first_name} ${state.contact.last_name}` : '';
