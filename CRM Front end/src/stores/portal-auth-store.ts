import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortalContact } from "@/types/portal";

interface PortalTokens {
  access: string;
  refresh: string;
}

interface PortalAuthState {
  contact: PortalContact | null;
  tokens: PortalTokens | null;
  setContact: (contact: PortalContact | null) => void;
  setTokens: (tokens: PortalTokens | null) => void;
  clear: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      contact: null,
      tokens: null,
      setContact: (contact) => set({ contact }),
      setTokens: (tokens) => set({ tokens }),
      clear: () => set({ contact: null, tokens: null }),
    }),
    {
      name: "portal-auth-storage",
    }
  )
);
