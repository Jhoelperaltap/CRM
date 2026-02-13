"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api/users";
import { UserForm } from "@/components/settings/user-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await createUser(data);
      router.push("/settings/users");
    } catch (err) {
      console.error(err);
      alert("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Creating New User" backHref="/settings/users" />
      <div className="rounded-lg border bg-card">
        <UserForm onSubmit={handleSubmit} isLoading={loading} isEdit={false} />
      </div>
    </div>
  );
}
