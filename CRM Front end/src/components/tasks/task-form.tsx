"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low","medium","high","urgent"]),
  status: z.enum(["todo","in_progress","completed","cancelled"]),
  assigned_to: z.string().optional(),
  assigned_group: z.string().optional(),
  case: z.string().optional(),
  contact: z.string().optional(),
  due_date: z.string().optional(),
  sla_hours: z.number().int().positive().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { defaultValues?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; isLoading?: boolean; }

export function TaskForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium", status: "todo", ...defaultValues },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2"><Label>Title *</Label><Input {...register("title")} />{errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Priority</Label>
          <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as FormData["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Due Date</Label><Input type="date" {...register("due_date")} /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Assigned To (User ID)</Label><Input {...register("assigned_to")} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>Assigned Group (ID)</Label><Input {...register("assigned_group")} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>SLA Hours</Label><Input type="number" {...register("sla_hours")} placeholder="e.g. 24" /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Case ID</Label><Input {...register("case")} placeholder="UUID (optional)" /></div>
        <div className="space-y-2"><Label>Contact ID</Label><Input {...register("contact")} placeholder="UUID (optional)" /></div>
      </div>
      <div className="space-y-2"><Label>Description</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} {...register("description")} /></div>
      <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Task"}</Button>
    </form>
  );
}
