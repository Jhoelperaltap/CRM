"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarMonth } from "@/components/appointments/calendar-month";
import { CalendarWeek } from "@/components/appointments/calendar-week";
import { CalendarDay } from "@/components/appointments/calendar-day";
import { MiniCalendar } from "@/components/appointments/mini-calendar";
import { AppointmentSlideOver } from "@/components/appointments/appointment-slide-over";
import { QuickCreateDialog } from "@/components/appointments/quick-create-dialog";
import { getCalendarAppointments } from "@/lib/api/appointments";
import type { CalendarAppointment } from "@/types";

type ViewMode = "month" | "week" | "day";

function toLocalDatetimeString(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay()); // start of week
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + (6 - end.getDay())); // end of week
  return { start: formatDateKey(start), end: formatDateKey(end) };
}

function getWeekRange(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDateKey(start), end: formatDateKey(end) };
}

function getDayRange(date: Date) {
  const key = formatDateKey(date);
  return { start: key, end: key };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string>("");

  // Slide-over state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // Quick create state
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateStart, setQuickCreateStart] = useState("");
  const [quickCreateEnd, setQuickCreateEnd] = useState("");

  const dateRange = useMemo(() => {
    if (viewMode === "month") return getMonthRange(currentDate);
    if (viewMode === "week") return getWeekRange(currentDate);
    return getDayRange(currentDate);
  }, [currentDate, viewMode]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: { start_date: string; end_date: string; assigned_to?: string } = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      if (teamFilter) params.assigned_to = teamFilter;
      const data = await getCalendarAppointments(params);
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, teamFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleEventClick = (appt: CalendarAppointment) => {
    setSelectedAppointmentId(appt.id);
    setSlideOverOpen(true);
  };

  const handleMonthSlotClick = (date: Date) => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setQuickCreateStart(toLocalDatetimeString(start));
    setQuickCreateEnd(toLocalDatetimeString(end));
    setQuickCreateOpen(true);
  };

  const handleWeekSlotClick = (date: Date, hour: number) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);
    setQuickCreateStart(toLocalDatetimeString(start));
    setQuickCreateEnd(toLocalDatetimeString(end));
    setQuickCreateOpen(true);
  };

  const handleDaySlotClick = (date: Date, hour: number, quarter: number) => {
    const start = new Date(date);
    start.setHours(hour, quarter, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    setQuickCreateStart(toLocalDatetimeString(start));
    setQuickCreateEnd(toLocalDatetimeString(end));
    setQuickCreateOpen(true);
  };

  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    // week
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [currentDate, viewMode]);

  const highlightedDates = useMemo(() => {
    const set = new Set<string>();
    for (const appt of appointments) {
      set.add(new Date(appt.start_datetime).toISOString().split("T")[0]);
    }
    return set;
  }, [appointments]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader title="Calendar" />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">{headerTitle}</h2>
          {loading && (
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Team filter */}
          <input
            type="text"
            placeholder="Filter by user UUID"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-8 w-48 rounded-md border bg-background px-2 text-sm"
          />

          {/* View mode toggle */}
          <div className="flex rounded-md border">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-md last:rounded-r-md"
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>

          <Button size="sm" onClick={() => setQuickCreateOpen(true)}>
            <Plus className="mr-1 size-4" />
            New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar mini-calendar (desktop only) */}
        <div className="hidden w-52 shrink-0 lg:block">
          <MiniCalendar
            selectedDate={currentDate}
            onDateSelect={(d) => {
              setCurrentDate(d);
              setViewMode("day");
            }}
            highlightedDates={highlightedDates}
          />
        </div>

        {/* Main calendar */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card">
          {viewMode === "month" && (
            <CalendarMonth
              date={currentDate}
              appointments={appointments}
              onEventClick={handleEventClick}
              onSlotClick={handleMonthSlotClick}
            />
          )}
          {viewMode === "week" && (
            <CalendarWeek
              date={currentDate}
              appointments={appointments}
              onEventClick={handleEventClick}
              onSlotClick={handleWeekSlotClick}
            />
          )}
          {viewMode === "day" && (
            <CalendarDay
              date={currentDate}
              appointments={appointments}
              onEventClick={handleEventClick}
              onSlotClick={handleDaySlotClick}
            />
          )}
        </div>
      </div>

      {/* Slide-over */}
      <AppointmentSlideOver
        appointmentId={selectedAppointmentId}
        open={slideOverOpen}
        onClose={() => {
          setSlideOverOpen(false);
          setSelectedAppointmentId(null);
        }}
      />

      {/* Quick create */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        defaultStart={quickCreateStart}
        defaultEnd={quickCreateEnd}
        onCreated={fetchAppointments}
      />
    </div>
  );
}
