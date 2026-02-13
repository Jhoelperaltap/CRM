"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { portalGetCase } from "@/lib/api/portal";
import { CaseProgress } from "@/components/portal/case-progress";
import type { PortalCase } from "@/types/portal";
import { ArrowLeft } from "lucide-react";

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<PortalCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    portalGetCase(id)
      .then(setCaseData)
      .catch(() => setCaseData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!caseData) {
    return <p className="text-muted-foreground">Case not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/portal/cases"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Cases
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">
              {caseData.case_number}
            </span>
            <h1 className="text-xl font-bold">{caseData.title}</h1>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
            {caseData.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Type</span>
            <div className="font-medium">{caseData.case_type.replace("_", " ")}</div>
          </div>
          {caseData.due_date && (
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <div className="font-medium">
                {new Date(caseData.due_date).toLocaleDateString()}
              </div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Opened</span>
            <div className="font-medium">
              {new Date(caseData.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {caseData.description && (
          <div className="mt-4">
            <span className="text-sm text-muted-foreground">Description</span>
            <p className="mt-1 text-sm">{caseData.description}</p>
          </div>
        )}
      </div>

      {caseData.checklist && (
        <div className="rounded-lg border bg-card p-6">
          <CaseProgress checklist={caseData.checklist} />
        </div>
      )}
    </div>
  );
}
