"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTaxRates, createTaxRate, updateTaxRate, deleteTaxRate } from "@/lib/api/inventory";
import type { TaxRateItem } from "@/types";

export default function TaxManagementPage() {
  const [items, setItems] = useState<TaxRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", rate: "", tax_type: "individual", is_active: true, is_compound: false, description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await getTaxRates({ page_size: "100" }); setItems(res.results || []); } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditId(null); setForm({ name: "", rate: "", tax_type: "individual", is_active: true, is_compound: false, description: "" }); setDialogOpen(true); };
  const openEdit = (item: TaxRateItem) => { setEditId(item.id); setForm({ name: item.name, rate: item.rate, tax_type: item.tax_type, is_active: item.is_active, is_compound: item.is_compound, description: item.description }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) { await updateTaxRate(editId, form); } else { await createTaxRate(form); }
      setDialogOpen(false); fetchData();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { if (!confirm("Delete this tax rate?")) return; await deleteTaxRate(id); fetchData(); };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader title="Tax Management" description="Configure tax rates for inventory" actions={<Button onClick={openCreate}><Plus className="mr-2 size-4" /> Add Tax Rate</Button>} />
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No tax rates configured</p><Button variant="outline" className="mt-4" onClick={openCreate}><Plus className="mr-2 size-4" /> Add Tax Rate</Button></div>
      ) : (
        <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Rate (%)</TableHead><TableHead>Type</TableHead><TableHead>Compound</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {items.map((t) => (<TableRow key={t.id}><TableCell className="font-medium">{t.name}</TableCell><TableCell>{t.rate}%</TableCell><TableCell className="capitalize">{t.tax_type}</TableCell><TableCell>{t.is_compound ? "Yes" : "No"}</TableCell><TableCell>{t.is_active ? "Active" : "Inactive"}</TableCell><TableCell className="flex gap-1 justify-end"><Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="size-4" /></Button></TableCell></TableRow>))}
        </TableBody></Table></div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Tax Rate</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Rate (%) *</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div></div>
          <div className="flex items-center gap-6"><div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div><div className="flex items-center gap-2"><Switch checked={form.is_compound} onCheckedChange={(v) => setForm({ ...form, is_compound: v })} /><Label>Compound</Label></div></div>
          <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.name || !form.rate}>{saving ? "Saving..." : editId ? "Update" : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
