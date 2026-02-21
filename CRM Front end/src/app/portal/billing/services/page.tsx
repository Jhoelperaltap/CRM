"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  portalGetServices,
  portalCreateService,
  portalUpdateService,
  portalDeleteService,
} from "@/lib/api/portal";
import type { TenantService, CreateServiceInput } from "@/types/portal-billing";
import { Plus, Search, Pencil, Trash2, Wrench } from "lucide-react";

const EMPTY_FORM: CreateServiceInput = {
  name: "",
  service_code: "",
  category: "",
  unit_price: "",
  usage_unit: "Hours",
  description: "",
};

export default function ServicesPage() {
  const [services, setServices] = useState<TenantService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<TenantService | null>(null);
  const [formData, setFormData] = useState<CreateServiceInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const data = await portalGetServices({ search: search || undefined });
      setServices(data.results);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (service: TenantService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      service_code: service.service_code,
      category: service.category,
      unit_price: service.unit_price,
      usage_unit: service.usage_unit,
      description: service.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.service_code || !formData.unit_price) {
      setError("Name, service code, and unit price are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingService) {
        await portalUpdateService(editingService.id, formData);
      } else {
        await portalCreateService(formData);
      }
      setDialogOpen(false);
      fetchServices();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: TenantService) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return;

    try {
      await portalDeleteService(service.id);
      fetchServices();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Failed to delete service");
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(value || "0"));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage your service catalog
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No services found</h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term" : "Add your first service to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {service.service_code}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">
                      {formatCurrency(service.unit_price)} / {service.usage_unit}
                    </span>
                  </div>
                  {service.category && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{service.category}</span>
                    </div>
                  )}
                </div>
                {service.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "New Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the service details below"
                : "Fill in the service details below"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_code">Service Code *</Label>
              <Input
                id="service_code"
                value={formData.service_code}
                onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage_unit">Usage Unit</Label>
                <Input
                  id="usage_unit"
                  value={formData.usage_unit}
                  onChange={(e) => setFormData({ ...formData, usage_unit: e.target.value })}
                  placeholder="e.g., Hours, Sessions"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
