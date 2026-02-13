"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuthPolicy, updateAuthPolicy } from "@/lib/api/settings";
import type { AuthenticationPolicy } from "@/types/settings";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AuthPolicyForm } from "@/components/settings/auth-policy-form";

export default function AuthPolicyPage() {
  const [policy, setPolicy] = useState<AuthenticationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPolicy = useCallback(async () => {
    try {
      const data = await getAuthPolicy();
      setPolicy(data);
    } catch (err) {
      console.error("Failed to load auth policy", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const handleSave = async (data: Partial<AuthenticationPolicy>) => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateAuthPolicy(data);
      setPolicy(updated);
      setMessage({ type: "success", text: "Authentication policy saved successfully." });
    } catch (err) {
      console.error("Failed to save auth policy", err);
      setMessage({ type: "error", text: "Failed to save authentication policy." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Authentication Policy"
        description="Configure password requirements and session settings"
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
      ) : policy ? (
        <AuthPolicyForm policy={policy} onSave={handleSave} loading={saving} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          Unable to load authentication policy.
        </p>
      )}
    </div>
  );
}
