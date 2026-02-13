"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { quickCreateAppointment } from "@/lib/api/appointments";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultStart?: string;
  defaultEnd?: string;
  onCreated?: () => void;
}

// Google Calendar inspired color palette
const APPOINTMENT_COLORS = [
  { value: "#dc2626", label: "Tomato", name: "Red" },
  { value: "#ea580c", label: "Tangerine", name: "Orange" },
  { value: "#ca8a04", label: "Banana", name: "Yellow" },
  { value: "#16a34a", label: "Basil", name: "Green" },
  { value: "#0d9488", label: "Sage", name: "Teal" },
  { value: "#0891b2", label: "Peacock", name: "Cyan" },
  { value: "#2563eb", label: "Blueberry", name: "Blue" },
  { value: "#7c3aed", label: "Lavender", name: "Purple" },
  { value: "#c026d3", label: "Grape", name: "Magenta" },
  { value: "#db2777", label: "Flamingo", name: "Pink" },
  { value: "#64748b", label: "Graphite", name: "Gray" },
  { value: "#78716c", label: "Birch", name: "Stone" },
];

export function QuickCreateDialog({
  open,
  onClose,
  defaultStart = "",
  defaultEnd = "",
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [startDatetime, setStartDatetime] = useState(defaultStart);
  const [endDatetime, setEndDatetime] = useState(defaultEnd);
  const [location, setLocation] = useState("office");
  const [color, setColor] = useState("#2563eb"); // Default blue
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setContact("");
    setStartDatetime(defaultStart);
    setEndDatetime(defaultEnd);
    setLocation("office");
    setColor("#2563eb");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !contact || !startDatetime || !endDatetime) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await quickCreateAppointment({
        title,
        contact,
        start_datetime: new Date(startDatetime).toISOString(),
        end_datetime: new Date(endDatetime).toISOString(),
        location,
        color,
      });
      reset();
      onCreated?.();
      onClose();
    } catch {
      setError("Failed to create appointment. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            Quick Create Appointment
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting with client"
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label>Contact ID *</Label>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="UUID"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start *</Label>
              <Input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End *</Label>
              <Input
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="client_site">Client Site</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {APPOINTMENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    color === c.value && "ring-2 ring-offset-2"
                  )}
                  style={{
                    backgroundColor: c.value,
                    ["--tw-ring-color" as string]: c.value,
                  } as React.CSSProperties}
                  title={c.name}
                >
                  {color === c.value && (
                    <Check className="size-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {APPOINTMENT_COLORS.find((c) => c.value === color)?.name || "Custom"}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: color }}
              className="text-white hover:opacity-90"
            >
              {loading ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
