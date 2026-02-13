"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verify2FARecovery } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

interface RecoveryCodeInputProps {
  onSuccess: () => void;
  onSwitchToCode: () => void;
}

export function RecoveryCodeInput({
  onSuccess,
  onSwitchToCode,
}: RecoveryCodeInputProps) {
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tempToken = useAuthStore((s) => s.tempToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);
    setLoading(true);
    try {
      await verify2FARecovery(tempToken, recoveryCode);
      onSuccess();
    } catch {
      setError("Invalid recovery code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Recovery Code</CardTitle>
        <p className="text-muted-foreground text-sm">
          Enter one of your 8-character recovery codes
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="recovery-code">Recovery Code</Label>
            <Input
              id="recovery-code"
              type="text"
              placeholder="XXXXXXXX"
              maxLength={8}
              value={recoveryCode}
              onChange={(e) =>
                setRecoveryCode(e.target.value.toUpperCase().slice(0, 8))
              }
              className="text-center text-xl tracking-widest font-mono"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || recoveryCode.length !== 8}
          >
            {loading ? "Verifying..." : "Verify Recovery Code"}
          </Button>

          <button
            type="button"
            onClick={onSwitchToCode}
            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Use authenticator code instead
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
