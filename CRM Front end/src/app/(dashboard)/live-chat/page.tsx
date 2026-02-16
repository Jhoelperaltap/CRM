"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Send,
  Phone,
  Mail,
  X,
  MoreVertical,
  UserPlus,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  chatStatsApi,
  chatSessionApi,
  chatAgentApi,
  chatDepartmentApi,
} from "@/lib/api/live-chat";
import type {
  ChatStats,
  ChatSessionList,
  ChatSession,
  ChatMessage,
  ChatAgent,
  ChatDepartment,
} from "@/types/live-chat";

export default function LiveChatPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [sessions, setSessions] = useState<ChatSessionList[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<ChatAgent | null>(null);
  const [departments, setDepartments] = useState<ChatDepartment[]>([]);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "waiting">("all");
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{
    type: "agent" | "department";
    id: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, sessionsData, agentData, deptsData, agentsData] =
        await Promise.all([
          chatStatsApi.get(),
          chatSessionApi.list(
            filter === "mine"
              ? { mine: true }
              : filter === "waiting"
              ? { status: "waiting" }
              : {}
          ),
          chatAgentApi.me().catch(() => null),
          chatDepartmentApi.list({ is_active: true }),
          chatAgentApi.list({ is_available: true }),
        ]);
      setStats(statsData);
      setSessions(sessionsData);
      setAgentStatus(agentData);
      setDepartments(deptsData);
      setAgents(agentsData);
    } catch (err) {
      console.error("Failed to load chat data:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const loadSession = async (sessionId: string) => {
    try {
      const session = await chatSessionApi.get(sessionId);
      setSelectedSession(session);
      setMessages(session.messages);
      // Mark messages as read
      await chatSessionApi.markRead(sessionId);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await chatSessionApi.sendMessage(
        selectedSession.id,
        newMessage
      );
      setMessages([...messages, message]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptChat = async (sessionId: string) => {
    try {
      const session = await chatSessionApi.accept(sessionId);
      setSelectedSession(session);
      setMessages(session.messages);
      fetchData();
    } catch (err) {
      console.error("Failed to accept chat:", err);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedSession) return;
    try {
      await chatSessionApi.close(selectedSession.id);
      setSelectedSession(null);
      setMessages([]);
      fetchData();
    } catch (err) {
      console.error("Failed to close chat:", err);
    }
  };

  const handleTransfer = async () => {
    if (!selectedSession || !transferTarget) return;
    try {
      await chatSessionApi.transfer(selectedSession.id, {
        agent_id: transferTarget.type === "agent" ? transferTarget.id : undefined,
        department_id:
          transferTarget.type === "department" ? transferTarget.id : undefined,
      });
      setTransferDialog(false);
      setSelectedSession(null);
      fetchData();
    } catch (err) {
      console.error("Failed to transfer chat:", err);
    }
  };

  const toggleAgentStatus = async () => {
    try {
      if (agentStatus?.is_available) {
        await chatAgentApi.goOffline();
      } else {
        await chatAgentApi.goOnline();
      }
      const agent = await chatAgentApi.me();
      setAgentStatus(agent);
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-amber-500";
      case "active":
        return "bg-green-500";
      case "on_hold":
        return "bg-blue-500";
      case "closed":
        return "bg-gray-500";
      case "missed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Live Chat</h1>
          <p className="text-muted-foreground">
            Manage customer conversations in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={agentStatus?.is_available ? "default" : "outline"}
            onClick={toggleAgentStatus}
          >
            <div
              className={cn(
                "size-2 rounded-full mr-2",
                agentStatus?.is_available ? "bg-green-500" : "bg-gray-500"
              )}
            />
            {agentStatus?.is_available ? "Online" : "Offline"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" />
              <div>
                <div className="text-lg font-bold">{stats?.waiting_chats || 0}</div>
                <div className="text-xs text-muted-foreground">Waiting</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-green-500" />
              <div>
                <div className="text-lg font-bold">{stats?.active_chats || 0}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-blue-500" />
              <div>
                <div className="text-lg font-bold">{stats?.closed_today || 0}</div>
                <div className="text-xs text-muted-foreground">Closed Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-purple-500" />
              <div>
                <div className="text-lg font-bold">
                  {stats?.avg_wait_time?.split(".")[0] || "0:00"}
                </div>
                <div className="text-xs text-muted-foreground">Avg Wait</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-cyan-500" />
              <div>
                <div className="text-lg font-bold">
                  {stats?.online_agents || 0}/{stats?.total_agents || 0}
                </div>
                <div className="text-xs text-muted-foreground">Agents Online</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat List */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Conversations</CardTitle>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as typeof filter)}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mine">My Chats</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No conversations
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                      selectedSession?.id === session.id && "bg-accent"
                    )}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs">
                          {session.visitor_name?.charAt(0) || "V"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {session.visitor_name || "Anonymous"}
                          </span>
                          <div className="flex items-center gap-1">
                            {session.unread_count > 0 && (
                              <Badge className="size-5 p-0 flex items-center justify-center text-xs">
                                {session.unread_count}
                              </Badge>
                            )}
                            <div
                              className={cn(
                                "size-2 rounded-full",
                                getStatusColor(session.status)
                              )}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {session.last_message?.content || session.subject || "No messages"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(session.started_at), "HH:mm")}
                          {session.department_name && (
                            <span className="ml-2">{session.department_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedSession.visitor_name?.charAt(0) || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedSession.visitor_name || "Anonymous"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {selectedSession.visitor_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {selectedSession.visitor_email}
                        </span>
                      )}
                      {selectedSession.visitor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {selectedSession.visitor_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.status === "waiting" && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptChat(selectedSession.id)}
                    >
                      <UserPlus className="size-4 mr-1" />
                      Accept
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTransferDialog(true)}>
                        <ArrowRight className="size-4 mr-2" />
                        Transfer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={handleCloseChat}
                      >
                        <X className="size-4 mr-2" />
                        Close Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_type === "agent" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.message_type === "system" ? (
                        <div className="text-xs text-center text-muted-foreground w-full py-2">
                          {msg.content}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg p-3",
                            msg.sender_type === "agent"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                            msg.is_internal && "border-2 border-amber-500 bg-amber-50 dark:bg-amber-950"
                          )}
                        >
                          {msg.is_internal && (
                            <div className="text-xs text-amber-600 mb-1 font-medium">
                              Internal Note
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          <div
                            className={cn(
                              "text-xs mt-1",
                              msg.sender_type === "agent"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                            {msg.sender_type === "agent" && msg.is_read && (
                              <span className="ml-1">✓</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {selectedSession.status !== "closed" && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      className="resize-none"
                    />
                    <Button onClick={handleSendMessage} disabled={sending}>
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedSession.status === "closed" && selectedSession.rating && (
                <div className="p-4 border-t bg-muted/50 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-5",
                          i <= selectedSession.rating!
                            ? "text-amber-500 fill-amber-500"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  {selectedSession.rating_comment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      &quot;{selectedSession.rating_comment}&quot;
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="size-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Transfer to Agent</label>
              <Select
                value={transferTarget?.type === "agent" ? transferTarget.id : ""}
                onValueChange={(v) =>
                  setTransferTarget(v ? { type: "agent", id: v } : null)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents
                    .filter((a) => a.id !== agentStatus?.id)
                    .map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.user_name} ({agent.current_chat_count}/
                        {agent.max_concurrent_chats})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center text-sm text-muted-foreground">or</div>
            <div>
              <label className="text-sm font-medium">
                Transfer to Department
              </label>
              <Select
                value={
                  transferTarget?.type === "department" ? transferTarget.id : ""
                }
                onValueChange={(v) =>
                  setTransferTarget(v ? { type: "department", id: v } : null)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.online_agents_count} online)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={!transferTarget}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
