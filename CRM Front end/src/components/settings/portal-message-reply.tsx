"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { replyPortalMessage } from "@/lib/api/settings";
import type { StaffPortalMessage } from "@/types/settings";

interface PortalMessageReplyProps {
  message: StaffPortalMessage;
  onReplied: (reply: StaffPortalMessage) => void;
}

export function PortalMessageReply({
  message,
  onReplied,
}: PortalMessageReplyProps) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const reply = await replyPortalMessage(message.id, {
        body,
        ...(subject ? { subject } : {}),
      });
      onReplied(reply);
      setBody("");
      setSubject("");
    } catch {
      setError("Failed to send reply.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reply to {message.contact_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reply-subject">Subject (optional)</Label>
            <Input
              id="reply-subject"
              placeholder={`Re: ${message.subject}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reply-body">Message</Label>
            <textarea
              id="reply-body"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Type your reply..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !body.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
