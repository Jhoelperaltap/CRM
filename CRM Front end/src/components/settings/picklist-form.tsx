"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Picklist, CRMModule } from "@/types/index";

interface PicklistFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picklist: Picklist | null;
  modules: CRMModule[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

export function PicklistForm({
  open,
  onOpenChange,
  picklist,
  modules,
  onSave,
}: PicklistFormProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (picklist) {
      setName(picklist.name);
      setLabel(picklist.label);
      setModuleId(picklist.module || "");
      setDescription(picklist.description);
    } else {
      setName("");
      setLabel("");
      setModuleId("");
      setDescription("");
    }
  }, [picklist, open]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!picklist) {
      setName(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        label,
        module: moduleId || null,
        description,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {picklist ? "Edit Picklist" : "New Picklist"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Case Priority"
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. case_priority"
              disabled={!!picklist}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Machine name (letters, numbers, underscores)
            </p>
          </div>
          <div>
            <Label>Module (optional)</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Global (no module)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global (no module)</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label_plural}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name || !label}
            >
              {saving ? "Saving..." : picklist ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
