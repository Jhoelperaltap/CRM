"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Folder,
  Eye,
  Download,
  ExternalLink,
  Loader2,
  Upload,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getDocuments, getDocumentDownloadUrl } from "@/lib/api/documents";
import { DocumentViewer } from "@/components/documents/document-viewer";
import type { DocumentListItem } from "@/types";

interface DocumentsByYearProps {
  entityType: "contact" | "corporation";
  entityId: string;
  className?: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "doc";
  if (mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return "xls";
  return "file";
}

export function DocumentsByYear({
  entityType,
  entityId,
  className,
}: DocumentsByYearProps) {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          page_size: "100",
        };
        params[entityType] = entityId;

        const response = await getDocuments(params);
        setDocuments(response.results);

        // Auto-expand the current year
        const currentYear = new Date().getFullYear();
        setExpandedYears(new Set([currentYear]));
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [entityType, entityId]);

  // Group documents by year
  const documentsByYear = useMemo(() => {
    const grouped: Record<number, DocumentListItem[]> = {};

    documents.forEach((doc) => {
      const year = new Date(doc.created_at).getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(doc);
    });

    // Sort years descending
    return Object.entries(grouped)
      .map(([year, docs]) => ({
        year: parseInt(year),
        documents: docs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => b.year - a.year);
  }, [documents]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const handleDownload = async (doc: DocumentListItem) => {
    try {
      const url = await getDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error getting download URL:", error);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No documents have been uploaded for this {entityType}.
        </p>
        <Button asChild>
          <Link href={`/documents?${entityType}=${entityId}`}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          Documents <Badge variant="secondary" className="ml-2">{documents.length}</Badge>
        </h3>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/documents?${entityType}=${entityId}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View All
          </Link>
        </Button>
      </div>

      {documentsByYear.map(({ year, documents: yearDocs }) => (
        <Collapsible
          key={year}
          open={expandedYears.has(year)}
          onOpenChange={() => toggleYear(year)}
        >
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <button className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">{year}</span>
                  <Badge variant="secondary" className="text-xs">
                    {yearDocs.length} {yearDocs.length === 1 ? "document" : "documents"}
                  </Badge>
                </div>
                {expandedYears.has(year) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t">
                {yearDocs.map((doc) => {
                  const isViewable =
                    doc.mime_type === "application/pdf" ||
                    doc.mime_type?.startsWith("image/");

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-medium text-sm hover:underline truncate block"
                          >
                            {doc.title}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{doc.doc_type.replace(/_/g, " ")}</span>
                            <span>&bull;</span>
                            <span>{formatBytes(doc.file_size)}</span>
                            <span>&bull;</span>
                            <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isViewable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      {/* Document Preview Viewer */}
      {previewDoc && (
        <DocumentViewer
          documentId={previewDoc.id}
          title={previewDoc.title}
          mimeType={previewDoc.mime_type}
          open={!!previewDoc}
          onOpenChange={(open) => {
            if (!open) setPreviewDoc(null);
          }}
        />
      )}
    </div>
  );
}
