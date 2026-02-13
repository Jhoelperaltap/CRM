"use client";
import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Pencil, FolderPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentFolderTreeNode } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FolderTreeItemProps {
  folder: DocumentFolderTreeNode;
  selectedId: string | null;
  depth?: number;
  onSelect: (id: string) => void;
  onRename: (folder: DocumentFolderTreeNode) => void;
  onNewSubfolder: (parentId: string) => void;
  onDelete: (folder: DocumentFolderTreeNode) => void;
}

export function FolderTreeItem({
  folder,
  selectedId,
  depth = 0,
  onSelect,
  onRename,
  onNewSubfolder,
  onDelete,
}: FolderTreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
          isSelected && "bg-accent font-medium"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </button>
        {expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate flex-1">{folder.name}</span>
        {folder.document_count > 0 && (
          <span className="text-xs text-muted-foreground">{folder.document_count}</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onRename(folder)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewSubfolder(folder.id)}>
              <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Subfolder
            </DropdownMenuItem>
            {!folder.is_default && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(folder)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              selectedId={selectedId}
              depth={depth + 1}
              onSelect={onSelect}
              onRename={onRename}
              onNewSubfolder={onNewSubfolder}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
