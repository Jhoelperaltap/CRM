"use client";

import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg shadow-lg">
              EJ
            </div>
          </div>
          <h1 className="text-2xl font-bold">EJFLOW Client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client Portal Access
          </p>
        </div>
        <PortalLoginForm />
      </div>
    </div>
  );
}
