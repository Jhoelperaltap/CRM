"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalLogout } from "@/lib/api/portal";

export function PortalTopbar() {
  const router = useRouter();
  const contact = usePortalAuthStore((s) => s.contact);
  const clear = usePortalAuthStore((s) => s.clear);

  const handleLogout = async () => {
    try {
      await portalLogout();
    } catch {
      // ignore
    }
    clear();
    router.replace("/portal/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-xs">
          EJ
        </div>
        <span className="text-sm font-medium">EJFLOW Client</span>
      </div>
      <div className="flex items-center gap-4">
        {contact && (
          <span className="text-sm text-muted-foreground">
            {contact.first_name} {contact.last_name}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1 size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
