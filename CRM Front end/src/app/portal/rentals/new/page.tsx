"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRentalProperty } from "@/lib/api/portal-rental";
import type { RentalPropertyFormData } from "@/types/portal-rental";
import { PROPERTY_TYPE_OPTIONS } from "@/types/portal-rental";
import { ArrowLeft, Home, Save, Loader2 } from "lucide-react";

export default function NewRentalPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RentalPropertyFormData>({
    name: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    property_type: "residential",
    units_count: 1,
    purchase_date: null,
    purchase_price: null,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const property = await createRentalProperty(formData);
      router.push(`/portal/rentals/${property.id}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create property";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/rentals"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Add New Property
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the details of your rental property
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Property Name */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Home className="size-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Property Information
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Property Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., 26-28 Holyoke St"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="property_type"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Property Type
                </label>
                <select
                  id="property_type"
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="units_count"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Number of Units
                </label>
                <input
                  type="number"
                  id="units_count"
                  name="units_count"
                  value={formData.units_count}
                  onChange={handleChange}
                  min={1}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-6">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
            Address
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="address_street"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Street Address *
              </label>
              <input
                type="text"
                id="address_street"
                name="address_street"
                value={formData.address_street}
                onChange={handleChange}
                placeholder="123 Main St"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="address_city"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  City *
                </label>
                <input
                  type="text"
                  id="address_city"
                  name="address_city"
                  value={formData.address_city}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="address_state"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  State *
                </label>
                <input
                  type="text"
                  id="address_state"
                  name="address_state"
                  value={formData.address_state}
                  onChange={handleChange}
                  placeholder="MA"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="address_zip"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="address_zip"
                  name="address_zip"
                  value={formData.address_zip}
                  onChange={handleChange}
                  placeholder="02101"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Information (Optional) */}
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-6">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
            Purchase Information
            <span className="ml-2 text-xs font-normal text-slate-500">
              (Optional)
            </span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="purchase_date"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Purchase Date
              </label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value={formData.purchase_date || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="purchase_price"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Purchase Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  value={formData.purchase_price ?? ""}
                  onChange={handleChange}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-7 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/portal/rentals"
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Create Property
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
