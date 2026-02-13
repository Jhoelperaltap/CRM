"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  getEmailAccounts,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  testEmailConnection,
  syncEmailNow,
} from "@/lib/api/emails";
import type { EmailAccount } from "@/types/email";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

// Server presets for IMAP/SMTP
const SERVER_PRESETS: Record<string, {
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
}> = {
  gmail: {
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_use_tls: true,
  },
  office365: {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_use_tls: true,
  },
  yahoo: {
    imap_host: "imap.mail.yahoo.com",
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: "smtp.mail.yahoo.com",
    smtp_port: 587,
    smtp_use_tls: true,
  },
};

type FormData = {
  name: string;
  email_address: string;
  server_type: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  username: string;
  password: string;
  is_active: boolean;
  sync_interval_minutes: number;
};

const defaultFormData: FormData = {
  name: "",
  email_address: "",
  server_type: "gmail",
  imap_host: "imap.gmail.com",
  imap_port: 993,
  imap_use_ssl: true,
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_use_tls: true,
  username: "",
  password: "",
  is_active: true,
  sync_interval_minutes: 5,
};

export default function MailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<EmailAccount | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const data = await getEmailAccounts();
      setAccounts(data.results);
    } catch {
      alert("Failed to load email accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleServerTypeChange = (type: string) => {
    setFormData((prev) => {
      const preset = SERVER_PRESETS[type];
      if (preset) {
        return { ...prev, server_type: type, ...preset };
      }
      return { ...prev, server_type: type };
    });
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (account: EmailAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      email_address: account.email_address,
      server_type: "custom",
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_use_ssl: account.imap_use_ssl,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_use_tls: account.smtp_use_tls,
      username: account.username,
      password: "", // Don't show stored password
      is_active: account.is_active,
      sync_interval_minutes: account.sync_interval_minutes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email_address: formData.email_address,
        imap_host: formData.imap_host,
        imap_port: formData.imap_port,
        imap_use_ssl: formData.imap_use_ssl,
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_use_tls: formData.smtp_use_tls,
        username: formData.username,
        is_active: formData.is_active,
        sync_interval_minutes: formData.sync_interval_minutes,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingAccount) {
        await updateEmailAccount(editingAccount.id, payload);
      } else {
        payload.password = formData.password; // Required for create
        await createEmailAccount(payload as Parameters<typeof createEmailAccount>[0]);
      }

      setDialogOpen(false);
      fetchAccounts();
    } catch {
      alert("Failed to save email account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    try {
      await deleteEmailAccount(deletingAccount.id);
      setDeleteOpen(false);
      setDeletingAccount(null);
      fetchAccounts();
    } catch {
      alert("Failed to delete email account");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testEmailConnection(id);
      alert(result.message || "Connection successful!");
    } catch {
      alert("Connection test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const result = await syncEmailNow(id);
      alert(result.message || "Sync started!");
      fetchAccounts();
    } catch {
      alert("Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex min-h-screen">
      <SettingsSidebar />
      <div className="flex-1 p-6">
        <PageHeader
          title="Mail Accounts"
          description="Manage email accounts that can be assigned to users for sending emails"
          actions={
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 size-4" />
              Add Account
            </Button>
          }
        />

        <div className="mt-6 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>SMTP Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No email accounts configured. Add one to enable email functionality.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-rose-500" />
                        {account.name}
                      </div>
                    </TableCell>
                    <TableCell>{account.email_address}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.smtp_host}:{account.smtp_port}
                    </TableCell>
                    <TableCell>
                      {account.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="size-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <XCircle className="size-4" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.last_sync_at
                        ? new Date(account.last_sync_at).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(account.id)}
                          disabled={testingId === account.id}
                        >
                          {testingId === account.id ? "Testing..." : "Test"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(account.id)}
                          disabled={syncingId === account.id}
                        >
                          <RefreshCw className={`size-4 ${syncingId === account.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(account)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingAccount(account);
                            setDeleteOpen(true);
                          }}
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Email Account" : "Add Email Account"}
              </DialogTitle>
              <DialogDescription>
                Configure IMAP and SMTP settings for this email account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Office Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={formData.email_address}
                    onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                    placeholder="office@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Server Type</Label>
                <Select value={formData.server_type} onValueChange={handleServerTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail / Google Workspace</SelectItem>
                    <SelectItem value="office365">Microsoft 365 / Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                    <SelectItem value="custom">Custom SMTP/IMAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">IMAP Settings (Incoming)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>IMAP Host</Label>
                    <Input
                      value={formData.imap_host}
                      onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={formData.imap_port}
                      onChange={(e) => setFormData({ ...formData, imap_port: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Switch
                    checked={formData.imap_use_ssl}
                    onCheckedChange={(v) => setFormData({ ...formData, imap_use_ssl: v })}
                  />
                  <Label>Use SSL</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">SMTP Settings (Outgoing)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={formData.smtp_host}
                      onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Switch
                    checked={formData.smtp_use_tls}
                    onCheckedChange={(v) => setFormData({ ...formData, smtp_use_tls: v })}
                  />
                  <Label>Use TLS</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Credentials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password {editingAccount ? "(leave blank to keep current)" : "*"}</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingAccount ? "(unchanged)" : ""}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sync Interval (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.sync_interval_minutes}
                      onChange={(e) => setFormData({ ...formData, sync_interval_minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-7">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingAccount ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Email Account"
          description={`Are you sure you want to delete "${deletingAccount?.name}"? Users assigned to this account will no longer be able to send emails.`}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
