"use client";

import { useEffect, useState } from "react";
import { getRolesTree } from "@/lib/api/settings";
import type { RoleTree, ExtendedModulePermission } from "@/types/settings";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { PermissionsMatrix } from "@/components/settings/permissions-matrix";

/** Flatten the tree into a list so we can show one section per role. */
function flattenTree(nodes: RoleTree[]): RoleTree[] {
  const result: RoleTree[] = [];
  function walk(list: RoleTree[]) {
    for (const node of list) {
      result.push(node);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export default function ProfilesPage() {
  const [roles, setRoles] = useState<RoleTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const tree = await getRolesTree();
        setRoles(flattenTree(tree));
      } catch (err) {
        console.error("Failed to load roles", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profiles"
        description="Permissions overview for all roles"
      />

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No roles configured.
        </p>
      ) : (
        roles.map((role) => (
          <div key={role.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{role.name}</h2>
              <Badge variant="secondary">{role.slug}</Badge>
              {role.department && (
                <span className="text-sm text-muted-foreground">
                  {role.department}
                </span>
              )}
            </div>
            <PermissionsMatrix
              permissions={role.permissions as ExtendedModulePermission[]}
              readOnly
            />
          </div>
        ))
      )}
    </div>
  );
}
