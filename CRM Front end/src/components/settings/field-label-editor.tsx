"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Save, Trash2 } from "lucide-react";
import type { FieldLabel } from "@/types/index";

interface FieldLabelEditorProps {
  labels: FieldLabel[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (labelId: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (labelId: string) => Promise<void>;
}

export function FieldLabelEditor({
  labels,
  onSave,
  onUpdate,
  onDelete,
}: FieldLabelEditorProps) {
  const [newFieldName, setNewFieldName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAdd = async () => {
    if (!newFieldName || !newLabel) return;
    await onSave({
      field_name: newFieldName,
      custom_label: newLabel,
      language: newLanguage,
    });
    setNewFieldName("");
    setNewLabel("");
  };

  const handleUpdate = async (labelId: string) => {
    await onUpdate(labelId, { custom_label: editValue });
    setEditingId(null);
  };

  const startEdit = (label: FieldLabel) => {
    setEditingId(label.id);
    setEditValue(label.custom_label);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name (e.g. first_name)"
          />
        </div>
        <div className="flex-1">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Custom label"
          />
        </div>
        <div className="w-20">
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="en"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newFieldName || !newLabel}
          size="sm"
        >
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No label overrides defined.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field Name</TableHead>
              <TableHead>Custom Label</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label) => (
              <TableRow key={label.id}>
                <TableCell className="font-mono text-xs">
                  {label.field_name}
                </TableCell>
                <TableCell>
                  {editingId === label.id ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(label.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => startEdit(label)}
                    >
                      {label.custom_label}
                    </span>
                  )}
                </TableCell>
                <TableCell>{label.language}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {editingId === label.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdate(label.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(label.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
