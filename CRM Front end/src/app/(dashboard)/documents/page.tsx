"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getDocuments,
  getFolderTree,
  getFolders,
  getTags,
  getLinks,
  deleteFolder,
} from "@/lib/api/documents";
import type {
  DocumentListItem,
  DocumentLink,
  DocumentFolder,
  DocumentFolderTreeNode,
  DocumentTag,
} from "@/types";
import type { PaginatedResponse } from "@/types/api";

import { FolderSidebar } from "@/components/documents/folder-sidebar";
import { DocumentGrid } from "@/components/documents/document-grid";
import { DocumentEmptyState } from "@/components/documents/document-empty-state";
import { UploadDialog } from "@/components/documents/upload-dialog";
import { NewFolderDialog } from "@/components/documents/new-folder-dialog";
import { LinkDocumentDialog } from "@/components/documents/link-document-dialog";
import { MultiUploadDialog } from "@/components/documents/multi-upload-dialog";
import { TagManagerDialog } from "@/components/documents/tag-manager-dialog";

import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FolderPlus,
  Upload,
  Link2,
  Files,
  LayoutGrid,
  LayoutList,
  Search,
  ChevronRight,
  Tag,
  Eye,
} from "lucide-react";
import { DocumentViewer } from "@/components/documents/document-viewer";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DocumentsPage() {
  const router = useRouter();

  // Data
  const [folderTree, setFolderTree] = useState<DocumentFolderTreeNode[]>([]);
  const [flatFolders, setFlatFolders] = useState<DocumentFolder[]>([]);
  const [sharedTags, setSharedTags] = useState<DocumentTag[]>([]);
  const [personalTags, setPersonalTags] = useState<DocumentTag[]>([]);
  const [docData, setDocData] = useState<PaginatedResponse<DocumentListItem> | null>(null);
  const [links, setLinks] = useState<DocumentLink[]>([]);

  // Selections
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [multiUploadOpen, setMultiUploadOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<DocumentFolderTreeNode | null>(null);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DocumentFolderTreeNode | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentListItem | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);

  // ---- Fetch sidebar data (folders + tags) ----
  const fetchSidebar = useCallback(async () => {
    try {
      const [tree, foldersRes, tagsRes] = await Promise.all([
        getFolderTree(),
        getFolders({ page_size: "200" }),
        getTags({ page_size: "200" }),
      ]);
      setFolderTree(tree);
      setFlatFolders(foldersRes.results);
      setSharedTags(tagsRes.results.filter((t) => t.tag_type === "shared"));
      setPersonalTags(tagsRes.results.filter((t) => t.tag_type === "personal"));
    } catch (err) {
      console.error("Failed to load sidebar data", err);
    }
  }, []);

  // ---- Fetch documents + links ----
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (selectedFolderId) params.folder = selectedFolderId;
      if (selectedTagId) params.tags = selectedTagId;

      const linkParams: Record<string, string> = { page_size: "100" };
      if (selectedFolderId) linkParams.folder = selectedFolderId;
      if (selectedTagId) linkParams.tags = selectedTagId;

      const [docs, linksRes] = await Promise.all([
        getDocuments(params),
        getLinks(linkParams),
      ]);
      setDocData(docs);
      setLinks(linksRes.results);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedFolderId, selectedTagId]);

  useEffect(() => {
    fetchSidebar();
  }, [fetchSidebar]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedFolderId, selectedTagId, search]);

  const refreshAll = () => {
    fetchSidebar();
    fetchContent();
  };

  // Find selected folder name for breadcrumb
  const findFolderName = (id: string): string => {
    const f = flatFolders.find((f) => f.id === id);
    return f?.name || "";
  };

  const isEmpty =
    !loading &&
    (docData?.results.length === 0 || !docData) &&
    links.length === 0;

  // ---- Handle folder rename ----
  const handleRenameFolder = (folder: DocumentFolderTreeNode) => {
    setEditFolder(folder);
    setNewFolderParentId(null);
    setNewFolderOpen(true);
  };

  // ---- Handle new subfolder ----
  const handleNewSubfolder = (parentId: string) => {
    setEditFolder(null);
    setNewFolderParentId(parentId);
    setNewFolderOpen(true);
  };

  // ---- Handle folder delete ----
  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await deleteFolder(deleteFolderTarget.id);
      if (selectedFolderId === deleteFolderTarget.id) setSelectedFolderId(null);
      refreshAll();
    } catch {
      alert("Failed to delete folder");
    } finally {
      setDeleteFolderTarget(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <FolderSidebar
        folderTree={folderTree}
        sharedTags={sharedTags}
        personalTags={personalTags}
        selectedFolderId={selectedFolderId}
        selectedTagId={selectedTagId}
        onSelectFolder={setSelectedFolderId}
        onSelectTag={setSelectedTagId}
        onNewFolder={() => {
          setEditFolder(null);
          setNewFolderParentId(null);
          setNewFolderOpen(true);
        }}
        onRenameFolder={handleRenameFolder}
        onNewSubfolder={handleNewSubfolder}
        onDeleteFolder={(f) => setDeleteFolderTarget(f)}
        onNewTag={() => setTagManagerOpen(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {/* + Add dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => {
                setEditFolder(null);
                setNewFolderParentId(selectedFolderId);
                setNewFolderOpen(true);
              }}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMultiUploadOpen(true)}>
                <Files className="mr-2 h-4 w-4" /> Upload Multiple
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                <Link2 className="mr-2 h-4 w-4" /> Add Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTagManagerOpen(true)}>
                <Tag className="mr-2 h-4 w-4" /> New Tag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        {selectedFolderId && (
          <div className="flex items-center gap-1 border-b px-4 py-2 text-sm text-muted-foreground">
            <button
              className="hover:text-foreground"
              onClick={() => setSelectedFolderId(null)}
            >
              All Documents
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">
              {findFolderName(selectedFolderId)}
            </span>
          </div>
        )}

        {selectedTagId && (
          <div className="flex items-center gap-1 border-b px-4 py-2 text-sm text-muted-foreground">
            <button
              className="hover:text-foreground"
              onClick={() => setSelectedTagId(null)}
            >
              All Documents
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">
              Tag: {[...sharedTags, ...personalTags].find((t) => t.id === selectedTagId)?.name || ""}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : isEmpty ? (
            <DocumentEmptyState
              onNewFolder={() => {
                setEditFolder(null);
                setNewFolderParentId(selectedFolderId);
                setNewFolderOpen(true);
              }}
              onUpload={() => setUploadOpen(true)}
              onLink={() => setLinkOpen(true)}
              onMultiUpload={() => setMultiUploadOpen(true)}
            />
          ) : viewMode === "grid" ? (
            <DocumentGrid
              documents={docData?.results || []}
              links={links}
              onPreview={(doc) => setPreviewDoc(doc)}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docData?.results.map((d) => {
                    const isViewable = d.mime_type === "application/pdf" || d.mime_type?.startsWith("image/");
                    return (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/documents/${d.id}`)}
                      >
                        <TableCell>
                          {isViewable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDoc(d);
                              }}
                              title="Quick preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell>{d.doc_type.replace(/_/g, " ")}</TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                        <TableCell>{d.folder_name || "-"}</TableCell>
                        <TableCell>{formatBytes(d.file_size)}</TableCell>
                        <TableCell>{d.uploaded_by_name || "-"}</TableCell>
                        <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {links.map((link) => (
                    <TableRow
                      key={`link-${link.id}`}
                      className="cursor-pointer"
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                    >
                      <TableCell></TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {link.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">Link</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{link.created_by_name || "-"}</TableCell>
                      <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {docData && docData.count > 0 && (
          <div className="border-t px-4 py-2">
            <DataTablePagination
              page={page}
              pageSize={25}
              total={docData.count}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={flatFolders}
        defaultFolderId={selectedFolderId}
        onUploaded={refreshAll}
      />
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={(open) => {
          setNewFolderOpen(open);
          if (!open) {
            setEditFolder(null);
            setNewFolderParentId(null);
          }
        }}
        folders={flatFolders}
        defaultParentId={newFolderParentId}
        editFolder={editFolder}
        onCreated={refreshAll}
      />
      <LinkDocumentDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        folders={flatFolders}
        defaultFolderId={selectedFolderId}
        onCreated={refreshAll}
      />
      <MultiUploadDialog
        open={multiUploadOpen}
        onOpenChange={setMultiUploadOpen}
        folders={flatFolders}
        defaultFolderId={selectedFolderId}
        onUploaded={refreshAll}
      />
      <TagManagerDialog
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        onCreated={refreshAll}
      />
      <ConfirmDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => { if (!open) setDeleteFolderTarget(null); }}
        title="Delete Folder"
        description={`Are you sure you want to delete "${deleteFolderTarget?.name}"? Documents inside will become unfiled.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteFolder}
      />

      {/* Document Preview Viewer */}
      {previewDoc && (
        <DocumentViewer
          documentId={previewDoc.id}
          title={previewDoc.title}
          mimeType={previewDoc.mime_type}
          open={!!previewDoc}
          onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        />
      )}
    </div>
  );
}
