"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { checkAuth } from "@/lib/auth";

/**
 * Hook for checking authentication status.
 *
 * With httpOnly cookies, we can't directly check for tokens in JavaScript.
 * Instead, we check if we have a user in the store (set during login).
 * On initial page load, we optionally verify the session is still valid.
 */
export function useAuth(redirectTo = "/login", verifyOnMount = false) {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(verifyOnMount);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!_hasHydrated) return;

    // If we have a user, we're authenticated (cookies handle the rest)
    if (user) {
      // Optionally verify the session is still valid on mount
      if (verifyOnMount && isVerifying) {
        checkAuth()
          .then((isValid) => {
            if (!isValid) {
              useAuthStore.getState().clear();
              router.replace(redirectTo);
            }
          })
          .finally(() => setIsVerifying(false));
      }
      return;
    }

    // No user - redirect to login
    router.replace(redirectTo);
  }, [user, _hasHydrated, router, redirectTo, verifyOnMount, isVerifying]);

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
