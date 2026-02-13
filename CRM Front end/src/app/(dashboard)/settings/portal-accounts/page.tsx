"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PortalInviteForm } from "@/components/settings/portal-invite-form";
import {
  getPortalAccounts,
  updatePortalAccount,
  deletePortalAccount,
} from "@/lib/api/settings";
import type { StaffPortalAccess } from "@/types/settings";
import { Trash2 } from "lucide-react";

export default function PortalAccountsPage() {
  const [accounts, setAccounts] = useState<StaffPortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<StaffPortalAccess | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await getPortalAccounts();
      setAccounts(data.results);
    } catch {
      setMessage({ type: "error", text: "Failed to load portal accounts." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleToggle = async (account: StaffPortalAccess) => {
    try {
      await updatePortalAccount(account.id, { is_active: !account.is_active });
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, is_active: !a.is_active } : a
        )
      );
    } catch {
      setMessage({ type: "error", text: "Failed to update account status." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePortalAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setMessage({ type: "success", text: "Portal account deleted." });
    } catch {
      setMessage({ type: "error", text: "Failed to delete account." });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal Accounts"
        description="Manage client portal access"
        actions={
          <PortalInviteForm
            onSuccess={() => {
              fetchAccounts();
              setMessage({
                type: "success",
                text: "Client invited successfully.",
              });
            }}
          />
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

      {loading ? (
        <LoadingSpinner />
      ) : accounts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No portal accounts found. Invite a client to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.contact_name}
                </TableCell>
                <TableCell>{account.email}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={account.is_active ? "active" : "inactive"}
                  />
                </TableCell>
                <TableCell>
                  {account.last_login
                    ? new Date(account.last_login).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  {new Date(account.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(account)}
                    >
                      {account.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setDeletingAccount(account);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Portal Account"
        description={deletingAccount ? `Are you sure you want to delete the portal account for ${deletingAccount.contact_name}? This action cannot be undone.` : ""}
        onConfirm={async () => {
          if (deletingAccount) {
            await handleDelete(deletingAccount.id);
            setDeleteOpen(false);
            setDeletingAccount(null);
          }
        }}
      />
    </div>
  );
}
