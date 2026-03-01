"use client";

import { useEffect, useState } from "react";
import { Eye, X, Clock, AlertTriangle } from "lucide-react";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImpersonationBanner() {
  const impersonation = usePortalAuthStore((s) => s.impersonation);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (impersonation?.remaining_minutes) {
      setRemainingMinutes(impersonation.remaining_minutes);

      // Update remaining time every minute
      const interval = setInterval(() => {
        setRemainingMinutes((prev) => Math.max(0, prev - 1));
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [impersonation?.remaining_minutes]);

  // Don't show if not impersonating or dismissed
  if (!impersonation?.is_impersonating || dismissed) {
    return null;
  }

  const isExpiringSoon = remainingMinutes <= 10;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 text-sm",
        isExpiringSoon
          ? "bg-amber-500 text-amber-950"
          : "bg-blue-600 text-white"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isExpiringSoon ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          <span className="font-medium">Impersonation Mode</span>
        </div>
        <span className="hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          Admin <strong>{impersonation.admin_name}</strong> is viewing this
          portal as <strong>{impersonation.contact_name}</strong>
        </span>
        <span className="sm:hidden">
          by {impersonation.admin_name}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="size-3.5" />
          <span>
            {remainingMinutes > 0
              ? `${remainingMinutes} min remaining`
              : "Expired"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-6",
            isExpiringSoon
              ? "text-amber-950 hover:bg-amber-600"
              : "text-white hover:bg-blue-700"
          )}
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
