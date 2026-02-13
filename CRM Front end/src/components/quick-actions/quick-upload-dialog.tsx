"use client";

import { useState, useEffect } from "react";
import { Loader2, Upload, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDocument, getFolders, createFolder } from "@/lib/api/documents";
import type { DocumentFolder } from "@/types";

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

interface QuickUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "contact" | "corporation";
  entityId: string;
  entityName: string;
  onUploaded?: () => void;
}

export function QuickUploadDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  onUploaded,
}: QuickUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [folderId, setFolderId] = useState("__none__");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingFolders(true);
      getFolders({ page_size: "200" })
        .then((res) => setFolders(res.results))
        .catch(console.error)
        .finally(() => setLoadingFolders(false));
    }
  }, [open]);

  const reset = () => {
    setFile(null);
    setTitle("");
    setDocType("other");
    setFolderId("__none__");
    setDescription("");
    setShowNewFolder(false);
    setNewFolderName("");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const newFolder = await createFolder({ name: newFolderName.trim() });
      setFolders((prev) => [...prev, newFolder]);
      setFolderId(newFolder.id);
      setShowNewFolder(false);
      setNewFolderName("");
    } catch {
      alert("Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !title) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("doc_type", docType);
      if (folderId && folderId !== "__none__") {
        formData.append("folder", folderId);
      }
      if (description) {
        formData.append("description", description);
      }
      // Associate with contact or corporation
      formData.append(entityType, entityId);

      await createDocument(formData);
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a document for <strong>{entityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>File *</Label>
            <Input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) {
                  // Auto-fill title from filename
                  setTitle(f.name.replace(/\.[^/.]+$/, ""));
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Folder</Label>
              <div className="flex gap-2">
                <Select
                  value={folderId}
                  onValueChange={setFolderId}
                  disabled={loadingFolders}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewFolder(true)}
                  title="Create new folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {showNewFolder && (
            <div className="flex gap-2 p-3 bg-muted rounded-md">
              <Input
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
              >
                {creatingFolder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !file || !title}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
