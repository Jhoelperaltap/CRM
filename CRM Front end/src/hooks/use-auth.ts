"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { checkAuth } from "@/lib/auth";

/**
 * Hook for checking authentication status.
 *
 * With httpOnly cookies, we can't directly check for tokens in JavaScript.
 * Instead, we check if we have a user in the store (set during login).
 * On initial page load, we optionally verify the session is still valid.
 *
 * IMPORTANT: Set verifyOnMount=true for protected routes to prevent
 * blank page issues when sessions expire by timeout.
 */
export function useAuth(redirectTo = "/login", verifyOnMount = false) {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(verifyOnMount);
  const hasVerified = useRef(false);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!_hasHydrated) return;

    // Verify session on mount (only once)
    if (verifyOnMount && !hasVerified.current) {
      hasVerified.current = true;
      setIsVerifying(true);

      checkAuth()
        .then((isValid) => {
          if (!isValid) {
            // Session invalid - checkAuth already cleared the store
            router.replace(`${redirectTo}?reason=session_expired`);
          }
        })
        .catch(() => {
          // Error checking auth - assume session is invalid
          useAuthStore.getState().clear();
          router.replace(`${redirectTo}?reason=session_expired`);
        })
        .finally(() => setIsVerifying(false));
      return;
    }

    // If not verifying and no user, redirect to login
    if (!verifyOnMount && !user) {
      router.replace(redirectTo);
    }
  }, [user, _hasHydrated, router, redirectTo, verifyOnMount]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !_hasHydrated || isVerifying,
  };
}

/**
 * Hook for pages that should only be accessible when NOT authenticated.
 * Redirects to dashboard if user is already logged in.
 */
export function useGuest(redirectTo = "/") {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && user) {
      router.replace(redirectTo);
    }
  }, [user, _hasHydrated, router, redirectTo]);

  return {
    isLoading: !_hasHydrated,
    isAuthenticated: !!user,
  };
}
