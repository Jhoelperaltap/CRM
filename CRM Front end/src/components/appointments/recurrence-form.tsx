"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  pattern: string;
  endDate: string;
  daysOfWeek: number[];
  onPatternChange: (pattern: string) => void;
  onEndDateChange: (date: string) => void;
  onDaysOfWeekChange: (days: number[]) => void;
}

const WEEKDAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export function RecurrenceForm({
  pattern,
  endDate,
  daysOfWeek,
  onPatternChange,
  onEndDateChange,
  onDaysOfWeekChange,
}: Props) {
  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      onDaysOfWeekChange(daysOfWeek.filter((d) => d !== day));
    } else {
      onDaysOfWeekChange([...daysOfWeek, day].sort());
    }
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label>Recurrence</Label>
        <Select value={pattern} onValueChange={onPatternChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pattern === "weekly" && (
        <div className="space-y-2">
          <Label>Repeat on</Label>
          <div className="flex gap-1">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  daysOfWeek.includes(day.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {pattern !== "none" && (
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank for no end date
          </p>
        </div>
      )}
    </div>
  );
}
