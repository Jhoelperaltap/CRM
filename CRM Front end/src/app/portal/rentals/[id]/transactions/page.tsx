"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRentalProperty,
  getPropertyTransactions,
  getExpenseCategories,
  deleteTransaction,
} from "@/lib/api/portal-rental";
import type {
  RentalProperty,
  RentalTransaction,
  RentalExpenseCategory,
} from "@/types/portal-rental";
import { MONTH_LABELS, MONTH_NAMES } from "@/types/portal-rental";
import {
  ArrowLeft,
  Home,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RentalTransactionModal } from "@/components/portal/rental-transaction-modal";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TransactionsPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [transactions, setTransactions] = useState<RentalTransaction[]>([]);
  const [categories, setCategories] = useState<RentalExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"income" | "expense">("income");

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const loadTransactions = useCallback(async () => {
    try {
      const txns = await getPropertyTransactions(propertyId, {
        year,
        month: month ?? undefined,
      });

      // Apply client-side filters
      let filtered = txns;
      if (typeFilter !== "all") {
        filtered = filtered.filter((t) => t.transaction_type === typeFilter);
      }
      if (categoryFilter) {
        filtered = filtered.filter((t) => t.category === categoryFilter);
      }

      setTransactions(filtered);
    } catch {
      setTransactions([]);
    }
  }, [propertyId, year, month, typeFilter, categoryFilter]);

  useEffect(() => {
    Promise.all([
      getRentalProperty(propertyId),
      getExpenseCategories(),
    ])
      .then(([prop, cats]) => {
        setProperty(prop);
        setCategories(cats);
      })
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    if (property) {
      loadTransactions();
    }
  }, [property, loadTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    setDeleting(id);
    try {
      await deleteTransaction(id);
      loadTransactions();
    } catch {
      alert("Failed to delete transaction");
    } finally {
      setDeleting(null);
    }
  };

  const handleAddIncome = () => {
    setModalType("income");
    setModalOpen(true);
  };

  const handleAddExpense = () => {
    setModalType("expense");
    setModalOpen(true);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    loadTransactions();
  };

  const clearFilters = () => {
    setYear(currentYear);
    setMonth(null);
    setTypeFilter("all");
    setCategoryFilter(null);
  };

  const hasFilters = year !== currentYear || month !== null || typeFilter !== "all" || categoryFilter !== null;

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.transaction_type === "income") {
        acc.income += t.amount;
      } else {
        acc.expenses += t.amount;
      }
      return acc;
    },
    { income: 0, expenses: 0 }
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/portal/rentals/${propertyId}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Home className="size-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Transactions
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {property.name}
            </p>
          </div>
        </div>

        {/* Add buttons */}
        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          <button
            onClick={handleAddIncome}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="size-4" />
            Add Income
          </button>
          <button
            onClick={handleAddExpense}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="size-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="size-4 text-slate-500" />

          {/* Year filter */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={month ?? ""}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">All Months</option>
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {MONTH_LABELS[m]}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "income" | "expense")}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter ?? ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-green-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Income</span>
          </div>
          <p className="mt-1 text-xl font-bold text-green-600">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border bg-red-50 dark:bg-red-950/30 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-5 text-red-600" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</span>
          </div>
          <p className="mt-1 text-xl font-bold text-red-600">
            {formatCurrency(totals.expenses)}
          </p>
        </div>
        <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Net</span>
          </div>
          <p
            className={cn(
              "mt-1 text-xl font-bold",
              totals.income - totals.expenses >= 0
                ? "text-green-600"
                : "text-red-600"
            )}
          >
            {formatCurrency(totals.income - totals.expenses)}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No transactions found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      {formatDate(txn.transaction_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          txn.transaction_type === "income"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {txn.transaction_type === "income" ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {txn.transaction_type_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {txn.category_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {txn.description || "-"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-sm text-right font-mono font-medium",
                        txn.transaction_type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(txn.id)}
                        disabled={deleting === txn.id}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {modalOpen && (
        <RentalTransactionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={handleModalSaved}
          propertyId={propertyId}
          year={year}
          month={month || new Date().getMonth() + 1}
          transactionType={modalType}
          categories={categories}
        />
      )}
    </div>
  );
}
