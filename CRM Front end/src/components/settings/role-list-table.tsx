"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoleTree } from "@/types/settings";

interface RoleRow {
  id: string;
  name: string;
  slug: string;
  parentName: string;
  assign_users_policy: string;
  assign_groups_policy: string;
}

function flattenTree(nodes: RoleTree[], parentName: string = ""): RoleRow[] {
  const rows: RoleRow[] = [];
  for (const node of nodes) {
    rows.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentName,
      assign_users_policy: node.assign_users_policy,
      assign_groups_policy: node.assign_groups_policy,
    });
    if (node.children?.length) {
      rows.push(...flattenTree(node.children, node.name));
    }
  }
  return rows;
}

const USERS_LABELS: Record<string, string> = {
  all_users: "All Users",
  same_role_hierarchy: "Same Role / Hierarchy / Subordinate",
  subordinate_role: "Subordinate Role",
};

const GROUPS_LABELS: Record<string, string> = {
  all_groups: "All Groups",
  user_groups: "User's Groups",
  selected_groups: "Selected Groups",
  no_groups: "No Groups",
  selected_groups_members: "Selected Groups & Members",
};

interface RoleListTableProps {
  nodes: RoleTree[];
  onEdit?: (node: RoleTree, parentId: string | null) => void;
  onDelete?: (nodeId: string, nodeName: string) => void;
}

function findNodeAndParent(
  nodes: RoleTree[],
  id: string,
  parentId: string | null = null
): { node: RoleTree; parentId: string | null } | null {
  for (const n of nodes) {
    if (n.id === id) return { node: n, parentId };
    if (n.children?.length) {
      const found = findNodeAndParent(n.children, id, n.id);
      if (found) return found;
    }
  }
  return null;
}

export function RoleListTable({ nodes, onEdit, onDelete }: RoleListTableProps) {
  const rows = flattenTree(nodes);

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
              Actions
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Role Name
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Parent Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              License Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Can assign records to
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-b-0 hover:bg-accent/50 transition-colors"
            >
              <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const found = findNodeAndParent(nodes, row.id);
                        if (found) onEdit(found.node, found.parentId);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(row.id, row.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-medium">{row.name}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {row.parentName || "--"}
              </td>
              <td className="px-4 py-2 text-muted-foreground">CRM User</td>
              <td className="px-4 py-2 text-muted-foreground">
                <span>
                  {USERS_LABELS[row.assign_users_policy] ||
                    row.assign_users_policy}
                </span>
                <span className="mx-1">&</span>
                <span>
                  {GROUPS_LABELS[row.assign_groups_policy] ||
                    row.assign_groups_policy}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No roles configured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
