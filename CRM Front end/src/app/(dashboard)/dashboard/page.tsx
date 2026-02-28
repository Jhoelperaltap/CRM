"use client";

import { useEffect, useState } from "react";
import { getDashboardData, type DashboardData } from "@/lib/api/dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatCards } from "@/components/dashboard/charts/stat-cards";
import { CasesByStatus } from "@/components/dashboard/charts/cases-by-status";
import { RevenuePipeline } from "@/components/dashboard/charts/revenue-pipeline";
import { AppointmentsToday } from "@/components/dashboard/charts/appointments-today";
import { MissingDocs } from "@/components/dashboard/charts/missing-docs";
import { TasksByUser } from "@/components/dashboard/charts/tasks-by-user";
import { UpcomingDeadlines } from "@/components/dashboard/charts/upcoming-deadlines";
import { StickyNotes } from "@/components/dashboard/charts/sticky-notes";
import { useUIStore } from "@/stores/ui-store";

export default function DashboardPage() {
  const uiMode = useUIStore((s) => s.uiMode);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div>Failed to load dashboard data</div>;

  const isLightMode = uiMode === "light";

  return (
    <div className={isLightMode ? "min-h-screen bg-gray-100 -m-6 p-4 space-y-4" : "space-y-6"}>
      <div className={isLightMode ? "bg-white rounded-lg shadow-sm p-4" : ""}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your CRM activity</p>
      </div>

      {/* Sticky Notes - Full width at top for visibility */}
      <StickyNotes />

      <StatCards stats={data.stats} />

      <div className="grid gap-4 md:grid-cols-2">
        <CasesByStatus data={data.cases_by_status} />
        <RevenuePipeline data={data.revenue_pipeline} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AppointmentsToday data={data.appointments_today} />
        <MissingDocs data={data.missing_docs} />
        <TasksByUser data={data.tasks_by_user} />
      </div>

      <UpcomingDeadlines data={data.upcoming_deadlines} />
    </div>
  );
}
