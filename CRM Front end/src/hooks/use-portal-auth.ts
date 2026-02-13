"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortalAuthStore } from "@/stores/portal-auth-store";

export function usePortalAuth(redirectTo = "/portal/login") {
  const router = useRouter();
  const { contact, tokens } = usePortalAuthStore();

  useEffect(() => {
    if (!tokens?.access && redirectTo) {
      router.replace(redirectTo);
    }
  }, [tokens, router, redirectTo]);

  return { contact, isAuthenticated: !!tokens?.access };
}
