import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

/**
 * Auth Store - Web Client Only
 *
 * SECURITY: This store does NOT persist JWT tokens.
 * JWT tokens are stored in httpOnly cookies (set by the backend),
 * which prevents XSS attacks from stealing authentication tokens.
 *
 * The store only persists:
 * - User profile (for UI display)
 * - 2FA flow state (temporary, cleared after completion)
 *
 * For mobile apps, use SecureStore directly - not this web store.
 */

interface AuthState {
  // User profile - stored for UI display only
  user: User | null;
  // 2FA flow state (temporary)
  tempToken: string | null;
  requires2FA: boolean;
  // Hydration tracking
  _hasHydrated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setTempToken: (token: string | null) => void;
  setRequires2FA: (value: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  clear: () => void;
  // Auth status check (based on user presence - cookies handle actual auth)
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tempToken: null,
      requires2FA: false,
      _hasHydrated: false,
      setUser: (user) => set({ user }),
      setTempToken: (tempToken) => set({ tempToken }),
      setRequires2FA: (requires2FA) => set({ requires2FA }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
      clear: () =>
        set({
          user: null,
          tempToken: null,
          requires2FA: false,
        }),
      // Check if authenticated - user exists means we're logged in
      // (httpOnly cookies handle the actual JWT auth)
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
      // SECURITY: Only persist user info and 2FA state
      // JWT tokens are NEVER stored in localStorage - they're in httpOnly cookies
      partialize: (state) => ({
        user: state.user,
        tempToken: state.tempToken,
        requires2FA: state.requires2FA,
      }),
    }
  )
);
