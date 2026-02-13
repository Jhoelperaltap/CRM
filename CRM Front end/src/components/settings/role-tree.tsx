"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoleTree } from "@/types/settings";

interface RoleTreeProps {
  nodes: RoleTree[];
  onEdit?: (node: RoleTree, parentId: string | null) => void;
  onDelete?: (nodeId: string, nodeName: string) => void;
}

function RoleTreeNode({
  node,
  depth = 0,
  parentId = null,
  onEdit,
  onDelete,
}: {
  node: RoleTree;
  depth?: number;
  parentId?: string | null;
  onEdit?: (node: RoleTree, parentId: string | null) => void;
  onDelete?: (nodeId: string, nodeName: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const router = useRouter();
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => router.push(`/settings/roles/${node.id}`)}
      >
        <button
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <span className="font-medium text-sm">{node.name}</span>

        <Badge variant="secondary" className="text-xs">
          {node.slug}
        </Badge>

        {node.department && (
          <span className="text-xs text-muted-foreground">{node.department}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{node.user_count}</span>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node, parentId);
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id, node.name);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <RoleTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              parentId={node.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RoleTreeView({ nodes, onEdit, onDelete }: RoleTreeProps) {
  return (
    <div className="rounded-md border bg-card">
      {nodes.map((node) => (
        <RoleTreeNode
          key={node.id}
          node={node}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
