"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Minus,
} from "lucide-react";
import type {
  FloorPaymentSummary,
  UnitPaymentSummary,
  MonthPaymentStatus,
} from "@/types/portal-commercial";
import { MONTH_NAMES, getPaymentStatusType } from "@/types/portal-commercial";
import { cn } from "@/lib/utils";

interface FloorPaymentGridProps {
  floor: FloorPaymentSummary;
  units: UnitPaymentSummary[];
  currentMonth: number;
  onUnitClick?: (unitId: string) => void;
  onCellClick?: (unitId: string, month: number, paid: boolean) => void;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function PaymentCell({
  status,
  currentMonth,
  onClick,
}: {
  status: MonthPaymentStatus;
  currentMonth: number;
  onClick?: () => void;
}) {
  const statusType = getPaymentStatusType(status.month, status.paid, currentMonth);

  const icons = {
    paid: <CheckCircle className="size-4 text-green-600 dark:text-green-400" />,
    overdue: <XCircle className="size-4 text-red-600 dark:text-red-400" />,
    pending: <Clock className="size-4 text-amber-600 dark:text-amber-400" />,
    future: <Minus className="size-4 text-slate-300 dark:text-slate-600" />,
    "no-lease": <Minus className="size-4 text-slate-200 dark:text-slate-700" />,
  };

  const bgColors = {
    paid: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
    overdue: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
    pending: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30",
    future: "bg-slate-50 dark:bg-slate-800/50",
    "no-lease": "bg-slate-50/50 dark:bg-slate-800/30",
  };

  return (
    <td
      className={cn(
        "px-2 py-2 text-center transition-colors",
        bgColors[statusType],
        onClick && statusType !== "future" && "cursor-pointer"
      )}
      onClick={onClick && statusType !== "future" ? onClick : undefined}
      title={
        status.paid
          ? `Paid: ${formatCurrency(status.amount)} on ${status.payment_date}`
          : statusType === "overdue"
            ? "Overdue"
            : statusType === "pending"
              ? "Due this month"
              : ""
      }
    >
      {icons[statusType]}
    </td>
  );
}

export function FloorPaymentGrid({
  floor,
  units,
  currentMonth,
  onUnitClick,
  onCellClick,
}: FloorPaymentGridProps) {
  const [expanded, setExpanded] = useState(true);

  // Calculate collection percentage for this floor
  const collectionRate =
    Number(floor.expected_monthly) > 0
      ? (Number(floor.collected_ytd) / (Number(floor.expected_monthly) * currentMonth)) * 100
      : 0;

  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden">
      {/* Floor Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="size-5 text-slate-400" />
          ) : (
            <ChevronRight className="size-5 text-slate-400" />
          )}
          <Layers className="size-5 text-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {floor.display_name}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            - Collected: {formatCurrency(floor.collected_ytd)}/{formatCurrency(Number(floor.expected_monthly) * currentMonth)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              collectionRate >= 90
                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                : collectionRate >= 70
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"
            )}
          >
            {collectionRate.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">
            {floor.units_paid} paid
          </span>
          {floor.units_pending > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {floor.units_pending} pending
            </span>
          )}
        </div>
      </button>

      {/* Payment Grid */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                  Unit
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky left-[100px] bg-slate-50 dark:bg-slate-800 z-10">
                  Tenant
                </th>
                {MONTH_NAMES.map((month, idx) => (
                  <th
                    key={month}
                    className={cn(
                      "px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider min-w-[50px]",
                      idx + 1 === currentMonth
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {month}
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {units.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    No occupied units on this floor.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td
                      className={cn(
                        "px-4 py-2 sticky left-0 bg-white dark:bg-slate-900 z-10",
                        onUnitClick && "cursor-pointer hover:text-blue-600"
                      )}
                      onClick={() => onUnitClick?.(unit.id)}
                    >
                      <span className="font-medium text-slate-900 dark:text-white">
                        {unit.unit_number}
                      </span>
                    </td>
                    <td className="px-4 py-2 sticky left-[100px] bg-white dark:bg-slate-900 z-10">
                      <div className="truncate max-w-[150px]">
                        <span className="text-slate-700 dark:text-slate-300">
                          {unit.tenant_name || "-"}
                        </span>
                        {unit.business_name && (
                          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                            {unit.business_name}
                          </span>
                        )}
                      </div>
                    </td>
                    {MONTH_NAMES.map((_, idx) => {
                      const monthStatus = unit.months_status.find(
                        (m) => m.month === idx + 1
                      );
                      if (!monthStatus) {
                        return (
                          <td
                            key={idx}
                            className="px-2 py-2 text-center bg-slate-50/50 dark:bg-slate-800/30"
                          >
                            <Minus className="size-4 text-slate-200 dark:text-slate-700 mx-auto" />
                          </td>
                        );
                      }
                      return (
                        <PaymentCell
                          key={idx}
                          status={monthStatus}
                          currentMonth={currentMonth}
                          onClick={
                            onCellClick
                              ? () =>
                                  onCellClick(unit.id, monthStatus.month, monthStatus.paid)
                              : undefined
                          }
                        />
                      );
                    })}
                    <td className="px-4 py-2 text-right">
                      <span
                        className={cn(
                          "font-semibold",
                          Number(unit.balance_due) > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        {Number(unit.balance_due) > 0
                          ? formatCurrency(unit.balance_due)
                          : "Paid"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
