"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRentalProperties, getRentalDashboard } from "@/lib/api/portal-rental";
import type { RentalProperty, RentalDashboardData } from "@/types/portal-rental";
import {
  Home,
  Plus,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function PortalRentalsPage() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [dashboard, setDashboard] = useState<RentalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      getRentalProperties(year),
      getRentalDashboard(year),
    ])
      .then(([props, dash]) => {
        setProperties(props);
        setDashboard(dash);
      })
      .catch(() => {
        setProperties([]);
        setDashboard(null);
      })
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Rental Properties
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track income and expenses for your rental properties
          </p>
        </div>
        <Link
          href="/portal/rentals/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Add Property
        </Link>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/50 p-2">
                <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Income ({year})
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(dashboard.total_income)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/50 p-2">
                <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Expenses ({year})
                </p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(dashboard.total_expenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-2">
                <DollarSign className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Net Profit ({year})
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    dashboard.total_net_profit >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCurrency(dashboard.total_net_profit)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-900 p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Building2 className="size-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            No properties yet
          </h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Add your first rental property to start tracking income and expenses.
          </p>
          <Link
            href="/portal/rentals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Add Property
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/portal/rentals/${property.id}`}
              className="group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900 p-5 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Property Type Badge */}
              <div className="absolute right-4 top-4">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {property.property_type_display}
                </span>
              </div>

              {/* Header */}
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-2">
                  <Home className="size-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {property.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="size-3.5" />
                  <span className="line-clamp-1">
                    {property.address_city}, {property.address_state}
                  </span>
                </div>
              </div>

              {/* YTD Stats */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Income</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(property.ytd_income)}
                  </p>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Expenses</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(property.ytd_expenses)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Profit</p>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      (property.ytd_net_profit ?? 0) >= 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatCurrency(property.ytd_net_profit)}
                  </p>
                </div>
              </div>

              {/* Units & Arrow */}
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {property.units_count} {property.units_count === 1 ? "unit" : "units"}
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
