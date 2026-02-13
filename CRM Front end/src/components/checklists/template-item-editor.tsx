"use client";

import { useState } from "react";
import type { ChecklistTemplateItem } from "@/types/checklists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";

interface TemplateItemEditorProps {
  items: ChecklistTemplateItem[];
  onAdd: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (itemId: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

export function TemplateItemEditor({
  items,
  onAdd,
  onUpdate,
  onDelete,
}: TemplateItemEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDocType("");
    setIsRequired(true);
  };

  const startAdd = () => {
    resetForm();
    setEditingId(null);
    setAdding(true);
  };

  const startEdit = (item: ChecklistTemplateItem) => {
    setTitle(item.title);
    setDescription(item.description);
    setDocType(item.doc_type);
    setIsRequired(item.is_required);
    setEditingId(item.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        title,
        description,
        doc_type: docType,
        is_required: isRequired,
        sort_order: editingId
          ? items.find((i) => i.id === editingId)?.sort_order ?? 0
          : items.length,
      };
      if (editingId) {
        await onUpdate(editingId, data);
      } else {
        await onAdd(data);
      }
      cancel();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await onDelete(itemId);
      if (editingId === itemId) cancel();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Item list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items yet. Add checklist items below.
          </p>
        )}
        {items.map((item) =>
          editingId === item.id ? (
            <Card key={item.id} className="border-primary">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Doc Type (auto-check)</Label>
                    <Input
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      placeholder="e.g. w2, 1099"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={isRequired}
                      onCheckedChange={setIsRequired}
                    />
                    <Label>Required</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancel}>
                    <X className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !title}
                  >
                    <Check className="mr-1 h-3 w-3" />{" "}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {item.is_required && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded dark:bg-red-900/30 dark:text-red-400">
                        Required
                      </span>
                    )}
                    {item.doc_type && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-400">
                        Auto: {item.doc_type}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Add new item form */}
      {adding && (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. W-2 Forms"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description or instructions"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Doc Type (auto-check)</Label>
                <Input
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. w2, 1099"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label>Required</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancel}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !title}
              >
                <Check className="mr-1 h-3 w-3" />{" "}
                {saving ? "Saving..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button */}
      {!adding && !editingId && (
        <Button variant="outline" onClick={startAdd} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      )}
    </div>
  );
}
