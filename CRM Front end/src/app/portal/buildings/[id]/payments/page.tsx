"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getBuilding,
  getBuildingPaymentSummary,
} from "@/lib/api/portal-commercial";
import type {
  CommercialBuilding,
  BuildingPaymentSummary,
  UnitPaymentSummary,
} from "@/types/portal-commercial";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { PaymentSummaryCards } from "@/components/portal/payment-summary-cards";
import { DelinquentTenantsTable } from "@/components/portal/delinquent-tenants-table";
import { FloorPaymentGrid } from "@/components/portal/floor-payment-grid";

export default function PaymentControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: buildingId } = use(params);
  const router = useRouter();
  const [building, setBuilding] = useState<CommercialBuilding | null>(null);
  const [summary, setSummary] = useState<BuildingPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Generate year options (current year and 2 previous years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  // Get current month
  const currentMonth = new Date().getMonth() + 1;

  const loadData = async () => {
    setLoading(true);
    try {
      const [buildingData, summaryData] = await Promise.all([
        getBuilding(buildingId),
        getBuildingPaymentSummary(buildingId, selectedYear),
      ]);
      setBuilding(buildingData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading payment data:", error);
      setBuilding(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, selectedYear]);

  // Group units by floor
  const getUnitsForFloor = (
    floorId: string,
    allUnits: UnitPaymentSummary[]
  ): UnitPaymentSummary[] => {
    const floor = summary?.floors.find((f) => f.id === floorId);
    if (!floor) return [];
    return allUnits.filter((u) => u.floor_number === floor.floor_number);
  };

  const handleUnitClick = (unitId: string) => {
    router.push(`/portal/buildings/${buildingId}/units/${unitId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!building || !summary) {
    return (
      <div className="rounded-xl border bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <p className="text-red-600 dark:text-red-400">
          Error loading payment data
        </p>
        <Link
          href={`/portal/buildings/${buildingId}`}
          className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="size-4" />
          Back to Building
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href={`/portal/buildings/${buildingId}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <ArrowLeft className="size-4" />
            Back to Building
          </Link>
          <div className="flex items-center gap-3">
            <DollarSign className="size-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Payment Control
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Building2 className="size-3.5" />
                {building.name}
                <span className="mx-1">-</span>
                <MapPin className="size-3.5" />
                {building.full_address}
              </div>
            </div>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-slate-400" />
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-4 pr-10 py-2 text-sm font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <PaymentSummaryCards building={summary.building} />

      {/* Delinquent Tenants */}
      <DelinquentTenantsTable
        delinquents={summary.delinquent}
        onUnitClick={handleUnitClick}
      />

      {/* Payment Grid by Floor */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Payment Status by Floor
        </h2>
        {summary.floors.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-900 p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No floors with active leases found.
            </p>
          </div>
        ) : (
          summary.floors.map((floor) => (
            <FloorPaymentGrid
              key={floor.id}
              floor={floor}
              units={getUnitsForFloor(floor.id, summary.units)}
              currentMonth={
                selectedYear === currentYear ? currentMonth : 12
              }
              onUnitClick={handleUnitClick}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Legend
        </h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <div className="size-3 rounded-full bg-green-500" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <div className="size-3 rounded-full bg-red-500" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">
              Overdue (Past Month)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <div className="size-3 rounded-full bg-amber-500" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">
              Pending (Current Month)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <div className="size-3 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">
              Future / No Lease
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
