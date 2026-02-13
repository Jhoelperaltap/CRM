"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getSharingRules,
  createSharingRule,
  deleteSharingRule,
} from "@/lib/api/settings";
import type { SharingRule } from "@/types/settings";
import type { PaginatedResponse } from "@/types/api";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SharingRuleForm } from "@/components/settings/sharing-rule-form";
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

export default function SharingRulesPage() {
  const [data, setData] = useState<PaginatedResponse<SharingRule> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSharingRules();
      setData(result);
    } catch (err) {
      console.error("Failed to load sharing rules", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (payload: Partial<SharingRule>) => {
    setCreating(true);
    try {
      await createSharingRule(payload);
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create sharing rule", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSharingRule(deleteTarget);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error("Failed to delete sharing rule", err);
    }
  };

  const accessBadgeColor: Record<string, string> = {
    private: "bg-red-100 text-red-800",
    public: "bg-green-100 text-green-800",
    read_only: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sharing Rules"
        description="Configure data sharing between roles and groups"
        actions={
          !showForm ? (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Sharing Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <SharingRuleForm
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
                <TableHead>Module</TableHead>
                <TableHead>Default Access</TableHead>
                <TableHead>Share Type</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium capitalize">
                    {rule.module}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-0 ${accessBadgeColor[rule.default_access] || ""}`}
                    >
                      {rule.default_access.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {rule.share_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="capitalize">
                    {rule.access_level.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!data || data.results.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No sharing rules configured.
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
        title="Delete Sharing Rule"
        description="Are you sure you want to delete this sharing rule? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
