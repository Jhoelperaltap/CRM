"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Send,
  Ban,
  Trash2,
  FileSignature,
  Mail,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import {
  getEsignDocument,
  deleteEsignDocument,
  sendEsignDocument,
  voidEsignDocument,
} from "@/lib/api/esign";
import type { EsignDocumentDetail, EsignSignee } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  voided: "bg-gray-200 text-gray-500",
  expired: "bg-orange-100 text-orange-700",
};

const SIGNEE_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  signed: CheckCircle2,
  declined: XCircle,
  viewed: Eye,
  sent: Mail,
  pending: HelpCircle,
};

const SIGNEE_STATUS_COLOR: Record<string, string> = {
  signed: "text-green-600",
  declined: "text-red-600",
  viewed: "text-blue-600",
  sent: "text-amber-600",
  pending: "text-muted-foreground",
};

export default function EsignDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<EsignDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEsignDocument(id);
      setDoc(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleSend = async () => {
    if (!doc) return;
    try {
      const updated = await sendEsignDocument(doc.id);
      setDoc(updated);
    } catch {
      /* empty */
    }
  };

  const handleVoid = async () => {
    if (!doc) return;
    try {
      const updated = await voidEsignDocument(doc.id);
      setDoc(updated);
    } catch {
      /* empty */
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    try {
      await deleteEsignDocument(doc.id);
      router.push("/esign-documents");
    } catch {
      /* empty */
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!doc)
    return (
      <div className="text-center py-20 text-muted-foreground">
        Esign document not found.
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.title || doc.email_subject}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/esign-documents")}
            >
              <ArrowLeft className="mr-1.5 size-4" />
              Back
            </Button>
            {doc.status === "draft" && (
              <Button size="sm" onClick={handleSend}>
                <Send className="mr-1.5 size-4" />
                Send
              </Button>
            )}
            {["draft", "sent", "in_progress"].includes(doc.status) && (
              <Button variant="outline" size="sm" onClick={handleVoid}>
                <Ban className="mr-1.5 size-4" />
                Void
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Info ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      STATUS_COLORS[doc.status] || ""
                    )}
                  >
                    {doc.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Document Source</span>
                <p className="mt-1 capitalize">
                  {doc.document_source.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Created By</span>
                <p className="mt-1">{doc.created_by_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="mt-1">
                  {format(new Date(doc.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              {doc.sent_at && (
                <div>
                  <span className="text-muted-foreground">Sent At</span>
                  <p className="mt-1">
                    {format(new Date(doc.sent_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {doc.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed At</span>
                  <p className="mt-1">
                    {format(new Date(doc.completed_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {doc.expires_at && (
                <div>
                  <span className="text-muted-foreground">Expires At</span>
                  <p className="mt-1">
                    {format(new Date(doc.expires_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {doc.internal_document_title && (
                <div>
                  <span className="text-muted-foreground">
                    Internal Document
                  </span>
                  <p className="mt-1">{doc.internal_document_title}</p>
                </div>
              )}
              {doc.file && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">File</span>
                  <p className="mt-1">
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Download file
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4" />
                Email Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Subject</span>
                <p className="mt-1 font-medium">{doc.email_subject}</p>
              </div>
              {doc.email_note && (
                <div>
                  <span className="text-muted-foreground">Note</span>
                  <p className="mt-1 whitespace-pre-wrap">{doc.email_note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Signees ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="size-4" />
                Signees ({doc.signees.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.signees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No signees
                </p>
              ) : (
                doc.signees.map((signee: EsignSignee) => {
                  const Icon =
                    SIGNEE_STATUS_ICON[signee.status] || HelpCircle;
                  const color =
                    SIGNEE_STATUS_COLOR[signee.status] ||
                    "text-muted-foreground";
                  return (
                    <div
                      key={signee.id}
                      className="flex items-center gap-3 p-3 rounded-md border"
                    >
                      <div
                        className={cn(
                          "rounded-full bg-muted p-2 shrink-0",
                          color
                        )}
                      >
                        <User className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {signee.contact_name ||
                            signee.recipient_email ||
                            `Signee #${signee.order}`}
                        </p>
                        {signee.recipient_email && signee.contact_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {signee.recipient_email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("size-4", color)} />
                        <span
                          className={cn("text-xs capitalize font-medium", color)}
                        >
                          {signee.status}
                        </span>
                      </div>
                      {signee.signed_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {format(
                            new Date(signee.signed_at),
                            "MMM d, h:mm a"
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
