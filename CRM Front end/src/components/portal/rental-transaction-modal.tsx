"use client";

import { useState, useEffect } from "react";
import { createTransaction } from "@/lib/api/portal-rental";
import type { RentalExpenseCategory, TransactionType } from "@/types/portal-rental";
import { MONTH_LABELS, MONTH_NAMES } from "@/types/portal-rental";
import { X, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RentalTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  propertyId: string;
  year: number;
  month: number;
  transactionType: TransactionType;
  categoryId?: string;
  categoryName?: string;
  categories: RentalExpenseCategory[];
}

export function RentalTransactionModal({
  open,
  onClose,
  onSaved,
  propertyId,
  year,
  month,
  transactionType,
  categoryId,
  categoryName,
  categories,
}: RentalTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedDay, setSelectedDay] = useState(15);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAmount("");
      setDescription("");
      setSelectedCategory(categoryId || "");
      setSelectedDay(15);
      setError(null);
    }
  }, [open, categoryId]);

  if (!open) return null;

  const monthName = MONTH_LABELS[MONTH_NAMES[month - 1]];
  const isIncome = transactionType === "income";

  // Get days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!isIncome && !selectedCategory) {
      setError("Please select a category for this expense");
      return;
    }

    setLoading(true);

    try {
      const transactionDate = `${year}-${String(month).padStart(2, "0")}-${String(
        selectedDay
      ).padStart(2, "0")}`;

      await createTransaction({
        property: propertyId,
        transaction_type: transactionType,
        category: isIncome ? undefined : selectedCategory,
        transaction_date: transactionDate,
        amount: numAmount,
        description: description.trim(),
      });

      onSaved();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save transaction";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl">
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between rounded-t-xl px-5 py-4",
            isIncome
              ? "bg-green-50 dark:bg-green-950/30"
              : "bg-red-50 dark:bg-red-950/30"
          )}
        >
          <div>
            <h2
              className={cn(
                "text-lg font-semibold",
                isIncome
                  ? "text-green-900 dark:text-green-100"
                  : "text-red-900 dark:text-red-100"
              )}
            >
              Add {isIncome ? "Income" : "Expense"}
            </h2>
            <p
              className={cn(
                "text-sm",
                isIncome
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              )}
            >
              {monthName} {year}
              {categoryName && ` - ${categoryName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                autoFocus
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Day of Month
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {monthName} {day}, {year}
                </option>
              ))}
            </select>
          </div>

          {/* Category (for expenses only) */}
          {!isIncome && !categoryId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
              <span className="ml-1 font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Rent payment, Plumber repair"
              maxLength={500}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed",
                isIncome
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Add ${isIncome ? "Income" : "Expense"}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
