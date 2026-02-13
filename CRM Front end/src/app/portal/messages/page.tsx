"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { portalGetMessages, portalSendMessage } from "@/lib/api/portal";
import type { PortalMessage } from "@/types/portal";
import { Plus, Mail, MailOpen } from "lucide-react";

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = () => {
    setLoading(true);
    portalGetMessages()
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;
    setSending(true);
    try {
      await portalSendMessage({ subject, body });
      setSubject("");
      setBody("");
      setComposeOpen(false);
      fetchMessages();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="mr-1 size-4" /> New Message
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <Link
              key={msg.id}
              href={`/portal/messages/${msg.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              {msg.is_read ? (
                <MailOpen className="size-5 text-muted-foreground" />
              ) : (
                <Mail className="size-5 text-primary" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${!msg.is_read ? "font-bold" : ""}`}>
                    {msg.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {msg.message_type === "client_to_staff" ? "Sent" : `From: ${msg.sender_name}`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Compose dialog */}
      <Dialog open={composeOpen} onOpenChange={(v) => !v && setComposeOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
