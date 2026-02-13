"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invitePortalClient } from "@/lib/api/settings";
import { Copy, CheckCircle, AlertCircle, Loader2, Smartphone } from "lucide-react";

interface PortalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  onSuccess?: () => void;
}

export function PortalAccessDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  onSuccess,
}: PortalAccessDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(contactEmail || "");
  const [result, setResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await invitePortalClient({
        contact: contactId,
        email: email || undefined,
      });

      setResult({
        email: response.email,
        tempPassword: response.temp_password || "",
      });

      onSuccess?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; contact?: string[]; email?: string[] } } };
      const message =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.contact?.[0] ||
        axiosErr.response?.data?.email?.[0] ||
        "Failed to create portal access";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `Email: ${result.email}\nPassword: ${result.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    setEmail(contactEmail || "");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Grant Portal Access
          </DialogTitle>
          <DialogDescription>
            Allow <strong>{contactName}</strong> to access the mobile app with their email and password.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Access Created</AlertTitle>
              <AlertDescription className="text-green-700">
                Share these credentials securely with the client.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-mono text-sm">{result.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Temporary Password
                </Label>
                <p className="font-mono text-sm font-bold">{result.tempPassword}</p>
              </div>
            </div>

            <Alert variant="destructive" className="border-amber-500 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                This password cannot be retrieved later. Make sure to copy it now.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Credentials
                  </>
                )}
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={contactEmail || "Enter email address"}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the contact&apos;s email: {contactEmail || "(no email)"}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || (!email && !contactEmail)}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Access
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
