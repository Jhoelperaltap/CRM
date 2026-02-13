"use client";

import type { CalendarAppointment } from "@/types";
import { CalendarEvent } from "./calendar-event";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  appointments: CalendarAppointment[];
  onEventClick: (appointment: CalendarAppointment) => void;
  onSlotClick: (date: Date, hour: number, quarter: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am-8pm
const QUARTERS = [0, 15, 30, 45];

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

export function CalendarDay({ date, appointments, onEventClick, onSlotClick }: Props) {
  const today = new Date();
  const isToday = isSameDay(date, today);
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  const getAppointmentsForSlot = (hour: number, quarter: number) => {
    return appointments.filter((appt) => {
      const start = new Date(appt.start_datetime);
      return (
        isSameDay(start, date) &&
        start.getHours() === hour &&
        start.getMinutes() >= quarter &&
        start.getMinutes() < quarter + 15
      );
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Day header */}
      <div className="sticky top-0 z-10 border-b bg-card p-4 shadow-sm">
        <div className="flex items-center justify-center gap-3">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full text-2xl font-bold transition-all",
              isToday && "bg-primary text-primary-foreground shadow-md",
              !isToday && "bg-muted text-foreground"
            )}
          >
            {date.getDate()}
          </div>
          <div>
            <div className={cn(
              "text-lg font-semibold",
              isToday && "text-primary"
            )}>
              {date.toLocaleDateString("en-US", { weekday: "long" })}
            </div>
            <div className="text-sm text-muted-foreground">
              {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1">
        {HOURS.map((hour) => {
          const isPastHour = isToday && hour < currentHour;
          const isCurrentHour = isToday && hour === currentHour;

          return (
            <div
              key={hour}
              className={cn(
                "flex border-b",
                isPastHour && "bg-muted/30"
              )}
            >
              {/* Time label */}
              <div className="relative w-20 shrink-0 border-r bg-muted/20 p-2 text-right">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatHour(hour)}
                </span>
              </div>

              {/* Quarter slots */}
              <div className="relative flex-1">
                {/* Current time indicator */}
                {isCurrentHour && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                    style={{
                      top: `${(currentMinute / 60) * 100}%`,
                    }}
                  >
                    <div className="absolute -left-1 -top-1.5 size-3 rounded-full bg-red-500" />
                  </div>
                )}

                {QUARTERS.map((quarter, idx) => {
                  const slotAppointments = getAppointmentsForSlot(hour, quarter);
                  const isHourStart = quarter === 0;
                  const isHalfHour = quarter === 30;

                  return (
                    <div
                      key={quarter}
                      className={cn(
                        "group min-h-[40px] cursor-pointer px-3 py-1 transition-colors",
                        "hover:bg-accent/30",
                        isHourStart && "border-t border-border",
                        isHalfHour && "border-t border-dashed border-border/40"
                      )}
                      onClick={() => onSlotClick(date, hour, quarter)}
                    >
                      <div className="space-y-1">
                        {slotAppointments.map((appt) => (
                          <CalendarEvent
                            key={appt.id}
                            appointment={appt}
                            onClick={() => onEventClick(appt)}
                          />
                        ))}
                      </div>

                      {/* Hover indicator */}
                      {slotAppointments.length === 0 && (
                        <div className="pointer-events-none flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            + Add at {formatHour(hour).replace(" ", "").toLowerCase()}
                            {quarter > 0 ? `:${quarter}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
