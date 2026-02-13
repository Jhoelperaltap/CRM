"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getModule,
  updateModule,
  resetModuleNumbering,
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getFieldLabels,
  saveFieldLabel,
  updateFieldLabel,
  deleteFieldLabel,
} from "@/lib/api/module-config";
import type { CRMModule, CustomField, FieldLabel } from "@/types/index";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomFieldTable } from "@/components/settings/custom-field-table";
import { CustomFieldForm } from "@/components/settings/custom-field-form";
import { NumberingConfigForm } from "@/components/settings/numbering-config-form";
import { FieldLabelEditor } from "@/components/settings/field-label-editor";
import { ArrowLeft, Plus } from "lucide-react";

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;

  const [module, setModule] = useState<CRMModule | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [labels, setLabels] = useState<FieldLabel[]>([]);
  const [loading, setLoading] = useState(true);

  // Field form state
  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteFieldOpen, setDeleteFieldOpen] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [mod, cf, lbl] = await Promise.all([
        getModule(moduleId),
        getCustomFields(moduleId),
        getFieldLabels(moduleId),
      ]);
      setModule(mod);
      setFields(cf);
      setLabels(lbl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Custom field handlers
  const handleCreateField = async (data: Record<string, unknown>) => {
    await createCustomField(moduleId, data);
    const updated = await getCustomFields(moduleId);
    setFields(updated);
    const mod = await getModule(moduleId);
    setModule(mod);
  };

  const handleUpdateField = async (data: Record<string, unknown>) => {
    if (!editingField) return;
    await updateCustomField(moduleId, editingField.id, data);
    const updated = await getCustomFields(moduleId);
    setFields(updated);
  };

  const handleDeleteField = async () => {
    if (!deletingFieldId) return;
    await deleteCustomField(moduleId, deletingFieldId);
    const updated = await getCustomFields(moduleId);
    setFields(updated);
    const mod = await getModule(moduleId);
    setModule(mod);
    setDeleteFieldOpen(false);
    setDeletingFieldId(null);
  };

  const openEditField = (field: CustomField) => {
    setEditingField(field);
    setFieldFormOpen(true);
  };

  const openCreateField = () => {
    setEditingField(null);
    setFieldFormOpen(true);
  };

  // Numbering handlers
  const handleSaveNumbering = async (data: Record<string, unknown>) => {
    const updated = await updateModule(moduleId, data);
    setModule(updated);
  };

  const handleResetNumbering = async () => {
    const updated = await resetModuleNumbering(moduleId);
    setModule(updated);
  };

  // Label handlers
  const handleSaveLabel = async (data: Record<string, unknown>) => {
    await saveFieldLabel(moduleId, data);
    const updated = await getFieldLabels(moduleId);
    setLabels(updated);
  };

  const handleUpdateLabel = async (
    labelId: string,
    data: Record<string, unknown>
  ) => {
    await updateFieldLabel(moduleId, labelId, data);
    const updated = await getFieldLabels(moduleId);
    setLabels(updated);
  };

  const handleDeleteLabel = async (labelId: string) => {
    await deleteFieldLabel(moduleId, labelId);
    const updated = await getFieldLabels(moduleId);
    setLabels(updated);
  };

  if (loading || !module) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings/modules")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={module.label_plural}
          actions={null}
        />
      </div>

      <Tabs defaultValue="fields" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Custom Fields</CardTitle>
              <Button size="sm" onClick={openCreateField}>
                <Plus className="mr-1 h-3 w-3" /> Add Field
              </Button>
            </CardHeader>
            <CardContent>
              <CustomFieldTable
                fields={fields}
                onEdit={openEditField}
                onDelete={(id) => {
                  setDeletingFieldId(id);
                  setDeleteFieldOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering">
          <NumberingConfigForm
            module={module}
            onSave={handleSaveNumbering}
            onReset={handleResetNumbering}
          />
        </TabsContent>

        <TabsContent value="labels">
          <Card>
            <CardHeader>
              <CardTitle>Field Label Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldLabelEditor
                labels={labels}
                onSave={handleSaveLabel}
                onUpdate={handleUpdateLabel}
                onDelete={handleDeleteLabel}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomFieldForm
        open={fieldFormOpen}
        onOpenChange={setFieldFormOpen}
        field={editingField}
        onSave={editingField ? handleUpdateField : handleCreateField}
      />

      <ConfirmDialog
        open={deleteFieldOpen}
        onOpenChange={setDeleteFieldOpen}
        title="Delete Custom Field"
        description="This will permanently delete this custom field. Data stored in this field on existing records will not be removed but will no longer be displayed."
        confirmLabel="Delete"
        onConfirm={handleDeleteField}
      />
    </div>
  );
}
