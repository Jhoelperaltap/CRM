"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getPicklists,
  createPicklist,
  updatePicklist,
  deletePicklist,
} from "@/lib/api/module-config";
import { getModules } from "@/lib/api/module-config";
import type { Picklist, CRMModule } from "@/types/index";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PicklistForm } from "@/components/settings/picklist-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function PicklistsPage() {
  const router = useRouter();
  const [picklists, setPicklists] = useState<Picklist[]>([]);
  const [modules, setModules] = useState<CRMModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPicklist, setEditingPicklist] = useState<Picklist | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [picklistRes, moduleRes] = await Promise.all([
        getPicklists(),
        getModules(),
      ]);
      setPicklists(picklistRes.results);
      setModules(moduleRes.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: Record<string, unknown>) => {
    await createPicklist(data);
    const res = await getPicklists();
    setPicklists(res.results);
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingPicklist) return;
    await updatePicklist(editingPicklist.id, data);
    const res = await getPicklists();
    setPicklists(res.results);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePicklist(deletingId);
      const res = await getPicklists();
      setPicklists(res.results);
    } catch (e) {
      console.error(e);
    }
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const openCreate = () => {
    setEditingPicklist(null);
    setFormOpen(true);
  };

  const openEdit = (picklist: Picklist) => {
    setEditingPicklist(picklist);
    setFormOpen(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Picklists"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Picklist
          </Button>
        }
      />

      {picklists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No picklists configured. Run the seed command to populate system
            picklists.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {picklists.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/settings/picklists/${p.id}`)}
                >
                  <TableCell className="font-mono text-sm">
                    {p.name}
                  </TableCell>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.module_name || "Global"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.values?.length || 0} value
                      {(p.values?.length || 0) !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.is_system ? (
                      <Badge>System</Badge>
                    ) : (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!p.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(p.id);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PicklistForm
        open={formOpen}
        onOpenChange={setFormOpen}
        picklist={editingPicklist}
        modules={modules}
        onSave={editingPicklist ? handleUpdate : handleCreate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Picklist"
        description="This will permanently delete this picklist and all its values. Fields using this picklist will no longer have dropdown options."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
