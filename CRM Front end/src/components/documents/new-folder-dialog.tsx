"use client";
import { useState } from "react";
import { createFolder, updateFolder } from "@/lib/api/documents";
import type { DocumentFolder, DocumentFolderTreeNode } from "@/types";
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

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: DocumentFolder[];
  defaultParentId?: string | null;
  editFolder?: DocumentFolderTreeNode | null;
  onCreated: () => void;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  folders,
  defaultParentId,
  editFolder,
  onCreated,
}: NewFolderDialogProps) {
  const [name, setName] = useState(editFolder?.name || "");
  const [parentId, setParentId] = useState(defaultParentId || editFolder?.parent || "__none__");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setParentId(defaultParentId || "__none__");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload: { name: string; parent?: string | null; description?: string } = {
        name: name.trim(),
        parent: parentId === "__none__" ? null : parentId || null,
      };
      if (description) payload.description = description;

      if (editFolder) {
        await updateFolder(editFolder.id, payload);
      } else {
        await createFolder(payload);
      }
      reset();
      onOpenChange(false);
      onCreated();
    } catch {
      alert(editFolder ? "Failed to update folder" : "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editFolder ? "Rename Folder" : "New Folder"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Parent Folder</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger><SelectValue placeholder="Root (no parent)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Root (no parent)</SelectItem>
                {folders
                  .filter((f) => f.id !== editFolder?.id)
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!editFolder && (
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Saving..." : editFolder ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
