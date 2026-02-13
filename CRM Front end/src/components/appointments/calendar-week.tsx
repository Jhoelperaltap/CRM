"use client";

import type { CalendarAppointment } from "@/types";
import { CalendarEvent } from "./calendar-event";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  appointments: CalendarAppointment[];
  onEventClick: (appointment: CalendarAppointment) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am-8pm
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export function CalendarWeek({ date, appointments, onEventClick, onSlotClick }: Props) {
  const weekDates = getWeekDates(date);
  const today = new Date();
  const currentHour = today.getHours();

  // Group appointments by date and hour
  const getAppointmentsForSlot = (d: Date, hour: number) => {
    return appointments.filter((appt) => {
      const start = new Date(appt.start_datetime);
      return isSameDay(start, d) && start.getHours() === hour;
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Header with day names */}
      <div className="sticky top-0 z-10 grid grid-cols-[70px_repeat(7,1fr)] border-b bg-card shadow-sm">
        <div className="border-r bg-muted/30 p-2" />
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isWeekend = i === 0 || i === 6;

          return (
            <div
              key={i}
              className={cn(
                "border-r p-3 text-center transition-colors last:border-r-0",
                isToday && "bg-primary/5",
                isWeekend && !isToday && "bg-muted/20"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {DAYS[d.getDay()]}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex size-10 items-center justify-center rounded-full text-lg font-semibold transition-all",
                  isToday && "bg-primary text-primary-foreground shadow-md",
                  !isToday && "text-foreground hover:bg-accent"
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid flex-1 grid-cols-[70px_repeat(7,1fr)]">
        {HOURS.map((hour) => {
          const isPastHour = isSameDay(today, date) && hour < currentHour;
          const isCurrentHour = isSameDay(today, date) && hour === currentHour;

          return (
            <div key={hour} className="contents">
              {/* Time label */}
              <div
                className={cn(
                  "relative border-b border-r bg-muted/30 p-1 text-right",
                  isCurrentHour && "bg-primary/5"
                )}
              >
                <span className="absolute -top-2 right-2 text-xs font-medium text-muted-foreground">
                  {formatHour(hour)}
                </span>
              </div>

              {/* Day columns */}
              {weekDates.map((d, dayIdx) => {
                const slotAppointments = getAppointmentsForSlot(d, hour);
                const isToday = isSameDay(d, today);
                const isWeekend = dayIdx === 0 || dayIdx === 6;
                const isCurrentSlot = isToday && hour === currentHour;

                return (
                  <div
                    key={`${dayIdx}-${hour}`}
                    className={cn(
                      "group relative min-h-[60px] cursor-pointer border-b border-r p-1 transition-colors last:border-r-0",
                      "hover:bg-accent/30",
                      isToday && "bg-primary/5",
                      isWeekend && !isToday && "bg-muted/10",
                      isPastHour && isToday && "bg-muted/20"
                    )}
                    onClick={() => onSlotClick(d, hour)}
                  >
                    {/* Current time indicator */}
                    {isCurrentSlot && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                        style={{
                          top: `${(today.getMinutes() / 60) * 100}%`,
                        }}
                      >
                        <div className="absolute -left-1 -top-1.5 size-3 rounded-full bg-red-500" />
                      </div>
                    )}

                    {/* Appointments */}
                    <div className="relative z-0 space-y-1">
                      {slotAppointments.map((appt) => (
                        <CalendarEvent
                          key={appt.id}
                          appointment={appt}
                          onClick={() => onEventClick(appt)}
                        />
                      ))}
                    </div>

                    {/* Hover indicator */}
                    <div className="pointer-events-none absolute inset-x-1 bottom-1 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      {slotAppointments.length === 0 && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          + Add
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
