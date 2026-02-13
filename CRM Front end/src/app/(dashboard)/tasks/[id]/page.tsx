"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTask, deleteTask } from "@/lib/api/tasks";
import type { Task } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => { getTask(id).then(setTask).catch(console.error).finally(() => setLoading(false)); }, [id]);
  if (loading) return <LoadingSpinner />;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={task.title} backHref="/tasks" actions={<>
        <Button variant="outline" asChild><Link href={`/tasks/${id}/edit`}><Pencil className="mr-2 h-4 w-4" /> Edit</Link></Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
      </>} />
      <Card><CardHeader><CardTitle>Task Details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><StatusBadge status={task.priority} /></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={task.status} /></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Assigned To</span><span>{task.assigned_to?.full_name || "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{task.due_date || "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Case</span><span>{task.case?.case_number || "-"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span>{task.contact ? `${task.contact.first_name} ${task.contact.last_name}` : "-"}</span></div>
        {task.description && <div><span className="text-muted-foreground">Description:</span><p className="mt-1">{task.description}</p></div>}
      </CardContent></Card>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Task" description="Are you sure? This cannot be undone." confirmLabel="Delete" onConfirm={async () => { await deleteTask(id); router.push("/tasks"); }} />
    </div>
  );
}
