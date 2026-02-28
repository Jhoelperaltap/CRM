"use client";

import { CorporationCard } from "./corporation-card";
import type { CorporationListItem } from "@/types";

interface CorporationGridProps {
  corporations: CorporationListItem[];
}

export function CorporationGrid({ corporations }: CorporationGridProps) {
  if (corporations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {corporations.map((corporation) => (
        <CorporationCard key={corporation.id} corporation={corporation} />
      ))}
    </div>
  );
}
