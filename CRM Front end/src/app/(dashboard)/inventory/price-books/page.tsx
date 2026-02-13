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
import { getPriceBooks, createPriceBook, deletePriceBook } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { PriceBookListItem } from "@/types";

export default function PriceBooksPage() {
  const [data, setData] = useState<PaginatedResponse<PriceBookListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", currency: "USD" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getPriceBooks({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createPriceBook(form); setDialogOpen(false); setForm({ name: "", description: "", currency: "USD" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Price Books" description="Manage price lists" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Price Book</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search price books..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No price books found</p><Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Price Book</Button></div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Currency</TableHead><TableHead>Entries</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.results.map((pb) => (<TableRow key={pb.id}><TableCell className="font-medium">{pb.name}</TableCell><TableCell>{pb.currency}</TableCell><TableCell>{pb.entry_count}</TableCell><TableCell><StatusBadge status={pb.is_active ? "active" : "inactive"} /></TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { if(confirm("Delete?")) { await deletePriceBook(pb.id); fetchData(); } }}>Delete</Button></TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Price Book</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div></div><div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.name}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
