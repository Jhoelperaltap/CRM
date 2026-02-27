"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HelpAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpAssistantDialog({
  open,
  onOpenChange,
}: HelpAssistantDialogProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm the EJFLOW Help Assistant. I can help you with:\n\n" +
        "- How to create users, contacts, and companies\n" +
        "- Navigating the system\n" +
        "- Configuring settings\n" +
        "- Using features like reports and documents\n\n" +
        "What would you like help with?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch } = useForm<{ message: string }>();
  const messageValue = watch("message", "");

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (data: { message: string }) => {
      const userMessage = data.message.trim();
      if (!userMessage || isLoading) return;

      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      reset();
      setIsLoading(true);

      try {
        // Build history for context (exclude the welcome message)
        const history = messages.slice(1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await api.post("/ai-agent/help/", {
          message: userMessage,
          history,
        });

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.data.response },
        ]);

        if (response.data.error && response.data.error !== null) {
          setError(response.data.error);
        }
      } catch (err) {
        console.error("Help assistant error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm sorry, I encountered an error. Please try again or contact support at jhoelp@supportit.com",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, reset]
  );

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hello! I'm the EJFLOW Help Assistant. I can help you with:\n\n" +
          "- How to create users, contacts, and companies\n" +
          "- Navigating the system\n" +
          "- Configuring settings\n" +
          "- Using features like reports and documents\n\n" +
          "What would you like help with?",
      },
    ]);
    setError(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[440px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-white text-lg">
                  Help Assistant
                </SheetTitle>
                <p className="text-xs text-white/70">
                  Ask me about EJFLOW features
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Clear Chat
            </Button>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Error Message */}
        {error && error !== "null" && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Some features may be limited. Contact support if issues persist.</span>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <form
            onSubmit={handleSubmit(sendMessage)}
            className="flex items-center gap-2"
          >
            <Input
              {...register("message")}
              ref={(e) => {
                register("message").ref(e);
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }}
              placeholder="Ask a question about EJFLOW..."
              disabled={isLoading}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !messageValue?.trim()}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-slate-400">
            I only answer questions about EJFLOW system features
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
