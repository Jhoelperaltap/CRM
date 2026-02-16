"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pin, Trash2, Check, X, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
  type StickyNote,
} from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const colorClasses: Record<StickyNote["color"], string> = {
  yellow: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
  blue: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  green: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
  pink: "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700",
  purple: "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
  orange: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
};

const priorityIndicator: Record<StickyNote["priority"], string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

interface NoteFormState {
  title: string;
  content: string;
  color: StickyNote["color"];
  priority: StickyNote["priority"];
}

const EMPTY_FORM: NoteFormState = {
  title: "",
  content: "",
  color: "yellow",
  priority: "medium",
};

export function StickyNotes() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [form, setForm] = useState<NoteFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await getStickyNotes(false);
      setNotes(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const openCreateDialog = () => {
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (note: StickyNote) => {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content,
      color: note.color,
      priority: note.priority,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      if (editingNote) {
        await updateStickyNote(editingNote.id, form);
      } else {
        await createStickyNote(form);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingNote(null);
      fetchNotes();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteStickyNote(id);
      fetchNotes();
    } catch {
      // ignore
    }
  };

  const handleTogglePin = async (note: StickyNote) => {
    try {
      await updateStickyNote(note.id, { is_pinned: !note.is_pinned });
      fetchNotes();
    } catch {
      // ignore
    }
  };

  const handleToggleComplete = async (note: StickyNote) => {
    try {
      await updateStickyNote(note.id, { is_completed: !note.is_completed });
      fetchNotes();
    } catch {
      // ignore
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">My Notes & Reminders</CardTitle>
        <Button size="sm" variant="outline" onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Note
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">No notes yet</p>
            <p className="text-muted-foreground text-xs mt-1">
              Add a note to keep track of important reminders
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Create your first note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "relative rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 min-h-[140px]",
                  colorClasses[note.color],
                  note.is_completed && "opacity-60"
                )}
                onClick={() => openEditDialog(note)}
              >
                {/* Priority indicator */}
                <div
                  className={cn(
                    "absolute top-3 right-3 h-2.5 w-2.5 rounded-full",
                    priorityIndicator[note.priority]
                  )}
                  title={`Priority: ${note.priority}`}
                />

                {/* Pinned indicator */}
                {note.is_pinned && (
                  <Pin className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                )}

                {/* Content */}
                <div className={cn("pt-2", note.is_pinned && "pl-6")}>
                  {note.title && (
                    <h4 className={cn(
                      "font-semibold text-sm mb-2",
                      note.is_completed && "line-through"
                    )}>
                      {note.title}
                    </h4>
                  )}
                  <p className={cn(
                    "text-sm text-muted-foreground whitespace-pre-wrap",
                    note.is_completed && "line-through"
                  )}>
                    {note.content}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-4 pt-2 border-t border-current/10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(note);
                    }}
                    title={note.is_completed ? "Mark incomplete" : "Mark complete"}
                  >
                    <Check className={cn(
                      "h-4 w-4",
                      note.is_completed && "text-green-600"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(note);
                    }}
                    title={note.is_pinned ? "Unpin" : "Pin to top"}
                  >
                    <Pin className={cn(
                      "h-4 w-4",
                      note.is_pinned && "text-blue-600 fill-blue-600"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Title (optional)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Write your note or reminder..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <Select
                  value={form.color}
                  onValueChange={(v) => setForm({ ...form, color: v as StickyNote["color"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yellow">Yellow</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="pink">Pink</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as StickyNote["priority"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Color preview */}
            <div className={cn(
              "rounded-lg border-2 p-3 text-sm",
              colorClasses[form.color]
            )}>
              <p className="text-muted-foreground">Preview of your note color</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.content.trim()}>
              {saving ? "Saving..." : editingNote ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
