"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BusinessHoursForm } from "@/components/business-hours/business-hours-form";
import { getBusinessHours } from "@/lib/api/business-hours";
import type { BusinessHoursDetail } from "@/types/business-hours";

export default function EditBusinessHoursPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] =
    useState<BusinessHoursDetail | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getBusinessHours(id);
        setBusinessHours(data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!businessHours)
    return <p className="text-muted-foreground">Business hours not found.</p>;

  return (
    <div className="space-y-4">
      <PageHeader title="Configuring Business Hours" backHref="/settings/business-hours" />
      <Card>
        <CardContent className="pt-6">
          <BusinessHoursForm initialData={businessHours} />
        </CardContent>
      </Card>
    </div>
  );
}
