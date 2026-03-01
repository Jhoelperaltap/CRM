"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, User } from "lucide-react";
import type { DelinquentTenant } from "@/types/portal-commercial";
import { MONTH_NAMES } from "@/types/portal-commercial";
import { cn } from "@/lib/utils";

interface DelinquentTenantsTableProps {
  delinquents: DelinquentTenant[];
  onUnitClick?: (unitId: string) => void;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function DelinquentTenantsTable({
  delinquents,
  onUnitClick,
}: DelinquentTenantsTableProps) {
  const [expanded, setExpanded] = useState(true);

  if (delinquents.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <AlertTriangle className="size-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
          No Delinquent Tenants
        </h3>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          All tenants are up to date with their payments.
        </p>
      </div>
    );
  }

  const totalOwed = delinquents.reduce((sum, d) => sum + Number(d.total_owed), 0);

  return (
    <div className="rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="size-5 text-red-500" />
          ) : (
            <ChevronRight className="size-5 text-red-500" />
          )}
          <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
          <span className="font-semibold text-red-800 dark:text-red-300">
            Delinquent Tenants ({delinquents.length})
          </span>
        </div>
        <span className="text-lg font-bold text-red-600 dark:text-red-400">
          {formatCurrency(totalOwed)}
        </span>
      </button>

      {/* Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Months Owed
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Total Owed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {delinquents.map((tenant) => (
                <tr
                  key={tenant.unit_id}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                    onUnitClick && "cursor-pointer"
                  )}
                  onClick={() => onUnitClick?.(tenant.unit_id)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {tenant.unit_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {tenant.tenant_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {tenant.business_name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tenant.months_owed.map((month) => (
                        <span
                          key={month}
                          className="inline-flex items-center rounded bg-red-100 dark:bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                        >
                          {MONTH_NAMES[month - 1]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(tenant.monthly_rent)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(tenant.total_owed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
