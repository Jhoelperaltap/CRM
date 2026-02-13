"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PortalMessageReply } from "@/components/settings/portal-message-reply";
import { getPortalMessages } from "@/lib/api/settings";
import type { StaffPortalMessage } from "@/types/settings";
import { MessageSquare, ArrowRight, ArrowLeft } from "lucide-react";

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<StaffPortalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffPortalMessage | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getPortalMessages();
      setMessages(data.results);
    } catch {
      setMessage({ type: "error", text: "Failed to load messages." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleReplied = (reply: StaffPortalMessage) => {
    setMessages((prev) => [reply, ...prev]);
    setSelected(null);
    setMessage({ type: "success", text: "Reply sent." });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal Messages"
        description="View and reply to client portal messages"
      />

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No messages found.
              </p>
            ) : (
              messages.map((msg) => (
                <Card
                  key={msg.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    selected?.id === msg.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelected(msg)}
                >
                  <CardContent className="flex items-start gap-3 py-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {msg.subject}
                        </span>
                        {!msg.is_read && (
                          <Badge
                            variant="default"
                            className="shrink-0 text-[10px] px-1.5 py-0"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{msg.contact_name}</span>
                        {msg.message_type === "client_to_staff" ? (
                          <ArrowRight className="h-3 w-3" />
                        ) : (
                          <ArrowLeft className="h-3 w-3" />
                        )}
                        <span>
                          {msg.message_type === "client_to_staff"
                            ? "Staff"
                            : msg.sender_name || "Staff"}
                        </span>
                        <span className="ml-auto">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div>
            {selected ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">{selected.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        From: {selected.contact_name} &middot;{" "}
                        {new Date(selected.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
                  </CardContent>
                </Card>
                {selected.message_type === "client_to_staff" && (
                  <PortalMessageReply
                    message={selected}
                    onReplied={handleReplied}
                  />
                )}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                Select a message to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
