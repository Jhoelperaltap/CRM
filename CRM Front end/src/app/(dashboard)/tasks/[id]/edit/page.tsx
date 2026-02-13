"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTask, updateTask } from "@/lib/api/tasks";
import type { Task } from "@/types";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getTask(id).then(setTask).catch(console.error).finally(() => setLoading(false)); }, [id]);
  if (loading) return <LoadingSpinner />;
  if (!task) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${task.title}`} backHref={`/tasks/${id}`} />
      <div className="rounded-lg border p-6">
        <TaskForm
          defaultValues={{ title: task.title, description: task.description, priority: task.priority as "low"|"medium"|"high"|"urgent", status: task.status as "todo"|"in_progress"|"completed"|"cancelled", assigned_to: task.assigned_to?.id, case: task.case?.id, contact: task.contact?.id, due_date: task.due_date || undefined }}
          onSubmit={async (data) => { setSaving(true); try { await updateTask(id, data); router.push(`/tasks/${id}`); } catch { alert("Failed"); } finally { setSaving(false); } }}
          isLoading={saving}
        />
      </div>
    </div>
  );
}
