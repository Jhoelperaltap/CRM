"use client";

import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { PortalModules } from "@/types/portal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ModuleGuardProps {
  module: keyof PortalModules;
  children: React.ReactNode;
}

/**
 * Protects a route based on module access.
 * If the module is not enabled for the user, shows an access denied message.
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const hasHydrated = usePortalAuthStore((s) => s._hasHydrated);
  const isModuleEnabled = usePortalAuthStore((s) => s.isModuleEnabled);

  // Wait for store hydration
  if (!hasHydrated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Check if module is enabled
  if (!isModuleEnabled(module)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              This module is not enabled for your account. Please contact your
              administrator if you believe this is an error.
            </p>
            <Button asChild>
              <Link href="/portal/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
