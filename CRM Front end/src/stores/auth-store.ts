import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

/**
 * Tokens interface - now optional for web clients.
 * Web clients use httpOnly cookies for JWT storage (XSS protection).
 * Mobile clients still use this for SecureStore-based token storage.
 */
interface Tokens {
  access: string;
  refresh: string;
}

interface AuthState {
  // User profile - stored for both web and mobile
  user: User | null;
  // Tokens - only used by mobile apps (web uses httpOnly cookies)
  tokens: Tokens | null;
  // 2FA flow state
  tempToken: string | null;
  requires2FA: boolean;
  // Hydration tracking
  _hasHydrated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: Tokens | null) => void;
  setTempToken: (token: string | null) => void;
  setRequires2FA: (value: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  clear: () => void;
  // Auth status check (works with cookies or tokens)
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      tempToken: null,
      requires2FA: false,
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens }),
      setTempToken: (tempToken) => set({ tempToken }),
      setRequires2FA: (requires2FA) => set({ requires2FA }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
      clear: () =>
        set({
          user: null,
          tokens: null,
          tempToken: null,
          requires2FA: false,
        }),
      // Check if authenticated - user exists means we're logged in
      // (cookies handle the actual auth, user in store is our indicator)
      isAuthenticated: () => {
        const state = get();
        return state.user !== null;
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Only persist user info and 2FA state - not tokens for web
      // Tokens are only for backwards compatibility with mobile
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens, // Keep for mobile backwards compatibility
        tempToken: state.tempToken,
        requires2FA: state.requires2FA,
      }),
    }
  )
);
