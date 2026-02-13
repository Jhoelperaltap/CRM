"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser, updateUser } from "@/lib/api/users";
import type { User } from "@/types";
import { UserForm } from "@/components/settings/user-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUser(id)
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateUser(id, data);
      router.push(`/settings/users/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${user.first_name} ${user.last_name}`} backHref={`/settings/users/${id}`} />
      <div className="rounded-lg border bg-card">
        <UserForm
          initialData={user}
          onSubmit={handleSubmit}
          isEdit={true}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
