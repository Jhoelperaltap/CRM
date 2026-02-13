"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RoleTree } from "@/types/settings";

interface RoleFormProps {
  role?: (RoleTree & { parent?: string | null }) | null;
  roles: RoleTree[];
  onSave: (payload: {
    name: string;
    slug: string;
    description?: string;
    parent?: string | null;
    level?: number;
    department?: string;
    assign_users_policy?: string;
    assign_groups_policy?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

function flattenRoles(
  nodes: RoleTree[],
  exclude?: string
): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  for (const node of nodes) {
    if (node.id !== exclude) {
      result.push({ id: node.id, name: node.name });
    }
    if (node.children?.length) {
      result.push(...flattenRoles(node.children, exclude));
    }
  }
  return result;
}

const USERS_POLICY_OPTIONS = [
  { value: "all_users", label: "All Users" },
  {
    value: "same_role_hierarchy",
    label: "Users having Same Role or Same Hierarchy or Subordinate Role",
  },
  { value: "subordinate_role", label: "Users having Subordinate Role" },
];

const GROUPS_POLICY_OPTIONS = [
  { value: "all_groups", label: "All Groups" },
  { value: "user_groups", label: "All Groups that user is part of" },
  { value: "selected_groups", label: "Selected Groups" },
  { value: "no_groups", label: "Can not assign to any group" },
  {
    value: "selected_groups_members",
    label: "Selected Groups and Group members",
  },
];

export function RoleForm({ role, roles, onSave, onCancel }: RoleFormProps) {
  const [name, setName] = useState(role?.name || "");
  const [slug, setSlug] = useState(role?.slug || "");
  const [description, setDescription] = useState(role?.description || "");
  const [parent, setParent] = useState<string>(role?.parent ?? "");
  const [level, setLevel] = useState<number>(role?.level ?? 0);
  const [department, setDepartment] = useState(role?.department || "");
  const [assignUsersPolicy, setAssignUsersPolicy] = useState(
    role?.assign_users_policy || "all_users"
  );
  const [assignGroupsPolicy, setAssignGroupsPolicy] = useState(
    role?.assign_groups_policy || "all_groups"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from name when creating
  useEffect(() => {
    if (!role) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      );
    }
  }, [name, role]);

  const parentOptions = flattenRoles(roles, role?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        parent: parent || null,
        level,
        department: department.trim() || undefined,
        assign_users_policy: assignUsersPolicy,
        assign_groups_policy: assignGroupsPolicy,
      });
    } catch {
      setError("Failed to save role. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Role Name */}
      <div className="grid gap-2">
        <Label htmlFor="role-name">
          Role Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sales Manager"
        />
      </div>

      {/* Reports To (Parent Role) */}
      <div className="grid gap-2">
        <Label htmlFor="role-parent">Reports To</Label>
        <select
          id="role-parent"
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">None (top-level)</option>
          {parentOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Can Assign Records To */}
      <div className="space-y-2">
        <Label>Can Assign Records To</Label>
        <div className="grid grid-cols-2 gap-4">
          {/* Users policy */}
          <div className="rounded-md border p-3 space-y-2">
            {USERS_POLICY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="assign_users_policy"
                  value={opt.value}
                  checked={assignUsersPolicy === opt.value}
                  onChange={() => setAssignUsersPolicy(opt.value)}
                  className="mt-0.5 accent-primary"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Groups policy */}
          <div className="rounded-md border p-3 space-y-2">
            {GROUPS_POLICY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2 cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name="assign_groups_policy"
                  value={opt.value}
                  checked={assignGroupsPolicy === opt.value}
                  onChange={() => setAssignGroupsPolicy(opt.value)}
                  className="mt-0.5 accent-primary"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Slug + Level row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="role-slug">Slug</Label>
          <Input
            id="role-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. sales-manager"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="role-level">Level</Label>
          <Input
            id="role-level"
            type="number"
            min={0}
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      {/* Department */}
      <div className="grid gap-2">
        <Label htmlFor="role-department">Department</Label>
        <Input
          id="role-department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Sales"
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="role-description">Description</Label>
        <Textarea
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional description of this role"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : role ? "Update Role" : "Create Role"}
        </Button>
      </div>
    </form>
  );
}
