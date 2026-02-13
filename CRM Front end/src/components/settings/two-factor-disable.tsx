"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { disable2FA } from "@/lib/api/settings";

interface TwoFactorDisableProps {
  onDisabled: () => void;
}

export function TwoFactorDisable({ onDisabled }: TwoFactorDisableProps) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await disable2FA(password, code);
      onDisabled();
    } catch {
      setError("Failed to disable 2FA. Check your password and code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disable Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your password and a current 2FA code to disable two-factor
            authentication.
          </p>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disable-code">2FA Code</Label>
            <Input
              id="disable-code"
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
            variant="destructive"
            className="w-full"
            disabled={loading || !password || code.length !== 6}
          >
            {loading ? "Disabling..." : "Disable 2FA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
