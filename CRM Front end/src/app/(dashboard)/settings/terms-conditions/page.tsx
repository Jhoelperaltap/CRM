"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTermsAndConditions, createTermsAndConditions, updateTermsAndConditions, deleteTermsAndConditions } from "@/lib/api/inventory";
import type { TermsAndConditionsItem } from "@/types";

export default function TermsConditionsPage() {
  const [items, setItems] = useState<TermsAndConditionsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", content: "", module: "", is_default: false });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getTermsAndConditions({ page_size: "100" }); setItems(res.results || []); } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditId(null); setForm({ name: "", content: "", module: "", is_default: false }); setDialogOpen(true); };
  const openEdit = (item: TermsAndConditionsItem) => { setEditId(item.id); setForm({ name: item.name, content: item.content, module: item.module, is_default: item.is_default }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) { await updateTermsAndConditions(editId, form); } else { await createTermsAndConditions(form); }
      setDialogOpen(false); fetchData();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm("Delete?")) return; await deleteTermsAndConditions(id); fetchData(); };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader title="Terms and Conditions" description="Manage T&C templates for invoices and orders" actions={<Button onClick={openCreate}><Plus className="mr-2 size-4" /> Add Template</Button>} />
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No templates configured</p><Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="mr-2 size-4" /> Add Template</Button></div>
      ) : (
        <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Module</TableHead><TableHead>Default</TableHead><TableHead>Content Preview</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {items.map((t) => (<TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell>{t.module || "All"}</TableCell><TableCell>{t.is_default ? "Yes" : "No"}</TableCell><TableCell className="max-w-xs truncate text-muted-foreground">{t.content.substring(0, 80)}...</TableCell><TableCell className="flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="size-4" /></Button></TableCell></TableRow>))}
        </TableBody></Table></div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Terms & Conditions</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Module</Label><Input placeholder="e.g. invoices, quotes (empty = all)" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} /></div></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label>Default template</Label></div>
          <div className="space-y-2"><Label>Content *</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.name || !form.content}>{saving ? "Saving..." : editId ? "Update" : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
