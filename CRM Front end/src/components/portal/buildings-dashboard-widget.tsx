"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCommercialDashboard } from "@/lib/api/portal-commercial";
import type { CommercialDashboardData } from "@/types/portal-commercial";
import { Building2, Users, DollarSign, ArrowRight, TrendingUp, Home } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BuildingsDashboardWidget() {
  const [data, setData] = useState<CommercialDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCommercialDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2">
            <Building2 className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Commercial Buildings
          </h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="size-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data || data.total_buildings === 0) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2">
              <Building2 className="size-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Commercial Buildings
            </h2>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Start managing your commercial properties.
          </p>
          <Link
            href="/portal/buildings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Add Your First Building
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2">
            <Building2 className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Commercial Buildings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.total_buildings} {data.total_buildings === 1 ? "building" : "buildings"} • {data.total_units} units
            </p>
          </div>
        </div>
        <Link
          href="/portal/buildings"
          className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
        >
          View All
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="size-3.5 text-violet-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Buildings</span>
          </div>
          <p className="text-sm font-bold text-violet-600">
            {data.total_buildings}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="size-3.5 text-green-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Occupied</span>
          </div>
          <p className="text-sm font-bold text-green-600">
            {data.total_occupied}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Home className="size-3.5 text-amber-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Available</span>
          </div>
          <p className="text-sm font-bold text-amber-600">
            {data.total_available}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="size-3.5 text-blue-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Occupancy</span>
          </div>
          <p className="text-sm font-bold text-blue-600">
            {Number(data.overall_occupancy_rate || 0).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Income Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="size-4 text-green-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Income</span>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(data.total_monthly_income)}
          </p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="size-4 text-blue-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Annual Income</span>
          </div>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(data.total_annual_income)}
          </p>
        </div>
      </div>

      {/* Buildings List */}
      {data.buildings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            Your Buildings
          </h3>
          {data.buildings.slice(0, 3).map((building) => (
            <Link
              key={building.building_id}
              href={`/portal/buildings/${building.building_id}`}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2">
                  <Building2 className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {building.building_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {building.units_count} units • {building.occupied_units} occupied
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "text-sm font-medium",
                  Number(building.occupancy_rate || 0) >= 80 ? "text-green-600" :
                  Number(building.occupancy_rate || 0) >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {Number(building.occupancy_rate || 0).toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  occupancy
                </p>
              </div>
            </Link>
          ))}
          {data.buildings.length > 3 && (
            <Link
              href="/portal/buildings"
              className="block text-center text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 py-2"
            >
              View all {data.buildings.length} buildings
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
