"use client";

import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Client Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ebenezer Tax Services
          </p>
        </div>
        <PortalLoginForm />
      </div>
    </div>
  );
}
