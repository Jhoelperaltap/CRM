/**
 * TypeScript types for Portal Commercial Buildings module.
 */

// Lease status types
export type LeaseStatus = "active" | "pending" | "expired" | "terminated";

// Commercial Tenant
export interface CommercialTenant {
  id: string;
  unit?: string;
  tenant_name: string;
  business_name: string;
  email: string;
  phone: string;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

// Form data for creating/updating tenants
export interface CommercialTenantFormData {
  tenant_name: string;
  business_name?: string;
  email?: string;
  phone?: string;
  is_current?: boolean;
}

// Commercial Lease (nested in unit)
export interface CommercialLeaseNested {
  id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  renewal_increase_percent: number;
  next_rent_after_renewal: number;
  days_until_expiration: number;
  status: LeaseStatus;
}

// Commercial Lease (full)
export interface CommercialLease extends CommercialLeaseNested {
  unit: string;
  tenant: string;
  tenant_name: string;
  business_name: string;
  status_display: string;
  lease_document: string | null;
  lease_document_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating leases
export interface CommercialLeaseFormData {
  unit?: string;
  tenant: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  renewal_increase_percent?: number;
  status?: LeaseStatus;
  lease_document?: File | null;
  notes?: string;
}

// Commercial Payment
export interface CommercialPayment {
  id: string;
  lease: string;
  lease_id: string;
  payment_date: string;
  amount: number;
  payment_month: number;
  payment_year: number;
  receipt: string | null;
  receipt_url: string | null;
  notes: string;
  created_at: string;
}

// Form data for creating/updating payments
export interface CommercialPaymentFormData {
  lease?: string;
  payment_date: string;
  amount: number;
  payment_month: number;
  payment_year: number;
  receipt?: File | null;
  notes?: string;
}

// Commercial Unit (list item in floor table)
export interface CommercialUnitListItem {
  id: string;
  unit_number: string;
  sqft: number | null;
  door_code: string;
  is_available: boolean;
  tenant_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  monthly_rent: number | null;
}

// Commercial Unit (full)
export interface CommercialUnit {
  id: string;
  floor: string;
  floor_number: number;
  floor_name: string;
  unit_number: string;
  sqft: number | null;
  door_code: string;
  is_available: boolean;
  notes: string;
  current_tenant: CommercialTenant | null;
  current_lease: CommercialLeaseNested | null;
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating units
export interface CommercialUnitFormData {
  floor?: string;
  unit_number: string;
  sqft?: number | null;
  door_code?: string;
  is_available?: boolean;
  notes?: string;
}

// Commercial Floor
export interface CommercialFloor {
  id: string;
  building: string;
  floor_number: number;
  name: string;
  display_name: string;
  total_sqft: number | null;
  units: CommercialUnitListItem[];
  units_count: number;
  occupied_count: number;
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating floors
export interface CommercialFloorFormData {
  building?: string;
  floor_number: number;
  name?: string;
  total_sqft?: number | null;
}

// Commercial Floor (list item)
export interface CommercialFloorListItem {
  id: string;
  floor_number: number;
  name: string;
  display_name: string;
  total_sqft: number | null;
  units_count: number;
}

// Commercial Building (list item)
export interface CommercialBuildingListItem {
  id: string;
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  full_address: string;
  total_sqft: number | null;
  floors_count: number;
  units_count: number;
  occupied_units: number;
  occupancy_rate: number;
  monthly_income: number;
  is_active: boolean;
  created_at: string;
}

// Commercial Building (detail with floors)
export interface CommercialBuilding extends CommercialBuildingListItem {
  floors: CommercialFloor[];
  updated_at: string;
}

// Form data for creating/updating buildings
export interface CommercialBuildingFormData {
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  total_sqft?: number | null;
  is_active?: boolean;
}

// Building Dashboard data
export interface BuildingDashboardData {
  building_id: string;
  building_name: string;
  total_sqft: number | null;
  floors_count: number;
  units_count: number;
  occupied_units: number;
  available_units: number;
  occupancy_rate: number;
  monthly_income: number;
  annual_income: number;
  leases_expiring_soon: number;
  vacant_sqft: number | null;
}

// Overall Commercial Dashboard data
export interface CommercialDashboardData {
  total_buildings: number;
  total_units: number;
  total_occupied: number;
  total_available: number;
  overall_occupancy_rate: number;
  total_monthly_income: number;
  total_annual_income: number;
  buildings: BuildingDashboardData[];
}

// Lease renewal data
export interface LeaseRenewalData {
  start_date?: string;
  months?: number;
}

// Occupancy level for badge coloring
export type OccupancyLevel = "high" | "medium" | "low";

/**
 * Get occupancy level based on percentage.
 * - High (green): >= 80%
 * - Medium (yellow): >= 50%
 * - Low (red): < 50%
 */
export function getOccupancyLevel(rate: number | string): OccupancyLevel {
  const numRate = Number(rate);
  if (numRate >= 80) return "high";
  if (numRate >= 50) return "medium";
  return "low";
}

// Month options for payment form
export const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// Lease status options
export const LEASE_STATUS_OPTIONS: { value: LeaseStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

// Status colors for badges
export const LEASE_STATUS_COLORS: Record<LeaseStatus, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-800",
  terminated: "bg-red-100 text-red-800",
};

// -----------------------------------------------------------------------
// Payment Summary Types
// -----------------------------------------------------------------------

// Payment status for a single month
export interface MonthPaymentStatus {
  month: number;
  paid: boolean;
  amount: number | null;
  payment_date: string | null;
}

// Payment summary for a single unit
export interface UnitPaymentSummary {
  id: string;
  unit_number: string;
  floor_number: number;
  tenant_name: string | null;
  business_name: string | null;
  monthly_rent: number;
  months_status: MonthPaymentStatus[];
  total_expected_ytd: number;
  total_paid_ytd: number;
  balance_due: number;
}

// Payment summary for a single floor
export interface FloorPaymentSummary {
  id: string;
  floor_number: number;
  display_name: string;
  expected_monthly: number;
  collected_ytd: number;
  pending_ytd: number;
  units_paid: number;
  units_pending: number;
}

// Delinquent tenant information
export interface DelinquentTenant {
  unit_id: string;
  unit_number: string;
  tenant_name: string;
  business_name: string | null;
  months_owed: number[];
  total_owed: number;
  monthly_rent: number;
}

// Building info within payment summary
export interface BuildingPaymentInfo {
  id: string;
  name: string;
  expected_monthly: number;
  expected_ytd: number;
  collected_ytd: number;
  pending_ytd: number;
  collection_rate: number;
}

// Complete payment summary for a building
export interface BuildingPaymentSummary {
  year: number;
  month: number | null;
  building: BuildingPaymentInfo;
  floors: FloorPaymentSummary[];
  units: UnitPaymentSummary[];
  delinquent: DelinquentTenant[];
}

// Payment status type for visual indicators
export type PaymentStatusType = "paid" | "pending" | "overdue" | "future" | "no-lease";

/**
 * Get payment status type for visual indicators.
 * - paid: Payment received
 * - overdue: Past month with no payment
 * - pending: Current month with no payment
 * - future: Future month
 * - no-lease: No active lease for this period
 */
export function getPaymentStatusType(
  month: number,
  paid: boolean,
  currentMonth: number
): PaymentStatusType {
  if (paid) return "paid";
  if (month < currentMonth) return "overdue";
  if (month === currentMonth) return "pending";
  return "future";
}

// Month names for display
export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Full month names
export const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
