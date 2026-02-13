"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createBusinessHours,
  updateBusinessHours,
} from "@/lib/api/business-hours";
import type { BusinessHoursDetail } from "@/types/business-hours";
import {
  DAYS_OF_WEEK,
  TIMEZONES,
  HOURS_12,
  MINUTES,
  PERIODS,
} from "@/types/business-hours";

/* ------------------------------------------------------------------ */
/*  Local interfaces                                                   */
/* ------------------------------------------------------------------ */

interface IntervalRow {
  key: number;
  startHour: string;
  startMinute: string;
  startPeriod: string;
  endHour: string;
  endMinute: string;
  endPeriod: string;
}

interface WorkingDayRow {
  key: number;
  day_of_week: number;
  is_working: boolean;
  intervals: IntervalRow[];
}

interface HolidayRow {
  key: number;
  date: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessHoursFormProps {
  initialData?: BusinessHoursDetail;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let nextKey = 1;

function parse24To12(time: string): {
  hour: string;
  minute: string;
  period: string;
} {
  if (!time) return { hour: "09", minute: "00", period: "AM" };
  const [h, m] = time.split(":");
  let hour = parseInt(h, 10);
  const minute = m?.substring(0, 2) || "00";
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour = hour - 12;
  return {
    hour: hour.toString().padStart(2, "0"),
    minute,
    period,
  };
}

function format12To24(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h = h + 12;
  return `${h.toString().padStart(2, "0")}:${minute}:00`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessHoursForm({ initialData }: BusinessHoursFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  // Basic info
  const [name, setName] = useState(initialData?.name ?? "");
  const [timezone, setTimezone] = useState(
    initialData?.timezone ?? "America/New_York"
  );
  const [isDefault, setIsDefault] = useState(initialData?.is_default ?? false);

  // Working days
  const [workingDays, setWorkingDays] = useState<WorkingDayRow[]>(() => {
    if (initialData?.working_days?.length) {
      return initialData.working_days.map((wd) => ({
        key: nextKey++,
        day_of_week: wd.day_of_week,
        is_working: wd.is_working,
        intervals: wd.intervals.map((iv) => {
          const start = parse24To12(iv.start_time);
          const end = parse24To12(iv.end_time);
          return {
            key: nextKey++,
            startHour: start.hour,
            startMinute: start.minute,
            startPeriod: start.period,
            endHour: end.hour,
            endMinute: end.minute,
            endPeriod: end.period,
          };
        }),
      }));
    }
    return [];
  });

  // Holidays
  const [holidays, setHolidays] = useState<HolidayRow[]>(() => {
    if (initialData?.holidays?.length) {
      return initialData.holidays.map((h) => ({
        key: nextKey++,
        date: h.date,
        name: h.name,
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);

  /* ── Working day helpers ── */

  const addWorkingDay = () => {
    // Find next day not already added
    const usedDays = workingDays.map((wd) => wd.day_of_week);
    const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d.value));
    if (!nextDay) return; // All days already added

    setWorkingDays((prev) => [
      ...prev,
      {
        key: nextKey++,
        day_of_week: nextDay.value,
        is_working: true,
        intervals: [
          {
            key: nextKey++,
            startHour: "09",
            startMinute: "00",
            startPeriod: "AM",
            endHour: "05",
            endMinute: "00",
            endPeriod: "PM",
          },
        ],
      },
    ]);
  };

  const toggleWorkingDay = (dayValue: number, checked: boolean) => {
    setWorkingDays((prev) => {
      const existing = prev.find((wd) => wd.day_of_week === dayValue);
      if (checked && !existing) {
        return [
          ...prev,
          {
            key: nextKey++,
            day_of_week: dayValue,
            is_working: true,
            intervals: [
              {
                key: nextKey++,
                startHour: "09",
                startMinute: "00",
                startPeriod: "AM",
                endHour: "05",
                endMinute: "00",
                endPeriod: "PM",
              },
            ],
          },
        ];
      } else if (!checked && existing) {
        return prev.filter((wd) => wd.day_of_week !== dayValue);
      }
      return prev;
    });
  };

  const updateWorkingDay = (key: number, updates: Partial<WorkingDayRow>) => {
    setWorkingDays((prev) =>
      prev.map((wd) => (wd.key === key ? { ...wd, ...updates } : wd))
    );
  };

  const addInterval = (wdKey: number) => {
    setWorkingDays((prev) =>
      prev.map((wd) =>
        wd.key === wdKey
          ? {
              ...wd,
              intervals: [
                ...wd.intervals,
                {
                  key: nextKey++,
                  startHour: "09",
                  startMinute: "00",
                  startPeriod: "AM",
                  endHour: "05",
                  endMinute: "00",
                  endPeriod: "PM",
                },
              ],
            }
          : wd
      )
    );
  };

  const updateInterval = (
    wdKey: number,
    ivKey: number,
    updates: Partial<IntervalRow>
  ) => {
    setWorkingDays((prev) =>
      prev.map((wd) =>
        wd.key === wdKey
          ? {
              ...wd,
              intervals: wd.intervals.map((iv) =>
                iv.key === ivKey ? { ...iv, ...updates } : iv
              ),
            }
          : wd
      )
    );
  };

  const removeInterval = (wdKey: number, ivKey: number) => {
    setWorkingDays((prev) =>
      prev.map((wd) =>
        wd.key === wdKey
          ? {
              ...wd,
              intervals: wd.intervals.filter((iv) => iv.key !== ivKey),
            }
          : wd
      )
    );
  };

  /* ── Holiday helpers ── */

  const addHoliday = () => {
    setHolidays((prev) => [
      ...prev,
      { key: nextKey++, date: "", name: "" },
    ]);
  };

  const updateHoliday = (key: number, updates: Partial<HolidayRow>) => {
    setHolidays((prev) =>
      prev.map((h) => (h.key === key ? { ...h, ...updates } : h))
    );
  };

  const removeHoliday = (key: number) => {
    setHolidays((prev) => prev.filter((h) => h.key !== key));
  };

  /* ── Submit ── */

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        timezone,
        is_default: isDefault,
        is_active: true,
        working_days: workingDays.map((wd) => ({
          day_of_week: wd.day_of_week,
          is_working: wd.is_working,
          intervals: wd.intervals.map((iv, idx) => ({
            start_time: format12To24(
              iv.startHour,
              iv.startMinute,
              iv.startPeriod
            ),
            end_time: format12To24(iv.endHour, iv.endMinute, iv.endPeriod),
            sort_order: idx,
          })),
        })),
        holidays: holidays
          .filter((h) => h.date && h.name)
          .map((h) => ({
            date: h.date,
            name: h.name,
          })),
      };

      if (isEdit && initialData) {
        await updateBusinessHours(initialData.id, payload);
      } else {
        await createBusinessHours(payload);
      }
      router.push("/settings/business-hours");
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  /* ── Time select component ── */

  const TimeSelect = ({
    hour,
    minute,
    period,
    onHourChange,
    onMinuteChange,
    onPeriodChange,
  }: {
    hour: string;
    minute: string;
    period: string;
    onHourChange: (v: string) => void;
    onMinuteChange: (v: string) => void;
    onPeriodChange: (v: string) => void;
  }) => (
    <div className="flex items-center gap-1">
      <Select value={hour} onValueChange={onHourChange}>
        <SelectTrigger className="w-16 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS_12.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={minute} onValueChange={onMinuteChange}>
        <SelectTrigger className="w-16 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-16 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  /* ── Render ── */

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Name<span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Business hours name"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Operational Time Zone<span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Time zone used for business hours calculations
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          <Label className="flex items-center gap-1">
            Default Business Hours
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="size-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                If checked, this will be the default business hours for the CRM
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>

        {/* Working Days */}
        <div className="space-y-3">
          <Label>Working Days</Label>
          <div className="flex items-center gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const isChecked = workingDays.some(
                (wd) => wd.day_of_week === day.value
              );
              return (
                <label
                  key={day.value}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className="text-xs font-medium">{day.label}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      toggleWorkingDay(day.value, e.target.checked)
                    }
                    className="accent-primary size-4"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Working Hours */}
        <div className="space-y-3">
          <Label>Working Hours</Label>
          {workingDays
            .sort((a, b) => a.day_of_week - b.day_of_week)
            .map((wd) => {
              const dayInfo = DAYS_OF_WEEK.find(
                (d) => d.value === wd.day_of_week
              );
              return (
                <div
                  key={wd.key}
                  className="rounded-md border p-3 space-y-2 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {dayInfo?.fullLabel}
                    </span>
                  </div>
                  {wd.intervals.map((iv, idx) => (
                    <div key={iv.key} className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">
                          Start Time
                        </span>
                        <TimeSelect
                          hour={iv.startHour}
                          minute={iv.startMinute}
                          period={iv.startPeriod}
                          onHourChange={(v) =>
                            updateInterval(wd.key, iv.key, { startHour: v })
                          }
                          onMinuteChange={(v) =>
                            updateInterval(wd.key, iv.key, { startMinute: v })
                          }
                          onPeriodChange={(v) =>
                            updateInterval(wd.key, iv.key, { startPeriod: v })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-14">
                          End Time
                        </span>
                        <TimeSelect
                          hour={iv.endHour}
                          minute={iv.endMinute}
                          period={iv.endPeriod}
                          onHourChange={(v) =>
                            updateInterval(wd.key, iv.key, { endHour: v })
                          }
                          onMinuteChange={(v) =>
                            updateInterval(wd.key, iv.key, { endMinute: v })
                          }
                          onPeriodChange={(v) =>
                            updateInterval(wd.key, iv.key, { endPeriod: v })
                          }
                        />
                      </div>
                      {wd.intervals.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeInterval(wd.key, iv.key)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addInterval(wd.key)}
                  >
                    <Plus className="mr-1 size-3" />
                    Add Interval
                  </Button>
                </div>
              );
            })}
          <Button variant="outline" size="sm" onClick={addWorkingDay}>
            <Plus className="mr-1 size-3" />
            Add Working Day
          </Button>
        </div>

        {/* Holidays */}
        <div className="space-y-3">
          <Label>Holidays</Label>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Days</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-6 text-muted-foreground"
                    >
                      No holidays added
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays.map((h) => (
                    <TableRow key={h.key}>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-8 w-40"
                          value={h.date}
                          onChange={(e) =>
                            updateHoliday(h.key, { date: e.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={h.name}
                          onChange={(e) =>
                            updateHoliday(h.key, { name: e.target.value })
                          }
                          placeholder="Holiday name"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => removeHoliday(h.key)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={addHoliday}>
            <Plus className="mr-1 size-3" />
            Add Holiday
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/business-hours")}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
