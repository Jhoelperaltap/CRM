"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader title="New Task" backHref="/tasks" />
      <div className="rounded-lg border p-6">
        <TaskForm onSubmit={async (data) => { setLoading(true); try { await createTask(data); router.push("/tasks"); } catch { alert("Failed"); } finally { setLoading(false); } }} isLoading={loading} />
      </div>
    </div>
  );
}
