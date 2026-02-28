/**
 * TypeScript types for Portal Rental Properties module.
 */

// Property types
export type PropertyType = "residential" | "commercial" | "multi_family" | "mixed_use";

// Transaction types
export type TransactionType = "income" | "expense";

// Expense Category
export interface RentalExpenseCategory {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

// Rental Property
export interface RentalProperty {
  id: string;
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  full_address: string;
  property_type: PropertyType;
  property_type_display: string;
  units_count: number;
  purchase_date: string | null;
  purchase_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // YTD summary (populated in list view)
  ytd_income?: number;
  ytd_expenses?: number;
  ytd_net_profit?: number;
}

// Form data for creating/updating properties
export interface RentalPropertyFormData {
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  property_type: PropertyType;
  units_count: number;
  purchase_date?: string | null;
  purchase_price?: number | null;
  is_active?: boolean;
}

// Rental Transaction
export interface RentalTransaction {
  id: string;
  property: string;
  property_name: string;
  transaction_type: TransactionType;
  transaction_type_display: string;
  category: string | null;
  category_name: string | null;
  category_slug: string | null;
  transaction_date: string;
  amount: number;
  description: string;
  receipt: string | null;
  receipt_url: string | null;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
}

// Form data for creating/updating transactions
export interface RentalTransactionFormData {
  property: string;
  transaction_type: TransactionType;
  category?: string | null;
  transaction_date: string;
  amount: number;
  description?: string;
  receipt?: File | null;
}

// Monthly values structure (for grid)
export interface MonthlyValues {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total: number;
}

// Category monthly values (for grid)
export interface CategoryMonthlyData {
  category_id: string;
  category_name: string;
  category_slug: string;
  values: MonthlyValues;
}

// Monthly Summary (for Excel-like grid)
export interface RentalMonthlySummary {
  year: number;
  property_id: string;
  property_name: string;
  income: MonthlyValues;
  expenses: CategoryMonthlyData[];
  total_expenses: MonthlyValues;
  net_cash_flow: MonthlyValues;
}

// Property profit data (for dashboard chart)
export interface PropertyProfitData {
  property_id: string;
  property_name: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
}

// Dashboard data
export interface RentalDashboardData {
  year: number;
  total_income: number;
  total_expenses: number;
  total_net_profit: number;
  properties_count: number;
  properties: PropertyProfitData[];
}

// Transaction filters for list view
export interface TransactionFilters {
  property?: string;
  year?: number;
  month?: number;
  type?: TransactionType;
  category?: string;
}

// Month names for grid display
export const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
] as const;

export const MONTH_LABELS: Record<string, string> = {
  jan: "Jan",
  feb: "Feb",
  mar: "Mar",
  apr: "Apr",
  may: "May",
  jun: "Jun",
  jul: "Jul",
  aug: "Aug",
  sep: "Sep",
  oct: "Oct",
  nov: "Nov",
  dec: "Dec",
};

// Property type options for forms
export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "mixed_use", label: "Mixed Use" },
];
