"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { WebformForm } from "@/components/webforms/webform-form";
import { getWebform } from "@/lib/api/webforms";
import type { WebformDetail } from "@/types/webforms";

export default function EditWebformPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [webform, setWebform] = useState<WebformDetail | null>(null);

  useEffect(() => {
    async function fetchWebform() {
      try {
        const data = await getWebform(id);
        setWebform(data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    }
    fetchWebform();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!webform) return <p className="text-muted-foreground">Webform not found.</p>;

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Webform" backHref="/settings/webforms" />
      <Card>
        <CardContent className="pt-6">
          <WebformForm initialData={webform} />
        </CardContent>
      </Card>
    </div>
  );
}
