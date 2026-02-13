"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  Clock,
  Inbox,
  Mail,
  MailOpen,
  MoreHorizontal,
  PenSquare,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  User,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getMessages, markRead, markUnread, toggleStar, moveToTrash } from "@/lib/api/emails";
import { EmailMessageListItem } from "@/types/email";

const folders = [
  { key: "inbox", label: "Inbox", icon: Inbox, count: 0 },
  { key: "sent", label: "Sent", icon: Send, count: 0 },
  { key: "drafts", label: "Drafts", icon: PenSquare, count: 0 },
  { key: "starred", label: "Starred", icon: Star, count: 0 },
  { key: "trash", label: "Trash", icon: Trash2, count: 0 },
] as const;

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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }
}

export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<EmailMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { folder: activeFolder };
      if (search) params.search = search;
      if (activeFolder === "starred") {
        params.is_starred = "true";
        delete params.folder;
      }
      const data = await getMessages(params);
      setMessages(data.results);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeFolder, search]);

  useEffect(() => {
    fetchMessages();
    setSelectedIds(new Set());
  }, [fetchMessages]);

  const handleToggleStar = async (e: React.MouseEvent, msg: EmailMessageListItem) => {
    e.stopPropagation();
    try {
      await toggleStar(msg.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_starred: !m.is_starred } : m))
      );
    } catch {
      // ignore
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  };

  const handleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleMarkAsRead = async () => {
    for (const id of selectedIds) {
      await markRead(id);
    }
    fetchMessages();
    setSelectedIds(new Set());
  };

  const handleMarkAsUnread = async () => {
    for (const id of selectedIds) {
      await markUnread(id);
    }
    fetchMessages();
    setSelectedIds(new Set());
  };

  const handleMoveToTrash = async () => {
    for (const id of selectedIds) {
      await moveToTrash(id);
    }
    fetchMessages();
    setSelectedIds(new Set());
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="p-3">
          <Button
            className="w-full justify-start gap-2 shadow-md"
            onClick={() => router.push("/inbox/compose")}
          >
            <PenSquare className="size-4" />
            Compose
          </Button>
        </div>

        <nav className="flex-1 px-2 py-1">
          {folders.map((f) => {
            const Icon = f.icon;
            const isActive = activeFolder === f.key;
            const showBadge = f.key === "inbox" && unreadCount > 0;

            return (
              <button
                key={f.key}
                onClick={() => setActiveFolder(f.key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all w-full text-left mb-0.5",
                  "hover:bg-accent",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4", isActive && f.key === "inbox" && "text-primary")} />
                <span className="flex-1">{f.label}</span>
                {showBadge && (
                  <Badge
                    variant="default"
                    className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Storage indicator placeholder */}
        <div className="border-t p-3">
          <div className="text-xs text-muted-foreground">
            <div className="flex justify-between mb-1">
              <span>Storage</span>
              <span>2.5 GB of 15 GB</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[17%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b px-4 py-2 bg-card">
          <TooltipProvider>
            {/* Select all checkbox */}
            <div className="flex items-center">
              <Checkbox
                checked={messages.length > 0 && selectedIds.size === messages.length}
                onCheckedChange={handleSelectAll}
                className="mr-2"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSelectedIds(new Set(messages.map((m) => m.id)))}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedIds(new Set())}>
                    None
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedIds(new Set(messages.filter((m) => !m.is_read).map((m) => m.id)))}>
                    Unread
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedIds(new Set(messages.filter((m) => m.is_starred).map((m) => m.id)))}>
                    Starred
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Actions */}
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-1 border-l pl-2 ml-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMarkAsRead}>
                      <MailOpen className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as read</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMarkAsUnread}>
                      <Mail className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as unread</TooltipContent>
                </Tooltip>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleMoveToTrash}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleMarkAsRead}>Mark as read</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMarkAsUnread}>Mark as unread</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleMoveToTrash} className="text-destructive">
                      Move to trash
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchMessages}>
                    <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {/* Search */}
          <div className="flex-1 max-w-xl ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search in emails"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <RefreshCw className="size-8 animate-spin mb-3" />
              <span>Loading emails...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Mail className="size-12 mb-3 opacity-50" />
              <span className="text-lg font-medium">No messages</span>
              <span className="text-sm">Your {activeFolder} is empty</span>
            </div>
          ) : (
            <div>
              {messages.map((msg) => {
                const isSelected = selectedIds.has(msg.id);
                const sender = msg.direction === "inbound" ? msg.from_address : msg.to_addresses[0];
                const senderName = sender?.split("@")[0] || "Unknown";

                return (
                  <div
                    key={msg.id}
                    onClick={() => router.push(`/inbox/${msg.thread || msg.id}`)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer transition-colors group",
                      "hover:bg-muted/50",
                      !msg.is_read && "bg-primary/5",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    {/* Checkbox */}
                    <div onClick={(e) => handleSelect(e, msg.id)}>
                      <Checkbox checked={isSelected} className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100" />
                    </div>

                    {/* Star */}
                    <button
                      onClick={(e) => handleToggleStar(e, msg)}
                      className="shrink-0"
                    >
                      <Star
                        className={cn(
                          "size-4 transition-colors",
                          msg.is_starred
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/50 hover:text-yellow-400"
                        )}
                      />
                    </button>

                    {/* Avatar */}
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs",
                        !msg.is_read ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {getInitials(sender || "?")}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {/* Sender */}
                      <span className={cn(
                        "w-40 shrink-0 truncate text-sm",
                        !msg.is_read ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}>
                        {senderName}
                      </span>

                      {/* Subject & Preview */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={cn(
                          "truncate text-sm",
                          !msg.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {msg.subject || "(no subject)"}
                        </span>
                      </div>
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.attachment_count > 0 && (
                        <Paperclip className="size-3.5 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-xs whitespace-nowrap",
                        !msg.is_read ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {msg.sent_at ? formatDate(msg.sent_at) : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
