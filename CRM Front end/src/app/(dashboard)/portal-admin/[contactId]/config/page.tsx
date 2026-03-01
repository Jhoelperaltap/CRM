"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Home, Save, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPortalClient,
  getClientConfig,
  updateClientConfig,
  getPresets,
  applyPresetToClient,
} from "@/lib/api/portal-admin";
import type {
  PortalClientDetail,
  PortalClientConfig,
  PortalModulePreset,
} from "@/types/portal-admin";

const MODULE_LABELS: Record<string, { label: string; description: string }> = {
  dashboard: {
    label: "Dashboard",
    description: "Main portal dashboard with widgets and overview",
  },
  billing: {
    label: "Billing",
    description: "Invoices, quotes, products and services",
  },
  messages: {
    label: "Messages",
    description: "Communication with staff via messages",
  },
  documents: {
    label: "Documents",
    description: "Document upload and management",
  },
  cases: {
    label: "Cases",
    description: "View and track assigned cases",
  },
  rentals: {
    label: "Rentals",
    description: "Rental properties management (residential)",
  },
  buildings: {
    label: "Buildings",
    description: "Commercial buildings management",
  },
  appointments: {
    label: "Appointments",
    description: "Schedule and view appointments",
  },
};

export default function PortalClientConfigPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<PortalClientDetail | null>(null);
  const [config, setConfig] = useState<PortalClientConfig | null>(null);
  const [presets, setPresets] = useState<PortalModulePreset[]>([]);

  // Form state
  const [modules, setModules] = useState({
    dashboard: false,
    billing: false,
    messages: false,
    documents: false,
    cases: false,
    rentals: false,
    buildings: false,
    appointments: false,
  });
  const [isPortalActive, setIsPortalActive] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Licensing limits state
  const [limits, setLimits] = useState({
    maxBuildings: 0,
    maxFloorsPerBuilding: 0,
    maxUnitsPerBuilding: 0,
    maxRentalProperties: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientData, configData, presetsData] = await Promise.all([
        getPortalClient(contactId),
        getClientConfig(contactId),
        getPresets(),
      ]);
      setClient(clientData);
      setConfig(configData);
      setPresets(presetsData);

      // Populate form
      setModules({
        dashboard: configData.module_dashboard,
        billing: configData.module_billing,
        messages: configData.module_messages,
        documents: configData.module_documents,
        cases: configData.module_cases,
        rentals: configData.module_rentals,
        buildings: configData.module_buildings,
        appointments: configData.module_appointments,
      });
      setIsPortalActive(configData.is_portal_active);
      setNotes(configData.notes || "");
      setSelectedPreset(configData.preset || "");
      setLimits({
        maxBuildings: configData.max_buildings,
        maxFloorsPerBuilding: configData.max_floors_per_building,
        maxUnitsPerBuilding: configData.max_units_per_building,
        maxRentalProperties: configData.max_rental_properties,
      });
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClientConfig(contactId, {
        module_dashboard: modules.dashboard,
        module_billing: modules.billing,
        module_messages: modules.messages,
        module_documents: modules.documents,
        module_cases: modules.cases,
        module_rentals: modules.rentals,
        module_buildings: modules.buildings,
        module_appointments: modules.appointments,
        is_portal_active: isPortalActive,
        notes,
        max_buildings: limits.maxBuildings,
        max_floors_per_building: limits.maxFloorsPerBuilding,
        max_units_per_building: limits.maxUnitsPerBuilding,
        max_rental_properties: limits.maxRentalProperties,
      });
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset) return;

    try {
      const updatedConfig = await applyPresetToClient(contactId, selectedPreset);
      setConfig(updatedConfig);

      // Update form state
      setModules({
        dashboard: updatedConfig.module_dashboard,
        billing: updatedConfig.module_billing,
        messages: updatedConfig.module_messages,
        documents: updatedConfig.module_documents,
        cases: updatedConfig.module_cases,
        rentals: updatedConfig.module_rentals,
        buildings: updatedConfig.module_buildings,
        appointments: updatedConfig.module_appointments,
      });
    } catch (error) {
      console.error("Failed to apply preset:", error);
    }
  };

  const toggleModule = (key: keyof typeof modules) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
    setSelectedPreset(""); // Clear preset selection when manually changing modules
  };

  if (loading) return <LoadingSpinner />;
  if (!client || !config) return <div>Client not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Configure: ${client.full_name}`}
          description="Manage portal modules and access"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Presets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              <CardTitle>Apply Preset</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                    {preset.is_default && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPreset && (
              <>
                <div className="text-sm text-muted-foreground">
                  {presets.find((p) => p.id === selectedPreset)?.description}
                </div>
                <Button onClick={handleApplyPreset} className="w-full">
                  Apply Preset
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modules */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Module Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(MODULE_LABELS).map(([key, { label, description }]) => (
                <div
                  key={key}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <Label className="font-medium">{label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    checked={modules[key as keyof typeof modules]}
                    onCheckedChange={() =>
                      toggleModule(key as keyof typeof modules)
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>License Limits</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Set resource limits for this client. Use 0 for unlimited.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Max Buildings</Label>
              <Input
                type="number"
                min="0"
                value={limits.maxBuildings}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxBuildings: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Commercial buildings (0 = unlimited)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Max Floors per Building</Label>
              <Input
                type="number"
                min="0"
                value={limits.maxFloorsPerBuilding}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxFloorsPerBuilding: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Floors per building (0 = unlimited)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Max Units per Building</Label>
              <Input
                type="number"
                min="0"
                value={limits.maxUnitsPerBuilding}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxUnitsPerBuilding: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Units per building (0 = unlimited)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <Label>Max Rental Properties</Label>
              </div>
              <Input
                type="number"
                min="0"
                value={limits.maxRentalProperties}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxRentalProperties: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Residential rentals (0 = unlimited)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portal Status & Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portal Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="font-medium">Portal Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable portal access for this client
                </p>
              </div>
              <Switch
                checked={isPortalActive}
                onCheckedChange={setIsPortalActive}
              />
            </div>

            {!isPortalActive && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                When inactive, the client cannot access the portal even if they
                have credentials.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add notes about this client's portal configuration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
