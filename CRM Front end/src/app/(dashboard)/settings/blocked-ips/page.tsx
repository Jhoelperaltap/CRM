"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, History, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import {
  getBlockedIPs,
  createBlockedIP,
  updateBlockedIP,
  deleteBlockedIP,
  getBlockedIPLogs,
  clearBlockedIPLogs,
} from "@/lib/api/blocked-ips";
import type { BlockedIPListItem, BlockedIPLog } from "@/types/blocked-ip";
import { REQUEST_TYPE_LABELS } from "@/types/blocked-ip";

export default function BlockedIPsPage() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIPListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIP, setSelectedIP] = useState<BlockedIPListItem | null>(null);
  const [logs, setLogs] = useState<BlockedIPLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    ip_address: "",
    cidr_prefix: "",
    reason: "",
    is_active: true,
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadBlockedIPs();
  }, []);

  async function loadBlockedIPs() {
    setLoading(true);
    try {
      const data = await getBlockedIPs();
      setBlockedIPs(data.results);
    } catch (error) {
      console.error("Failed to load blocked IPs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setFormError("");
    if (!formData.ip_address) {
      setFormError("IP address is required");
      return;
    }

    setFormLoading(true);
    try {
      await createBlockedIP({
        ip_address: formData.ip_address,
        cidr_prefix: formData.cidr_prefix ? parseInt(formData.cidr_prefix) : null,
        reason: formData.reason,
        is_active: formData.is_active,
      });
      setShowAddDialog(false);
      setFormData({ ip_address: "", cidr_prefix: "", reason: "", is_active: true });
      loadBlockedIPs();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { ip_address?: string[]; detail?: string } } };
      if (err.response?.data?.ip_address) {
        setFormError(err.response.data.ip_address[0]);
      } else if (err.response?.data?.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError("Failed to add blocked IP");
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggleActive(ip: BlockedIPListItem) {
    try {
      await updateBlockedIP(ip.id, { is_active: !ip.is_active });
      loadBlockedIPs();
    } catch (error) {
      console.error("Failed to toggle IP status:", error);
    }
  }

  async function handleDelete() {
    if (!selectedIP) return;
    try {
      await deleteBlockedIP(selectedIP.id);
      setShowDeleteDialog(false);
      setSelectedIP(null);
      loadBlockedIPs();
    } catch (error) {
      console.error("Failed to delete blocked IP:", error);
    }
  }

  async function handleViewLogs(ip: BlockedIPListItem) {
    setSelectedIP(ip);
    setLogsLoading(true);
    setShowLogsDialog(true);
    try {
      const data = await getBlockedIPLogs(ip.id);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleClearLogs() {
    if (!selectedIP) return;
    try {
      await clearBlockedIPLogs(selectedIP.id);
      setLogs([]);
      loadBlockedIPs();
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }

  return (
    <div className="flex min-h-screen">
      <SettingsSidebar />
      <div className="flex-1 p-6">
        <PageHeader
          title="Blocked IPs"
          description="Manage IP addresses that are blocked from accessing the system"
          actions={
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 size-4" />
              Add Blocked IP
            </Button>
          }
        />

        <div className="mt-6 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blocked IP Address</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Records Created</TableHead>
                <TableHead>Blocked Webform Requests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : blockedIPs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No blocked IPs found
                  </TableCell>
                </TableRow>
              ) : (
                blockedIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono">
                      {ip.ip_address}
                      {ip.cidr_prefix && `/${ip.cidr_prefix}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ip.reason || "-"}
                    </TableCell>
                    <TableCell>{formatDate(ip.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ip.blocked_webform_requests}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ip.is_active ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewLogs(ip)}
                          title="View Logs"
                        >
                          <History className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(ip)}
                          title={ip.is_active ? "Deactivate" : "Activate"}
                        >
                          {ip.is_active ? (
                            <ToggleRight className="size-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedIP(ip);
                            setShowDeleteDialog(true);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Blocked IP</DialogTitle>
              <DialogDescription>
                Enter the IP address you want to block from accessing the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label>IP Address *</Label>
                  <Input
                    placeholder="192.168.1.1"
                    value={formData.ip_address}
                    onChange={(e) =>
                      setFormData({ ...formData, ip_address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CIDR Prefix</Label>
                  <Input
                    type="number"
                    placeholder="24"
                    min={0}
                    max={128}
                    value={formData.cidr_prefix}
                    onChange={(e) =>
                      setFormData({ ...formData, cidr_prefix: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="Reason for blocking this IP"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={formLoading}>
                {formLoading ? "Adding..." : "Add Blocked IP"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logs Dialog */}
        <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Blocked Request Logs - {selectedIP?.ip_address}
                {selectedIP?.cidr_prefix && `/${selectedIP.cidr_prefix}`}
              </DialogTitle>
              <DialogDescription>
                History of blocked requests from this IP address
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {logsLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No blocked requests logged
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>User Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {REQUEST_TYPE_LABELS[log.request_type] || log.request_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.request_path}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.user_agent || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                Clear Logs
              </Button>
              <Button onClick={() => setShowLogsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Blocked IP?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the blocked IP{" "}
                <span className="font-mono font-medium">
                  {selectedIP?.ip_address}
                  {selectedIP?.cidr_prefix && `/${selectedIP.cidr_prefix}`}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
