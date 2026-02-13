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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStockTransactions, createStockTransaction, getProducts } from "@/lib/api/inventory";
import type { PaginatedResponse } from "@/types/api";
import type { StockTransactionItem, ProductListItem } from "@/types";

export default function StockManagementPage() {
  const [data, setData] = useState<PaginatedResponse<StockTransactionItem> | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product: "", transaction_type: "stock_in", quantity: "", reference: "", notes: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await getStockTransactions({ page: String(page), ...(search ? { search } : {}) })); } catch {}
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { getProducts({ page_size: "100" }).then((r) => setProducts(r.results || [])).catch(() => {}); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try { await createStockTransaction({ ...form, quantity: Number(form.quantity) }); setDialogOpen(false); setForm({ product: "", transaction_type: "stock_in", quantity: "", reference: "", notes: "" }); fetchData(); } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Stock Management" description="Track inventory stock movements" actions={<Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Transaction</Button>} />
      <DataTableToolbar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search by reference..." />
      {loading ? <LoadingSpinner /> : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16"><p className="text-muted-foreground">No stock transactions found</p><Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 size-4" /> Add Transaction</Button></div>
      ) : (
        <>
          <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Reference</TableHead><TableHead>By</TableHead></TableRow></TableHeader><TableBody>
            {data.results.map((t) => (<TableRow key={t.id}><TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell><TableCell className="font-medium">{t.product_name}</TableCell><TableCell><StatusBadge status={t.transaction_type.replace("_", " ")} /></TableCell><TableCell className="text-right">{t.quantity}</TableCell><TableCell>{t.reference || "—"}</TableCell><TableCell>{t.created_by_name || "—"}</TableCell></TableRow>))}
          </TableBody></Table></div>
          <DataTablePagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add Stock Transaction</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Product *</Label>
            <Select value={form.product} onValueChange={(v) => setForm({ ...form, product: v })}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.product_code} – {p.name}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Transaction Type</Label>
              <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stock_in">Stock In</SelectItem><SelectItem value="stock_out">Stock Out</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving || !form.product || !form.quantity}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
