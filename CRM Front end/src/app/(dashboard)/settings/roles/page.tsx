"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Network, List } from "lucide-react";
import { getRolesTree, createRole, updateRole, deleteRole } from "@/lib/api/settings";
import type { RoleTree } from "@/types/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RoleTreeView } from "@/components/settings/role-tree";
import { RoleListTable } from "@/components/settings/role-list-table";
import { RoleForm } from "@/components/settings/role-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EditingRole extends RoleTree {
  parent?: string | null;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await getRolesTree();
      setRoles(data);
    } catch (err) {
      console.error("Failed to load roles tree", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleSave = async (payload: {
    name: string;
    slug: string;
    description?: string;
    parent?: string | null;
    level?: number;
    department?: string;
    assign_users_policy?: string;
    assign_groups_policy?: string;
  }) => {
    if (editingRole) {
      await updateRole(editingRole.id, payload);
    } else {
      await createRole(payload);
    }
    setDialogOpen(false);
    setEditingRole(null);
    fetchRoles();
  };

  const handleEdit = (node: RoleTree, parentId: string | null) => {
    setEditingRole({ ...node, parent: parentId });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      fetchRoles();
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="Role hierarchy and user assignments"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-md border bg-muted p-0.5">
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "tree"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("tree")}
              >
                <Network className="h-4 w-4" />
                Tree
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>

            <Button
              onClick={() => {
                setEditingRole(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              New Role
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No roles configured.
        </p>
      ) : viewMode === "tree" ? (
        <RoleTreeView
          nodes={roles}
          onEdit={handleEdit}
          onDelete={(id, name) => setDeleteTarget({ id, name })}
        />
      ) : (
        <RoleListTable
          nodes={roles}
          onEdit={handleEdit}
          onDelete={(id, name) => setDeleteTarget({ id, name })}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editingRole}
            roles={roles}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Role"
        description={`This will permanently delete the role "${deleteTarget?.name}". Any child roles will be unlinked. Continue?`}
      />
    </div>
  );
}
