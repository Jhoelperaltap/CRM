"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecurrenceForm } from "@/components/appointments/recurrence-form";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_datetime: z.string().min(1, "Start is required"),
  end_datetime: z.string().min(1, "End is required"),
  location: z.enum(["office", "virtual", "client_site", "phone"]),
  status: z.enum(["scheduled","confirmed","checked_in","in_progress","completed","cancelled","no_show"]),
  contact: z.string().min(1, "Contact is required"),
  assigned_to: z.string().optional(),
  case: z.string().optional(),
  notes: z.string().optional(),
  recurrence_pattern: z.enum(["none", "daily", "weekly", "monthly"]),
  recurrence_end_date: z.string().optional(),
  recurrence_config: z.any().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props { defaultValues?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; isLoading?: boolean; }

export function AppointmentForm({ defaultValues, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "scheduled", location: "office", recurrence_pattern: "none", ...defaultValues },
  });

  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    (defaultValues?.recurrence_config as { days_of_week?: number[] })?.days_of_week || []
  );

  const recurrencePattern = watch("recurrence_pattern") || "none";
  const recurrenceEndDate = watch("recurrence_end_date") || "";

  const handleFormSubmit = async (data: FormData) => {
    // Build recurrence_config
    if (data.recurrence_pattern === "weekly" && daysOfWeek.length > 0) {
      data.recurrence_config = { days_of_week: daysOfWeek };
    }
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Title *</Label><Input {...register("title")} />{errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}</div>
        <div className="space-y-2"><Label>Contact ID *</Label><Input {...register("contact")} placeholder="UUID" />{errors.contact && <p className="text-destructive text-sm">{errors.contact.message}</p>}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Start *</Label><Input type="datetime-local" {...register("start_datetime")} />{errors.start_datetime && <p className="text-destructive text-sm">{errors.start_datetime.message}</p>}</div>
        <div className="space-y-2"><Label>End *</Label><Input type="datetime-local" {...register("end_datetime")} />{errors.end_datetime && <p className="text-destructive text-sm">{errors.end_datetime.message}</p>}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormData["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="checked_in">Checked In</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="no_show">No Show</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Location</Label>
          <Select value={watch("location")} onValueChange={(v) => setValue("location", v as FormData["location"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="virtual">Virtual</SelectItem><SelectItem value="client_site">Client Site</SelectItem><SelectItem value="phone">Phone</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Assigned To (User ID)</Label><Input {...register("assigned_to")} placeholder="UUID (optional)" /></div>
      </div>
      <div className="space-y-2"><Label>Case ID</Label><Input {...register("case")} placeholder="UUID (optional)" /></div>
      <div className="space-y-2"><Label>Description</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} {...register("description")} /></div>
      <div className="space-y-2"><Label>Notes</Label><textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={2} {...register("notes")} /></div>

      {/* Recurrence section */}
      <RecurrenceForm
        pattern={recurrencePattern}
        endDate={recurrenceEndDate}
        daysOfWeek={daysOfWeek}
        onPatternChange={(v) => setValue("recurrence_pattern", v as FormData["recurrence_pattern"])}
        onEndDateChange={(v) => setValue("recurrence_end_date", v)}
        onDaysOfWeekChange={setDaysOfWeek}
      />

      <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Appointment"}</Button>
    </form>
  );
}
