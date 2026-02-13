"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { bulkUploadDocuments } from "@/lib/api/documents";
import type { DocumentFolder } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface MultiUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DocumentFolder[];
  defaultFolderId?: string | null;
  onUploaded: () => void;
}

export function MultiUploadDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
  onUploaded,
}: MultiUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [folderId, setFolderId] = useState(defaultFolderId || "__none__");
  const [docType, setDocType] = useState("other");
  const [loading, setLoading] = useState(false);

  const docTypes = [
    { value: "w2", label: "W-2" },
    { value: "1099", label: "1099" },
    { value: "tax_return", label: "Tax Return" },
    { value: "id_document", label: "ID Document" },
    { value: "bank_statement", label: "Bank Statement" },
    { value: "authorization", label: "Authorization" },
    { value: "correspondence", label: "Correspondence" },
    { value: "receipt", label: "Receipt" },
    { value: "other", label: "Other" },
  ];

  const reset = () => {
    setFiles([]);
    setFolderId(defaultFolderId || "__none__");
    setDocType("other");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (folderId && folderId !== "__none__") formData.append("folder", folderId);
      formData.append("doc_type", docType);
      await bulkUploadDocuments(formData);
      reset();
      onOpenChange(false);
      onUploaded();
    } catch {
      alert("Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Multiple Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Files *</Label>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                setFiles((prev) => [...prev, ...selected]);
              }}
            />
          </div>
          {files.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeFile(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || files.length === 0}>
            {loading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
