"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setup2FA, verifySetup2FA } from "@/lib/api/settings";

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"qr" | "verify" | "codes">("qr");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await setup2FA();
      setSecret(data.secret);
      setQrCode(data.qr_code);
      setStep("qr");
    } catch {
      setError("Failed to start 2FA setup.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await verifySetup2FA(code);
      setRecoveryCodes(data.recovery_codes);
      setStep("codes");
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Show QR code
  if (step === "qr" && !qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Two-factor authentication adds an extra layer of security to your
            account. You'll need an authenticator app like Google Authenticator
            or Authy.
          </p>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button onClick={handleStartSetup} disabled={loading}>
            {loading ? "Starting..." : "Begin Setup"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "qr" && qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your authenticator app, then enter the
            6-digit code below.
          </p>
          <div className="flex justify-center">
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="TOTP QR Code"
              className="rounded-lg border"
              width={200}
              height={200}
            />
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-1">
              Can't scan? Enter this code manually:
            </p>
            <code className="text-sm font-mono break-all">{secret}</code>
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="setup-code">Verification Code</Label>
              <Input
                id="setup-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-xl tracking-widest"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify & Enable"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Show recovery codes
  return (
    <Card>
      <CardHeader>
        <CardTitle>Save Your Recovery Codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Save these codes in a safe place. Each code can only be used once.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {recoveryCodes.map((rc, i) => (
              <code
                key={i}
                className="rounded bg-white px-2 py-1 text-sm font-mono text-center border"
              >
                {rc}
              </code>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ack-codes"
            checked={codesAcknowledged}
            onChange={(e) => setCodesAcknowledged(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="ack-codes" className="text-sm">
            I have saved these recovery codes
          </Label>
        </div>
        <Button
          className="w-full"
          disabled={!codesAcknowledged}
          onClick={onComplete}
        >
          Done
        </Button>
      </CardContent>
    </Card>
  );
}
