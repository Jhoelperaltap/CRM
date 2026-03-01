"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, Package } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
} from "@/lib/api/portal-admin";
import type { PortalModulePreset, PresetInput } from "@/types/portal-admin";

const MODULE_KEYS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "billing", label: "Billing" },
  { key: "messages", label: "Messages" },
  { key: "documents", label: "Documents" },
  { key: "cases", label: "Cases" },
  { key: "rentals", label: "Rentals" },
  { key: "buildings", label: "Buildings" },
];

export default function PortalPresetsPage() {
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<PortalModulePreset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PortalModulePreset | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formModules, setFormModules] = useState<Record<string, boolean>>({
    dashboard: false,
    billing: false,
    messages: false,
    documents: false,
    cases: false,
    rentals: false,
    buildings: false,
  });
  const [formIsDefault, setFormIsDefault] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPresets();
      setPresets(data);
    } catch (error) {
      console.error("Failed to fetch presets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setSelectedPreset(null);
    setFormName("");
    setFormDescription("");
    setFormModules({
      dashboard: false,
      billing: false,
      messages: false,
      documents: false,
      cases: false,
      rentals: false,
      buildings: false,
    });
    setFormIsDefault(false);
    setDialogOpen(true);
  };

  const openEditDialog = (preset: PortalModulePreset) => {
    setSelectedPreset(preset);
    setFormName(preset.name);
    setFormDescription(preset.description || "");
    setFormModules({
      dashboard: preset.module_dashboard,
      billing: preset.module_billing,
      messages: preset.module_messages,
      documents: preset.module_documents,
      cases: preset.module_cases,
      rentals: preset.module_rentals,
      buildings: preset.module_buildings,
    });
    setFormIsDefault(preset.is_default);
    setDialogOpen(true);
  };

  const openDeleteDialog = (preset: PortalModulePreset) => {
    setSelectedPreset(preset);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      return;
    }

    setSaving(true);
    try {
      const payload: PresetInput = {
        name: formName,
        description: formDescription,
        module_dashboard: formModules.dashboard,
        module_billing: formModules.billing,
        module_messages: formModules.messages,
        module_documents: formModules.documents,
        module_cases: formModules.cases,
        module_rentals: formModules.rentals,
        module_buildings: formModules.buildings,
        is_default: formIsDefault,
      };

      if (selectedPreset) {
        await updatePreset(selectedPreset.id, payload);
      } else {
        await createPreset(payload);
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save preset:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPreset) return;

    try {
      await deletePreset(selectedPreset.id);
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to delete preset:", error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Module Presets"
          description="Manage preset configurations for portal modules"
        />
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Preset
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <Card key={preset.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  {preset.is_system ? (
                    <Badge variant="secondary">System</Badge>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(preset)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => openDeleteDialog(preset)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {preset.is_default && (
                <Badge className="bg-green-500 w-fit">Default</Badge>
              )}
            </CardHeader>
            <CardContent>
              {preset.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {preset.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {preset.enabled_modules.map((mod) => (
                  <Badge key={mod} variant="outline" className="text-xs capitalize">
                    {mod}
                  </Badge>
                ))}
                {preset.enabled_modules.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No modules enabled
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPreset ? "Edit Preset" : "Create Preset"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Preset name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Modules</Label>
              <div className="space-y-2">
                {MODULE_KEYS.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{label}</span>
                    <Switch
                      checked={formModules[key]}
                      onCheckedChange={(checked) =>
                        setFormModules((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t">
              <div className="space-y-0.5">
                <Label>Set as Default</Label>
                <p className="text-xs text-muted-foreground">
                  Apply to new clients automatically
                </p>
              </div>
              <Switch
                checked={formIsDefault}
                onCheckedChange={setFormIsDefault}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Check className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedPreset?.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
