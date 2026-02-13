"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  getChecklistTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
} from "@/lib/api/checklists";
import type {
  ChecklistTemplateListItem,
  ChecklistTemplate,
  ChecklistTemplateItem,
} from "@/types/checklists";
import { CASE_TYPE_LABELS } from "@/types/checklists";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TemplateItemEditor } from "@/components/checklists/template-item-editor";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<ChecklistTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<ChecklistTemplate | null>(null);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCaseType, setFormCaseType] = useState("");
  const [formTaxYear, setFormTaxYear] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await getChecklistTemplates();
      setTemplates(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormName("");
    setFormCaseType("");
    setFormTaxYear("");
    setFormIsActive(true);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const tmpl = await getChecklistTemplate(id);
      setEditingId(id);
      setFormName(tmpl.name);
      setFormCaseType(tmpl.case_type);
      setFormTaxYear(tmpl.tax_year?.toString() || "");
      setFormIsActive(tmpl.is_active);
      setDialogOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const openItemEditor = async (id: string) => {
    try {
      const tmpl = await getChecklistTemplate(id);
      setEditTemplate(tmpl);
      setItemEditorOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formName,
        case_type: formCaseType,
        tax_year: formTaxYear ? parseInt(formTaxYear) : null,
        is_active: formIsActive,
      };
      if (editingId) {
        await updateChecklistTemplate(editingId, payload);
      } else {
        await createChecklistTemplate(payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteChecklistTemplate(deletingId);
      setDeleteOpen(false);
      setDeletingId(null);
      fetchTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = async (data: Record<string, unknown>) => {
    if (!editTemplate) return;
    await addTemplateItem(editTemplate.id, data);
    const updated = await getChecklistTemplate(editTemplate.id);
    setEditTemplate(updated);
  };

  const handleUpdateItem = async (
    itemId: string,
    data: Record<string, unknown>
  ) => {
    if (!editTemplate) return;
    await updateTemplateItem(editTemplate.id, itemId, data);
    const updated = await getChecklistTemplate(editTemplate.id);
    setEditTemplate(updated);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!editTemplate) return;
    await deleteTemplateItem(editTemplate.id, itemId);
    const updated = await getChecklistTemplate(editTemplate.id);
    setEditTemplate(updated);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist Templates"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No checklist templates configured yet. Create one to auto-populate
            checklists when cases are created.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {CASE_TYPE_LABELS[t.case_type] || t.case_type}
                    {t.tax_year ? ` / ${t.tax_year}` : " / All Years"}
                  </p>
                </div>
                <Badge variant={t.is_active ? "default" : "secondary"}>
                  {t.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.item_count} item{t.item_count !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openItemEditor(t.id)}
                  >
                    <ListChecks className="mr-1 h-3 w-3" /> Items
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(t.id)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeletingId(t.id);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Individual 1040 Checklist"
              />
            </div>
            <div>
              <Label>Case Type</Label>
              <Select value={formCaseType} onValueChange={setFormCaseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax Year (optional)</Label>
              <Input
                type="number"
                value={formTaxYear}
                onChange={(e) => setFormTaxYear(e.target.value)}
                placeholder="Leave empty for all years"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName || !formCaseType}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item editor dialog */}
      {editTemplate && (
        <Dialog open={itemEditorOpen} onOpenChange={setItemEditorOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Items: {editTemplate.name}</DialogTitle>
            </DialogHeader>
            <TemplateItemEditor
              items={editTemplate.items}
              onAdd={handleAddItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Template"
        description="This will permanently delete this template. Cases already using it will not be affected."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
