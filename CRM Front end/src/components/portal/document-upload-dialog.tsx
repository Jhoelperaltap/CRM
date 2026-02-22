"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { portalUploadDocument, portalGetCases } from "@/lib/api/portal";
import type { PortalCase } from "@/types/portal";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

export function DocumentUploadDialog({ open, onClose, onUploaded }: Props) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState("");
  const [cases, setCases] = useState<PortalCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch cases when dialog opens
  useEffect(() => {
    if (open) {
      portalGetCases()
        .then(setCases)
        .catch(() => setCases([]));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Document title is required.");
      return;
    }
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);
    if (caseId && caseId !== "none") {
      formData.append("case", caseId);
    }

    try {
      await portalUploadDocument(formData);
      setTitle("");
      setFile(null);
      setCaseId("");
      onUploaded?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; file?: string[] } } };
      const detail = axiosErr?.response?.data?.detail;
      const fileError = axiosErr?.response?.data?.file?.[0];
      setError(detail || fileError || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setFile(null);
    setCaseId("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-blue-500" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a document to share with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. W-2 Form, Tax Return, ID Copy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <div className="relative">
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-sm">
                <FileText className="size-4 text-blue-500" />
                <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="case">Related Case (optional)</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger id="case">
                <SelectValue placeholder="Select a case (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No case selected</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number} - {c.title || c.case_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optionally link this document to one of your cases.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
