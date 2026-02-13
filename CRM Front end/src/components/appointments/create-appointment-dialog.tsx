"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, User, Building2, FileText } from "lucide-react";
import { quickCreateAppointment } from "@/lib/api/appointments";
import { getContacts } from "@/lib/api/contacts";
import type { ContactListItem } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-fill options
  contactId?: string;
  contactName?: string;
  corporationId?: string;
  corporationName?: string;
  onCreated?: () => void;
}

const locationOptions = [
  { value: "office", label: "Office", icon: Building2 },
  { value: "virtual", label: "Virtual Meeting", icon: MapPin },
  { value: "client_site", label: "Client Site", icon: MapPin },
  { value: "phone", label: "Phone Call", icon: MapPin },
];

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Get default start time (next hour)
function getDefaultStart(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return now.toISOString().slice(0, 16);
}

// Get default end time (1 hour after start)
function getDefaultEnd(start: string): string {
  const date = new Date(start);
  date.setHours(date.getHours() + 1);
  return date.toISOString().slice(0, 16);
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  corporationId,
  corporationName,
  onCreated,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContactId, setSelectedContactId] = useState(contactId || "");
  const [selectedContactName, setSelectedContactName] = useState(contactName || "");
  const [startDatetime, setStartDatetime] = useState(getDefaultStart());
  const [endDatetime, setEndDatetime] = useState(getDefaultEnd(getDefaultStart()));
  const [location, setLocation] = useState("office");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For corporation mode - load contacts from that corporation
  const [corporationContacts, setCorporationContacts] = useState<ContactListItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when opening
      setTitle("");
      setDescription("");
      setSelectedContactId(contactId || "");
      setSelectedContactName(contactName || "");
      setStartDatetime(getDefaultStart());
      setEndDatetime(getDefaultEnd(getDefaultStart()));
      setLocation("office");
      setError("");

      // If corporation mode, load contacts
      if (corporationId && !contactId) {
        setLoadingContacts(true);
        getContacts({ corporation: corporationId, page_size: "100" })
          .then((data) => {
            setCorporationContacts(data.results);
            // Auto-select first contact if only one
            if (data.results.length === 1) {
              setSelectedContactId(data.results[0].id);
              setSelectedContactName(`${data.results[0].first_name} ${data.results[0].last_name}`);
            }
          })
          .catch(console.error)
          .finally(() => setLoadingContacts(false));
      }
    }
  }, [open, contactId, contactName, corporationId]);

  const handleStartChange = (value: string) => {
    setStartDatetime(value);
    // Auto-adjust end time to be 1 hour after start
    const start = new Date(value);
    start.setHours(start.getHours() + 1);
    setEndDatetime(start.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for the appointment.");
      return;
    }
    if (!selectedContactId) {
      setError("Please select a contact.");
      return;
    }
    if (!startDatetime || !endDatetime) {
      setError("Please set the appointment time.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await quickCreateAppointment({
        title: title.trim(),
        contact: selectedContactId,
        start_datetime: new Date(startDatetime).toISOString(),
        end_datetime: new Date(endDatetime).toISOString(),
        location,
      });
      onCreated?.();
      onOpenChange(false);
    } catch {
      setError("Failed to create appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewFull = () => {
    // Navigate to full appointment form with pre-filled data
    const params = new URLSearchParams();
    if (selectedContactId) params.set("contact", selectedContactId);
    if (title) params.set("title", title);
    if (startDatetime) params.set("start", startDatetime);
    if (endDatetime) params.set("end", endDatetime);
    if (location) params.set("location", location);

    router.push(`/appointments/new?${params.toString()}`);
    onOpenChange(false);
  };

  const isContactMode = !!contactId;
  const isCorporationMode = !!corporationId && !contactId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Appointment
          </DialogTitle>
          <DialogDescription>
            {isContactMode && contactName && (
              <span>Create an appointment with <strong>{contactName}</strong></span>
            )}
            {isCorporationMode && corporationName && (
              <span>Create an appointment for <strong>{corporationName}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Selection - Only show if corporation mode */}
          {isCorporationMode && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact *
              </Label>
              {loadingContacts ? (
                <div className="text-sm text-muted-foreground">Loading contacts...</div>
              ) : corporationContacts.length === 0 ? (
                <div className="text-sm text-destructive">
                  No contacts found for this organization.
                </div>
              ) : (
                <Select value={selectedContactId} onValueChange={(v) => {
                  setSelectedContactId(v);
                  const contact = corporationContacts.find(c => c.id === v);
                  if (contact) {
                    setSelectedContactName(`${contact.first_name} ${contact.last_name}`);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {corporationContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(`${c.first_name} ${c.last_name}`)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{c.first_name} {c.last_name}</span>
                          {c.email && (
                            <span className="text-muted-foreground text-xs">({c.email})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Contact Display - Only show if contact mode */}
          {isContactMode && contactName && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{contactName}</p>
                <p className="text-sm text-muted-foreground">Contact</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Title *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Tax Consultation, Document Review..."
              autoFocus
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start *
              </Label>
              <Input
                type="datetime-local"
                value={startDatetime}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End *
              </Label>
              <Input
                type="datetime-local"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                min={startDatetime}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or details..."
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleViewFull}
              className="sm:mr-auto"
            >
              More options...
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (isCorporationMode && corporationContacts.length === 0)}>
              <Calendar className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
