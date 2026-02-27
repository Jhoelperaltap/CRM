"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRentalDashboard } from "@/lib/api/portal-rental";
import type { RentalDashboardData, PropertyProfitData } from "@/types/portal-rental";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Home, TrendingUp, TrendingDown, DollarSign, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

interface ChartDataItem {
  name: string;
  profit: number;
  fill: string;
}

export function RentalDashboardWidget() {
  const [data, setData] = useState<RentalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    getRentalDashboard(year)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-lg bg-teal-100 dark:bg-teal-900/50 p-2">
            <Home className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Rental Properties
          </h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="size-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data || data.properties_count === 0) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 dark:bg-teal-900/50 p-2">
              <Home className="size-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Rental Properties
            </h2>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Start tracking your rental property income and expenses.
          </p>
          <Link
            href="/portal/rentals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Add Your First Property
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData: ChartDataItem[] = data.properties.map((p: PropertyProfitData) => ({
    name: p.property_name.length > 15 ? p.property_name.substring(0, 15) + "..." : p.property_name,
    profit: Number(p.net_profit),
    fill: Number(p.net_profit) >= 0 ? "#10b981" : "#ef4444", // green or red
  }));

  return (
    <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-teal-100 dark:bg-teal-900/50 p-2">
            <Home className="size-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Rental Properties
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.properties_count} {data.properties_count === 1 ? "property" : "properties"} • {year}
            </p>
          </div>
        </div>
        <Link
          href="/portal/rentals"
          className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
        >
          View All
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="size-3.5 text-green-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Income</span>
          </div>
          <p className="text-sm font-bold text-green-600">
            {formatCurrency(data.total_income)}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="size-3.5 text-red-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Expenses</span>
          </div>
          <p className="text-sm font-bold text-red-600">
            {formatCurrency(data.total_expenses)}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="size-3.5 text-blue-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Net Profit</span>
          </div>
          <p
            className={cn(
              "text-sm font-bold",
              data.total_net_profit >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {formatCurrency(data.total_net_profit)}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={formatCurrencyShort}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Net Profit"]}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
