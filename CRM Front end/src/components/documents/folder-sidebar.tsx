"use client";
import { useState } from "react";
import { FolderPlus, Tag, Plus, Cloud, ChevronRight, ChevronDown, Folder, Building2 } from "lucide-react";
import type { DocumentFolderTreeNode, DocumentTag } from "@/types";
import type { DepartmentFolderGroup, DepartmentClientFolderTree } from "@/types/department";
import { FolderTreeItem } from "./folder-tree-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
  folderTree: DocumentFolderTreeNode[];
  departmentFolders?: DepartmentFolderGroup[];
  sharedTags: DocumentTag[];
  personalTags: DocumentTag[];
  selectedFolderId: string | null;
  selectedDeptFolderId?: string | null;
  selectedTagId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectDeptFolder?: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onNewFolder: () => void;
  onRenameFolder: (folder: DocumentFolderTreeNode) => void;
  onNewSubfolder: (parentId: string) => void;
  onDeleteFolder: (folder: DocumentFolderTreeNode) => void;
  onNewTag: () => void;
}

export function FolderSidebar({
  folderTree,
  departmentFolders = [],
  sharedTags,
  personalTags,
  selectedFolderId,
  selectedDeptFolderId,
  selectedTagId,
  onSelectFolder,
  onSelectDeptFolder,
  onSelectTag,
  onNewFolder,
  onRenameFolder,
  onNewSubfolder,
  onDeleteFolder,
  onNewTag,
}: FolderSidebarProps) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r">
      {/* Folders header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Folders</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onNewFolder}>
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* All Documents */}
      <div
        className={`mx-2 cursor-pointer rounded-md px-3 py-1.5 text-sm ${
          !selectedFolderId && !selectedDeptFolderId && !selectedTagId ? "bg-accent font-medium" : "hover:bg-accent"
        }`}
        onClick={() => {
          onSelectFolder(null);
          onSelectDeptFolder?.(null);
          onSelectTag(null);
        }}
      >
        All Documents
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {folderTree.map((folder) => (
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            selectedId={selectedFolderId}
            onSelect={(id) => {
              onSelectTag(null);
              onSelectDeptFolder?.(null);
              onSelectFolder(id);
            }}
            onRename={onRenameFolder}
            onNewSubfolder={onNewSubfolder}
            onDelete={onDeleteFolder}
          />
        ))}

        {/* Department Folders Section */}
        {departmentFolders.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Department Folders
            </div>
            {departmentFolders.map((dept) => (
              <DepartmentFolderSection
                key={dept.id}
                department={dept}
                selectedDeptFolderId={selectedDeptFolderId}
                onSelectDeptFolder={(id) => {
                  onSelectFolder(null);
                  onSelectTag(null);
                  onSelectDeptFolder?.(id);
                }}
              />
            ))}
          </>
        )}
      </div>

      <Separator />

      {/* Cloud Storage placeholders */}
      <div className="px-4 py-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Cloud Storage</span>
        <TooltipProvider>
          <div className="mt-2 space-y-1">
            {["Google Drive", "Dropbox", "OneDrive"].map((service) => (
              <Tooltip key={service}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-50 cursor-default">
                    <Cloud className="h-4 w-4" />
                    <span>{service}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Coming Soon</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Shared Tags */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Shared Tags</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onNewTag}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {sharedTags.length === 0 && (
            <span className="text-xs text-muted-foreground">No shared tags</span>
          )}
          {sharedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTagId === tag.id ? "default" : "outline"}
              className="cursor-pointer text-xs"
              style={
                selectedTagId === tag.id
                  ? { backgroundColor: tag.color, borderColor: tag.color }
                  : { borderColor: tag.color, color: tag.color }
              }
              onClick={() => {
                onSelectFolder(null);
                onSelectTag(selectedTagId === tag.id ? null : tag.id);
              }}
            >
              <Tag className="mr-1 h-3 w-3" />
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Personal Tags */}
      <div className="px-4 pb-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Personal Tags</span>
        <div className="mt-2 flex flex-wrap gap-1">
          {personalTags.length === 0 && (
            <span className="text-xs text-muted-foreground">No personal tags</span>
          )}
          {personalTags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTagId === tag.id ? "default" : "outline"}
              className="cursor-pointer text-xs"
              style={
                selectedTagId === tag.id
                  ? { backgroundColor: tag.color, borderColor: tag.color }
                  : { borderColor: tag.color, color: tag.color }
              }
              onClick={() => {
                onSelectFolder(null);
                onSelectTag(selectedTagId === tag.id ? null : tag.id);
              }}
            >
              <Tag className="mr-1 h-3 w-3" />
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Department folder section component
function DepartmentFolderSection({
  department,
  selectedDeptFolderId,
  onSelectDeptFolder,
}: {
  department: DepartmentFolderGroup;
  selectedDeptFolderId?: string | null;
  onSelectDeptFolder: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate total documents across all folders
  const totalDocs = department.folders.reduce((sum, f) => sum + countDocsRecursive(f), 0);

  function countDocsRecursive(folder: DepartmentClientFolderTree): number {
    let count = folder.document_count;
    if (folder.children) {
      for (const child of folder.children) {
        count += countDocsRecursive(child);
      }
    }
    return count;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <div
            className="h-4 w-4 rounded flex items-center justify-center text-white text-[8px] font-semibold shrink-0"
            style={{ backgroundColor: department.color }}
          >
            {department.code.substring(0, 2)}
          </div>
          <span className="text-sm flex-1 truncate">{department.name}</span>
          {totalDocs > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {totalDocs}
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4">
          {department.folders.map((folder) => (
            <DeptFolderItem
              key={folder.id}
              folder={folder}
              depth={0}
              selectedDeptFolderId={selectedDeptFolderId}
              onSelectDeptFolder={onSelectDeptFolder}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Individual department folder item
function DeptFolderItem({
  folder,
  depth,
  selectedDeptFolderId,
  onSelectDeptFolder,
}: {
  folder: DepartmentClientFolderTree;
  depth: number;
  selectedDeptFolderId?: string | null;
  onSelectDeptFolder: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedDeptFolderId === folder.id;

  // Show folder name with client name if available
  const displayName = folder.client_name
    ? `${folder.name} - ${folder.client_name}`
    : folder.name;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer text-sm",
          isSelected ? "bg-accent font-medium" : "hover:bg-accent"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectDeptFolder(folder.id)}
        title={displayName}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Folder className="h-3.5 w-3.5 text-amber-500" />
        <span className="flex-1 truncate">{displayName}</span>
        {folder.document_count > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {folder.document_count}
          </Badge>
        )}
      </div>
      {hasChildren && isOpen && (
        <div>
          {folder.children.map((child) => (
            <DeptFolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedDeptFolderId={selectedDeptFolderId}
              onSelectDeptFolder={onSelectDeptFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
