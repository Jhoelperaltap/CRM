"use client";
import { useState } from "react";
import { addCaseNote } from "@/lib/api/cases";
import type { TaxCaseNote } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props { caseId: string; notes: TaxCaseNote[]; onNoteAdded: () => void; }

export function CaseNotes({ caseId, notes, onNoteAdded }: Props) {
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await addCaseNote(caseId, { content, is_internal: isInternal });
      setContent("");
      onNoteAdded();
    } catch { alert("Failed to add note"); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Notes ({notes.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{note.author?.full_name || "Unknown"}</span>
                <div className="flex items-center gap-2">
                  {note.is_internal && <span className="bg-yellow-100 text-yellow-800 rounded px-2 py-0.5 text-xs">Internal</span>}
                  <span className="text-muted-foreground">{new Date(note.created_at).toLocaleString()}</span>
                </div>
              </div>
              <p className="mt-1 text-sm">{note.content}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t pt-4">
          <textarea
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add a note..."
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note
            </label>
            <Button size="sm" onClick={handleAdd} disabled={saving || !content.trim()}>
              {saving ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
