"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  FileSignature,
  Plus,
  Search,
  Trash2,
  Send,
  Eye,
  X,
  Upload,
  FileText,
  Link2,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getEsignDocuments,
  createEsignDocument,
  deleteEsignDocument,
  sendEsignDocument,
} from "@/lib/api/esign";
import { getContacts } from "@/lib/api/contacts";
import { getDocuments } from "@/lib/api/documents";
import type { EsignDocumentListItem, ContactListItem, DocumentListItem } from "@/types";

/* ------------------------------------------------------------------ */
/*  Signee row type (local state for the dialog)                       */
/* ------------------------------------------------------------------ */

interface SigneeRow {
  key: number;
  signee_type: "contact" | "user" | "external";
  contact_id: string;
  contact_search: string;
  recipient_email: string;
}

type DocSource = "upload" | "internal" | "related";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  voided: "bg-gray-200 text-gray-500",
  expired: "bg-orange-100 text-orange-700",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EsignDocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<EsignDocumentListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [signees, setSignees] = useState<SigneeRow[]>([
    { key: 1, signee_type: "contact", contact_id: "", contact_search: "", recipient_email: "" },
  ]);
  const [docSource, setDocSource] = useState<DocSource>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [internalDocId, setInternalDocId] = useState("");
  const [relatedModule, setRelatedModule] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNote, setEmailNote] = useState("");

  // Lookups
  const [contactResults, setContactResults] = useState<ContactListItem[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [activeSigneeKey, setActiveSigneeKey] = useState<number | null>(null);
  const [internalDocs, setInternalDocs] = useState<DocumentListItem[]>([]);

  let nextKey = signees.length + 1;

  /* ── Fetch esign documents ── */
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await getEsignDocuments(params);
      setDocs(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  /* ── Contact search ── */
  const searchContacts = useCallback(async (q: string) => {
    if (q.length < 2) {
      setContactResults([]);
      return;
    }
    setContactSearching(true);
    try {
      const res = await getContacts({ search: q, page_size: "10" });
      setContactResults(res.results || []);
    } catch {
      /* empty */
    } finally {
      setContactSearching(false);
    }
  }, []);

  /* ── Internal docs for picker ── */
  useEffect(() => {
    if (docSource === "internal" && internalDocs.length === 0) {
      getDocuments({ page_size: "50" })
        .then((res) => setInternalDocs(res.results || []))
        .catch(() => {});
    }
  }, [docSource, internalDocs.length]);

  /* ── Signee helpers ── */
  const addSignee = () => {
    setSignees((prev) => [
      ...prev,
      {
        key: ++nextKey,
        signee_type: "contact",
        contact_id: "",
        contact_search: "",
        recipient_email: "",
      },
    ]);
  };

  const removeSignee = (key: number) => {
    setSignees((prev) => prev.filter((s) => s.key !== key));
  };

  const updateSignee = (key: number, updates: Partial<SigneeRow>) => {
    setSignees((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...updates } : s))
    );
  };

  /* ── Reset dialog ── */
  const resetDialog = () => {
    setSignees([
      { key: 1, signee_type: "contact", contact_id: "", contact_search: "", recipient_email: "" },
    ]);
    setDocSource("upload");
    setFile(null);
    setInternalDocId("");
    setRelatedModule("");
    setEmailSubject("");
    setEmailNote("");
    setContactResults([]);
    setActiveSigneeKey(null);
  };

  /* ── Submit ── */
  const handleCreate = async () => {
    if (!emailSubject.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("email_subject", emailSubject);
      fd.append("email_note", emailNote);
      fd.append("document_source", docSource);

      if (docSource === "upload" && file) {
        fd.append("file", file);
        fd.append("title", file.name);
      }
      if (docSource === "internal" && internalDocId) {
        fd.append("internal_document", internalDocId);
      }
      if (docSource === "related" && relatedModule) {
        fd.append("related_module", relatedModule);
      }

      // Signees as JSON string
      const signeesPayload = signees.map((s, idx) => ({
        signee_type: s.signee_type,
        order: idx + 1,
        ...(s.contact_id ? { contact: s.contact_id } : {}),
        recipient_email: s.recipient_email,
      }));
      fd.append("signees_json", JSON.stringify(signeesPayload));

      await createEsignDocument(fd);
      setDialogOpen(false);
      resetDialog();
      fetchDocs();
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    try {
      await deleteEsignDocument(id);
      fetchDocs();
    } catch {
      /* empty */
    }
  };

  /* ── Send ── */
  const handleSend = async (id: string) => {
    try {
      await sendEsignDocument(id);
      fetchDocs();
    } catch {
      /* empty */
    }
  };

  /* ── Filtered ── */
  const filtered = docs;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Esign Documents"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Esign Document
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search esign documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Esign Documents</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center py-32">
          <div className="mb-6 rounded-full bg-muted p-8">
            <FileSignature className="size-16 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            There are no Esign Documents.
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            You can add Esign Documents by clicking the button below
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Esign Document
          </Button>
        </div>
      ) : (
        /* ── Table ── */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Subject</TableHead>
                <TableHead>Signees</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/esign-documents/${doc.id}`)}
                >
                  <TableCell className="font-medium">
                    {doc.title || doc.email_subject}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize",
                        STATUS_COLORS[doc.status] || ""
                      )}
                    >
                      {doc.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {doc.email_subject}
                  </TableCell>
                  <TableCell>{doc.signee_count}</TableCell>
                  <TableCell>{doc.created_by_name}</TableCell>
                  <TableCell>
                    {doc.sent_at
                      ? format(new Date(doc.sent_at), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/esign-documents/${doc.id}`);
                          }}
                        >
                          <Eye className="mr-2 size-4" />
                          View
                        </DropdownMenuItem>
                        {doc.status === "draft" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSend(doc.id);
                            }}
                          >
                            <Send className="mr-2 size-4" />
                            Send
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Esign Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── Section 1: Who should sign ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Who should sign this Document?
              </h3>

              {signees.map((signee, idx) => (
                <div key={signee.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      Signee {idx + 1}
                    </span>

                    <Select
                      value={signee.signee_type}
                      onValueChange={(val) =>
                        updateSignee(signee.key, {
                          signee_type: val as SigneeRow["signee_type"],
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Contacts</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                      </SelectContent>
                    </Select>

                    {signee.signee_type === "contact" ? (
                      <div className="relative flex-1">
                        <Input
                          placeholder="Type to search"
                          value={signee.contact_search}
                          onChange={(e) => {
                            updateSignee(signee.key, {
                              contact_search: e.target.value,
                            });
                            setActiveSigneeKey(signee.key);
                            searchContacts(e.target.value);
                          }}
                          onFocus={() => setActiveSigneeKey(signee.key)}
                        />
                        {/* Dropdown results */}
                        {activeSigneeKey === signee.key &&
                          contactResults.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                              {contactResults.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                                  onClick={() => {
                                    updateSignee(signee.key, {
                                      contact_id: c.id,
                                      contact_search: c.full_name,
                                      recipient_email:
                                        c.email || signee.recipient_email,
                                    });
                                    setContactResults([]);
                                    setActiveSigneeKey(null);
                                  }}
                                >
                                  <span className="font-medium">
                                    {c.full_name}
                                  </span>
                                  {c.email && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {c.email}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : null}

                    <Input
                      className="w-48"
                      placeholder="Recipient Email"
                      value={signee.recipient_email}
                      onChange={(e) =>
                        updateSignee(signee.key, {
                          recipient_email: e.target.value,
                        })
                      }
                    />

                    {signees.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeSignee(signee.key)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addSignee}>
                <UserPlus className="mr-1.5 size-4" />
                Add Signee
              </Button>
            </div>

            {/* ── Section 2: What document ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                What document should be signed?
              </h3>

              <div className="flex items-center gap-4">
                {(
                  [
                    { value: "upload", label: "Upload File", icon: Upload },
                    {
                      value: "internal",
                      label: "Internal Document",
                      icon: FileText,
                    },
                    {
                      value: "related",
                      label: "Select Related Module",
                      icon: Link2,
                    },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="doc_source"
                        checked={docSource === opt.value}
                        onChange={() => setDocSource(opt.value)}
                        className="accent-primary"
                      />
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Upload area */}
              {docSource === "upload" && (
                <label
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                    "hover:border-primary/50 hover:bg-muted/30",
                    file ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <Upload className="size-10 text-primary" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm">
                        Drag &amp; drop your file here or{" "}
                        <span className="text-primary font-medium">Browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maximum upload size is 50 MB
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                </label>
              )}

              {/* Internal document picker */}
              {docSource === "internal" && (
                <Select value={internalDocId} onValueChange={setInternalDocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an internal document" />
                  </SelectTrigger>
                  <SelectContent>
                    {internalDocs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Related module picker */}
              {docSource === "related" && (
                <Select value={relatedModule} onValueChange={setRelatedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotes">Quotes</SelectItem>
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="corporations">Corporations</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Section 3: Email details ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Add Email details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="email_subject">
                  <span className="text-destructive">*</span> Email Subject
                </Label>
                <Input
                  id="email_subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_note">Email Note</Label>
                <Textarea
                  id="email_note"
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  placeholder="Add a note for the recipients..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetDialog();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !emailSubject.trim()}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
