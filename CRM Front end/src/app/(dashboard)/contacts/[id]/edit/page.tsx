"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getContact, updateContact } from "@/lib/api/contacts";
import type { Contact } from "@/types";
import { ContactForm } from "@/components/contacts/contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getContact(id).then(setContact).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateContact(id, data);
      router.push(`/contacts/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!contact) return <div>Contact not found</div>;

  const defaultValues = {
    // Basic Information
    salutation: contact.salutation || "",
    first_name: contact.first_name || "",
    last_name: contact.last_name || "",
    title: contact.title || "",
    department: contact.department || "",
    reports_to: contact.reports_to?.id || "",
    // Contact Info
    email: contact.email || "",
    secondary_email: contact.secondary_email || "",
    phone: contact.phone || "",
    mobile: contact.mobile || "",
    home_phone: contact.home_phone || "",
    fax: contact.fax || "",
    assistant: contact.assistant || "",
    assistant_phone: contact.assistant_phone || "",
    // Personal
    date_of_birth: contact.date_of_birth || undefined,
    ssn_last_four: contact.ssn_last_four || "",
    // Lead & Source
    lead_source: contact.lead_source || "",
    source: contact.source || "",
    referred_by: contact.referred_by || "",
    source_campaign: contact.source_campaign || "",
    platform: contact.platform || "",
    ad_group: contact.ad_group || "",
    // Communication Preferences
    do_not_call: contact.do_not_call || false,
    notify_owner: contact.notify_owner || false,
    email_opt_in: contact.email_opt_in || "single_opt_in",
    sms_opt_in: contact.sms_opt_in || "single_opt_in",
    // Mailing Address
    mailing_street: contact.mailing_street || "",
    mailing_city: contact.mailing_city || "",
    mailing_state: contact.mailing_state || "",
    mailing_zip: contact.mailing_zip || "",
    mailing_country: contact.mailing_country || "United States",
    mailing_po_box: contact.mailing_po_box || "",
    // Other Address
    other_street: contact.other_street || "",
    other_city: contact.other_city || "",
    other_state: contact.other_state || "",
    other_zip: contact.other_zip || "",
    other_country: contact.other_country || "United States",
    other_po_box: contact.other_po_box || "",
    // Language & Timezone
    preferred_language: (contact.preferred_language as "en" | "es" | "fr" | "pt" | "zh" | "ko" | "vi" | "ht" | "other") || "en",
    timezone: contact.timezone || "",
    // Status
    status: contact.status || "active",
    // Customer Portal
    portal_user: contact.portal_user || false,
    support_start_date: contact.support_start_date || undefined,
    support_end_date: contact.support_end_date || undefined,
    // Social Media
    twitter_username: contact.twitter_username || "",
    linkedin_url: contact.linkedin_url || "",
    linkedin_followers: contact.linkedin_followers || undefined,
    facebook_url: contact.facebook_url || "",
    facebook_followers: contact.facebook_followers || undefined,
    // Relationships - Multi-corporation support
    corporations: contact.corporations?.map(c => c.id) || [],
    primary_corporation: contact.primary_corporation?.id || "",
    assigned_to: contact.assigned_to?.id || "",
    sla: contact.sla?.id || "",
    // Other
    description: contact.description || "",
    tags: contact.tags || "",
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${contact.first_name} ${contact.last_name}`} backHref={`/contacts/${id}`} />
      <div className="rounded-lg border bg-card">
        <ContactForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={saving}
          isEdit={true}
          contactId={id}
          contactName={`${contact.first_name} ${contact.last_name}`}
          contactEmail={contact.email}
        />
      </div>
    </div>
  );
}
