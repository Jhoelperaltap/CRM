"use client";
import { FileText, FolderPlus, Upload, Link2, FileUp, Files } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentEmptyStateProps {
  onNewFolder: () => void;
  onUpload: () => void;
  onLink: () => void;
  onMultiUpload: () => void;
}

export function DocumentEmptyState({
  onNewFolder,
  onUpload,
  onLink,
  onMultiUpload,
}: DocumentEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No documents yet</h3>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        Get started by uploading files, creating folders, or adding external links to
        organise your tax documents.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onNewFolder}>
          <FolderPlus className="h-5 w-5" />
          <span className="text-xs">New Folder</span>
        </Button>
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onUpload}>
          <Upload className="h-5 w-5" />
          <span className="text-xs">Upload</span>
        </Button>
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onLink}>
          <Link2 className="h-5 w-5" />
          <span className="text-xs">Add Link</span>
        </Button>
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onMultiUpload}>
          <Files className="h-5 w-5" />
          <span className="text-xs">Upload Multiple</span>
        </Button>
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onUpload}>
          <FileUp className="h-5 w-5" />
          <span className="text-xs">New Document</span>
        </Button>
        <Button variant="outline" className="flex flex-col gap-1 h-auto py-4 px-6" onClick={onMultiUpload}>
          <Upload className="h-5 w-5" />
          <span className="text-xs">Import Documents</span>
        </Button>
      </div>
    </div>
  );
}
