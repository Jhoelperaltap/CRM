"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBuilding, updateBuilding, deleteBuilding } from "@/lib/api/portal-commercial";
import type { CommercialBuilding, CommercialBuildingFormData } from "@/types/portal-commercial";
import { ArrowLeft, Building2, Trash2 } from "lucide-react";

export default function EditBuildingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: buildingId } = use(params);
  const router = useRouter();
  const [building, setBuilding] = useState<CommercialBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [totalSqft, setTotalSqft] = useState("");

  useEffect(() => {
    getBuilding(buildingId)
      .then((data) => {
        setBuilding(data);
        setName(data.name);
        setAddressStreet(data.address_street);
        setAddressCity(data.address_city);
        setAddressState(data.address_state);
        setAddressZip(data.address_zip);
        setTotalSqft(data.total_sqft ? String(data.total_sqft) : "");
      })
      .catch(() => setBuilding(null))
      .finally(() => setLoading(false));
  }, [buildingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Partial<CommercialBuildingFormData> = {
        name,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        total_sqft: totalSqft ? parseFloat(totalSqft) : undefined,
      };

      await updateBuilding(buildingId, payload);
      router.push(`/portal/buildings/${buildingId}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update building";
      setError(errorMessage);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBuilding(buildingId);
      router.push("/portal/buildings");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete building";
      setError(errorMessage);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
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
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/portal/buildings/${buildingId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <ArrowLeft className="size-4" />
          Back to Building
        </Link>
        <div className="flex items-center gap-3">
          <Building2 className="size-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Edit Building
          </h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border bg-white dark:bg-slate-900 p-6"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Building Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Building Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                City *
              </label>
              <input
                type="text"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                State *
              </label>
              <input
                type="text"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                ZIP Code *
              </label>
              <input
                type="text"
                value={addressZip}
                onChange={(e) => setAddressZip(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Total SQFT */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Total Square Feet (optional)
            </label>
            <input
              type="number"
              value={totalSqft}
              onChange={(e) => setTotalSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-between border-t border-slate-200 dark:border-slate-700 pt-6">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-600 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <Link
              href={`/portal/buildings/${buildingId}`}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Delete Building?
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              This will deactivate the building and hide it from your list. This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Building"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
