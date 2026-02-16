"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocument, deleteDocument, getDocumentDownloadUrl } from "@/lib/api/documents";
import type { Document } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2, Folder, Tag, Eye, Maximize2 } from "lucide-react";
import { InlineDocumentViewer, DocumentViewer } from "@/components/documents/document-viewer";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024; const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Helper to detect mime type from file extension
function getMimeTypeFromExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
  };
  return mimeMap[ext || ""] || null;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { getDocument(id).then(setDoc).catch(console.error).finally(() => setLoading(false)); }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getDocumentDownloadUrl(id);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error getting download URL:", error);
    } finally {
      setDownloading(false);
    }
  };

  // Detect mime type from extension if not provided
  const effectiveMimeType = useMemo(() => {
    if (!doc) return null;
    if (doc.mime_type && doc.mime_type !== "application/octet-stream") {
      return doc.mime_type;
    }
    return getMimeTypeFromExtension(doc.title) || doc.mime_type;
  }, [doc]);

  if (loading) return <LoadingSpinner />;
  if (!doc) return <div>Document not found</div>;

  const isPdf = effectiveMimeType === "application/pdf";
  const isImage = effectiveMimeType?.startsWith("image/");
  const isViewable = isPdf || isImage;

  return (
    <div className="space-y-6">
      <PageHeader title={doc.title} backHref="/documents" actions={<>
        {isViewable && (
          <Button variant="outline" onClick={() => setViewerOpen(true)}>
            <Maximize2 className="mr-2 h-4 w-4" /> View Fullscreen
          </Button>
        )}
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" /> {downloading ? "Preparing..." : "Download"}
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
      </>} />

      {/* Folder breadcrumb */}
      {doc.folder && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder className="h-4 w-4" />
          <span
            className="cursor-pointer hover:text-foreground"
            onClick={() => router.push(`/documents?folder=${doc.folder!.id}`)}
          >
            {doc.folder.name}
          </span>
        </div>
      )}

      {/* Tags */}
      {doc.tags && doc.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {doc.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Document Preview - Inline Viewer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Document Preview
          </CardTitle>
          {isViewable && (
            <Button variant="ghost" size="sm" onClick={() => setViewerOpen(true)}>
              <Maximize2 className="h-4 w-4 mr-1" />
              Expand
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <InlineDocumentViewer
            documentId={id}
            title={doc.title}
            mimeType={doc.mime_type}
            className="w-full h-[500px]"
          />
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>Document Info</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{doc.doc_type.replace(/_/g, " ")}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={doc.status} /></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(doc.file_size)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">MIME Type</span><span>{doc.mime_type}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>{doc.version}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Uploaded By</span><span>{doc.uploaded_by?.full_name || "-"}</span></div>
        {doc.folder && (
          <div className="flex justify-between"><span className="text-muted-foreground">Folder</span><span>{doc.folder.name}</span></div>
        )}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex justify-between"><span className="text-muted-foreground">Tags</span>
            <span className="flex gap-1 flex-wrap justify-end">
              {doc.tags.map((t) => (
                <Badge key={t.id} variant="outline" className="text-xs" style={{ borderColor: t.color, color: t.color }}>{t.name}</Badge>
              ))}
            </span>
          </div>
        )}
        <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{doc.contact ? `${doc.contact.first_name} ${doc.contact.last_name}` : "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Case</span><span>{doc.case?.case_number || "-"}</span></div>
        {doc.description && <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{doc.description}</p></div>}
      </CardContent></Card>

      {/* Fullscreen Viewer Modal */}
      <DocumentViewer
        documentId={id}
        title={doc.title}
        mimeType={doc.mime_type}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Document" description="Are you sure? This cannot be undone." confirmLabel="Delete" onConfirm={async () => { await deleteDocument(id); router.push("/documents"); }} />
    </div>
  );
}
