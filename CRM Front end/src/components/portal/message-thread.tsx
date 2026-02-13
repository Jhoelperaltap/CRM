"use client";

import type { PortalMessage } from "@/types/portal";
import { cn } from "@/lib/utils";

interface Props {
  messages: PortalMessage[];
}

export function MessageThread({ messages }: Props) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isClient = msg.message_type === "client_to_staff";
        return (
          <div
            key={msg.id}
            className={cn(
              "max-w-[80%] rounded-lg p-3",
              isClient
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={cn("text-xs font-medium", isClient ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {msg.sender_name || "You"}
              </span>
              <span className={cn("text-xs", isClient ? "text-primary-foreground/60" : "text-muted-foreground")}>
                {new Date(msg.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
          </div>
        );
      })}
    </div>
  );
}
