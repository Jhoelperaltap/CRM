"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Briefcase, GripVertical, Sparkles } from "lucide-react";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  seedDepartments,
} from "@/lib/api/departments";
import type { Department } from "@/types/department";

// Color preset options
const COLOR_PRESETS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6366F1", // indigo
  "#84CC16", // lime
  "#F97316", // orange
];

// Icon options (Lucide icon names)
const ICON_OPTIONS = [
  { value: "Calculator", label: "Calculator" },
  { value: "DollarSign", label: "Dollar Sign" },
  { value: "Receipt", label: "Receipt" },
  { value: "FileSearch", label: "File Search" },
  { value: "Scale", label: "Scale" },
  { value: "Users", label: "Users" },
  { value: "Briefcase", label: "Briefcase" },
  { value: "FileText", label: "File Text" },
  { value: "Building", label: "Building" },
  { value: "ClipboardList", label: "Clipboard List" },
];

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [icon, setIcon] = useState("Briefcase");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await getDepartments();
      setDepartments(res);
    } catch (err) {
      console.error("Failed to load departments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setColor("#6366F1");
    setIcon("Briefcase");
    setIsActive(true);
    setOrder(departments.length);
    setEditingDepartment(null);
  };

  const openCreate = () => {
    resetForm();
    setOrder(departments.length);
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setName(dept.name || "");
    setCode(dept.code || "");
    setDescription(dept.description || "");
    setColor(dept.color || "#6366F1");
    setIcon(dept.icon || "Briefcase");
    setIsActive(dept.is_active ?? true);
    setOrder(dept.order ?? 0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name,
        code: code.toUpperCase(),
        description,
        color,
        icon,
        is_active: isActive,
        order,
      };
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, payload);
      } else {
        await createDepartment(payload);
      }
      await fetchDepartments();
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to save department", err);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (dept.user_count && dept.user_count > 0) {
      alert(
        `Cannot delete "${dept.name}" because it has ${dept.user_count} users assigned. Please reassign users first.`
      );
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${dept.name}"?`)) {
      return;
    }
    try {
      await deleteDepartment(dept.id);
      await fetchDepartments();
    } catch (err) {
      console.error("Failed to delete department", err);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm("This will create default departments if they don't exist. Continue?")) {
      return;
    }
    setSeeding(true);
    try {
      const result = await seedDepartments();
      if (result.created.length > 0) {
        alert(`Created departments: ${result.created.join(", ")}`);
      } else {
        alert("All default departments already exist.");
      }
      await fetchDepartments();
    } catch (err) {
      console.error("Failed to seed departments", err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="bg-background min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Departments
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={seeding}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {seeding ? "Seeding..." : "Seed Defaults"}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? "Edit Department" : "Add Department"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Accounting"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ACCT"
                      className="uppercase"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Department description..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-8 w-8 rounded-full transition-all ${
                          color === c
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-12 p-0 border-0 cursor-pointer"
                      title="Custom color"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <select
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      min={0}
                      value={order}
                      onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-border h-4 w-4"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!name || !code}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground">
        Manage organizational departments. Each department can have its own folder
        structure per client for organizing documents.
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading departments...
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No departments configured yet. Click &quot;Add Department&quot; to create
            one, or &quot;Seed Defaults&quot; to create the standard departments.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 px-2 py-3"></th>
                <th className="text-left font-medium px-4 py-3">Department</th>
                <th className="text-left font-medium px-4 py-3">Code</th>
                <th className="text-left font-medium px-4 py-3">Description</th>
                <th className="text-center font-medium px-4 py-3">Users</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr
                  key={dept.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-2 py-3 text-center text-muted-foreground">
                    <GripVertical className="h-4 w-4 mx-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: dept.color }}
                      >
                        {dept.code.substring(0, 2)}
                      </div>
                      <span className="font-medium">{dept.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{dept.code}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {dept.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {dept.user_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {dept.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(dept)}
                        title="Edit department"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dept)}
                        title="Delete department"
                        disabled={Boolean(dept.user_count && dept.user_count > 0)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
