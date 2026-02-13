"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";
import { TwoFactorDisable } from "@/components/settings/two-factor-disable";
import { get2FAStatus } from "@/lib/api/settings";
import type { TwoFactorStatus } from "@/types/settings";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export default function TwoFactorPage() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await get2FAStatus();
      setStatus(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load 2FA status." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSetupComplete = () => {
    setShowSetup(false);
    setMessage({
      type: "success",
      text: "Two-factor authentication has been enabled.",
    });
    fetchStatus();
  };

  const handleDisabled = () => {
    setShowDisable(false);
    setMessage({
      type: "success",
      text: "Two-factor authentication has been disabled.",
    });
    fetchStatus();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
      />

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : showSetup ? (
        <TwoFactorSetup onComplete={handleSetupComplete} />
      ) : showDisable ? (
        <TwoFactorDisable onDisabled={handleDisabled} />
      ) : status ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.is_enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
              )}
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm">Two-Factor Authentication:</span>
              <Badge
                variant={status.is_enabled ? "default" : "outline"}
                className={
                  status.is_enabled
                    ? "bg-green-100 text-green-800 border-0"
                    : "bg-yellow-100 text-yellow-800 border-0"
                }
              >
                {status.is_enabled ? "Enabled" : "Not Enabled"}
              </Badge>
            </div>
            {status.enforce_required && !status.is_enabled && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                Your organization requires two-factor authentication. Please
                set it up as soon as possible.
              </div>
            )}
            <div>
              {status.is_enabled ? (
                <button
                  onClick={() => setShowDisable(true)}
                  className="text-sm text-destructive hover:underline"
                >
                  Disable two-factor authentication
                </button>
              ) : (
                <button
                  onClick={() => setShowSetup(true)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Set up two-factor authentication
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          Unable to load 2FA status.
        </p>
      )}
    </div>
  );
}
