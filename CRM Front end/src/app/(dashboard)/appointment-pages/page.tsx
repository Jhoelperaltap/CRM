"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  CalendarCheck,
  Users as UsersIcon,
  UserCheck,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getAppointmentPages,
  createAppointmentPage,
  deleteAppointmentPage,
} from "@/lib/api/appointment-pages";
import type {
  AppointmentPageListItem,
  AppointmentPagePayload,
} from "@/lib/api/appointment-pages";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type PageType = "meet_me" | "auto_assigned" | "group_event";

const PAGE_TYPE_INFO: Record<
  PageType,
  { label: string; description: string; example: string; icon: typeof CalendarCheck }
> = {
  meet_me: {
    label: "Meet Me",
    description:
      "Allow your clients to schedule appointments with a specific individual.",
    example: "Ex: Meet with john(Sales rep), Meet the CEO.",
    icon: UserCheck,
  },
  auto_assigned: {
    label: "Auto Assigned",
    description:
      "Auto-assign events to one of the available members from the team.",
    example: "Ex: Demo or Service appointments.",
    icon: UsersIcon,
  },
  group_event: {
    label: "Group Event",
    description: "Allow multiple clients to register for an event.",
    example: "Ex: Webinars, Workshops, etc.",
    icon: CalendarCheck,
  },
};

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "demo", label: "Demo" },
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow Up" },
  { value: "other", label: "Other" },
];

const DURATION_PRESETS = [15, 30, 45, 60];

const QUESTION_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Select" },
];

/* ------------------------------------------------------------------ */
/*  Type Picker Dialog                                                 */
/* ------------------------------------------------------------------ */

function TypePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (type: PageType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Choose the type of appointment page to create
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y">
          {(Object.keys(PAGE_TYPE_INFO) as PageType[]).map((type) => {
            const info = PAGE_TYPE_INFO[type];
            const Icon = info.icon;
            return (
              <button
                key={type}
                className="flex w-full items-start gap-4 px-2 py-4 text-left hover:bg-muted/50 transition-colors rounded"
                onClick={() => {
                  onSelect(type);
                  onOpenChange(false);
                }}
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{info.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {info.example}
                  </p>
                </div>
                <span className="mt-2 flex items-center gap-1 text-sm text-primary font-medium">
                  Create <ChevronRight className="size-4" />
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Appointment Page Wizard                                        */
/* ------------------------------------------------------------------ */

type WizardStep = "details" | "notifications" | "schedule" | "questions";

function getSteps(pageType: PageType): WizardStep[] {
  if (pageType === "group_event") {
    return ["details", "notifications", "questions"];
  }
  return ["details", "notifications", "schedule", "questions"];
}

const STEP_LABELS: Record<WizardStep, string> = {
  details: "Details",
  notifications: "Notifications",
  schedule: "Schedule",
  questions: "Invitee Questions",
};

function AddPageWizard({
  open,
  onOpenChange,
  pageType,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pageType: PageType;
  onCreated: () => void;
}) {
  const steps = getSteps(pageType);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // Details
  const [name, setName] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [slug, setSlug] = useState("");
  const [cssUrl, setCssUrl] = useState("");
  const [duration, setDuration] = useState(15);
  const [customDuration, setCustomDuration] = useState("");
  const [activityType, setActivityType] = useState("");
  const [allowKnown, setAllowKnown] = useState(false);
  const [emailOtp, setEmailOtp] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [trackUtm, setTrackUtm] = useState(false);

  // Notifications
  const [notifyOnBook, setNotifyOnBook] = useState(true);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [reminderHours, setReminderHours] = useState("24");

  // Schedule
  const [bufferBefore, setBufferBefore] = useState("0");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [minNotice, setMinNotice] = useState("60");

  // Questions
  const [questions, setQuestions] = useState<
    { label: string; type: string; required: boolean }[]
  >([]);

  const step = steps[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const typeLabel = PAGE_TYPE_INFO[pageType].label;

  const resetForm = () => {
    setStepIdx(0);
    setName("");
    setIntroduction("");
    setSlug("");
    setCssUrl("");
    setDuration(15);
    setCustomDuration("");
    setActivityType("");
    setAllowKnown(false);
    setEmailOtp(false);
    setIsActive(true);
    setTrackUtm(false);
    setNotifyOnBook(true);
    setNotifyOnCancel(true);
    setReminderHours("24");
    setBufferBefore("0");
    setBufferAfter("0");
    setMinNotice("60");
    setQuestions([]);
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalDuration =
        customDuration && parseInt(customDuration, 10) > 0
          ? parseInt(customDuration, 10)
          : duration;

      const payload: AppointmentPagePayload = {
        name: name.trim(),
        page_type: pageType,
        introduction,
        slug: slug || name.trim().toLowerCase().replace(/\s+/g, "-"),
        css_url: cssUrl,
        event_duration: finalDuration,
        event_activity_type: activityType || "meeting",
        allow_known_records: allowKnown,
        email_otp_validation: emailOtp,
        is_active: isActive,
        track_utm: trackUtm,
        notification_config: {
          notify_on_booking: notifyOnBook,
          notify_on_cancel: notifyOnCancel,
          reminder_hours: parseInt(reminderHours, 10) || 24,
        },
        schedule_config: {
          buffer_before: parseInt(bufferBefore, 10) || 0,
          buffer_after: parseInt(bufferAfter, 10) || 0,
          min_notice_minutes: parseInt(minNotice, 10) || 60,
        },
        invitee_questions: questions,
      };
      await createAppointmentPage(payload);
      handleClose(false);
      onCreated();
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () =>
    setQuestions((prev) => [...prev, { label: "", type: "text", required: false }]);
  const updateQuestion = (
    i: number,
    patch: Partial<{ label: string; type: string; required: boolean }>
  ) =>
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    );
  const removeQuestion = (i: number) =>
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {typeLabel}</DialogTitle>
        </DialogHeader>

        {/* Step tabs */}
        <div className="flex items-center justify-center gap-0 mb-4">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (i <= stepIdx) setStepIdx(i);
              }}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors",
                i <= stepIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              style={{
                clipPath:
                  i === 0
                    ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                    : i === steps.length - 1
                      ? "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                      : "polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
              }}
            >
              {STEP_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="space-y-4 min-h-[320px]">
          {/* ── Details Step ── */}
          {step === "details" && (
            <>
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Introduction <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  rows={4}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Appointment Page Link{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="my-meeting"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>CSS file URL</Label>
                <Input
                  value={cssUrl}
                  onChange={(e) => setCssUrl(e.target.value)}
                />
              </div>

              {pageType !== "group_event" && (
                <>
                  <div className="space-y-2">
                    <Label>Event Duration</Label>
                    <div className="flex items-center gap-2">
                      {DURATION_PRESETS.map((d) => (
                        <button
                          key={d}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                            duration === d && !customDuration
                              ? "bg-primary text-primary-foreground border-primary"
                              : "hover:bg-muted"
                          )}
                          onClick={() => {
                            setDuration(d);
                            setCustomDuration("");
                          }}
                        >
                          {d}M
                        </button>
                      ))}
                      <span className="text-sm text-muted-foreground">
                        -or-
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          className="w-16 h-8 text-center text-sm"
                          placeholder="00"
                          value={
                            customDuration
                              ? String(
                                  Math.floor(
                                    parseInt(customDuration, 10) / 60
                                  ) || 0
                                )
                              : ""
                          }
                          onChange={(e) => {
                            const h = parseInt(e.target.value, 10) || 0;
                            const curMin =
                              (parseInt(customDuration, 10) || 0) % 60;
                            setCustomDuration(String(h * 60 + curMin));
                          }}
                        />
                        <span className="text-xs">H :</span>
                        <Input
                          className="w-16 h-8 text-center text-sm"
                          placeholder="00"
                          value={
                            customDuration
                              ? String(
                                  (parseInt(customDuration, 10) || 0) % 60
                                )
                              : ""
                          }
                          onChange={(e) => {
                            const m = parseInt(e.target.value, 10) || 0;
                            const curH = Math.floor(
                              (parseInt(customDuration, 10) || 0) / 60
                            );
                            setCustomDuration(String(curH * 60 + m));
                          }}
                        />
                        <span className="text-xs">M</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Event Activity Type{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an Option" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Allow known Records</Label>
                  <input
                    type="checkbox"
                    checked={allowKnown}
                    onChange={(e) => setAllowKnown(e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Email OTP Validation</Label>
                  <input
                    type="checkbox"
                    checked={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Status</Label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Track UTM Parameters</Label>
                  <Switch checked={trackUtm} onCheckedChange={setTrackUtm} />
                </div>
              </div>
            </>
          )}

          {/* ── Notifications Step ── */}
          {step === "notifications" && (
            <>
              <div className="flex items-center justify-between">
                <Label>Notify on new booking</Label>
                <Switch
                  checked={notifyOnBook}
                  onCheckedChange={setNotifyOnBook}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notify on cancellation</Label>
                <Switch
                  checked={notifyOnCancel}
                  onCheckedChange={setNotifyOnCancel}
                />
              </div>
              <div className="space-y-2">
                <Label>Reminder (hours before)</Label>
                <Input
                  type="number"
                  value={reminderHours}
                  onChange={(e) => setReminderHours(e.target.value)}
                  className="w-32"
                />
              </div>
            </>
          )}

          {/* ── Schedule Step ── */}
          {step === "schedule" && (
            <>
              <div className="space-y-2">
                <Label>Buffer before event (minutes)</Label>
                <Input
                  type="number"
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Buffer after event (minutes)</Label>
                <Input
                  type="number"
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum notice (minutes)</Label>
                <Input
                  type="number"
                  value={minNotice}
                  onChange={(e) => setMinNotice(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum time before an appointment can be booked.
                </p>
              </div>
            </>
          )}

          {/* ── Invitee Questions Step ── */}
          {step === "questions" && (
            <>
              <div className="flex items-center justify-between">
                <Label>Custom questions for invitees</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="mr-1 size-3" />
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No custom questions. Default fields (Name, Email) are always
                  included.
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          className="h-8 text-sm"
                          value={q.label}
                          onChange={(e) =>
                            updateQuestion(i, { label: e.target.value })
                          }
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={q.type}
                          onValueChange={(v) => updateQuestion(i, { type: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map((qt) => (
                              <SelectItem key={qt.value} value={qt.value}>
                                {qt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-1 pb-1 text-xs">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            updateQuestion(i, { required: e.target.checked })
                          }
                          className="rounded"
                        />
                        Req.
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive"
                        onClick={() => removeQuestion(i)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => setStepIdx((i) => i - 1)}
            disabled={isFirst}
          >
            Back
          </Button>
          <Button
            onClick={isLast ? handleSave : () => setStepIdx((i) => i + 1)}
            disabled={isLast ? saving || !name.trim() : !name.trim()}
          >
            {isLast ? (saving ? "Saving..." : "Save") : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AppointmentPagesPage() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<AppointmentPageListItem[]>([]);
  const [filterType, setFilterType] = useState("");

  // Dialog states
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PageType>("meet_me");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.page_type = filterType;
      const data = await getAppointmentPages(params);
      setPages(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleSelectType = (type: PageType) => {
    setSelectedType(type);
    setWizardOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteAppointmentPage(deleteTarget.id);
      setDeleteTarget(null);
      fetchPages();
    }
  };

  const clearValue = "__all__";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointment Pages"
        actions={
          <Button onClick={() => setTypePickerOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Appointment Page
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarCheck className="mr-2 size-4" />
              {filterType
                ? PAGE_TYPE_INFO[filterType as PageType]?.label + " Pages"
                : "Meet Me Pages"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterType("")}>
              All Pages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType("meet_me")}>
              Meet Me Pages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType("auto_assigned")}>
              Auto Assigned Pages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType("group_event")}>
              Group Event Pages
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : pages.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-6 rounded-full bg-muted p-6">
            <CalendarCheck className="size-12 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium text-muted-foreground mb-2">
            There are no Appointment Pages.
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            You can add Appointment Pages by clicking the button below
          </p>
          <Button onClick={() => setTypePickerOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Appointment Page
          </Button>
        </div>
      ) : (
        /* List */
        <Card className="py-0 gap-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Duration
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Activity
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Created By
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">
                        {PAGE_TYPE_INFO[p.page_type]?.label || p.page_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">{p.event_duration}m</td>
                    <td className="px-4 py-2.5 capitalize">
                      {p.event_activity_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2.5">{p.created_by_name || "--"}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={p.is_active ? "default" : "secondary"}
                        className={
                          p.is_active ? "bg-green-500 hover:bg-green-600" : ""
                        }
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          setDeleteTarget({ id: p.id, name: p.name })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Type Picker */}
      <TypePickerDialog
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        onSelect={handleSelectType}
      />

      {/* Creation Wizard */}
      <AddPageWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        pageType={selectedType}
        onCreated={fetchPages}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Appointment Page"
        description={`This will permanently delete "${deleteTarget?.name}". Continue?`}
        variant="destructive"
      />
    </div>
  );
}
