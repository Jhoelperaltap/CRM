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
import { getPayments, createPayment, deletePayment } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { PaymentListItem } from "@/types";

export default function PaymentsPage() {
  const [data, setData] = useState<PaginatedResponse<PaymentListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ payment_number: "", amount: "", payment_date: new Date().toISOString().split("T")[0], payment_mode: "cash", status: "pending" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getPayments({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createPayment(form); setDialogOpen(false); setForm({ payment_number: "", amount: "", payment_date: new Date().toISOString().split("T")[0], payment_mode: "cash", status: "pending" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Track payment records" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Payment</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search payments..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No payments found</p><Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Payment</Button></div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Payment #</TableHead><TableHead>Contact</TableHead><TableHead>Invoice</TableHead><TableHead>Mode</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.results.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.payment_number}</TableCell><TableCell>{p.contact_name || "—"}</TableCell><TableCell>{p.invoice_number || "—"}</TableCell><TableCell className="capitalize">{p.payment_mode.replace("_", " ")}</TableCell><TableCell>{p.payment_date}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell><TableCell className="text-right">${Number(p.amount).toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={async () => { if(confirm("Delete?")) { await deletePayment(p.id); fetchData(); } }}>Delete</Button></TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Payment Number *</Label><Input value={form.payment_number} onChange={(e) => setForm({ ...form, payment_number: e.target.value })} /></div><div className="space-y-2"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div><div className="space-y-2"><Label>Payment Mode</Label><Input value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.payment_number || !form.amount}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
