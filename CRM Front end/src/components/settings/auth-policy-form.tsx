"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import type { AuthenticationPolicy } from "@/types/settings";

interface AuthPolicyFormProps {
  policy: AuthenticationPolicy;
  onSave: (data: Partial<AuthenticationPolicy>) => void;
  loading?: boolean;
}

export function AuthPolicyForm({ policy, onSave, loading = false }: AuthPolicyFormProps) {
  const [resetFrequencyDays, setResetFrequencyDays] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [enforceComplexity, setEnforceComplexity] = useState(false);
  const [minLength, setMinLength] = useState(8);
  const [idleTimeout, setIdleTimeout] = useState(30);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [enforce2fa, setEnforce2fa] = useState(false);
  const [rememberDeviceDays, setRememberDeviceDays] = useState(0);
  // SSO
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoProvider, setSsoProvider] = useState("");
  const [ssoEntityId, setSsoEntityId] = useState("");
  const [ssoLoginUrl, setSsoLoginUrl] = useState("");
  const [ssoCertificate, setSsoCertificate] = useState("");

  useEffect(() => {
    if (policy) {
      setResetFrequencyDays(policy.password_reset_frequency_days);
      setHistoryCount(policy.password_history_count);
      setEnforceComplexity(policy.enforce_password_complexity);
      setMinLength(policy.min_password_length);
      setIdleTimeout(policy.idle_session_timeout_minutes);
      setMaxConcurrent(policy.max_concurrent_sessions);
      setEnforce2fa(policy.enforce_2fa);
      setRememberDeviceDays(policy.remember_device_days);
      setSsoEnabled(policy.sso_enabled ?? false);
      setSsoProvider(policy.sso_provider ?? "");
      setSsoEntityId(policy.sso_entity_id ?? "");
      setSsoLoginUrl(policy.sso_login_url ?? "");
      setSsoCertificate(policy.sso_certificate ?? "");
    }
  }, [policy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      password_reset_frequency_days: resetFrequencyDays,
      password_history_count: historyCount,
      enforce_password_complexity: enforceComplexity,
      min_password_length: minLength,
      idle_session_timeout_minutes: idleTimeout,
      max_concurrent_sessions: maxConcurrent,
      enforce_2fa: enforce2fa,
      remember_device_days: rememberDeviceDays,
      sso_enabled: ssoEnabled,
      sso_provider: ssoProvider,
      sso_entity_id: ssoEntityId,
      sso_login_url: ssoLoginUrl,
      sso_certificate: ssoCertificate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reset-freq">Reset Frequency (days)</Label>
              <Input
                id="reset-freq"
                type="number"
                min={0}
                value={resetFrequencyDays}
                onChange={(e) => setResetFrequencyDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of days before users must reset their password. 0 = never.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history-count">Password History Count</Label>
              <Input
                id="history-count"
                type="number"
                min={0}
                value={historyCount}
                onChange={(e) => setHistoryCount(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of previous passwords to remember and prevent reuse.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-length">Minimum Password Length</Label>
              <Input
                id="min-length"
                type="number"
                min={6}
                max={128}
                value={minLength}
                onChange={(e) => setMinLength(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="enforce-complexity"
                checked={enforceComplexity}
                onChange={(e) => setEnforceComplexity(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="enforce-complexity">
                Enforce Password Complexity
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="idle-timeout">Idle Session Timeout (minutes)</Label>
              <Input
                id="idle-timeout"
                type="number"
                min={1}
                value={idleTimeout}
                onChange={(e) => setIdleTimeout(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minutes of inactivity before the session is automatically ended.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-concurrent">Max Concurrent Sessions</Label>
              <Input
                id="max-concurrent"
                type="number"
                min={1}
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of simultaneous active sessions per user.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="enforce-2fa"
                checked={enforce2fa}
                onChange={(e) => setEnforce2fa(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="enforce-2fa">
                Enforce 2FA for All Staff
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remember-device">Remember Device (days)</Label>
              <Input
                id="remember-device"
                type="number"
                min={0}
                value={rememberDeviceDays}
                onChange={(e) => setRememberDeviceDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Days to trust a device after 2FA verification. 0 = always ask.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Single Sign-On (SSO)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sso-enabled"
              checked={ssoEnabled}
              onChange={(e) => setSsoEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="sso-enabled">Enable SSO</Label>
          </div>

          {ssoEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sso-provider">SSO Provider</Label>
                <Input
                  id="sso-provider"
                  value={ssoProvider}
                  onChange={(e) => setSsoProvider(e.target.value)}
                  placeholder="e.g. okta, azure_ad, google"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sso-entity-id">Entity ID</Label>
                <Input
                  id="sso-entity-id"
                  value={ssoEntityId}
                  onChange={(e) => setSsoEntityId(e.target.value)}
                  placeholder="https://idp.example.com/entity"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sso-login-url">Login URL</Label>
                <Input
                  id="sso-login-url"
                  value={ssoLoginUrl}
                  onChange={(e) => setSsoLoginUrl(e.target.value)}
                  placeholder="https://idp.example.com/sso/saml"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sso-certificate">Certificate (PEM)</Label>
                <textarea
                  id="sso-certificate"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm font-mono"
                  rows={4}
                  value={ssoCertificate}
                  onChange={(e) => setSsoCertificate(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the IdP&apos;s X.509 signing certificate in PEM format.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Policy"}
        </Button>
      </div>
    </form>
  );
}
