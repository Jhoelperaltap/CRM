import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortalContact } from "@/types/portal";

/**
 * Portal Auth Store - Client Portal Only
 *
 * SECURITY: This store does NOT persist JWT tokens.
 * JWT tokens are stored in httpOnly cookies (set by the backend),
 * which prevents XSS attacks from stealing authentication tokens.
 *
 * The store only persists the contact profile for UI display.
 */

interface PortalAuthState {
  contact: PortalContact | null;
  _hasHydrated: boolean;
  setContact: (contact: PortalContact | null) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set, get) => ({
      contact: null,
      _hasHydrated: false,
      setContact: (contact) => set({ contact }),
      clear: () => set({ contact: null }),
      isAuthenticated: () => get().contact !== null,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "portal-auth-storage",
      // SECURITY: Only persist contact info, NOT tokens
      partialize: (state) => ({
        contact: state.contact,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
