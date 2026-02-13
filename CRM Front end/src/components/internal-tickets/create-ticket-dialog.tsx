"use client";
import { useState, useEffect } from "react";
import { createInternalTicket } from "@/lib/api/internal-tickets";
import { getUsers } from "@/lib/api/users";
import type { User } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NONE = "__none__";

const sections = [
  { id: "summary", label: "Ticket Summary Information" },
  { id: "basic", label: "Basic Information" },
  { id: "sla", label: "SLA Information" },
] as const;

const statusOptions = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "wait_for_response", label: "Wait For Response" },
  { value: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const channelOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "web", label: "Web" },
  { value: "chat", label: "Chat" },
  { value: "portal", label: "Portal" },
  { value: "other", label: "Other" },
];

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "technical", label: "Technical" },
  { value: "billing", label: "Billing" },
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
  { value: "other", label: "Other" },
];

const resolutionTypeOptions = [
  { value: "fixed", label: "Fixed" },
  { value: "wont_fix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
  { value: "deferred", label: "Deferred" },
  { value: "other", label: "Other" },
];

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTicketDialogProps) {
  const [activeSection, setActiveSection] = useState<string>("summary");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketStatus, setTicketStatus] = useState("new");
  const [priority, setPriority] = useState("high");
  const [assignedTo, setAssignedTo] = useState(NONE);
  const [channel, setChannel] = useState(NONE);
  const [resolution, setResolution] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(NONE);
  const [deferredDate, setDeferredDate] = useState("");
  const [resolutionType, setResolutionType] = useState(NONE);
  const [employee, setEmployee] = useState(NONE);
  const [rating, setRating] = useState(NONE);
  const [reopenCount, setReopenCount] = useState("0");
  const [satisfactionFeedback, setSatisfactionFeedback] = useState("");
  const [slaName, setSlaName] = useState("");

  useEffect(() => {
    if (open) {
      getUsers({ page_size: "200" })
        .then((res) => setUsers(res.results))
        .catch(console.error);
    }
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setTicketStatus("new");
    setPriority("high");
    setAssignedTo(NONE);
    setChannel(NONE);
    setResolution("");
    setEmail("");
    setCategory(NONE);
    setDeferredDate("");
    setResolutionType(NONE);
    setEmployee(NONE);
    setRating(NONE);
    setReopenCount("0");
    setSatisfactionFeedback("");
    setSlaName("");
    setActiveSection("summary");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description,
        status: ticketStatus,
        priority,
      };
      if (assignedTo !== NONE) payload.assigned_to = assignedTo;
      if (channel !== NONE) payload.channel = channel;
      if (resolution) payload.resolution = resolution;
      if (email) payload.email = email;
      if (category !== NONE) payload.category = category;
      if (deferredDate) payload.deferred_date = deferredDate;
      if (resolutionType !== NONE) payload.resolution_type = resolutionType;
      if (employee !== NONE) payload.employee = employee;
      if (rating !== NONE) payload.rating = rating;
      if (Number(reopenCount) > 0) payload.reopen_count = Number(reopenCount);
      if (satisfactionFeedback) payload.satisfaction_survey_feedback = satisfactionFeedback;
      if (slaName) payload.sla_name = slaName;

      await createInternalTicket(payload);
      reset();
      onOpenChange(false);
      onCreated();
    } catch {
      alert("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Creating Internal Ticket</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-0 overflow-hidden -mx-6 border-t">
          {/* Left sections nav */}
          <div className="w-56 shrink-0 border-r bg-muted/30 py-3">
            <div className="px-4 pb-2 text-sm font-semibold text-foreground">
              Sections
            </div>
            <div className="space-y-0.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    activeSection === s.id
                      ? "border-l-[3px] border-primary bg-primary/10 font-medium text-primary"
                      : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Ticket Summary Information */}
            {activeSection === "summary" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Ticket Summary Information</h3>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ticket title"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue..."
                  />
                </div>
              </div>
            )}

            {/* Basic Information */}
            {activeSection === "basic" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select value={ticketStatus} onValueChange={setTicketStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select an Option</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select an Option</SelectItem>
                        {channelOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <textarea
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SLA Information */}
            {activeSection === "sla" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select an Option</SelectItem>
                        {categoryOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deferred Date</Label>
                    <Input
                      type="date"
                      value={deferredDate}
                      onChange={(e) => setDeferredDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resolution Type</Label>
                    <Select value={resolutionType} onValueChange={setResolutionType}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select an Option</SelectItem>
                        {resolutionTypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger><SelectValue placeholder="Select an Option" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select an Option</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reopen Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={reopenCount}
                      onChange={(e) => setReopenCount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Satisfaction Survey Feedback</Label>
                  <textarea
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
                    value={satisfactionFeedback}
                    onChange={(e) => setSatisfactionFeedback(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={employee} onValueChange={setEmployee}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Select an Option</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <h3 className="text-sm font-semibold pt-4">SLA Information</h3>
                <div className="space-y-2">
                  <Label>SLA Name</Label>
                  <Input
                    value={slaName}
                    onChange={(e) => setSlaName(e.target.value)}
                    placeholder="Type to search"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
