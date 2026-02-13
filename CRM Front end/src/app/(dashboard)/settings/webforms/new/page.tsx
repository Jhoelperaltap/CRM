"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WebformForm } from "@/components/webforms/webform-form";

export default function NewWebformPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Create Webform" backHref="/settings/webforms" />
      <Card>
        <CardContent className="pt-6">
          <WebformForm />
        </CardContent>
      </Card>
    </div>
  );
}
