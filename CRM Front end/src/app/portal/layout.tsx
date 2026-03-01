"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalTopbar } from "@/components/portal/portal-topbar";
import { ImpersonationBanner } from "@/components/portal/impersonation-banner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { portalGetMe } from "@/lib/api/portal";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/portal/login";
  const setModules = usePortalAuthStore((s) => s.setModules);
  const setImpersonation = usePortalAuthStore((s) => s.setImpersonation);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  // Don't require auth on the login page
  const { isAuthenticated, hasHydrated } = usePortalAuth(
    isLoginPage ? "" : "/portal/login"
  );

  // Fetch modules and impersonation status on mount
  useEffect(() => {
    if (!isAuthenticated || isLoginPage) {
      setModulesLoaded(true); // Skip loading for login page
      return;
    }

    async function fetchPortalConfig() {
      try {
        const me = await portalGetMe();
        if (me.modules) {
          setModules(me.modules);
        }
        if (me.impersonation) {
          setImpersonation(me.impersonation);
        } else {
          setImpersonation(null);
        }
      } catch (error) {
        console.error("Failed to fetch portal config:", error);
      } finally {
        setModulesLoaded(true);
      }
    }

    fetchPortalConfig();
  }, [isAuthenticated, isLoginPage, setModules, setImpersonation]);

  // Login page renders without the sidebar/topbar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Wait for hydration to complete to prevent hydration mismatch
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect is in progress or modules still loading
  if (!isAuthenticated || !modulesLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <ImpersonationBanner />
      <div className="flex flex-1">
        <PortalSidebar />
        <div className="flex flex-1 flex-col">
          <PortalTopbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
