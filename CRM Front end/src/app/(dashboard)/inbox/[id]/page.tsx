"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Forward,
  MoreHorizontal,
  Paperclip,
  Printer,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  User,
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getThread, markRead, toggleStar, moveToTrash } from "@/lib/api/emails";
import { EmailThreadDetail, EmailMessageDetail } from "@/types/email";

function getInitials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return FileImage;
  if (["pdf"].includes(ext || "")) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext || "")) return FileSpreadsheet;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [thread, setThread] = useState<EmailThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [isStarred, setIsStarred] = useState(false);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getThread(id);
      setThread(data);
      // Expand last message by default
      if (data.messages.length > 0) {
        const sortedMsgs = [...data.messages].sort(
          (a, b) => new Date(a.sent_at || a.created_at).getTime() - new Date(b.sent_at || b.created_at).getTime()
        );
        setExpandedMessages(new Set([sortedMsgs[sortedMsgs.length - 1].id]));
      }
      for (const msg of data.messages) {
        if (!msg.is_read && msg.direction === "inbound") {
          markRead(msg.id);
        }
      }
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const handleReply = (msg: EmailMessageDetail) => {
    const replyTo = msg.direction === "inbound" ? msg.from_address : msg.to_addresses[0];
    const qp = new URLSearchParams({
      to: replyTo || "",
      in_reply_to: msg.message_id,
      references: `${msg.references} ${msg.message_id}`.trim(),
      subject: msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`,
      contact: msg.contact || "",
      case: msg.case || "",
    });
    router.push(`/inbox/compose?${qp.toString()}`);
  };

  const handleReplyAll = (msg: EmailMessageDetail) => {
    const allRecipients = [
      ...(msg.direction === "inbound" ? [msg.from_address] : []),
      ...msg.to_addresses,
      ...msg.cc_addresses,
    ].filter((e, i, arr) => arr.indexOf(e) === i);

    const qp = new URLSearchParams({
      to: allRecipients.join(", "),
      in_reply_to: msg.message_id,
      references: `${msg.references} ${msg.message_id}`.trim(),
      subject: msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`,
      contact: msg.contact || "",
      case: msg.case || "",
    });
    router.push(`/inbox/compose?${qp.toString()}`);
  };

  const toggleExpand = (msgId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleToggleStar = async () => {
    if (!thread) return;
    const firstMsg = thread.messages[0];
    if (firstMsg) {
      try {
        await toggleStar(firstMsg.id);
        setIsStarred(!isStarred);
      } catch {
        // ignore
      }
    }
  };

  const handleDelete = async () => {
    if (!thread) return;
    try {
      for (const msg of thread.messages) {
        await moveToTrash(msg.id);
      }
      router.push("/inbox");
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Conversation not found</p>
          <Button variant="link" onClick={() => router.push("/inbox")}>
            Return to inbox
          </Button>
        </div>
      </div>
    );
  }

  const sortedMessages = [...thread.messages].sort(
    (a, b) => new Date(a.sent_at || a.created_at).getTime() - new Date(b.sent_at || b.created_at).getTime()
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-card shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/inbox")}>
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to inbox</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1 border-l pl-2 ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Archive className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                  <Printer className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Add star</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thread Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Subject */}
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-1">
                <h1 className="text-xl font-semibold mb-1">
                  {thread.subject || "(no subject)"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{thread.message_count} message{thread.message_count !== 1 && "s"}</span>
                  {thread.contact_name && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <Badge variant="outline" className="font-normal">
                        <User className="size-3 mr-1" />
                        {thread.contact_name}
                      </Badge>
                    </>
                  )}
                  {thread.case_title && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <Badge variant="secondary" className="font-normal">
                        {thread.case_title}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleStar}
              >
                <Star className={cn(
                  "size-4",
                  isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )} />
              </Button>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {sortedMessages.map((msg, idx) => {
                const isExpanded = expandedMessages.has(msg.id);
                const isLast = idx === sortedMessages.length - 1;
                const sender = msg.from_address;
                const senderName = sender?.split("@")[0] || "Unknown";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-lg border bg-card overflow-hidden transition-shadow",
                      isExpanded && "shadow-sm"
                    )}
                  >
                    {/* Message Header */}
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        !isExpanded && "border-b-0"
                      )}
                      onClick={() => toggleExpand(msg.id)}
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className={cn(
                          msg.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {getInitials(sender || "?")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{senderName}</span>
                          {msg.direction === "outbound" && (
                            <Badge variant="secondary" className="text-xs h-5">
                              Sent
                            </Badge>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground truncate">
                            {msg.body_text?.slice(0, 100)}...
                          </p>
                        )}
                        {isExpanded && (
                          <p className="text-xs text-muted-foreground">
                            to {msg.to_addresses.join(", ")}
                            {msg.cc_addresses.length > 0 && `, cc: ${msg.cc_addresses.join(", ")}`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {msg.attachments.length > 0 && (
                          <Paperclip className="size-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {msg.sent_at ? formatShortDate(msg.sent_at) : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t">
                        {/* Full date */}
                        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                          {msg.sent_at ? formatDate(msg.sent_at) : "Date unknown"}
                        </div>

                        {/* Body */}
                        <div className="px-4 py-4">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent p-0 m-0">
                              {msg.body_text}
                            </pre>
                          </div>
                        </div>

                        {/* Attachments */}
                        {msg.attachments.length > 0 && (
                          <div className="px-4 py-3 border-t bg-muted/20">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              {msg.attachments.length} attachment{msg.attachments.length !== 1 && "s"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.attachments.map((att) => {
                                const Icon = getFileIcon(att.filename);
                                return (
                                  <a
                                    key={att.id}
                                    href={att.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 hover:bg-muted/50 transition-colors group"
                                  >
                                    <Icon className="size-5 text-muted-foreground" />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium truncate max-w-[150px]">
                                        {att.filename}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatFileSize(att.file_size)}
                                      </span>
                                    </div>
                                    <Download className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="px-4 py-3 border-t flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(msg);
                            }}
                          >
                            <Reply className="size-4" />
                            Reply
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplyAll(msg);
                            }}
                          >
                            <ReplyAll className="size-4" />
                            Reply all
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2" disabled>
                            <Forward className="size-4" />
                            Forward
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Reply (for last message) */}
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-12 text-muted-foreground"
                onClick={() => handleReply(sortedMessages[sortedMessages.length - 1])}
              >
                <Reply className="size-4" />
                Click here to Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
