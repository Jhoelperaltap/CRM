"use client";
import { FolderPlus, Tag, Plus, Cloud } from "lucide-react";
import type { DocumentFolderTreeNode, DocumentTag } from "@/types";
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

interface FolderSidebarProps {
  folderTree: DocumentFolderTreeNode[];
  sharedTags: DocumentTag[];
  personalTags: DocumentTag[];
  selectedFolderId: string | null;
  selectedTagId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onNewFolder: () => void;
  onRenameFolder: (folder: DocumentFolderTreeNode) => void;
  onNewSubfolder: (parentId: string) => void;
  onDeleteFolder: (folder: DocumentFolderTreeNode) => void;
  onNewTag: () => void;
}

export function FolderSidebar({
  folderTree,
  sharedTags,
  personalTags,
  selectedFolderId,
  selectedTagId,
  onSelectFolder,
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
          !selectedFolderId && !selectedTagId ? "bg-accent font-medium" : "hover:bg-accent"
        }`}
        onClick={() => {
          onSelectFolder(null);
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
              onSelectFolder(id);
            }}
            onRename={onRenameFolder}
            onNewSubfolder={onNewSubfolder}
            onDelete={onDeleteFolder}
          />
        ))}
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
