"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Loader2,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getClientDepartmentFolders,
  initializeDepartmentFolders,
  createDepartmentClientFolder,
  updateDepartmentClientFolder,
  deleteDepartmentClientFolder,
} from "@/lib/api/departments";
import type {
  DepartmentFolderGroup,
  DepartmentClientFolderTree,
} from "@/types/department";
import { cn } from "@/lib/utils";

interface DepartmentFoldersProps {
  contactId?: string;
  corporationId?: string;
  onFolderSelect?: (folderId: string) => void;
  selectedFolderId?: string;
}

interface FolderNodeProps {
  folder: DepartmentClientFolderTree;
  depth: number;
  departmentId: string;
  contactId?: string;
  corporationId?: string;
  onFolderSelect?: (folderId: string) => void;
  selectedFolderId?: string;
  onRefresh: () => void;
}

function FolderNode({
  folder,
  depth,
  departmentId,
  contactId,
  corporationId,
  onFolderSelect,
  selectedFolderId,
  onRefresh,
}: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolderName, setEditFolderName] = useState(folder.name);
  const [saving, setSaving] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const handleCreateSubfolder = async () => {
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      await createDepartmentClientFolder({
        name: newFolderName,
        department: departmentId,
        contact: contactId,
        corporation: corporationId,
        parent: folder.id,
      });
      setNewFolderName("");
      setCreateDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to create subfolder", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editFolderName.trim() || editFolderName === folder.name) {
      setEditDialogOpen(false);
      return;
    }
    setSaving(true);
    try {
      await updateDepartmentClientFolder(folder.id, { name: editFolderName });
      setEditDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to rename folder", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (folder.is_default) {
      alert("Default folders cannot be deleted.");
      return;
    }
    if (folder.document_count > 0) {
      alert("Cannot delete folder with documents. Move or delete documents first.");
      return;
    }
    if (hasChildren) {
      alert("Cannot delete folder with subfolders. Delete subfolders first.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      return;
    }
    try {
      await deleteDepartmentClientFolder(folder.id);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete folder", err);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer group",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onFolderSelect?.(folder.id)}
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
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-sm flex-1 truncate">{folder.name}</span>
        {folder.document_count > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {folder.document_count}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditFolderName(folder.name);
                setEditDialogOpen(true);
              }}
              disabled={folder.is_default}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={folder.is_default}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isOpen && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              departmentId={departmentId}
              contactId={contactId}
              corporationId={corporationId}
              onFolderSelect={onFolderSelect}
              selectedFolderId={selectedFolderId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Create Subfolder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Subfolder in {folder.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subfolder-name">Folder Name</Label>
              <Input
                id="subfolder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubfolder} disabled={saving || !newFolderName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={saving || !editFolderName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DepartmentSection({
  department,
  contactId,
  corporationId,
  onFolderSelect,
  selectedFolderId,
  onRefresh,
}: {
  department: DepartmentFolderGroup;
  contactId?: string;
  corporationId?: string;
  onFolderSelect?: (folderId: string) => void;
  selectedFolderId?: string;
  onRefresh: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);

  const totalDocs = department.folders.reduce(
    (sum, f) => sum + countDocsRecursive(f),
    0
  );

  function countDocsRecursive(folder: DepartmentClientFolderTree): number {
    let count = folder.document_count;
    if (folder.children) {
      for (const child of folder.children) {
        count += countDocsRecursive(child);
      }
    }
    return count;
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      await createDepartmentClientFolder({
        name: newFolderName,
        department: department.id,
        contact: contactId,
        corporation: corporationId,
      });
      setNewFolderName("");
      setCreateDialogOpen(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to create folder", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b last:border-0">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ backgroundColor: department.color }}
              >
                {department.code.substring(0, 2)}
              </div>
              <span className="font-medium text-sm">{department.name}</span>
              {totalDocs > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {totalDocs}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pb-2">
            {department.folders.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No folders yet
              </div>
            ) : (
              department.folders.map((folder) => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  departmentId={department.id}
                  contactId={contactId}
                  corporationId={corporationId}
                  onFolderSelect={onFolderSelect}
                  selectedFolderId={selectedFolderId}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder in {department.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-folder-name">Folder Name</Label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={saving || !newFolderName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

export function DepartmentFolders({
  contactId,
  corporationId,
  onFolderSelect,
  selectedFolderId,
}: DepartmentFoldersProps) {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [departments, setDepartments] = useState<DepartmentFolderGroup[]>([]);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientDepartmentFolders({
        contact: contactId,
        corporation: corporationId,
      });
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load department folders", err);
    } finally {
      setLoading(false);
    }
  }, [contactId, corporationId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await initializeDepartmentFolders({
        contact: contactId,
        corporation: corporationId,
      });
      await fetchFolders();
    } catch (err) {
      console.error("Failed to initialize folders", err);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-4">
          No department folders yet
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleInitialize}
          disabled={initializing}
        >
          {initializing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Initialize Folders
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
        <span className="font-medium text-sm">Department Folders</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={handleInitialize}
          disabled={initializing}
          title="Initialize default folders for all departments"
        >
          {initializing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {departments.map((dept) => (
          <DepartmentSection
            key={dept.id}
            department={dept}
            contactId={contactId}
            corporationId={corporationId}
            onFolderSelect={onFolderSelect}
            selectedFolderId={selectedFolderId}
            onRefresh={fetchFolders}
          />
        ))}
      </div>
    </div>
  );
}
