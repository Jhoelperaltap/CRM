"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBuilding, createFloor, createUnit, createTenant, createLease } from "@/lib/api/portal-commercial";
import type {
  CommercialBuilding,
  CommercialFloor,
  CommercialUnitListItem,
  CommercialFloorFormData,
  CommercialUnitFormData,
  CommercialTenantFormData,
  CommercialLeaseFormData,
} from "@/types/portal-commercial";
import { getOccupancyLevel } from "@/types/portal-commercial";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Edit,
  Layers,
  MapPin,
  Plus,
  Users,
  Mail,
  Phone,
  Key,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null) return "-";
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

// Floor Section Component
function FloorSection({
  floor,
  buildingId,
  onUnitClick,
  onAddUnit,
  onAddTenant,
}: {
  floor: CommercialFloor;
  buildingId: string;
  onUnitClick: (unitId: string) => void;
  onAddUnit: (floorId: string) => void;
  onAddTenant: (unitId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden">
      {/* Floor Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 -m-2 p-2 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronDown className="size-5 text-slate-400" />
          ) : (
            <ChevronRight className="size-5 text-slate-400" />
          )}
          <Layers className="size-5 text-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-white">
            {floor.display_name}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({floor.units_count} units, {floor.occupied_count} occupied)
          </span>
        </button>
        <button
          onClick={() => onAddUnit(floor.id)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-3" />
          Add Unit
        </button>
      </div>

      {/* Units Table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Suite
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tenant Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Door Code
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  SQFT
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {floor.units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No units in this floor. Click "Add Unit" to create one.
                  </td>
                </tr>
              ) : (
                floor.units.map((unit) => (
                  <tr
                    key={unit.id}
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors",
                      unit.is_available && "bg-slate-50/50 dark:bg-slate-800/50"
                    )}
                    onClick={() => onUnitClick(unit.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {unit.unit_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {unit.tenant_name ? (
                        <span className="text-slate-700 dark:text-slate-300">
                          {unit.tenant_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          (Vacant)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {unit.business_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {unit.email ? (
                        <a
                          href={`mailto:${unit.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {unit.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {unit.phone ? (
                        <a
                          href={`tel:${unit.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {unit.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-400">
                      {unit.door_code || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      {unit.sqft ? Number(unit.sqft).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(unit.monthly_rent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {unit.is_available && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddTenant(unit.id);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-green-100 dark:bg-green-900/50 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
                        >
                          <Plus className="size-3" />
                          Add Tenant
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: buildingId } = use(params);
  const router = useRouter();
  const [building, setBuilding] = useState<CommercialBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState<string | null>(null);
  const [showAddTenantModal, setShowAddTenantModal] = useState<string | null>(null);

  const loadBuilding = () => {
    setLoading(true);
    getBuilding(buildingId)
      .then(setBuilding)
      .catch(() => setBuilding(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBuilding();
  }, [buildingId]);

  const handleAddFloor = async (data: CommercialFloorFormData) => {
    try {
      await createFloor(buildingId, data);
      loadBuilding();
      setShowAddFloorModal(false);
    } catch (error: unknown) {
      // Log error details for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        console.error("Error creating floor:", axiosError.response?.data);
        alert(`Error creating floor: ${JSON.stringify(axiosError.response?.data)}`);
      } else {
        console.error("Error creating floor:", error);
        alert("Error creating floor. Please try again.");
      }
    }
  };

  const handleAddUnit = async (floorId: string, data: CommercialUnitFormData) => {
    await createUnit(floorId, data);
    loadBuilding();
    setShowAddUnitModal(null);
  };

  const handleAddTenant = async (
    unitId: string,
    tenantData: CommercialTenantFormData,
    leaseData: CommercialLeaseFormData
  ) => {
    // Create tenant first
    const tenant = await createTenant(unitId, tenantData);
    // Then create lease
    await createLease(unitId, { ...leaseData, tenant: tenant.id });
    loadBuilding();
    setShowAddTenantModal(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="rounded-xl border bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Building not found</p>
        <Link
          href="/portal/buildings"
          className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="size-4" />
          Back to Buildings
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
            href="/portal/buildings"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <ArrowLeft className="size-4" />
            Back to Buildings
          </Link>
          <div className="flex items-center gap-3">
            <Building2 className="size-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {building.name}
              </h1>
              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="size-3.5" />
                {building.full_address}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/buildings/${buildingId}/payments`}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <DollarSign className="size-4" />
            Payment Control
          </Link>
          <Link
            href={`/portal/buildings/${buildingId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="size-4" />
            Edit
          </Link>
          <button
            onClick={() => setShowAddFloorModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
            Add Floor
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <Ruler className="size-4" />
            Total SQFT
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {building.total_sqft ? Number(building.total_sqft).toLocaleString() : "-"}
          </p>
        </div>
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <Layers className="size-4" />
            Floors
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {building.floors_count}
          </p>
        </div>
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <Key className="size-4" />
            Units
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {building.occupied_units}/{building.units_count}
          </p>
        </div>
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <Users className="size-4" />
            Occupancy
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {Number(building.occupancy_rate).toFixed(0)}%
            </p>
            <OccupancyBadge rate={building.occupancy_rate} />
          </div>
        </div>
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <DollarSign className="size-4" />
            Monthly Income
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(building.monthly_income)}
          </p>
        </div>
      </div>

      {/* Floors with Units */}
      <div className="space-y-4">
        {building.floors.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-900 p-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Layers className="size-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              No floors yet
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Add your first floor to start managing units and tenants.
            </p>
            <button
              onClick={() => setShowAddFloorModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Add Floor
            </button>
          </div>
        ) : (
          building.floors.map((floor) => (
            <FloorSection
              key={floor.id}
              floor={floor}
              buildingId={buildingId}
              onUnitClick={(unitId) => router.push(`/portal/buildings/${buildingId}/units/${unitId}`)}
              onAddUnit={(floorId) => setShowAddUnitModal(floorId)}
              onAddTenant={(unitId) => setShowAddTenantModal(unitId)}
            />
          ))
        )}
      </div>

      {/* Add Floor Modal */}
      {showAddFloorModal && (
        <AddFloorModal
          onClose={() => setShowAddFloorModal(false)}
          onSubmit={handleAddFloor}
          nextFloorNumber={building.floors.length + 1}
        />
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <AddUnitModal
          floorId={showAddUnitModal}
          onClose={() => setShowAddUnitModal(null)}
          onSubmit={(data) => handleAddUnit(showAddUnitModal, data)}
        />
      )}

      {/* Add Tenant Modal */}
      {showAddTenantModal && (
        <AddTenantModal
          unitId={showAddTenantModal}
          onClose={() => setShowAddTenantModal(null)}
          onSubmit={(tenantData, leaseData) =>
            handleAddTenant(showAddTenantModal, tenantData, leaseData)
          }
        />
      )}
    </div>
  );
}

// Add Floor Modal Component
function AddFloorModal({
  onClose,
  onSubmit,
  nextFloorNumber,
}: {
  onClose: () => void;
  onSubmit: (data: CommercialFloorFormData) => Promise<void>;
  nextFloorNumber: number;
}) {
  const [loading, setLoading] = useState(false);
  const [floorNumber, setFloorNumber] = useState(nextFloorNumber);
  const [name, setName] = useState("");
  const [totalSqft, setTotalSqft] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(floorNumber)) {
      alert("Please enter a valid floor number");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        floor_number: floorNumber,
        name: name || undefined,
        total_sqft: totalSqft ? parseFloat(totalSqft) : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Add New Floor
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Floor Number *
            </label>
            <input
              type="number"
              value={floorNumber}
              onChange={(e) => setFloorNumber(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Floor Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Basement, Mezzanine"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Total SQFT (optional)
            </label>
            <input
              type="number"
              value={totalSqft}
              onChange={(e) => setTotalSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Floor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Unit Modal Component
function AddUnitModal({
  floorId,
  onClose,
  onSubmit,
}: {
  floorId: string;
  onClose: () => void;
  onSubmit: (data: CommercialUnitFormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");
  const [sqft, setSqft] = useState("");
  const [doorCode, setDoorCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        unit_number: unitNumber,
        sqft: sqft ? parseFloat(sqft) : undefined,
        door_code: doorCode || undefined,
        is_available: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Add New Unit
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit Number *
            </label>
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g., #101, Suite A"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Square Feet (optional)
            </label>
            <input
              type="number"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Door Code (optional)
            </label>
            <input
              type="text"
              value={doorCode}
              onChange={(e) => setDoorCode(e.target.value)}
              placeholder="e.g., #2040"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Tenant Modal Component (includes lease info)
function AddTenantModal({
  unitId,
  onClose,
  onSubmit,
}: {
  unitId: string;
  onClose: () => void;
  onSubmit: (
    tenantData: CommercialTenantFormData,
    leaseData: CommercialLeaseFormData
  ) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  // Tenant fields
  const [tenantName, setTenantName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Lease fields
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [renewalPercent, setRenewalPercent] = useState("0");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(
        {
          tenant_name: tenantName,
          business_name: businessName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          is_current: true,
        },
        {
          tenant: "", // Will be set after tenant creation
          start_date: startDate,
          end_date: endDate,
          monthly_rent: parseFloat(monthlyRent),
          renewal_increase_percent: parseFloat(renewalPercent) || 0,
          status: "active",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const calculatedRenewalRent = monthlyRent
    ? (parseFloat(monthlyRent) * (1 + parseFloat(renewalPercent || "0") / 100)).toFixed(2)
    : "0.00";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl mx-4">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Add New Tenant
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tenant Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lease Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Lease Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rent *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-7 pr-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Renewal Increase %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={renewalPercent}
                      onChange={(e) => setRenewalPercent(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pr-8 pl-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      %
                    </span>
                  </div>
                </div>
              </div>
              {/* Calculated renewal rent */}
              {monthlyRent && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Rent after renewal:{" "}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      ${calculatedRenewalRent}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Tenant & Lease"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
