"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getProducts,
} from "@/lib/api/inventory";
import { getContacts } from "@/lib/api/contacts";
import { getCorporations } from "@/lib/api/corporations";
import { getUsers } from "@/lib/api/users";
import type { PaginatedResponse } from "@/types/api";
import type {
  AssetListItem,
  ProductListItem,
  ContactListItem,
  CorporationListItem,
  User,
} from "@/types";

interface AssetFormState {
  name: string;
  serial_number: string;
  product: string;
  status: string;
  assigned_to: string;
  date_in_service: string;
  date_sold: string;
  corporation: string;
  contact: string;
}

const EMPTY_FORM: AssetFormState = {
  name: "",
  serial_number: "",
  product: "",
  status: "in_service",
  assigned_to: "",
  date_in_service: "",
  date_sold: "",
  corporation: "",
  contact: "",
};

export default function AssetsPage() {
  const [data, setData] = useState<PaginatedResponse<AssetListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AssetFormState>(EMPTY_FORM);

  // Lookup data
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    getProducts().then((r) => setProducts(r.results)).catch(() => {});
    getContacts().then((r) => setContacts(r.results)).catch(() => {});
    getCorporations().then((r) => setCorporations(r.results)).catch(() => {});
    getUsers().then((r) => setUsers(r.results)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await getAssets({
          page: String(page),
          ...(search ? { search } : {}),
        })
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const asset = await getAsset(id);
      setEditingId(id);
      setForm({
        name: asset.name || "",
        serial_number: asset.serial_number || "",
        product: asset.product || "",
        status: asset.status || "in_service",
        assigned_to: asset.assigned_to || "",
        date_in_service: asset.date_in_service || "",
        date_sold: asset.date_sold || "",
        corporation: asset.corporation || "",
        contact: asset.contact || "",
      });
      setDialogOpen(true);
    } catch {
      alert("Failed to load asset.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.product) delete payload.product;
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.corporation) delete payload.corporation;
      if (!payload.contact) delete payload.contact;
      if (!payload.date_in_service) delete payload.date_in_service;
      if (!payload.date_sold) delete payload.date_sold;

      if (editingId) {
        await updateAsset(editingId, payload);
      } else {
        await createAsset(payload);
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchData();
    } catch {
      alert(editingId ? "Failed to update asset." : "Failed to create asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await deleteAsset(id);
      fetchData();
    } catch {
      alert("Failed to delete asset.");
    }
  };

  const setField = (key: keyof AssetFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assets"
        description="Track customer assets"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" /> Add Asset
          </Button>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search assets..."
      />

      {loading ? (
        <LoadingSpinner />
      ) : !data?.results.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">No assets found</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="mr-2 size-4" /> Add Asset
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.serial_number || "\u2014"}</TableCell>
                    <TableCell>{a.product_name || "\u2014"}</TableCell>
                    <TableCell>{a.corporation_name || "\u2014"}</TableCell>
                    <TableCell>{a.contact_name || "\u2014"}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status.replace("_", " ")} />
                    </TableCell>
                    <TableCell>{a.assigned_to_name || "\u2014"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(a.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={page}
            pageSize={25}
            total={data.count}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Add / Edit Asset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Asset" : "Add Asset"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Asset Name */}
            <div className="space-y-2">
              <Label>Asset Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Enter asset name"
              />
            </div>

            {/* Serial Number */}
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={form.serial_number}
                onChange={(e) => setField("serial_number", e.target.value)}
                placeholder="Enter serial number"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Select
                value={form.product || ""}
                onValueChange={(v) => setField("product", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_service">In Service</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={form.assigned_to || ""}
                onValueChange={(v) => setField("assigned_to", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date in Service / Date Sold */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date in Service</Label>
                <Input
                  type="date"
                  value={form.date_in_service}
                  onChange={(e) => setField("date_in_service", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date Sold</Label>
                <Input
                  type="date"
                  value={form.date_sold}
                  onChange={(e) => setField("date_sold", e.target.value)}
                />
              </div>
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Select
                value={form.corporation || ""}
                onValueChange={(v) => setField("corporation", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {corporations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Select
                value={form.contact || ""}
                onValueChange={(v) => setField("contact", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
