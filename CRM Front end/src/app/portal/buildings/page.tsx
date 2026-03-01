"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBuildings, getCommercialDashboard } from "@/lib/api/portal-commercial";
import type { CommercialBuildingListItem, CommercialDashboardData } from "@/types/portal-commercial";
import { getOccupancyLevel } from "@/types/portal-commercial";
import {
  Building2,
  Plus,
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
  MapPin,
  Layers,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function OccupancyBadge({ rate }: { rate: number | string }) {
  const numRate = Number(rate);
  const level = getOccupancyLevel(numRate);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        level === "high" && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400",
        level === "medium" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400",
        level === "low" && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"
      )}
    >
      {numRate.toFixed(0)}% Occupied
    </span>
  );
}

export default function PortalBuildingsPage() {
  const [buildings, setBuildings] = useState<CommercialBuildingListItem[]>([]);
  const [dashboard, setDashboard] = useState<CommercialDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBuildings(), getCommercialDashboard()])
      .then(([buildingsData, dashboardData]) => {
        setBuildings(buildingsData);
        setDashboard(dashboardData);
      })
      .catch(() => {
        setBuildings([]);
        setDashboard(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Commercial Buildings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your commercial properties, floors, and units
          </p>
        </div>
        <Link
          href="/portal/buildings/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add Building
        </Link>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-2">
                <Building2 className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Buildings</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {dashboard.total_buildings}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 dark:bg-purple-900/50 p-2">
                <DoorOpen className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Units</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {dashboard.total_units}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/50 p-2">
                <Users className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Occupancy</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {Number(dashboard.overall_occupancy_rate).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2">
                <DollarSign className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Income</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(dashboard.total_monthly_income)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buildings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : buildings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-900 p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Building2 className="size-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            No buildings yet
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Add your first commercial building to start managing tenants and leases.
          </p>
          <Link
            href="/portal/buildings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Add Building
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((building) => (
            <Link
              key={building.id}
              href={`/portal/buildings/${building.id}`}
              className="group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900 p-5 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Occupancy Badge */}
              <div className="absolute right-4 top-4">
                <OccupancyBadge rate={building.occupancy_rate} />
              </div>

              {/* Header */}
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-2">
                  <Building2 className="size-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {building.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="size-3.5" />
                  <span className="line-clamp-1">
                    {building.address_city}, {building.address_state}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Floors</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {building.floors_count}
                  </p>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Units</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {building.occupied_units}/{building.units_count}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Income</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(building.monthly_income)}
                  </p>
                </div>
              </div>

              {/* SQFT & Arrow */}
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {building.total_sqft
                    ? `${Number(building.total_sqft).toLocaleString()} sqft`
                    : "No SQFT data"}
                </span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
