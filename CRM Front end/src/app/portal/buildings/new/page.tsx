"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AxiosError } from "axios";
import { createBuilding } from "@/lib/api/portal-commercial";
import type { CommercialBuildingFormData } from "@/types/portal-commercial";
import { ArrowLeft, Building2, AlertTriangle } from "lucide-react";

export default function NewBuildingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLicenseError, setIsLicenseError] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [totalSqft, setTotalSqft] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLicenseError(false);
    setLoading(true);

    try {
      const payload: CommercialBuildingFormData = {
        name,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        total_sqft: totalSqft ? parseFloat(totalSqft) : undefined,
        is_active: true,
      };

      const building = await createBuilding(payload);
      router.push(`/portal/buildings/${building.id}`);
    } catch (err: unknown) {
      let errorMessage = "Failed to create building";

      // Extract error message from Axios response
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (data.detail) {
          errorMessage = data.detail;
          // Check if this is a license limit error (403)
          if (err.response.status === 403) {
            setIsLicenseError(true);
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/portal/buildings"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <ArrowLeft className="size-4" />
          Back to Buildings
        </Link>
        <div className="flex items-center gap-3">
          <Building2 className="size-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Add New Building
          </h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border bg-white dark:bg-slate-900 p-6"
      >
        {error && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              isLicenseError
                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {isLicenseError && (
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    isLicenseError
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isLicenseError ? "License Limit Reached" : "Error"}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    isLicenseError
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {error}
                </p>
              </div>
            </div>
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
              placeholder="e.g., Main Street Plaza"
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
              placeholder="e.g., 123 Main Street"
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
                placeholder="Boston"
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
                placeholder="MA"
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
                placeholder="02101"
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
              placeholder="e.g., 50000"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Total rentable area in the building
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
          <Link
            href="/portal/buildings"
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Building"}
          </button>
        </div>
      </form>
    </div>
  );
}
