"use client";

import { CaseCard } from "./case-card";
import type { TaxCaseListItem } from "@/types";

interface CaseGridProps {
  cases: TaxCaseListItem[];
}

export function CaseGrid({ cases }: CaseGridProps) {
  if (cases.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cases.map((case_) => (
        <CaseCard key={case_.id} case_={case_} />
      ))}
    </div>
  );
}
