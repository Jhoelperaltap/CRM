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
import { getVendors, createVendor, deleteVendor } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { VendorListItem } from "@/types";

export default function VendorsPage() {
  const [data, setData] = useState<PaginatedResponse<VendorListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", vendor_code: "", email: "", phone: "", category: "", city: "", country: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getVendors({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createVendor(form); setDialogOpen(false); setForm({ name: "", vendor_code: "", email: "", phone: "", category: "", city: "", country: "" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Vendors" description="Manage your vendors and suppliers" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Vendor</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search vendors..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">No vendors found</p>
          <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Vendor</Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.results.map((v) => (<TableRow key={v.id}><TableCell className="font-medium">{v.name}</TableCell><TableCell>{v.vendor_code || "—"}</TableCell><TableCell>{v.email || "—"}</TableCell><TableCell>{v.phone || "—"}</TableCell><TableCell>{v.category || "—"}</TableCell><TableCell><StatusBadge status={v.is_active ? "active" : "inactive"} /></TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { if(confirm("Delete?")) { await deleteVendor(v.id); fetchData(); } }}>Delete</Button></TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Vendor Code</Label><Input value={form.vendor_code} onChange={(e) => setForm({ ...form, vendor_code: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
