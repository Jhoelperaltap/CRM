"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import type { RoleDetail } from "@/types/settings";
import type { ExtendedModulePermission } from "@/types/settings";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionsMatrix } from "@/components/settings/permissions-matrix";

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRole = useCallback(async () => {
    try {
      const { data } = await api.get<RoleDetail>(`/roles/${id}/`);
      setRole(data);
    } catch (err) {
      console.error("Failed to load role", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const handleSavePermissions = async (permissions: ExtendedModulePermission[]) => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/roles/${id}/`, { permissions });
      setMessage({ type: "success", text: "Permissions saved successfully." });
      fetchRole();
    } catch (err) {
      console.error("Failed to save permissions", err);
      setMessage({ type: "error", text: "Failed to save permissions." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!role) return <div className="py-8 text-center text-muted-foreground">Role not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={role.name} description="Role details and permissions" backHref="/settings/roles" />

      <Card>
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slug</span>
            <Badge variant="secondary">{role.slug}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parent Role</span>
            <span>{role.parent_name || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department</span>
            <span>{role.department || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Level</span>
            <span>{role.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">License Type</span>
            <span>CRM User</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assign to Users</span>
            <span className="text-right max-w-xs">
              {role.assign_users_policy === "all_users"
                ? "All Users"
                : role.assign_users_policy === "same_role_hierarchy"
                  ? "Same Role / Hierarchy / Subordinate"
                  : role.assign_users_policy === "subordinate_role"
                    ? "Subordinate Role"
                    : role.assign_users_policy || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assign to Groups</span>
            <span className="text-right max-w-xs">
              {role.assign_groups_policy === "all_groups"
                ? "All Groups"
                : role.assign_groups_policy === "user_groups"
                  ? "All Groups that user is part of"
                  : role.assign_groups_policy === "selected_groups"
                    ? "Selected Groups"
                    : role.assign_groups_policy === "no_groups"
                      ? "Can not assign to any group"
                      : role.assign_groups_policy === "selected_groups_members"
                        ? "Selected Groups and Group members"
                        : role.assign_groups_policy || "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Description</span>
            <span className="text-right max-w-xs">{role.description || "-"}</span>
          </div>
          {role.user_count !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Users</span>
              <span>{role.user_count}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Permissions Matrix</h2>
        <PermissionsMatrix
          permissions={role.permissions as ExtendedModulePermission[]}
          onSave={handleSavePermissions}
          readOnly={saving}
        />
      </div>
    </div>
  );
}
