"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Save, Trash2, GripVertical, X } from "lucide-react";
import type { PicklistValue } from "@/types/index";

interface PicklistValueEditorProps {
  values: PicklistValue[];
  onAdd: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (valueId: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (valueId: string) => Promise<void>;
  onToggleActive: (valueId: string, active: boolean) => Promise<void>;
}

export function PicklistValueEditor({
  values,
  onAdd,
  onUpdate,
  onDelete,
  onToggleActive,
}: PicklistValueEditorProps) {
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = async () => {
    if (!newValue || !newLabel) return;
    await onAdd({
      value: newValue,
      label: newLabel,
      color: newColor,
      sort_order: values.length,
      is_active: true,
      is_default: false,
    });
    setNewValue("");
    setNewLabel("");
    setNewColor("");
    setAdding(false);
  };

  const handleLabelChange = (val: string) => {
    setNewLabel(val);
    if (!newValue) {
      setNewValue(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  };

  const startEdit = (v: PicklistValue) => {
    setEditingId(v.id);
    setEditLabel(v.label);
    setEditColor(v.color);
  };

  const handleUpdate = async (valueId: string) => {
    await onUpdate(valueId, { label: editLabel, color: editColor });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3 w-3" /> Add Value
          </Button>
        ) : (
          <div className="flex items-end gap-2 w-full border rounded-md p-3 bg-muted/30">
            <div className="flex-1">
              <Input
                value={newLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Label"
              />
            </div>
            <div className="flex-1">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Value"
              />
            </div>
            <div className="w-28">
              <Input
                type="color"
                value={newColor || "#6b7280"}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 p-1"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newValue || !newLabel}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAdding(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No values defined. Add one to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {values.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell className="font-mono text-xs">{v.value}</TableCell>
                <TableCell>
                  {editingId === v.id ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(v.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => startEdit(v)}
                    >
                      {v.label}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === v.id ? (
                    <Input
                      type="color"
                      value={editColor || "#6b7280"}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-16 p-1"
                    />
                  ) : v.color ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {v.color}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {v.is_default && (
                    <Badge variant="default">Default</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={v.is_active}
                    onCheckedChange={(checked) =>
                      onToggleActive(v.id, checked)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {editingId === v.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdate(v.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(v.id)}
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
