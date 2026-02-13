"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessHoursForm } from "@/components/business-hours/business-hours-form";

export default function NewBusinessHoursPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Configuring Business Hours" backHref="/settings/business-hours" />
      <Card>
        <CardContent className="pt-6">
          <BusinessHoursForm />
        </CardContent>
      </Card>
    </div>
  );
}
