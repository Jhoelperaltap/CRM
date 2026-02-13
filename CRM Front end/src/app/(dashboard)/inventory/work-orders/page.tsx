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
import { getWorkOrders, createWorkOrder, deleteWorkOrder } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { WorkOrderListItem } from "@/types";

export default function WorkOrdersPage() {
  const [data, setData] = useState<PaginatedResponse<WorkOrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ wo_number: "", subject: "", status: "open", priority: "medium" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getWorkOrders({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createWorkOrder(form); setDialogOpen(false); setForm({ wo_number: "", subject: "", status: "open", priority: "medium" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Work Orders" description="Manage work orders" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Work Order</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search work orders..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No work orders found</p><Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Work Order</Button></div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>WO #</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assigned To</TableHead><TableHead>Start Date</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.results.map((wo) => (<TableRow key={wo.id}><TableCell className="font-medium">{wo.wo_number}</TableCell><TableCell>{wo.subject}</TableCell><TableCell><StatusBadge status={wo.status} /></TableCell><TableCell className="capitalize">{wo.priority}</TableCell><TableCell>{wo.assigned_to_name || "—"}</TableCell><TableCell>{wo.start_date || "—"}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { if(confirm("Delete?")) { await deleteWorkOrder(wo.id); fetchData(); } }}>Delete</Button></TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Work Order</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>WO Number *</Label><Input value={form.wo_number} onChange={(e) => setForm({ ...form, wo_number: e.target.value })} /></div><div className="space-y-2"><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.wo_number || !form.subject}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
