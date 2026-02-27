"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRentalProperty,
  getPropertySummary,
  getExpenseCategories,
  getPropertyExportUrl,
  getPropertyPdfUrl,
} from "@/lib/api/portal-rental";
import type { RentalProperty, RentalMonthlySummary, RentalExpenseCategory } from "@/types/portal-rental";
import { RentalMonthlyGrid } from "@/components/portal/rental-monthly-grid";
import {
  ArrowLeft,
  Home,
  MapPin,
  Building2,
  ChevronDown,
  Download,
  FileText,
  Printer,
  List,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function RentalPropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [summary, setSummary] = useState<RentalMonthlySummary | null>(null);
  const [categories, setCategories] = useState<RentalExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  // Generate year options (last 5 years + current)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prop, cats] = await Promise.all([
        getRentalProperty(propertyId),
        getExpenseCategories(),
      ]);
      setProperty(prop);
      setCategories(cats);
    } catch {
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const loadSummary = useCallback(async () => {
    try {
      const summaryData = await getPropertySummary(propertyId, year);
      setSummary(summaryData);
    } catch {
      setSummary(null);
    }
  }, [propertyId, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (property) {
      loadSummary();
    }
  }, [property, year, loadSummary]);

  const handleTransactionAdded = () => {
    loadSummary();
  };

  const handleExport = () => {
    const url = getPropertyExportUrl(propertyId, year);
    window.open(url, "_blank");
  };

  const handlePDF = () => {
    const url = getPropertyPdfUrl(propertyId, year);
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Property not found
        </h2>
        <Link
          href="/portal/rentals"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/portal/rentals"
            className="mt-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Home className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {property.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {property.full_address}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="size-4" />
                {property.property_type_display}
              </span>
              <span>
                {property.units_count} {property.units_count === 1 ? "unit" : "units"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-14 lg:ml-0">
          {/* Year Selector */}
          <div className="relative">
            <button
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {year}
              <ChevronDown className="size-4" />
            </button>
            {yearDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setYearDropdownOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setYearDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700",
                        y === year
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 print:hidden"
          >
            <Printer className="size-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handlePDF}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 print:hidden"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 print:hidden"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* View Transactions */}
          <Link
            href={`/portal/rentals/${propertyId}/transactions`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <List className="size-4" />
            Transactions
          </Link>

          {/* Settings */}
          <Link
            href={`/portal/rentals/${propertyId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {summary && (
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
                  {formatCurrency(summary.income.total)}
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
                  {formatCurrency(summary.total_expenses.total)}
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
                  Net Cash Flow ({year})
                </p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    summary.net_cash_flow.total >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCurrency(summary.net_cash_flow.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Grid */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Monthly Breakdown - {year}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Click on any cell to add a transaction
          </p>
        </div>

        {summary ? (
          <RentalMonthlyGrid
            summary={summary}
            categories={categories}
            onTransactionAdded={handleTransactionAdded}
          />
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
