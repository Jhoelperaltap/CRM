"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getBackups,
  createBackup,
  deleteBackup,
  downloadBackupUrl,
  restoreBackup,
  uploadBackup,
  type Backup,
  type BackupCreatePayload,
} from "@/lib/api/backups";
import { getCorporations } from "@/lib/api/corporations";
import type { PaginatedResponse } from "@/types/api";
import type { CorporationListItem } from "@/types";
import {
  Plus,
  Download,
  RotateCcw,
  Trash2,
  Database,
  Building,
  RefreshCw,
  AlertTriangle,
  Upload,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
};

const TYPE_LABELS: Record<string, string> = {
  global: "Global",
  tenant: "Tenant",
};

export default function BackupsPage() {
  const [data, setData] = useState<PaginatedResponse<Backup> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    backup_type: "global" | "tenant";
    corporation: string;
    include_media: boolean;
  }>({
    name: "",
    backup_type: "global",
    corporation: "",
    include_media: true,
  });
  const [corporations, setCorporations] = useState<CorporationListItem[]>([]);
  const [corporationsLoading, setCorporationsLoading] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBackup, setDeletingBackup] = useState<Backup | null>(null);

  // Restore dialog state
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<Backup | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadRestoreAfter, setUploadRestoreAfter] = useState(false);

  // Message state
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (typeFilter !== "all") params.backup_type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const result = await getBackups(params);
      setData(result);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load backups." });
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh for in-progress backups
  useEffect(() => {
    const hasInProgress = data?.results.some(
      (b) => b.status === "pending" || b.status === "in_progress"
    );
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, [data, fetchData]);

  const fetchCorporations = async () => {
    setCorporationsLoading(true);
    try {
      const result = await getCorporations({ page_size: "100" });
      setCorporations(result.results);
    } catch {
      setMessage({ type: "error", text: "Failed to load corporations." });
    } finally {
      setCorporationsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      backup_type: "global",
      corporation: "",
      include_media: true,
    });
    setCreateOpen(true);
    fetchCorporations();
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setMessage({ type: "error", text: "Backup name is required." });
      return;
    }

    if (createForm.backup_type === "tenant" && !createForm.corporation) {
      setMessage({ type: "error", text: "Corporation is required for tenant backups." });
      return;
    }

    setCreateLoading(true);
    try {
      const payload: BackupCreatePayload = {
        name: createForm.name.trim(),
        backup_type: createForm.backup_type,
        include_media: createForm.include_media,
      };
      if (createForm.backup_type === "tenant") {
        payload.corporation = createForm.corporation;
      }
      await createBackup(payload);
      setMessage({ type: "success", text: "Backup started successfully." });
      setCreateOpen(false);
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to create backup." });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBackup(id);
      setMessage({ type: "success", text: "Backup deleted successfully." });
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to delete backup." });
    }
  };

  const handleDownload = (backup: Backup) => {
    window.open(downloadBackupUrl(backup.id), "_blank");
  };

  const handleOpenRestore = (backup: Backup) => {
    setRestoringBackup(backup);
    setRestoreConfirmed(false);
    setRestoreOpen(true);
  };

  const handleRestore = async () => {
    if (!restoringBackup || !restoreConfirmed) return;

    setRestoreLoading(true);
    try {
      await restoreBackup(restoringBackup.id, true);
      setMessage({
        type: "success",
        text: "Restore started. This may take a few minutes.",
      });
      setRestoreOpen(false);
    } catch {
      setMessage({ type: "error", text: "Failed to start restore." });
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleOpenUpload = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadRestoreAfter(false);
    setUploadOpen(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setMessage({ type: "error", text: "Please select a backup file." });
      return;
    }

    if (!uploadFile.name.endsWith(".enc")) {
      setMessage({ type: "error", text: "Invalid file type. Please upload a .enc backup file." });
      return;
    }

    setUploadLoading(true);
    try {
      await uploadBackup(uploadFile, uploadName || undefined, uploadRestoreAfter);
      setMessage({
        type: "success",
        text: uploadRestoreAfter
          ? "Backup uploaded and restore started."
          : "Backup uploaded successfully.",
      });
      setUploadOpen(false);
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to upload backup." });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Backups"
        description="Create and manage database backups"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenUpload}>
              <Upload className="mr-2 h-4 w-4" /> Upload Backup
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Backup
            </Button>
          </div>
        }
      />

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

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search backups..."
        actions={
          <div className="flex gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Corporation</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No backups found. Create your first backup to get started.
                    </TableCell>
                  </TableRow>
                )}
                {data?.results.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {backup.backup_type === "global" ? (
                          <Database className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building className="h-4 w-4 text-purple-500" />
                        )}
                        {backup.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPE_LABELS[backup.backup_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {backup.corporation_name || "-"}
                    </TableCell>
                    <TableCell>{backup.file_size_human || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-0 font-medium ${STATUS_STYLES[backup.status]}`}
                      >
                        {backup.status === "in_progress" && (
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {STATUS_LABELS[backup.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(backup.created_at).toLocaleDateString()}{" "}
                      {new Date(backup.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {backup.status === "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(backup)}
                              title="Download backup"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRestore(backup)}
                              title="Restore backup"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => {
                            setDeletingBackup(backup);
                            setDeleteOpen(true);
                          }}
                          title="Delete backup"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && (
            <DataTablePagination
              page={page}
              pageSize={25}
              total={data.count}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Create Backup
            </DialogTitle>
            <DialogDescription>
              Create a new backup of your CRM data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Backup Name</Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Backup - January 2025"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Backup Type</Label>
              <Select
                value={createForm.backup_type}
                onValueChange={(v: "global" | "tenant") =>
                  setCreateForm((prev) => ({
                    ...prev,
                    backup_type: v,
                    corporation: v === "global" ? "" : prev.corporation,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Global (Full Database)
                    </div>
                  </SelectItem>
                  <SelectItem value="tenant">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Tenant (Corporation-specific)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createForm.backup_type === "tenant" && (
              <div className="space-y-2">
                <Label htmlFor="corporation">Corporation</Label>
                <Select
                  value={createForm.corporation}
                  onValueChange={(v) =>
                    setCreateForm((prev) => ({ ...prev, corporation: v }))
                  }
                  disabled={corporationsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a corporation" />
                  </SelectTrigger>
                  <SelectContent>
                    {corporations.map((corp) => (
                      <SelectItem key={corp.id} value={corp.id}>
                        {corp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include_media"
                checked={createForm.include_media}
                onCheckedChange={(checked) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    include_media: !!checked,
                  }))
                }
              />
              <Label htmlFor="include_media" className="text-sm font-normal">
                Include media files (documents, images)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? "Creating..." : "Create Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Backup"
        description={
          deletingBackup
            ? `Are you sure you want to delete "${deletingBackup.name}"? This action cannot be undone.`
            : ""
        }
        onConfirm={async () => {
          if (deletingBackup) {
            await handleDelete(deletingBackup.id);
            setDeleteOpen(false);
            setDeletingBackup(null);
          }
        }}
      />

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Restore Backup
            </DialogTitle>
            <DialogDescription>
              {restoringBackup
                ? `You are about to restore "${restoringBackup.name}"`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Warning:</strong> Restoring a backup will overwrite
              existing data. This operation cannot be undone. Make sure you have
              a recent backup before proceeding.
            </div>

            {restoringBackup && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {TYPE_LABELS[restoringBackup.backup_type]}
                  </span>
                </div>
                {restoringBackup.corporation_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Corporation:</span>
                    <span className="font-medium">
                      {restoringBackup.corporation_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(restoringBackup.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {restoringBackup.file_size_human}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm_restore"
                checked={restoreConfirmed}
                onCheckedChange={(checked) => setRestoreConfirmed(!!checked)}
              />
              <Label
                htmlFor="confirm_restore"
                className="text-sm font-normal text-destructive"
              >
                I understand this will overwrite existing data
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreOpen(false)}
              disabled={restoreLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoreLoading || !restoreConfirmed}
            >
              {restoreLoading ? "Restoring..." : "Restore Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Backup Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Backup
            </DialogTitle>
            <DialogDescription>
              Upload a previously downloaded backup file for disaster recovery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload_file">Backup File (.enc)</Label>
              <Input
                id="upload_file"
                type="file"
                accept=".enc"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setUploadFile(file);
                  if (file && !uploadName) {
                    // Auto-fill name from filename
                    const baseName = file.name.replace(/\.enc$/, "");
                    setUploadName(`Uploaded: ${baseName}`);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Select an encrypted backup file (.enc) from your computer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload_name">Backup Name (optional)</Label>
              <Input
                id="upload_name"
                placeholder="e.g., Recovery Backup - January 2025"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="restore_after_upload"
                checked={uploadRestoreAfter}
                onCheckedChange={(checked) => setUploadRestoreAfter(!!checked)}
              />
              <Label htmlFor="restore_after_upload" className="text-sm font-normal">
                Restore immediately after upload
              </Label>
            </div>

            {uploadRestoreAfter && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    <strong>Warning:</strong> This will overwrite existing data after upload.
                  </span>
                </div>
              </div>
            )}

            {uploadFile && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <span className="font-medium truncate max-w-[200px]">{uploadFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploadLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadLoading || !uploadFile}
            >
              {uploadLoading ? "Uploading..." : "Upload Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
