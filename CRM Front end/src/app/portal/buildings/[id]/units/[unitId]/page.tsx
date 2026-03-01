"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getUnit,
  getUnitLeases,
  getLeasePayments,
  createPayment,
  updateUnit,
  updateTenant,
} from "@/lib/api/portal-commercial";
import type {
  CommercialUnit,
  CommercialLease,
  CommercialPayment,
  CommercialPaymentFormData,
} from "@/types/portal-commercial";
import { LEASE_STATUS_COLORS, MONTH_OPTIONS } from "@/types/portal-commercial";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Edit,
  Key,
  Mail,
  Phone,
  Plus,
  Ruler,
  User,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id: buildingId, unitId } = use(params);
  const [unit, setUnit] = useState<CommercialUnit | null>(null);
  const [leases, setLeases] = useState<CommercialLease[]>([]);
  const [payments, setPayments] = useState<CommercialPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitData, leasesData] = await Promise.all([
        getUnit(unitId),
        getUnitLeases(unitId),
      ]);
      setUnit(unitData);
      setLeases(leasesData);

      // Load payments for active lease
      const activeLease = leasesData.find((l) => l.status === "active");
      if (activeLease) {
        const paymentsData = await getLeasePayments(activeLease.id, selectedYear);
        setPayments(paymentsData);
      } else {
        setPayments([]);
      }
    } catch {
      setUnit(null);
      setLeases([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [unitId, selectedYear]);

  const activeLease = leases.find((l) => l.status === "active");

  const handleAddPayment = async (data: CommercialPaymentFormData) => {
    if (!activeLease) return;
    await createPayment(activeLease.id, data);
    loadData();
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="rounded-xl border bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Unit not found</p>
        <Link
          href={`/portal/buildings/${buildingId}`}
          className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="size-4" />
          Back to Building
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href={`/portal/buildings/${buildingId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <ArrowLeft className="size-4" />
            Back to Building
          </Link>
          <div className="flex items-center gap-3">
            <Key className="size-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Unit {unit.unit_number}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unit.floor_name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditUnitModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="size-4" />
            Edit Unit
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - Unit & Tenant Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Unit Info Card */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
              Unit Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Ruler className="size-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">SQFT:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {unit.sqft ? Number(unit.sqft).toLocaleString() : "-"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Key className="size-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">Door Code:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {unit.door_code || "-"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="size-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    unit.is_available
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"
                      : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                  )}
                >
                  {unit.is_available ? "Vacant" : "Occupied"}
                </span>
              </div>
            </div>
          </div>

          {/* Tenant Info Card */}
          {unit.current_tenant && (
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Current Tenant
                </h2>
                <button
                  onClick={() => setShowEditTenantModal(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="size-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="size-4 text-slate-400" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {unit.current_tenant.tenant_name}
                  </span>
                </div>
                {unit.current_tenant.business_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="size-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">
                      {unit.current_tenant.business_name}
                    </span>
                  </div>
                )}
                {unit.current_tenant.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-4 text-slate-400" />
                    <a
                      href={`mailto:${unit.current_tenant.email}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {unit.current_tenant.email}
                    </a>
                  </div>
                )}
                {unit.current_tenant.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-slate-400" />
                    <a
                      href={`tel:${unit.current_tenant.phone}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {unit.current_tenant.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Lease Info */}
          {activeLease && (
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Active Lease
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {formatDate(activeLease.start_date)} - {formatDate(activeLease.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="size-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">Rent:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(activeLease.monthly_rent)}/mo
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <TrendingUp className="size-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">Renewal:</span>
                  <span className="text-slate-900 dark:text-white">
                    +{activeLease.renewal_increase_percent}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="size-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">Expires in:</span>
                  <span
                    className={cn(
                      "font-medium",
                      activeLease.days_until_expiration <= 30
                        ? "text-red-600 dark:text-red-400"
                        : activeLease.days_until_expiration <= 90
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    {activeLease.days_until_expiration} days
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Rent after renewal
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(activeLease.next_rent_after_renewal)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Payments & Lease History */}
        <div className="space-y-6 lg:col-span-3">
          {/* Payments Section */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Rent Payments
                </h2>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  )}
                </select>
              </div>
              {activeLease && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="size-4" />
                  Add Payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed bg-slate-50 dark:bg-slate-800 p-8 text-center">
                <DollarSign className="mx-auto mb-2 size-8 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No payments recorded for {selectedYear}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {MONTH_OPTIONS.find((m) => m.value === payment.payment_month)?.label}{" "}
                          {payment.payment_year}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 text-right">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {payment.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {payment.receipt_url ? (
                            <a
                              href={payment.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="size-4 mx-auto" />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lease History */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-5">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
              Lease History
            </h2>
            {leases.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed bg-slate-50 dark:bg-slate-800 p-8 text-center">
                <FileText className="mx-auto mb-2 size-8 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No lease history
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leases.map((lease) => (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {lease.tenant_name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            LEASE_STATUS_COLORS[lease.status]
                          )}
                        >
                          {lease.status_display}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(lease.monthly_rent)}/mo
                      </p>
                      {lease.lease_document_url && (
                        <a
                          href={lease.lease_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && activeLease && (
        <AddPaymentModal
          leaseId={activeLease.id}
          monthlyRent={activeLease.monthly_rent}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleAddPayment}
        />
      )}

      {/* Edit Unit Modal */}
      {showEditUnitModal && unit && (
        <EditUnitModal
          unit={unit}
          onClose={() => setShowEditUnitModal(false)}
          onSubmit={async (data) => {
            await updateUnit(unit.id, data);
            loadData();
            setShowEditUnitModal(false);
          }}
        />
      )}

      {/* Edit Tenant Modal */}
      {showEditTenantModal && unit?.current_tenant && (
        <EditTenantModal
          tenant={unit.current_tenant}
          onClose={() => setShowEditTenantModal(false)}
          onSubmit={async (data) => {
            await updateTenant(unit.current_tenant!.id, data);
            loadData();
            setShowEditTenantModal(false);
          }}
        />
      )}
    </div>
  );
}

// Add Payment Modal
function AddPaymentModal({
  leaseId,
  monthlyRent,
  onClose,
  onSubmit,
}: {
  leaseId: string;
  monthlyRent: number;
  onClose: () => void;
  onSubmit: (data: CommercialPaymentFormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const [paymentDate, setPaymentDate] = useState(now.toISOString().split("T")[0]);
  const [amount, setAmount] = useState(String(monthlyRent));
  const [paymentMonth, setPaymentMonth] = useState(now.getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState(now.getFullYear());
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        payment_date: paymentDate,
        amount: parseFloat(amount),
        payment_month: paymentMonth,
        payment_year: paymentYear,
        notes: notes || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Record Payment
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-7 pr-3 py-2"
                required
                step="0.01"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Month *
              </label>
              <select
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Year *
              </label>
              <input
                type="number"
                value={paymentYear}
                onChange={(e) => setPaymentYear(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Check #1234"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Unit Modal
function EditUnitModal({
  unit,
  onClose,
  onSubmit,
}: {
  unit: CommercialUnit;
  onClose: () => void;
  onSubmit: (data: { sqft?: number | null; door_code?: string; notes?: string }) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [sqft, setSqft] = useState(unit.sqft ? String(unit.sqft) : "");
  const [doorCode, setDoorCode] = useState(unit.door_code || "");
  const [notes, setNotes] = useState(unit.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        sqft: sqft ? parseFloat(sqft) : null,
        door_code: doorCode,
        notes,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Edit Unit {unit.unit_number}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Square Feet
            </label>
            <input
              type="number"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Door Code
            </label>
            <input
              type="text"
              value={doorCode}
              onChange={(e) => setDoorCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Tenant Modal
function EditTenantModal({
  tenant,
  onClose,
  onSubmit,
}: {
  tenant: { id: string; tenant_name: string; business_name: string; email: string; phone: string };
  onClose: () => void;
  onSubmit: (data: { tenant_name?: string; business_name?: string; email?: string; phone?: string }) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState(tenant.tenant_name);
  const [businessName, setBusinessName] = useState(tenant.business_name);
  const [email, setEmail] = useState(tenant.email);
  const [phone, setPhone] = useState(tenant.phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        tenant_name: tenantName,
        business_name: businessName,
        email,
        phone,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Edit Tenant
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tenant Name *
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
