"use client";

import { usePathname } from "next/navigation";
import { usePortalAuth } from "@/hooks/use-portal-auth";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalTopbar } from "@/components/portal/portal-topbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/portal/login";

  // Don't require auth on the login page
  const { isAuthenticated, hasHydrated } = usePortalAuth(
    isLoginPage ? "" : "/portal/login"
  );

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

  // Redirect is in progress
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-background">
      <PortalSidebar />
      <div className="flex flex-1 flex-col">
        <PortalTopbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
