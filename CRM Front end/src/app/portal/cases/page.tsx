"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { portalGetCases } from "@/lib/api/portal";
import type { PortalCase } from "@/types/portal";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  under_review: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  filed: "bg-green-100 text-green-800",
  on_hold: "bg-gray-100 text-gray-800",
};

export default function PortalCasesPage() {
  const [cases, setCases] = useState<PortalCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalGetCases()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Cases</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : cases.length === 0 ? (
        <p className="text-muted-foreground">No cases found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/portal/cases/${c.id}`}
              className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {c.case_number}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {c.status.replace("_", " ")}
                </span>
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.case_type.replace("_", " ")}</span>
                {c.due_date && (
                  <span>Due: {new Date(c.due_date).toLocaleDateString()}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
