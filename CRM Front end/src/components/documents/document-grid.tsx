"use client";
import { useRouter } from "next/navigation";
import { FileText, FileSpreadsheet, FileImage, File, Link2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { DocumentListItem, DocumentLink } from "@/types";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return FileText;
  return File;
}

interface DocumentGridProps {
  documents: DocumentListItem[];
  links: DocumentLink[];
  onPreview?: (doc: DocumentListItem) => void;
}

export function DocumentGrid({ documents, links, onPreview }: DocumentGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {documents.map((doc) => {
        const Icon = getFileIcon(doc.mime_type);
        const isViewable = doc.mime_type === "application/pdf" || doc.mime_type?.startsWith("image/");
        return (
          <Card
            key={doc.id}
            className="group relative cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push(`/documents/${doc.id}`)}
          >
            {/* Preview button overlay */}
            {isViewable && onPreview && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(doc);
                }}
                title="Quick preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <Icon className="h-10 w-10 text-muted-foreground" />
              <span className="line-clamp-2 text-sm font-medium">{doc.title}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</span>
              <StatusBadge status={doc.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </CardContent>
          </Card>
        );
      })}
      {links.map((link) => (
        <Card
          key={`link-${link.id}`}
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
        >
          <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground" />
            <span className="line-clamp-2 text-sm font-medium">{link.title}</span>
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {new URL(link.url).hostname}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(link.created_at).toLocaleDateString()}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
