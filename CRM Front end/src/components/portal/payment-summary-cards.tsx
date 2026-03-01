"use client";

import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { BuildingPaymentInfo } from "@/types/portal-commercial";
import { cn } from "@/lib/utils";

interface PaymentSummaryCardsProps {
  building: BuildingPaymentInfo;
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function CollectionRateBadge({ rate }: { rate: number }) {
  const level = rate >= 90 ? "high" : rate >= 70 ? "medium" : "low";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        level === "high" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400",
        level === "medium" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400",
        level === "low" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"
      )}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

export function PaymentSummaryCards({ building }: PaymentSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Expected YTD */}
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <DollarSign className="size-4" />
          Expected YTD
        </div>
        <p className="text-xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(building.expected_ytd)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monthly: {formatCurrency(building.expected_monthly)}
        </p>
      </div>

      {/* Collected YTD */}
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <CheckCircle className="size-4 text-green-600" />
          Collected YTD
        </div>
        <p className="text-xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(building.collected_ytd)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {((Number(building.collected_ytd) / Number(building.expected_ytd)) * 100 || 0).toFixed(1)}% of expected
        </p>
      </div>

      {/* Pending YTD */}
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <AlertTriangle className="size-4 text-amber-600" />
          Pending YTD
        </div>
        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
          {formatCurrency(building.pending_ytd)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Outstanding balance
        </p>
      </div>

      {/* Collection Rate */}
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
          <TrendingUp className="size-4" />
          Collection Rate
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {building.collection_rate.toFixed(1)}%
          </p>
          <CollectionRateBadge rate={building.collection_rate} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Collected vs Expected
        </p>
      </div>
    </div>
  );
}
