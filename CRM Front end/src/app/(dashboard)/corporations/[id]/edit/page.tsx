"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCorporation, updateCorporation } from "@/lib/api/corporations";
import type { Corporation } from "@/types";
import { CorporationForm } from "@/components/corporations/corporation-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditCorporationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [corp, setCorp] = useState<Corporation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCorporation(id)
      .then(setCorp)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!corp) return <div>Not found</div>;

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateCorporation(id, data);
      router.push(`/corporations/${id}`);
    } catch {
      alert("Failed to update corporation");
    } finally {
      setSaving(false);
    }
  };

  // Build default values from corporation data
  const defaultValues = {
    // Organization Details
    name: corp.name || "",
    legal_name: corp.legal_name || "",
    entity_type: corp.entity_type || "llc",
    organization_type: corp.organization_type || "lead",
    organization_status: corp.organization_status || "cold",
    ein: corp.ein || "",
    state_id: corp.state_id || "",
    // Business Details
    employees: corp.employees || undefined,
    ownership: corp.ownership || "",
    ticker_symbol: corp.ticker_symbol || "",
    sic_code: corp.sic_code || "",
    industry: corp.industry || "",
    annual_revenue: corp.annual_revenue || undefined,
    annual_revenue_range: corp.annual_revenue_range || "",
    fiscal_year_end: corp.fiscal_year_end || "",
    date_incorporated: corp.date_incorporated || "",
    region: corp.region || "",
    timezone: corp.timezone || "",
    // Contact info
    phone: corp.phone || "",
    secondary_phone: corp.secondary_phone || "",
    fax: corp.fax || "",
    email: corp.email || "",
    secondary_email: corp.secondary_email || "",
    email_domain: corp.email_domain || "",
    website: corp.website || "",
    // Social media
    twitter_username: corp.twitter_username || "",
    linkedin_url: corp.linkedin_url || "",
    facebook_url: corp.facebook_url || "",
    // Marketing preferences
    email_opt_in: corp.email_opt_in || "single_opt_in",
    sms_opt_in: corp.sms_opt_in || "single_opt_in",
    notify_owner: corp.notify_owner || false,
    // Billing address
    billing_street: corp.billing_street || "",
    billing_city: corp.billing_city || "",
    billing_state: corp.billing_state || "",
    billing_zip: corp.billing_zip || "",
    billing_country: corp.billing_country || "United States",
    billing_po_box: corp.billing_po_box || "",
    // Shipping address
    shipping_street: corp.shipping_street || "",
    shipping_city: corp.shipping_city || "",
    shipping_state: corp.shipping_state || "",
    shipping_zip: corp.shipping_zip || "",
    shipping_country: corp.shipping_country || "United States",
    shipping_po_box: corp.shipping_po_box || "",
    // Status & relationships
    status: (corp.status as "active" | "inactive" | "dissolved") || "active",
    member_of: corp.member_of?.id || "",
    assigned_to: corp.assigned_to?.id || "",
    sla: corp.sla?.id || "",
    // Other
    description: corp.description || "",
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${corp.name}`} backHref={`/corporations/${id}`} />
      <div className="rounded-lg border bg-card">
        <CorporationForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={saving}
          isEdit={true}
          corporationId={id}
          corporationName={corp.name}
          corporationEmail={corp.email}
          primaryContactId={corp.primary_contact?.id || null}
          primaryContactName={corp.primary_contact ? `${corp.primary_contact.first_name} ${corp.primary_contact.last_name}` : null}
        />
      </div>
    </div>
  );
}
