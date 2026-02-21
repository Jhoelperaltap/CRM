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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PortalInviteForm } from "@/components/settings/portal-invite-form";
import {
  getPortalAccounts,
  getPortalAccount,
  updatePortalAccount,
  deletePortalAccount,
  enableBillingAccess,
  disableBillingAccess,
} from "@/lib/api/settings";
import type { StaffPortalAccess, StaffPortalAccessDetail } from "@/types/settings";
import { Trash2, Receipt } from "lucide-react";
import api from "@/lib/api";

export default function PortalAccountsPage() {
  const [accounts, setAccounts] = useState<StaffPortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<StaffPortalAccess | null>(null);

  // Billing dialog state
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingAccount, setBillingAccount] = useState<StaffPortalAccessDetail | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingPermissions, setBillingPermissions] = useState({
    can_manage_products: true,
    can_manage_services: true,
    can_create_invoices: true,
    can_create_quotes: true,
    can_view_reports: true,
  });

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

  const openBillingDialog = async (account: StaffPortalAccess) => {
    setBillingLoading(true);
    setBillingOpen(true);
    try {
      const detail = await getPortalAccount(account.id);
      setBillingAccount(detail);
      if (detail.billing_access) {
        setBillingPermissions({
          can_manage_products: detail.billing_access.can_manage_products,
          can_manage_services: detail.billing_access.can_manage_services,
          can_create_invoices: detail.billing_access.can_create_invoices,
          can_create_quotes: detail.billing_access.can_create_quotes,
          can_view_reports: detail.billing_access.can_view_reports,
        });
      } else {
        setBillingPermissions({
          can_manage_products: true,
          can_manage_services: true,
          can_create_invoices: true,
          can_create_quotes: true,
          can_view_reports: true,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load account details." });
      setBillingOpen(false);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleEnableBilling = async () => {
    if (!billingAccount) return;

    setBillingLoading(true);
    try {
      // Get the contact's corporation from the contact detail
      const { data: contact } = await api.get(`/contacts/${billingAccount.contact}/`);

      if (!contact.corporation) {
        setMessage({ type: "error", text: "Contact must belong to a corporation to enable billing." });
        setBillingLoading(false);
        return;
      }

      await enableBillingAccess(billingAccount.id, {
        tenant: contact.corporation,
        ...billingPermissions,
      });
      setMessage({ type: "success", text: "Billing access enabled." });
      setBillingOpen(false);
      fetchAccounts();
    } catch {
      setMessage({ type: "error", text: "Failed to enable billing access." });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDisableBilling = async () => {
    if (!billingAccount) return;

    setBillingLoading(true);
    try {
      await disableBillingAccess(billingAccount.id);
      setMessage({ type: "success", text: "Billing access disabled." });
      setBillingOpen(false);
      fetchAccounts();
    } catch {
      setMessage({ type: "error", text: "Failed to disable billing access." });
    } finally {
      setBillingLoading(false);
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
                      onClick={() => openBillingDialog(account)}
                      title="Billing Settings"
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      Billing
                    </Button>
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

      {/* Billing Access Dialog */}
      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing Access
            </DialogTitle>
            <DialogDescription>
              {billingAccount
                ? `Configure billing portal access for ${billingAccount.contact_name}`
                : "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {billingLoading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : billingAccount ? (
            <div className="space-y-4">
              {billingAccount.billing_access ? (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                  Billing is <strong>enabled</strong> for {billingAccount.billing_access.tenant_name}
                </div>
              ) : (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Billing is <strong>not enabled</strong> for this account
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_manage_products"
                      checked={billingPermissions.can_manage_products}
                      onCheckedChange={(checked) =>
                        setBillingPermissions((p) => ({ ...p, can_manage_products: !!checked }))
                      }
                    />
                    <Label htmlFor="can_manage_products" className="text-sm font-normal">
                      Manage Products
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_manage_services"
                      checked={billingPermissions.can_manage_services}
                      onCheckedChange={(checked) =>
                        setBillingPermissions((p) => ({ ...p, can_manage_services: !!checked }))
                      }
                    />
                    <Label htmlFor="can_manage_services" className="text-sm font-normal">
                      Manage Services
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_create_invoices"
                      checked={billingPermissions.can_create_invoices}
                      onCheckedChange={(checked) =>
                        setBillingPermissions((p) => ({ ...p, can_create_invoices: !!checked }))
                      }
                    />
                    <Label htmlFor="can_create_invoices" className="text-sm font-normal">
                      Create Invoices
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_create_quotes"
                      checked={billingPermissions.can_create_quotes}
                      onCheckedChange={(checked) =>
                        setBillingPermissions((p) => ({ ...p, can_create_quotes: !!checked }))
                      }
                    />
                    <Label htmlFor="can_create_quotes" className="text-sm font-normal">
                      Create Quotes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_view_reports"
                      checked={billingPermissions.can_view_reports}
                      onCheckedChange={(checked) =>
                        setBillingPermissions((p) => ({ ...p, can_view_reports: !!checked }))
                      }
                    />
                    <Label htmlFor="can_view_reports" className="text-sm font-normal">
                      View Reports
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {billingAccount?.billing_access ? (
              <Button
                variant="destructive"
                onClick={handleDisableBilling}
                disabled={billingLoading}
              >
                Disable Billing
              </Button>
            ) : (
              <Button
                onClick={handleEnableBilling}
                disabled={billingLoading}
              >
                Enable Billing
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
