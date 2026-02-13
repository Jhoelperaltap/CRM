"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMessages } from "@/lib/api/emails";
import { EmailMessageListItem } from "@/types/email";

interface EmailTimelineProps {
  contactId?: string;
  caseId?: string;
}

export function EmailTimeline({ contactId, caseId }: EmailTimelineProps) {
  const [messages, setMessages] = useState<EmailMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (contactId) params.contact = contactId;
    if (caseId) params.case = caseId;
    if (!contactId && !caseId) return;

    getMessages(params)
      .then((data) => setMessages(data.results))
      .finally(() => setLoading(false));
  }, [contactId, caseId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading emails...</p>;
  }

  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">No emails linked.</p>;
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex items-start gap-3 rounded-md border px-3 py-2",
            !msg.is_read && "bg-muted/20"
          )}
        >
          <Mail className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {msg.direction === "inbound"
                  ? msg.from_address
                  : `To: ${msg.to_addresses[0] || ""}`}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {msg.direction}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {msg.subject || "(no subject)"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
