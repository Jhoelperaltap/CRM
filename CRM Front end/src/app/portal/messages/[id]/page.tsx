"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  portalGetMessage,
  portalGetMessages,
  portalMarkMessageRead,
  portalSendMessage,
} from "@/lib/api/portal";
import { MessageThread } from "@/components/portal/message-thread";
import type { PortalMessage } from "@/types/portal";
import { ArrowLeft } from "lucide-react";

export default function PortalMessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState<PortalMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const msg = await portalGetMessage(id);
        setMessage(msg);

        // Mark as read
        if (!msg.is_read) {
          await portalMarkMessageRead(id);
        }

        // Get all messages and filter thread
        const allMessages = await portalGetMessages();
        const thread = allMessages.filter(
          (m) =>
            m.id === id ||
            m.parent_message === id ||
            (msg.parent_message && (m.id === msg.parent_message || m.parent_message === msg.parent_message))
        );
        thread.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setThreadMessages(thread);
      } catch {
        setMessage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody || !message) return;
    setSending(true);
    try {
      const reply = await portalSendMessage({
        subject: `Re: ${message.subject}`,
        body: replyBody,
        parent_message: message.id,
        case: message.case || undefined,
      });
      setThreadMessages((prev) => [...prev, reply]);
      setReplyBody("");
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!message) {
    return <p className="text-muted-foreground">Message not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/portal/messages"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Messages
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-4 text-lg font-bold">{message.subject}</h1>
        <MessageThread messages={threadMessages} />
      </div>

      {/* Reply form */}
      <form onSubmit={handleReply} className="rounded-lg border bg-card p-4">
        <textarea
          className="border-input bg-background mb-3 w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Type your reply..."
          required
        />
        <Button type="submit" disabled={sending} size="sm">
          {sending ? "Sending..." : "Reply"}
        </Button>
      </form>
    </div>
  );
}
