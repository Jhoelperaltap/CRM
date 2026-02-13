"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPicklist,
  createPicklistValue,
  updatePicklistValue,
  deletePicklistValue,
} from "@/lib/api/module-config";
import type { Picklist } from "@/types/index";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PicklistValueEditor } from "@/components/settings/picklist-value-editor";
import { ArrowLeft } from "lucide-react";

export default function PicklistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const picklistId = params.id as string;

  const [picklist, setPicklist] = useState<Picklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingValueId, setDeletingValueId] = useState<string | null>(null);

  const fetchPicklist = useCallback(async () => {
    try {
      const data = await getPicklist(picklistId);
      setPicklist(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [picklistId]);

  useEffect(() => {
    fetchPicklist();
  }, [fetchPicklist]);

  const handleAddValue = async (data: Record<string, unknown>) => {
    await createPicklistValue(picklistId, data);
    await fetchPicklist();
  };

  const handleUpdateValue = async (
    valueId: string,
    data: Record<string, unknown>
  ) => {
    await updatePicklistValue(picklistId, valueId, data);
    await fetchPicklist();
  };

  const handleDeleteValue = async () => {
    if (!deletingValueId) return;
    await deletePicklistValue(picklistId, deletingValueId);
    await fetchPicklist();
    setDeleteOpen(false);
    setDeletingValueId(null);
  };

  const handleToggleActive = async (valueId: string, active: boolean) => {
    await updatePicklistValue(picklistId, valueId, { is_active: active });
    await fetchPicklist();
  };

  if (loading || !picklist) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings/picklists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={picklist.label} />
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono">
          {picklist.name}
        </Badge>
        {picklist.module_name && (
          <Badge variant="secondary">{picklist.module_name}</Badge>
        )}
        {picklist.is_system && <Badge>System</Badge>}
        {picklist.description && (
          <span className="text-sm text-muted-foreground">
            {picklist.description}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Values</CardTitle>
        </CardHeader>
        <CardContent>
          <PicklistValueEditor
            values={picklist.values || []}
            onAdd={handleAddValue}
            onUpdate={handleUpdateValue}
            onDelete={async (valueId) => {
              setDeletingValueId(valueId);
              setDeleteOpen(true);
            }}
            onToggleActive={handleToggleActive}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Value"
        description="This will permanently delete this picklist value. Records using this value will retain it but it will no longer appear in dropdowns."
        confirmLabel="Delete"
        onConfirm={handleDeleteValue}
      />
    </div>
  );
}
