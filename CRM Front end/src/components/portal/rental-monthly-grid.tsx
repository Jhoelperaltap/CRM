"use client";

import { useState } from "react";
import type {
  RentalMonthlySummary,
  MonthlyValues,
  CategoryMonthlyData,
  RentalExpenseCategory,
} from "@/types/portal-rental";
import { MONTH_LABELS, MONTH_NAMES } from "@/types/portal-rental";
import { cn } from "@/lib/utils";
import { RentalTransactionModal } from "./rental-transaction-modal";

interface RentalMonthlyGridProps {
  summary: RentalMonthlySummary;
  categories: RentalExpenseCategory[];
  onTransactionAdded?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

interface CellClickData {
  type: "income" | "expense";
  month: string;
  monthIndex: number;
  categoryId?: string;
  categoryName?: string;
}

export function RentalMonthlyGrid({
  summary,
  categories,
  onTransactionAdded,
}: RentalMonthlyGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [cellData, setCellData] = useState<CellClickData | null>(null);

  const handleCellClick = (data: CellClickData) => {
    setCellData(data);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setCellData(null);
  };

  const handleTransactionSaved = () => {
    handleModalClose();
    onTransactionAdded?.();
  };

  const renderValueCell = (
    value: number,
    key: string,
    onClick?: () => void,
    isClickable = true
  ) => {
    const isNegative = value < 0;
    const isZero = value === 0;

    return (
      <td
        key={key}
        className={cn(
          "border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right text-sm font-mono",
          isClickable && "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30",
          isNegative && "text-red-600 dark:text-red-400",
          !isNegative && !isZero && "text-slate-900 dark:text-white",
          isZero && "text-slate-400 dark:text-slate-500"
        )}
        onClick={onClick}
      >
        {formatCurrency(value)}
      </td>
    );
  };

  const renderMonthlyRow = (
    label: string,
    values: MonthlyValues,
    type: "income" | "expense",
    categoryId?: string,
    categoryName?: string,
    isHeader = false,
    isTotal = false,
    rowKey?: string
  ) => {
    return (
      <tr
        key={rowKey || label}
        className={cn(
          isHeader && "bg-slate-50 dark:bg-slate-800",
          isTotal && "bg-slate-100 dark:bg-slate-800 font-semibold"
        )}
      >
        <td
          className={cn(
            "border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-inherit",
            isHeader && "bg-slate-50 dark:bg-slate-800",
            isTotal && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          {label}
        </td>
        {MONTH_NAMES.map((month, idx) =>
          renderValueCell(
            values[month as keyof MonthlyValues] as number,
            `${label}-${month}`,
            isTotal
              ? undefined
              : () =>
                  handleCellClick({
                    type,
                    month,
                    monthIndex: idx + 1,
                    categoryId,
                    categoryName,
                  }),
            !isTotal
          )
        )}
        {/* Total column - not clickable */}
        <td
          className={cn(
            "border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-right text-sm font-mono font-semibold",
            values.total < 0
              ? "text-red-600 dark:text-red-400"
              : values.total > 0
              ? "text-slate-900 dark:text-white"
              : "text-slate-400 dark:text-slate-500",
            "bg-slate-50 dark:bg-slate-800"
          )}
        >
          {formatCurrency(values.total)}
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left text-sm font-semibold text-slate-900 dark:text-white sticky left-0 bg-slate-100 dark:bg-slate-800 min-w-[160px]">
                CATEGORY
              </th>
              {MONTH_NAMES.map((month) => (
                <th
                  key={month}
                  className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white min-w-[80px]"
                >
                  {MONTH_LABELS[month]}
                </th>
              ))}
              <th className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 min-w-[100px]">
                TOTAL YEAR
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Income Section */}
            {renderMonthlyRow("INCOME", summary.income, "income", undefined, undefined, true)}

            {/* Expenses Section Header */}
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <td
                colSpan={14}
                className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                EXPENSES
              </td>
            </tr>

            {/* Expense Categories */}
            {summary.expenses.map((expense: CategoryMonthlyData) =>
              renderMonthlyRow(
                expense.category_name,
                expense.values,
                "expense",
                expense.category_id,
                expense.category_name,
                false,
                false,
                `expense-${expense.category_id}`
              )
            )}

            {/* Total Expenses */}
            {renderMonthlyRow(
              "TOTAL EXPENSES",
              summary.total_expenses,
              "expense",
              undefined,
              undefined,
              false,
              true
            )}

            {/* Net Cash Flow */}
            <tr className="bg-blue-50 dark:bg-blue-950/30">
              <td className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-bold text-blue-900 dark:text-blue-100 sticky left-0 bg-blue-50 dark:bg-blue-950/30">
                NET CASH FLOW
              </td>
              {MONTH_NAMES.map((month) => {
                const value = summary.net_cash_flow[month as keyof MonthlyValues] as number;
                return (
                  <td
                    key={month}
                    className={cn(
                      "border border-slate-200 dark:border-slate-700 px-2 py-2 text-right text-sm font-mono font-bold",
                      value < 0
                        ? "text-red-600 dark:text-red-400"
                        : value > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {formatCurrency(value)}
                  </td>
                );
              })}
              <td
                className={cn(
                  "border border-slate-200 dark:border-slate-700 px-2 py-2 text-right text-sm font-mono font-bold bg-blue-100 dark:bg-blue-900/30",
                  summary.net_cash_flow.total < 0
                    ? "text-red-600 dark:text-red-400"
                    : summary.net_cash_flow.total > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {formatCurrency(summary.net_cash_flow.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction Modal */}
      {modalOpen && cellData && (
        <RentalTransactionModal
          open={modalOpen}
          onClose={handleModalClose}
          onSaved={handleTransactionSaved}
          propertyId={summary.property_id}
          year={summary.year}
          month={cellData.monthIndex}
          transactionType={cellData.type}
          categoryId={cellData.categoryId}
          categoryName={cellData.categoryName}
          categories={categories}
        />
      )}
    </>
  );
}
