import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortalContact, PortalModules, PortalImpersonationInfo } from "@/types/portal";

/**
 * Portal Auth Store - Client Portal Only
 *
 * SECURITY: This store does NOT persist JWT tokens.
 * JWT tokens are stored in httpOnly cookies (set by the backend),
 * which prevents XSS attacks from stealing authentication tokens.
 *
 * The store only persists the contact profile for UI display.
 */

// Default modules - all disabled until loaded from API
const DEFAULT_MODULES: PortalModules = {
  dashboard: false,
  billing: false,
  messages: false,
  documents: false,
  cases: false,
  rentals: false,
  buildings: false,
  appointments: false,
};

interface PortalAuthState {
  contact: PortalContact | null;
  modules: PortalModules;
  impersonation: PortalImpersonationInfo | null;
  _hasHydrated: boolean;
  setContact: (contact: PortalContact | null) => void;
  setModules: (modules: PortalModules) => void;
  setImpersonation: (info: PortalImpersonationInfo | null) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (state: boolean) => void;
  isModuleEnabled: (module: keyof PortalModules) => boolean;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set, get) => ({
      contact: null,
      modules: DEFAULT_MODULES,
      impersonation: null,
      _hasHydrated: false,
      setContact: (contact) => set({ contact }),
      setModules: (modules) => set({ modules }),
      setImpersonation: (impersonation) => set({ impersonation }),
      clear: () => set({ contact: null, modules: DEFAULT_MODULES, impersonation: null }),
      isAuthenticated: () => get().contact !== null,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      isModuleEnabled: (module) => get().modules[module] ?? true,
    }),
    {
      name: "portal-auth-storage",
      // SECURITY: Only persist contact info, NOT tokens, modules, or impersonation
      // Modules are always loaded fresh from the API to ensure admin changes are applied
      partialize: (state) => ({
        contact: state.contact,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
