"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortalAuthStore } from "@/stores/portal-auth-store";

/**
 * Portal authentication hook.
 *
 * SECURITY: Auth state is based on contact presence in store.
 * JWT tokens are stored in httpOnly cookies (not accessible via JS).
 */
export function usePortalAuth(redirectTo = "/portal/login") {
  const router = useRouter();
  const contact = usePortalAuthStore((s) => s.contact);
  const isAuthenticated = usePortalAuthStore((s) => s.isAuthenticated());
  const hasHydrated = usePortalAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Only redirect after store has hydrated from localStorage
    if (hasHydrated && !isAuthenticated && redirectTo) {
      router.replace(redirectTo);
    }
  }, [hasHydrated, isAuthenticated, router, redirectTo]);

  return { contact, isAuthenticated, hasHydrated };
}
