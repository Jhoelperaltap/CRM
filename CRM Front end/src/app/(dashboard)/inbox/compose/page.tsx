"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bold,
  ChevronDown,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Send,
  Smile,
  Trash2,
  Underline,
  X,
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { composeEmail, getTemplates } from "@/lib/api/emails";
import { getMe } from "@/lib/api/users";
import { EmailTemplate } from "@/types/email";

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return FileImage;
  if (["pdf"].includes(ext || "")) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext || "")) return FileSpreadsheet;
  return File;
}

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userEmailAccount, setUserEmailAccount] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [noEmailAccount, setNoEmailAccount] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [form, setForm] = useState({
    to: searchParams.get("to") || "",
    cc: "",
    bcc: "",
    subject: searchParams.get("subject") || "",
    body_text: "",
    contact: searchParams.get("contact") || "",
    case_id: searchParams.get("case") || "",
    in_reply_to: searchParams.get("in_reply_to") || "",
    references: searchParams.get("references") || "",
    template_id: "",
  });

  useEffect(() => {
    getMe().then((user) => {
      if (user.email_account && user.email_account_email) {
        setUserEmailAccount({
          id: user.email_account,
          email: user.email_account_email,
        });
      } else {
        setNoEmailAccount(true);
      }
    }).catch(() => {
      setNoEmailAccount(true);
    });
    getTemplates().then((data) => setTemplates(data.results));
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setForm((f) => ({
        ...f,
        subject: template.subject,
        body_text: template.body_text,
        template_id: templateId,
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!userEmailAccount) {
      setError("No email account assigned. Contact your administrator.");
      return;
    }
    if (!form.to) {
      setError("Please add at least one recipient.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await composeEmail(
        {
          account: userEmailAccount.id,
          to_addresses: form.to.split(",").map((e) => e.trim()).filter(Boolean),
          cc_addresses: form.cc ? form.cc.split(",").map((e) => e.trim()).filter(Boolean) : [],
          bcc_addresses: form.bcc ? form.bcc.split(",").map((e) => e.trim()).filter(Boolean) : [],
          subject: form.subject,
          body_text: form.body_text,
          contact: form.contact || null,
          case: form.case_id || null,
          in_reply_to: form.in_reply_to,
          references: form.references,
          template_id: form.template_id || null,
        },
        files.length > 0 ? files : undefined
      );
      router.push("/inbox");
    } catch {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = () => {
    if (form.to || form.subject || form.body_text || files.length > 0) {
      if (confirm("Discard this draft?")) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  if (noEmailAccount) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>No Email Account Assigned</AlertTitle>
            <AlertDescription>
              You do not have an email account assigned to your user profile.
              Please contact your administrator to configure your email account.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 size-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">New Message</h1>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Use template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-3">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Email Form */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-4">
          <div className="rounded-lg border bg-card shadow-sm">
            {/* From Field */}
            <div className="flex items-center border-b px-4 py-2">
              <span className="w-16 shrink-0 text-sm text-muted-foreground">From</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm font-medium">{userEmailAccount?.email || "Loading..."}</span>
              </div>
            </div>

            {/* To Field */}
            <div className="flex items-center border-b px-4 py-2">
              <span className="w-16 shrink-0 text-sm text-muted-foreground">To</span>
              <Input
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                placeholder="Recipients"
                className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
              />
              <div className="flex items-center gap-1 ml-2">
                {!showCc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCc(true)}
                  >
                    Cc
                  </Button>
                )}
                {!showBcc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowBcc(true)}
                  >
                    Bcc
                  </Button>
                )}
              </div>
            </div>

            {/* CC Field */}
            {showCc && (
              <div className="flex items-center border-b px-4 py-2">
                <span className="w-16 shrink-0 text-sm text-muted-foreground">Cc</span>
                <Input
                  value={form.cc}
                  onChange={(e) => setForm({ ...form, cc: e.target.value })}
                  placeholder="Carbon copy recipients"
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => {
                    setShowCc(false);
                    setForm({ ...form, cc: "" });
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div className="flex items-center border-b px-4 py-2">
                <span className="w-16 shrink-0 text-sm text-muted-foreground">Bcc</span>
                <Input
                  value={form.bcc}
                  onChange={(e) => setForm({ ...form, bcc: e.target.value })}
                  placeholder="Blind carbon copy recipients"
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => {
                    setShowBcc(false);
                    setForm({ ...form, bcc: "" });
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}

            {/* Subject Field */}
            <div className="flex items-center border-b px-4 py-2">
              <span className="w-16 shrink-0 text-sm text-muted-foreground">Subject</span>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Subject"
                className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1 font-medium"
              />
            </div>

            {/* Body */}
            <div className="min-h-[300px]">
              <textarea
                value={form.body_text}
                onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                placeholder="Write your message here..."
                className="w-full min-h-[300px] resize-none border-0 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
              />
            </div>

            {/* Attachments */}
            {files.length > 0 && (
              <div className="border-t px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => {
                    const Icon = getFileIcon(file.name);
                    return (
                      <div
                        key={`${file.name}-${i}`}
                        className="group flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
                      >
                        <Icon className="size-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[150px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="ml-1 rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Toolbar */}
      <div className="border-t bg-card">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-1">
              {/* Send Button */}
              <TooltipProvider>
                <div className="flex items-center">
                  <Button
                    onClick={handleSend}
                    disabled={sending || !form.to}
                    className="rounded-r-none gap-2"
                  >
                    <Send className="size-4" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="rounded-l-none border-l border-primary-foreground/20 px-2"
                        disabled={sending}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleSend}>
                        Send now
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        Schedule send
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Formatting Toolbar */}
                <div className="ml-4 flex items-center gap-0.5 border-l pl-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Bold className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Italic className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Underline className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Underline</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <List className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bulleted list</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <ListOrdered className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Numbered list</TooltipContent>
                  </Tooltip>
                </div>

                {/* Attachment & Insert Tools */}
                <div className="ml-2 flex items-center gap-0.5 border-l pl-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach files</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Link2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert link</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Image className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert image</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Smile className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert emoji</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Discard */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleDiscard}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard draft</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
