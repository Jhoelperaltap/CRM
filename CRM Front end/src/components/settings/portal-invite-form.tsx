"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { invitePortalClient } from "@/lib/api/settings";
import type { StaffPortalAccessDetail } from "@/types/settings";

interface PortalInviteFormProps {
  onSuccess: (access: StaffPortalAccessDetail) => void;
}

export function PortalInviteForm({ onSuccess }: PortalInviteFormProps) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StaffPortalAccessDetail | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await invitePortalClient({
        contact: contactId,
        ...(email ? { email } : {}),
      });
      setResult(data);
      onSuccess(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to invite client.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setContactId("");
    setEmail("");
    setError(null);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Client to Portal</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              Portal access created for{" "}
              <span className="font-medium">{result.contact_name}</span>.
            </p>
            {result.temp_password && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-sm font-medium text-yellow-800">
                  Temporary Password
                </p>
                <code className="mt-1 block text-sm font-mono text-yellow-900">
                  {result.temp_password}
                </code>
                <p className="mt-1 text-xs text-yellow-700">
                  Share this password with the client securely. It cannot be
                  retrieved later.
                </p>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="contact-id">Contact ID</Label>
              <Input
                id="contact-id"
                placeholder="UUID of the contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the UUID of the contact to invite.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email (optional)</Label>
              <Input
                id="portal-email"
                type="email"
                placeholder="Override contact email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the contact&apos;s existing email.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Inviting..." : "Send Invitation"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
