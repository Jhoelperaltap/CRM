"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";
import { RecoveryCodeInput } from "@/components/auth/recovery-code-input";
import { Clock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"credentials" | "totp" | "recovery">(
    "credentials"
  );
  const requires2FA = useAuthStore((s) => s.requires2FA);

  // Check for session-related messages in URL
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_timeout") {
      setSessionTimeoutMessage("Your session has expired due to inactivity. Please sign in again.");
      // Clean up URL
      router.replace("/login", { scroll: false });
    } else if (reason === "session_terminated") {
      setSessionTimeoutMessage("Your session was terminated because you logged in from another device.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const result = await login(data.email, data.password);
      if ("requires_2fa" in result && result.requires_2fa) {
        setStep("totp");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid email or password");
    }
  };

  const handle2FASuccess = () => {
    router.push("/dashboard");
  };

  // Show 2FA verification step
  if (step === "totp" || requires2FA) {
    return (
      <TwoFactorVerify
        onSuccess={handle2FASuccess}
        onSwitchToRecovery={() => setStep("recovery")}
      />
    );
  }

  // Show recovery code input
  if (step === "recovery") {
    return (
      <RecoveryCodeInput
        onSuccess={handle2FASuccess}
        onSwitchToCode={() => setStep("totp")}
      />
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Ebenezer Tax Services
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Sign in to your CRM account
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {sessionTimeoutMessage && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-md p-3 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              {sessionTimeoutMessage}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
