"use client";

import type { CalendarAppointment } from "@/types";
import { CalendarEvent } from "./calendar-event";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

interface Props {
  date: Date;
  appointments: CalendarAppointment[];
  onEventClick: (appointment: CalendarAppointment) => void;
  onSlotClick: (date: Date) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function CalendarMonth({ date, appointments, onEventClick, onSlotClick }: Props) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  // Build grid cells - include previous month days
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month days to complete the grid
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let nextMonthDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({
      date: new Date(nextYear, nextMonth, nextMonthDay++),
      isCurrentMonth: false,
    });
  }

  // Group appointments by date
  const appointmentsByDate = new Map<string, CalendarAppointment[]>();
  for (const appt of appointments) {
    const key = new Date(appt.start_datetime).toISOString().split("T")[0];
    if (!appointmentsByDate.has(key)) appointmentsByDate.set(key, []);
    appointmentsByDate.get(key)!.push(appt);
  }

  // Sort appointments within each day by start time
  appointmentsByDate.forEach((appts) => {
    appts.sort((a, b) =>
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAYS.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "px-3 py-3 text-center text-sm font-semibold",
              idx === 0 || idx === 6 ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {cells.map((cell, idx) => {
          const dateKey = cell.date.toISOString().split("T")[0];
          const dayAppointments = appointmentsByDate.get(dateKey) || [];
          const isToday = isSameDay(cell.date, today);
          const weekend = isWeekend(cell.date);
          const maxVisible = 3;

          return (
            <div
              key={`${dateKey}-${idx}`}
              className={cn(
                "group relative min-h-[120px] cursor-pointer border-b border-r p-1 transition-colors",
                "hover:bg-accent/40",
                !cell.isCurrentMonth && "bg-muted/20",
                cell.isCurrentMonth && weekend && "bg-muted/10",
                "[&:nth-child(7n)]:border-r-0"
              )}
              onClick={() => onSlotClick(cell.date)}
            >
              {/* Date number */}
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isToday && "bg-primary text-primary-foreground shadow-sm",
                    !isToday && cell.isCurrentMonth && "text-foreground group-hover:bg-accent",
                    !isToday && !cell.isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {dayAppointments.length > maxVisible && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <MoreHorizontal className="size-3" />
                    <span>{dayAppointments.length - maxVisible}+</span>
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1 px-0.5">
                {dayAppointments.slice(0, maxVisible).map((appt) => (
                  <CalendarEvent
                    key={appt.id}
                    appointment={appt}
                    compact
                    onClick={() => onEventClick(appt)}
                  />
                ))}
              </div>

              {/* Hover indicator for adding */}
              <div className="pointer-events-none absolute inset-x-1 bottom-1 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  Click to add
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
