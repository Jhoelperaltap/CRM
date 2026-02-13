"use client";

import type { CalendarAppointment } from "@/types";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Repeat, User } from "lucide-react";

interface Props {
  appointment: CalendarAppointment;
  compact?: boolean;
  onClick?: (appointment: CalendarAppointment) => void;
}

// Calculate if the background color is light or dark to determine text color
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Generate lighter background color for Google Calendar style
function getLightBackground(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Make it 85% lighter
  const newR = Math.round(r + (255 - r) * 0.85);
  const newG = Math.round(g + (255 - g) * 0.85);
  const newB = Math.round(b + (255 - b) * 0.85);
  return `rgb(${newR}, ${newG}, ${newB})`;
}

export function CalendarEvent({ appointment, compact = false, onClick }: Props) {
  const start = new Date(appointment.start_datetime);
  const end = new Date(appointment.end_datetime);

  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endTimeStr = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const baseColor = appointment.color || "#3b82f6";
  const bgColor = getLightBackground(baseColor);
  const textColor = baseColor;
  const isLight = isLightColor(baseColor);

  if (compact) {
    // Compact view for month calendar - pill style like Google Calendar
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(appointment);
        }}
        className={cn(
          "group/event flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs transition-all",
          "hover:shadow-md hover:scale-[1.02]"
        )}
        style={{
          backgroundColor: bgColor,
          borderLeft: `3px solid ${baseColor}`,
        }}
        title={`${timeStr} - ${endTimeStr}: ${appointment.title}`}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: baseColor }}
        />
        <span className="truncate font-medium" style={{ color: textColor }}>
          {timeStr.replace(":00", "").toLowerCase()} {appointment.title}
        </span>
        {appointment.recurrence_pattern !== "none" && (
          <Repeat className="ml-auto size-3 shrink-0" style={{ color: textColor }} />
        )}
      </button>
    );
  }

  // Full view for week/day calendar - card style
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(appointment);
      }}
      className={cn(
        "group/event flex w-full flex-col rounded-lg p-2 text-left text-xs transition-all",
        "hover:shadow-lg hover:scale-[1.01] border-l-4"
      )}
      style={{
        backgroundColor: bgColor,
        borderLeftColor: baseColor,
      }}
      title={`${timeStr} - ${endTimeStr}: ${appointment.title}`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-1">
        <span
          className="font-semibold leading-tight line-clamp-2"
          style={{ color: textColor }}
        >
          {appointment.title}
        </span>
        {appointment.recurrence_pattern !== "none" && (
          <Repeat className="size-3 shrink-0 mt-0.5" style={{ color: textColor }} />
        )}
      </div>

      {/* Time row */}
      <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: textColor }}>
        <Clock className="size-3" />
        <span>{timeStr} - {endTimeStr}</span>
      </div>

      {/* Contact */}
      {appointment.contact_name && (
        <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: textColor }}>
          <User className="size-3" />
          <span className="truncate">{appointment.contact_name}</span>
        </div>
      )}

      {/* Location */}
      {appointment.location && (
        <div className="mt-1 flex items-center gap-1 text-[10px] opacity-75" style={{ color: textColor }}>
          <MapPin className="size-3" />
          <span className="truncate capitalize">{appointment.location.replace("_", " ")}</span>
        </div>
      )}
    </button>
  );
}
