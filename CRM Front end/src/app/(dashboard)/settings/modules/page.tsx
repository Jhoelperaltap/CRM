"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getModules, toggleModule } from "@/lib/api/module-config";
import type { CRMModule } from "@/types/index";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleCard } from "@/components/settings/module-card";

export default function ModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<CRMModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      const res = await getModules();
      setModules(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const updated = await toggleModule(id);
      setModules((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active: updated.is_active } : m))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleClick = (id: string) => {
    router.push(`/settings/modules/${id}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Modules" />

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No modules configured. Run the seed command to populate modules.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              onToggle={handleToggle}
              onClick={handleClick}
              toggling={togglingId === m.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
