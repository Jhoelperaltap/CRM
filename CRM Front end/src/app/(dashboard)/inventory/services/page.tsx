"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getServices, createService, deleteService } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { ServiceListItem } from "@/types";

export default function ServicesPage() {
  const [data, setData] = useState<PaginatedResponse<ServiceListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", service_code: "", category: "", unit_price: "", usage_unit: "Hours", description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getServices({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createService({ ...form, unit_price: form.unit_price || "0" }); setDialogOpen(false); setForm({ name: "", service_code: "", category: "", unit_price: "", usage_unit: "Hours", description: "" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Services" description="Manage your service catalog" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Service</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search services..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">No services found</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Service</Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Service Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead>Usage Unit</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.results.map((s) => (<TableRow key={s.id}><TableCell className="font-medium">{s.service_code}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.category || "—"}</TableCell><TableCell className="text-right">${Number(s.unit_price).toFixed(2)}</TableCell><TableCell>{s.usage_unit}</TableCell><TableCell><StatusBadge status={s.is_active ? "active" : "inactive"} /></TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { if(confirm("Delete?")) { await deleteService(s.id); fetchData(); } }}>Delete</Button></TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Service Code *</Label><Input value={form.service_code} onChange={(e) => setForm({ ...form, service_code: e.target.value })} /></div><div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Unit Price</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div><div className="space-y-2"><Label>Usage Unit</Label><Input value={form.usage_unit} onChange={(e) => setForm({ ...form, usage_unit: e.target.value })} /></div></div>
          <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name || !form.service_code}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
