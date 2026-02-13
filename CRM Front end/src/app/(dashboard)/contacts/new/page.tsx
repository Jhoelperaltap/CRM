"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContact } from "@/lib/api/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await createContact(data);
      router.push("/contacts");
    } catch (err) {
      console.error(err);
      alert("Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Creating Contact" backHref="/contacts" />
      <div className="rounded-lg border bg-card">
        <ContactForm onSubmit={handleSubmit} isLoading={loading} isEdit={false} />
      </div>
    </div>
  );
}
