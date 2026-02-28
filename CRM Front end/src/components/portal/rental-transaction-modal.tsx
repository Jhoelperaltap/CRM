"use client";

import { useState, useEffect, useRef } from "react";
import { createTransaction, updateTransaction } from "@/lib/api/portal-rental";
import type {
  RentalExpenseCategory,
  RentalTransaction,
  TransactionType,
} from "@/types/portal-rental";
import { MONTH_LABELS, MONTH_NAMES } from "@/types/portal-rental";
import {
  X,
  DollarSign,
  Loader2,
  Upload,
  FileText,
  Trash2,
  Pencil,
} from "lucide-react";
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
  /** If provided, the modal will edit this transaction instead of creating a new one */
  transaction?: RentalTransaction | null;
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
  transaction,
}: RentalTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedDay, setSelectedDay] = useState(15);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!transaction;

  // Reset form when modal opens or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        // Editing mode - load transaction data
        setAmount(String(transaction.amount));
        setDescription(transaction.description || "");
        setSelectedCategory(transaction.category || "");
        const txDate = new Date(transaction.transaction_date);
        setSelectedMonth(txDate.getMonth() + 1);
        setSelectedDay(txDate.getDate());
        setExistingReceiptUrl(transaction.receipt_url || null);
      } else {
        // Create mode - reset form
        setAmount("");
        setDescription("");
        setSelectedCategory(categoryId || "");
        setSelectedMonth(month);
        setSelectedDay(15);
        setExistingReceiptUrl(null);
      }
      setError(null);
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  }, [open, transaction, categoryId, month]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please upload an image (JPG, PNG, GIF, WebP) or PDF file.");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB.");
        return;
      }
      setReceiptFile(file);
      setExistingReceiptUrl(null); // Clear existing receipt when new file is selected
      setError(null);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setExistingReceiptUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!open) return null;

  const effectiveType = transaction
    ? transaction.transaction_type
    : transactionType;
  const monthName = MONTH_LABELS[MONTH_NAMES[selectedMonth - 1]];
  const isIncome = effectiveType === "income";

  // Get days in selected month
  const daysInMonth = new Date(year, selectedMonth, 0).getDate();
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
      const transactionDate = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(
        selectedDay
      ).padStart(2, "0")}`;

      if (isEditing && transaction) {
        // Update existing transaction
        await updateTransaction(transaction.id, {
          transaction_type: effectiveType,
          category: isIncome ? undefined : selectedCategory,
          transaction_date: transactionDate,
          amount: numAmount,
          description: description.trim(),
          receipt: receiptFile || undefined,
        });
      } else {
        // Create new transaction
        await createTransaction({
          property: propertyId,
          transaction_type: effectiveType,
          category: isIncome ? undefined : selectedCategory,
          transaction_date: transactionDate,
          amount: numAmount,
          description: description.trim(),
          receipt: receiptFile || undefined,
        });
      }

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900">
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
                "flex items-center gap-2 text-lg font-semibold",
                isIncome
                  ? "text-green-900 dark:text-green-100"
                  : "text-red-900 dark:text-red-100"
              )}
            >
              {isEditing && <Pencil className="size-4" />}
              {isEditing ? "Edit" : "Add"} {isIncome ? "Income" : "Expense"}
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
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                autoFocus={!isEditing}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Month */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                // Adjust day if current day exceeds new month's days
                const newDaysInMonth = new Date(
                  year,
                  Number(e.target.value),
                  0
                ).getDate();
                if (selectedDay > newDaysInMonth) {
                  setSelectedDay(newDaysInMonth);
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {MONTH_LABELS[m]} {year}
                </option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {monthName} {day}, {year}
                </option>
              ))}
            </select>
          </div>

          {/* Category (for expenses only) */}
          {!isIncome && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Receipt/Proof Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Receipt/Proof
              <span className="ml-1 font-normal text-slate-400">
                (optional - image or PDF)
              </span>
            </label>

            {receiptFile ? (
              <div className="relative rounded-lg border border-slate-300 p-3 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  {receiptPreview ? (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <FileText className="size-8 text-red-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {receiptFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(receiptFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ) : existingReceiptUrl ? (
              <div className="relative rounded-lg border border-slate-300 p-3 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  {existingReceiptUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={existingReceiptUrl}
                      alt="Current receipt"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <FileText className="size-8 text-red-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Current receipt
                    </p>
                    <a
                      href={existingReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View file
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    title="Remove and upload new"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:hover:bg-blue-950/20"
              >
                <Upload className="mx-auto size-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Click to upload receipt
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG, GIF, WebP or PDF (max 10MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
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
              ) : isEditing ? (
                "Save Changes"
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
