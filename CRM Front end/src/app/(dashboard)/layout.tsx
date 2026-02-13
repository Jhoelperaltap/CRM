"use client";

import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { SessionTimeoutProvider } from "@/providers/session-timeout-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

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
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
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
