"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Maximize2,
  Minimize2,
  X,
  FileText,
  Image as ImageIcon,
  File,
  ExternalLink
} from "lucide-react";
import { getDocumentDownloadUrl, getDocumentViewUrl } from "@/lib/api/documents";

interface DocumentViewerProps {
  documentId: string;
  title: string;
  mimeType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({
  documentId,
  title,
  mimeType,
  open,
  onOpenChange,
}: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  // Fetch secure download token when dialog opens
  useEffect(() => {
    if (open && !viewUrl && !urlLoading) {
      setUrlLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      getDocumentViewUrl(documentId)
        .then(setViewUrl)
        .catch((err) => {
          console.error("Error fetching view URL:", err);
          setError(true);
        })
        .finally(() => setUrlLoading(false));
    }
    // Reset when dialog closes
    if (!open) {
      setViewUrl(null);
      setIsLoading(true);
      setError(false);
    }
  }, [open, documentId, viewUrl, urlLoading]);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType?.startsWith("image/");
  const isViewable = isPdf || isImage;

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  const handleDownload = async () => {
    try {
      const url = await getDocumentDownloadUrl(documentId);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting download URL:", err);
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      const url = await getDocumentDownloadUrl(documentId);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting download URL:", err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <File className="h-16 w-16" />
          <p>Unable to preview this document</p>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download to view
          </Button>
        </div>
      );
    }

    // Show loading while fetching secure URL
    if (urlLoading || !viewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Preparing secure view...</span>
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={`${viewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0"
          title={title}
          onLoad={handleLoad}
          onError={handleError}
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-muted/30">
          <img
            src={viewUrl}
            alt={title}
            className="max-w-full max-h-full object-contain"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    }

    // Non-viewable file types
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <FileText className="h-16 w-16" />
        <p>This file type cannot be previewed</p>
        <p className="text-sm">{mimeType || "Unknown type"}</p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          isFullscreen
            ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] m-0 rounded-none"
            : "max-w-5xl w-[90vw] h-[85vh]"
        } flex flex-col p-0`}
      >
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-medium truncate pr-4">
            {isPdf && <FileText className="h-4 w-4 text-red-500 shrink-0" />}
            {isImage && <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />}
            {!isPdf && !isImage && <File className="h-4 w-4 shrink-0" />}
            <span className="truncate">{title}</span>
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInNewTab}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative bg-muted/20">
          {isLoading && isViewable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading document...</span>
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline viewer for embedding in pages (not modal)
interface InlineDocumentViewerProps {
  documentId: string;
  title: string;
  mimeType: string;
  className?: string;
}

export function InlineDocumentViewer({
  documentId,
  title,
  mimeType,
  className = "w-full h-[600px]",
}: InlineDocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(true);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType?.startsWith("image/");

  // Fetch secure download token on mount
  useEffect(() => {
    getDocumentViewUrl(documentId)
      .then(setViewUrl)
      .catch((err) => {
        console.error("Error fetching view URL:", err);
        setError(true);
      })
      .finally(() => setUrlLoading(false));
  }, [documentId]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  const handleDownload = async () => {
    try {
      const url = await getDocumentDownloadUrl(documentId);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting download URL:", err);
    }
  };

  // Show loading while fetching secure URL
  if (urlLoading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 border rounded-lg bg-muted/10 ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Preparing secure view...</span>
      </div>
    );
  }

  if (error || !viewUrl) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 text-muted-foreground border rounded-lg bg-muted/10 ${className}`}>
        <File className="h-12 w-12" />
        <p>Unable to preview this document</p>
        <Button onClick={handleDownload} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className={`relative border rounded-lg overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <iframe
          src={`${viewUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full border-0"
          title={title}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={`relative border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <img
          src={viewUrl}
          alt={title}
          className="max-w-full max-h-full object-contain"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Non-viewable file types
  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-muted-foreground border rounded-lg bg-muted/10 ${className}`}>
      <FileText className="h-12 w-12" />
      <p>Preview not available for this file type</p>
      <p className="text-sm">{mimeType || "Unknown type"}</p>
      <Button onClick={handleDownload} size="sm">
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
    </div>
  );
}
