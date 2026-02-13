"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate, renderTemplate,
} from "@/lib/api/emails";
import { EmailTemplate } from "@/types/email";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body_text: string } | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body_text: "", variables: "" });

  const fetch = async () => {
    setLoading(true);
    try { setTemplates((await getTemplates()).results); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const reset = () => { setForm({ name: "", subject: "", body_text: "", variables: "" }); setEditId(null); setShowForm(false); setPreview(null); };

  const handleEdit = (t: EmailTemplate) => {
    setForm({ name: t.name, subject: t.subject, body_text: t.body_text, variables: t.variables.join(", ") });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name, subject: form.subject, body_text: form.body_text,
      variables: form.variables.split(",").map((v) => v.trim()).filter(Boolean),
    };
    if (editId) { await updateTemplate(editId, payload); } else { await createTemplate(payload); }
    reset(); fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Button onClick={() => { setShowForm(!showForm); setPreview(null); }}>
          <Plus className="mr-2 size-4" />Add Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Create"} Template</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Subject</label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Welcome {{contact_name}}" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Body (plain text)</label>
              <textarea value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={8} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono" placeholder="Use {{variable}} for placeholders" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Variables (comma separated)</label>
              <Input value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="contact_name, case_number" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleSubmit}>{editId ? "Update" : "Create"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium">Subject: {preview.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm font-sans bg-muted p-3 rounded-md">{preview.body_text}</pre>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setPreview(null)}>Close</Button>
          </CardContent>
        </Card>
      )}

      {loading ? <p className="text-muted-foreground">Loading...</p> : templates.length === 0 ? <p className="text-muted-foreground">No templates yet.</p> : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.subject}</p>
                  {t.variables.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {t.variables.map((v) => <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => {
                    const ctx: Record<string, string> = {};
                    t.variables.forEach((v) => { ctx[v] = `[${v}]`; });
                    renderTemplate(t.id, ctx).then(setPreview).catch(() => setPreview({ subject: t.subject, body_text: t.body_text }));
                  }}><Eye className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteTemplate(t.id).then(fetch); }}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
