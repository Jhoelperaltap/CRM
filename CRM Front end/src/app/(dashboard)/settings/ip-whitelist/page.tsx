"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getIPWhitelist,
  createIPWhitelistEntry,
  deleteIPWhitelistEntry,
} from "@/lib/api/settings";
import type { LoginIPWhitelistEntry } from "@/types/settings";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IPWhitelistForm } from "@/components/settings/ip-whitelist-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export default function IPWhitelistPage() {
  const [data, setData] = useState<PaginatedResponse<LoginIPWhitelistEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getIPWhitelist();
      setData(result);
    } catch (err) {
      console.error("Failed to load IP whitelist", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (payload: Partial<LoginIPWhitelistEntry>) => {
    setCreating(true);
    try {
      await createIPWhitelistEntry(payload);
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to add IP whitelist entry", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIPWhitelistEntry(deleteTarget);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error("Failed to delete IP whitelist entry", err);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="IP Whitelist"
        description="Restrict login access by IP address"
        actions={
          !showForm ? (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Whitelist Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <IPWhitelistForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={creating}
            />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>CIDR</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {entry.ip_address}
                  </TableCell>
                  <TableCell>{entry.cidr_prefix ?? "-"}</TableCell>
                  <TableCell className="text-sm">{entry.role || "-"}</TableCell>
                  <TableCell className="text-sm">{entry.user || "-"}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {entry.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.is_active ? "default" : "secondary"}>
                      {entry.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.results.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No IP whitelist entries.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Whitelist Entry"
        description="Are you sure you want to remove this IP whitelist entry?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
