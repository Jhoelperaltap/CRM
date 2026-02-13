"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createQuote } from "@/lib/api/quotes";
import { getContacts } from "@/lib/api/contacts";
import { getCorporations } from "@/lib/api/corporations";
import { getUsers } from "@/lib/api/users";
import type { ContactListItem, CorporationListItem, User } from "@/types";

interface QuickAddQuoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function QuickAddQuote({ open, onOpenChange, onCreated }: QuickAddQuoteProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [contact, setContact] = useState("");
  const [corporation, setCorporation] = useState("");
  const [stage, setStage] = useState("draft");
  const [validUntil, setValidUntil] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (open) {
      getContacts().then((res) => setContacts(res.results)).catch(console.error);
      getCorporations().then((res) => setCorporations(res.results)).catch(console.error);
      getUsers().then((res) => setUsers(res.results)).catch(console.error);
    }
  }, [open]);

  const resetForm = () => {
    setSubject("");
    setContact("");
    setCorporation("");
    setStage("draft");
    setValidUntil("");
    setAssignedTo("");
    setError("");
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!contact) {
      setError("Contact is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        subject: subject.trim(),
        contact,
        stage,
      };
      if (corporation) payload.corporation = corporation;
      if (validUntil) payload.valid_until = validUntil;
      if (assignedTo) payload.assigned_to = assignedTo;

      await createQuote(payload);
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      setError("Failed to create quote. Please check the data and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewFullForm = () => {
    onOpenChange(false);
    router.push("/quotes/new");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quote subject"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Contact <span className="text-destructive">*</span></Label>
            <Select value={contact} onValueChange={setContact}>
              <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Corporation</Label>
            <Select value={corporation} onValueChange={(v) => setCorporation(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select corporation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {corporations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={handleViewFullForm}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            View full form
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
