"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Send,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  getClientMessages,
  sendClientMessage,
  type ClientMessage,
} from "@/lib/api/contacts";

interface ClientMessagesSectionProps {
  contactId: string;
  contactName: string;
}

export function ClientMessagesSection({
  contactId,
  contactName,
}: ClientMessagesSectionProps) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // New message form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientMessages(contactId);
      setMessages(data.results);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setMessage({ type: "error", text: "Failed to load messages" });
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setMessage({ type: "error", text: "Subject and message are required" });
      return;
    }

    setSending(true);
    try {
      const newMessage = await sendClientMessage(contactId, {
        subject: subject.trim(),
        body: body.trim(),
      });
      setMessages((prev) => [newMessage, ...prev]);
      setSubject("");
      setBody("");
      setDialogOpen(false);
      setMessage({ type: "success", text: "Message sent to client" });
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessage({ type: "error", text: "Failed to send message" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Send Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Messages</h3>
          <p className="text-sm text-muted-foreground">
            Messages between your team and {contactName}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send Message to Client</DialogTitle>
              <DialogDescription>
                This message will appear in {contactName}&apos;s client portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-muted-foreground text-center mt-1">
              Send a message to start a conversation with this client
            </p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send First Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={
                msg.message_type === "staff_to_client"
                  ? "border-l-4 border-l-blue-500"
                  : "border-l-4 border-l-green-500"
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {msg.message_type === "staff_to_client"
                        ? msg.sender_name?.[0] || "S"
                        : contactName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {msg.message_type === "staff_to_client"
                          ? msg.sender_name || "Staff"
                          : contactName}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          msg.message_type === "staff_to_client"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {msg.message_type === "staff_to_client" ? (
                          <>
                            <ArrowRight className="mr-1 h-3 w-3" />
                            Sent
                          </>
                        ) : (
                          <>
                            <ArrowLeft className="mr-1 h-3 w-3" />
                            Received
                          </>
                        )}
                      </Badge>
                      {!msg.is_read &&
                        msg.message_type === "client_to_staff" && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(msg.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <h4 className="font-medium mt-1">{msg.subject}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {msg.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
