"use client";

import { useAuth } from "@/hooks/use-auth";
import { MegaMenuSidebar } from "@/components/layout/mega-menu-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { SessionTimeoutProvider } from "@/providers/session-timeout-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // verifyOnMount=true ensures session is validated with the server on page load
  // This prevents stale sessions from showing a blank page
  const { isAuthenticated, isLoading } = useAuth("/login", true);

  // Show nothing while hydrating auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Render nothing while redirecting to login
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SessionTimeoutProvider>
      <div className="relative flex min-h-screen bg-background">
        {/* Mega Menu Sidebar */}
        <MegaMenuSidebar />

        {/* Main content area */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            "lg:ml-[68px]" // Fixed width for mega-menu sidebar (desktop only)
          )}
        >
          {/* Top bar */}
          <Topbar />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionTimeoutProvider>
  );
}
